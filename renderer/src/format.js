// Value formatters referenced from templates as `{{ path | name:arg }}`.
// Every formatter must tolerate null/undefined and return a string.

const nz = (v) => (v === null || v === undefined || v === '' ? null : v);

/**
 * Absent is not zero.
 *
 * `Number(null)` is 0, so a naive numeric formatter turns a missing price into
 * "$0.00" — which on a customer-facing quote reads as free. Absent values must
 * render empty so `hideEmpty` can drop the field, while an EXPLICIT zero still
 * prints as $0.00. (The previous app shipped a fix titled "Honor explicit 0 in
 * commission Additional Costs" for the mirror image of this bug.)
 */
const num = (v) => {
  if (nz(v) === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const formatters = {
  text: (v) => (nz(v) === null ? '' : String(v)),

  /** Cents-safe currency. Accepts a number of dollars. */
  currency: (v, decimals = '2') => {
    const n = num(v);
    if (n === null) return '';
    const d = Number(decimals);
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  },

  number: (v, decimals = '0') => {
    const n = num(v);
    if (n === null) return '';
    const d = Number(decimals);
    return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  },

  percent: (v, decimals = '1') => {
    const n = num(v);
    if (n === null) return '';
    return (n * 100).toFixed(Number(decimals)) + '%';
  },

  /** Rate factors are small and must not be rounded away (0.019740). */
  rate: (v, decimals = '6') => {
    const n = num(v);
    if (n === null) return '';
    return n.toFixed(Number(decimals));
  },

  /**
   * Date formatting that does NOT shift across timezones. A bare `YYYY-MM-DD`
   * is treated as a calendar date, not an instant — `new Date('2026-09-30')`
   * parses as UTC midnight and renders as Sep 29 in any negative offset, which
   * is the timezone bug the existing app had to fix twice.
   */
  date: (v, style = 'long') => {
    if (nz(v) === null) return '';
    let y, m, d;
    const s = String(v);
    const bare = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (bare) {
      [, y, m, d] = bare.map(Number);
    } else {
      const parsed = new Date(s);
      if (Number.isNaN(parsed.getTime())) return '';
      y = parsed.getUTCFullYear(); m = parsed.getUTCMonth() + 1; d = parsed.getUTCDate();
    }
    const MONTHS = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    if (style === 'short') return `${String(m).padStart(2,'0')}/${String(d).padStart(2,'0')}/${y}`;
    if (style === 'medium') return `${MONTHS[m-1].slice(0,3)} ${d}, ${y}`;
    return `${MONTHS[m-1]} ${d}, ${y}`;
  },

  upper: (v) => (nz(v) === null ? '' : String(v).toUpperCase()),
};

export function applyFormat(value, spec) {
  if (!spec) return formatters.text(value);
  const [name, ...args] = spec.split(':');
  const fn = formatters[name.trim()];
  if (!fn) throw new Error(`Unknown formatter: ${name}`);
  return fn(value, ...args.map((a) => a.trim()));
}
