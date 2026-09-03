// Resolved blocks -> a single print document. No layout maths here: the
// stylesheet and Chromium decide where pages break.

import { buildCss, esc } from './css.js';

/** Rich text arrives from a terms library, so it is sanitised to an inline
 *  formatting subset rather than trusted as markup. */
const ALLOWED = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'span']);
export function sanitizeHtml(html) {
  if (typeof html !== 'string') return '';
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)\b[^>]*\/?>/gi, '');
  return stripped.replace(/<\s*\/?\s*([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g,
    (match, tag, attrs) => {
      const name = tag.toLowerCase();
      if (!ALLOWED.has(name)) return '';
      if (match.startsWith('</')) return `</${name}>`;
      // Drop every attribute: no href, no style, no on* handlers.
      void attrs;
      return name === 'br' ? '<br>' : `<${name}>`;
    });
}

function tableBlock(b) {
  const cols = b.columns ?? [];
  const colgroup = `<colgroup>${cols.map(
    (c) => `<col${c.width ? ` style="width:${esc(c.width)}"` : ''}>`).join('')}</colgroup>`;
  const head = `<thead><tr>${cols.map(
    (c) => `<th class="${cls(c.align)}">${esc(c.label)}</th>`).join('')}</tr></thead>`;

  const body = [];
  if (!b.rowCount) {
    body.push(`<tr class="empty"><td colspan="${cols.length || 1}">${esc(b.emptyText)}</td></tr>`);
  } else {
    for (const g of b.groups) {
      if (g.label !== null) {
        body.push(`<tr class="group"><td colspan="${cols.length}">${esc(g.label)}` +
          ` &middot; ${g.cells.length} item${g.cells.length === 1 ? '' : 's'}</td></tr>`);
      }
      for (const cells of g.cells) {
        body.push('<tr>' + cells.map(
          (v, i) => `<td class="${cls(cols[i].align)}">${esc(v)}</td>`).join('') + '</tr>');
      }
      if (g.label !== null && b.subtotalPerGroup) {
        const money = '$' + g.subtotal.toLocaleString('en-US',
          { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        body.push(`<tr class="groupSub"><td colspan="${Math.max(1, cols.length - 1)}">` +
          `${esc(g.label)} subtotal</td><td class="num">${money}</td></tr>`);
      }
    }
  }

  const note = b.overflow
    ? `<div class="tableOverflow">${b.overflow} additional line item(s) are not shown` +
      ` — see the attached schedule.</div>`
    : '';
  return `<table class="grid">${colgroup}${head}<tbody>${body.join('')}</tbody></table>${note}`;
}

const cls = (align) => (align === 'right' ? 'num' : align === 'center' ? 'ctr' : '');

function renderBlock(b) {
  const keep = b.keepTogether === false ? '' : ' keep';
  switch (b.type) {
    case 'docTitle':
      return `<section class="block docTitle${keep}"><h1>${esc(b.title)}</h1>
        <div class="meta">${(b.meta ?? []).filter((m) => m.value !== '').map(
          (m) => `<div><span class="k">${esc(m.label)}:</span> <span class="v">${esc(m.value)}</span></div>`
        ).join('')}</div></section>`;

    case 'fieldGrid':
      return `<section class="block fieldGrid${keep}">
        ${b.title ? `<div class="sectionHead">${esc(b.title)}</div>` : ''}
        <div class="grid" style="--cols:${Number(b.columns) || 2}">${(b.fields ?? []).map(
          (f) => `<div class="f${f.full ? ' full' : ''}"><span class="k">${esc(f.label)}</span>` +
                 `<span class="v">${esc(f.value)}</span></div>`).join('')}</div></section>`;

    case 'table':
      // A table is the one block that must be allowed to split.
      return `<section class="block table">
        ${b.title ? `<div class="sectionHead">${esc(b.title)}</div>` : ''}
        ${tableBlock(b)}</section>`;

    case 'summary':
      return `<section class="block summary keep"><div class="box">${(b.rows ?? []).map(
        (r) => `<div class="r${r.bold ? ' bold' : ''}${r.rule ? ' rule' : ''}">` +
               `<span>${esc(r.label)}</span><span class="v">${esc(r.value)}</span></div>`
      ).join('')}</div></section>`;

    case 'richText':
      return `<section class="block richText${b.keepTogether ? ' keep' : ''}">
        ${b.title ? `<div class="sectionHead">${esc(b.title)}</div>` : ''}
        <div class="body">${sanitizeHtml(b.html)}</div></section>`;

    case 'signature':
      return `<section class="block signature keep">
        <div class="sectionHead">${esc(b.title)}</div>
        <div class="cols">${(b.signers ?? []).map(
          (g) => `<div><div class="line"></div><div class="cap">${esc(g.label)}` +
                 `${g.sublabel ? ` &middot; ${esc(g.sublabel)}` : ''}</div></div>`).join('')}</div></section>`;

    case 'pageBreak':
      return '<div class="pageBreak"></div>';

    case 'spacer':
      return `<div style="height:${Number(b.height) || 12}pt"></div>`;

    default:
      return '';
  }
}

/** @returns {string} a complete standalone HTML document */
export function buildHtml({ template, blocks }) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(template.name ?? 'Document')}</title>
<style>${buildCss(template)}</style></head>
<body>${blocks.map(renderBlock).join('\n')}</body></html>`;
}
