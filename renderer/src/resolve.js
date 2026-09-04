// Resolves a template against a data payload: tokens, bound collections,
// grouping, and computed totals.
//
// The output of resolve() is the ONLY thing the HTML layer sees. That boundary
// is deliberate: preview, PDF, e-sign field placement and CRM write-back must
// all consume one resolved payload, so a number can never be computed twice
// and disagree with itself.

import { applyFormat } from './format.js';
import { evaluate, refsIn, coalesceBranches } from './expr.js';

export function get(obj, path) {
  if (obj == null) return undefined;
  let cur = obj;
  for (const key of String(path).split('.')) {
    if (cur == null) return undefined;
    cur = cur[key];
  }
  return cur;
}

const TOKEN = /\{\{\s*([^}|]+?)\s*(?:\|\s*([^}]+?)\s*)?\}\}/g;

/** Replace every `{{ path | formatter }}` in a string. */
export function interpolate(str, scope, { missing = '' } = {}) {
  if (typeof str !== 'string') return str;
  return str.replace(TOKEN, (_m, path, fmt) => {
    const v = get(scope, path.trim());
    if (v === undefined || v === null || v === '') return missing;
    return applyFormat(v, fmt);
  });
}

/** Every token referenced by a string, for the editor's "trace this token" view. */
export function tokensIn(str) {
  if (typeof str !== 'string') return [];
  return [...str.matchAll(TOKEN)].map((m) => m[1].trim());
}

/**
 * True when a string references at least one token and every one of them
 * resolved to nothing.
 *
 * This is what `hideEmpty` actually needs. Checking the interpolated result
 * for emptiness is not enough: "{{lease.term}} months" against a null term
 * produces " months", so the field survives as a dangling unit with no
 * number — a visibly broken line on a customer-facing document.
 */
export function allTokensEmpty(str, scope) {
  const refs = tokensIn(str);
  if (refs.length === 0) return false;
  return refs.every((path) => {
    const v = get(scope, path);
    return v === undefined || v === null || v === '';
  });
}

function rowsFor(template, block, data) {
  const raw = get(data, block.bind);
  const rows = Array.isArray(raw) ? raw.slice() : [];
  // A row limit protects the renderer from a runaway collection; it is a
  // guard rail, not a business rule, so overflow is reported rather than
  // silently truncated.
  const limit = block.maxRows ?? template.limits?.maxRows ?? 500;
  const overflow = Math.max(0, rows.length - limit);
  return { rows: overflow ? rows.slice(0, limit) : rows, overflow };
}

function groupRows(rows, groupBy) {
  if (!groupBy) return [{ key: null, label: null, rows }];
  const order = [];
  const bag = new Map();
  for (const r of rows) {
    const key = get(r, groupBy) ?? '—';
    if (!bag.has(key)) { bag.set(key, []); order.push(key); }
    bag.get(key).push(r);
  }
  return order.map((key) => ({ key, label: String(key), rows: bag.get(key) }));
}

/**
 * @param {object} template
 * @param {object} data
 * @returns {{template:object, scope:object, blocks:object[], warnings:string[]}}
 */
export function resolve(template, data) {
  const warnings = [];
  const vars = template.vars ?? {};

  // Pass 1: bound collections and their arithmetic, so `totals.*` exists
  // before any token or expression is evaluated.
  const totals = { count: 0, qty: 0, subtotal: 0 };
  const tableState = new Map();

  for (const block of template.blocks ?? []) {
    if (block.type !== 'table' || !block.bind) continue;
    const { rows, overflow } = rowsFor(template, block, data);
    if (overflow) warnings.push(`${block.bind}: ${overflow} row(s) beyond the row limit were not rendered`);

    const amountKey = block.amountKey ?? 'extended';
    const qtyKey = block.qtyKey ?? 'quantity';
    const groups = groupRows(rows, block.groupBy).map((g) => {
      const subtotal = g.rows.reduce((s, r) => s + (Number(get(r, amountKey)) || 0), 0);
      const qty = g.rows.reduce((s, r) => s + (Number(get(r, qtyKey)) || 0), 0);
      return { ...g, subtotal, qty };
    });
    const blockSubtotal = groups.reduce((s, g) => s + g.subtotal, 0);
    tableState.set(block, { rows, groups, overflow, subtotal: blockSubtotal });

    totals.count += rows.length;
    totals.qty += groups.reduce((s, g) => s + g.qty, 0);
    totals.subtotal += blockSubtotal;
  }

  // `computed` entries may reference earlier ones, so evaluate in declared order.
  const computed = {};
  const scope = { ...data, vars, totals, computed };
  const lookup = (path) => get(scope, path);

  // Absence propagates. A value computed from a missing input is itself
  // missing, not zero — otherwise a quote with no rate factor prints
  // "Monthly payment $0.00", which reads as free. Tracked as a set of keys
  // rather than by writing null into `computed`, so arithmetic downstream
  // still sees numbers and cannot throw.
  const absent = new Set();
  const isAbsentPath = (path) => {
    if (path.startsWith('computed.')) return absent.has(path.slice('computed.'.length));
    const v = get(scope, path);
    return v === undefined || v === null || v === '';
  };

  /**
   * Is this expression's result missing?
   *
   * Anything built from a missing input is missing -- except a firstNonZero,
   * which exists to fall back, and is missing only when every branch it could
   * fall back to is. Judged branch by branch: a branch mentioning an
   * always-present subtotal must not make the whole thing look present when
   * the figures beside it are gone.
   */
  const exprIsMissing = (expr) => {
    const refs = refsIn(expr);
    if (!refs.length) return false;
    const branches = coalesceBranches(expr);
    if (!branches) return refs.some(isAbsentPath);
    return branches.every((b) => {
      const r = refsIn(b);
      // A branch of pure literals is a real value, never absent.
      return r.length > 0 && r.some(isAbsentPath);
    });
  };

  for (const [key, expr] of Object.entries(template.computed ?? {})) {
    const refs = refsIn(expr);
    if (exprIsMissing(expr)) absent.add(key);
    try {
      computed[key] = evaluate(String(expr), lookup);
    } catch (err) {
      warnings.push(`computed.${key}: ${err.message}`);
      computed[key] = 0;
      absent.add(key);
    }
  }

  // Pass 2: materialise blocks with every string resolved.
  const blocks = [];
  for (const block of template.blocks ?? []) {
    const s = (v) => interpolate(v, scope, { missing: block.missing ?? '' });
    switch (block.type) {
      case 'docTitle':
        blocks.push({ ...block, title: s(block.title),
          meta: (block.meta ?? [])
            .filter((m) => !allTokensEmpty(m.value, scope))
            .map((m) => ({ label: s(m.label), value: s(m.value) })) });
        break;
      case 'fieldGrid': {
        const fields = (block.fields ?? [])
          .filter((f) => !block.hideEmpty || !allTokensEmpty(f.value, scope))
          .map((f) => ({ label: s(f.label), value: s(f.value), full: !!f.full }))
          .filter((f) => !block.hideEmpty || f.value.trim() !== '');
        blocks.push({ ...block, fields });
        break;
      }
      case 'table': {
        const st = tableState.get(block) ?? { rows: [], groups: [], subtotal: 0, overflow: 0 };
        const columns = (block.columns ?? []).map((c) => ({
          key: c.key, label: s(c.label), align: c.align ?? 'left',
          width: c.width, format: c.format, hidden: !!c.hidden,
        })).filter((c) => !c.hidden);
        const groups = st.groups.map((g) => ({
          label: g.label, subtotal: g.subtotal, qty: g.qty,
          cells: g.rows.map((r) => columns.map((c) => {
            const v = c.key.includes('{{') ? interpolate(c.key, { ...scope, row: r }) : get(r, c.key);
            return applyFormat(v, c.format);
          })),
        }));
        blocks.push({ ...block, columns, groups, subtotal: st.subtotal,
          rowCount: st.rows.length, overflow: st.overflow,
          emptyText: s(block.emptyText ?? 'No items.') });
        break;
      }
      case 'summary': {
        const rows = (block.rows ?? []).map((r) => {
          let value;
          if (r.expr) {
            // A row resting on absent data renders blank rather than zero.
            // Totals legitimately are zero sometimes (an empty quote), and
            // that still prints — this is about inputs that were never there.
            if (exprIsMissing(r.expr)) {
              value = '';
            } else {
              try { value = evaluate(String(r.expr), lookup); }
              catch (err) { warnings.push(`summary "${r.label}": ${err.message}`); value = 0; }
              value = applyFormat(value, r.format ?? 'currency');
            }
          } else {
            value = s(r.value ?? '');
          }
          return { label: s(r.label), value, bold: !!r.bold, rule: !!r.rule };
        });
        blocks.push({ ...block, rows: block.hideEmpty ? rows.filter((r) => r.value !== '') : rows });
        break;
      }
      case 'richText': {
        const html = s(block.html ?? block.text ?? '');
        // A terms block sourced from a dealer's own settings is empty until
        // they have entered any. Printing the heading over nothing invites the
        // reader to assume the terms are elsewhere; omitting the section says
        // plainly that this document carries none.
        if (block.hideEmpty && html.replace(/<[^>]*>/g, '').trim() === '') break;
        blocks.push({ ...block, title: s(block.title), html });
        break;
      }
      case 'signature':
        blocks.push({ ...block, title: s(block.title ?? 'Acceptance'),
          signers: (block.signers ?? []).map((g) => ({ label: s(g.label), sublabel: s(g.sublabel ?? '') })) });
        break;
      case 'pageBreak':
      case 'spacer':
        blocks.push({ ...block });
        break;
      default:
        warnings.push(`Unknown block type "${block.type}" was skipped`);
    }
  }

  return { template, scope, blocks, warnings };
}
