/**
 * Parser for leasing-partner rate sheets laid out as a cross-tab matrix.
 *
 * The real files look like this (Eakes/Cornerstone, June-November 2026):
 *
 *   [0] EAKES COMMERCIAL LEASE RATES
 *   [1] June 1, 2026 - November 30, 2026
 *   [2] ZERO PAYMENTS
 *   [3] MON 0.07875  MON 0.07875  MON 0.07875  MON 0.06875 ...
 *   [4]  60 0.02022   40 0.02851   20 0.05352   60 0.01974 ...
 *   [5]  59 0.02050   39 0.02915   19 0.05615   59 0.02002 ...
 *
 * Six (term, factor) column pairs run across, each priced at the money rate
 * sitting above it in the MON row. Three pairs cover term bands 60-51, 40-31
 * and 20-12 for one money rate, then the pattern repeats for the next. So a
 * single tab holds two complete term ladders, and a workbook tab is one
 * promotion.
 *
 * Deliberately dependency-free and takes already-read rows rather than a file,
 * so the layout rules can be tested without a spreadsheet library.
 */

import type { ParseResult, ParsedFactor, RateSheetTab } from './types';

const MAX_TERM = 120;

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
const isBlank = (v: unknown): boolean => text(v) === '';

/** A term must be a whole number of months in a plausible range. */
function asTerm(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(text(v));
  return Number.isInteger(n) && n >= 1 && n <= MAX_TERM ? n : null;
}

/**
 * A rate factor is a small fraction — a payment per dollar financed. Anything
 * at or above 1 is a different quantity that has drifted into the column
 * (a total, a percentage) and must not be stored as a factor.
 */
function asFactor(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(text(v));
  return Number.isFinite(n) && n > 0 && n < 1 ? n : null;
}

const MONTHS = ['january','february','march','april','may','june',
                'july','august','september','october','november','december'];

/**
 * "June 1, 2026 - November 30, 2026" -> two ISO calendar dates.
 *
 * Returned as YYYY-MM-DD strings rather than Date objects on purpose: these
 * are calendar dates, and routing them through Date would let a negative UTC
 * offset shift an effective-from back a day.
 */
export function parseEffectiveRange(line: string): { from: string | null; to: string | null } {
  const one = (s: string): string | null => {
    const m = /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/.exec(s);
    if (m) {
      const mi = MONTHS.indexOf(m[1].toLowerCase());
      if (mi < 0) return null;
      return `${m[3]}-${String(mi + 1).padStart(2, '0')}-${String(Number(m[2])).padStart(2, '0')}`;
    }
    const n = /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/.exec(s);
    if (n) {
      const year = n[3].length === 2 ? `20${n[3]}` : n[3];
      return `${year}-${String(Number(n[1])).padStart(2, '0')}-${String(Number(n[2])).padStart(2, '0')}`;
    }
    return null;
  };
  // Split on an en/em dash or a hyphen flanked by spaces, so "June 1, 2026"
  // is not torn apart at a date's own separators.
  const parts = line.split(/\s+[–—-]\s+|\s+to\s+/i);
  if (parts.length >= 2) return { from: one(parts[0]), to: one(parts.slice(1).join(' ')) };
  const single = one(line);
  return { from: single, to: null };
}

/** First non-blank cell of a row, as text. */
function leadText(row: unknown[] | undefined): string {
  if (!row) return '';
  for (const cell of row) if (!isBlank(cell)) return text(cell);
  return '';
}

/**
 * True for a row carrying one cell of prose rather than rate pairs.
 *
 * Kept deliberately narrow — exactly one non-blank cell, non-numeric, and long
 * enough to be a sentence — so a malformed data row is still reported as
 * skipped rather than quietly reclassified as a note.
 */
const FOOTNOTE_MIN_LENGTH = 15;
function isFootnoteRow(row: unknown[]): boolean {
  const filled = row.filter((c) => !isBlank(c));
  if (filled.length !== 1) return false;
  const only = text(filled[0]);
  if (only.length < FOOTNOTE_MIN_LENGTH) return false;
  return !Number.isFinite(Number(only));
}

function findMonRow(rows: unknown[][]): number {
  for (let i = 0; i < rows.length; i++) {
    if (leadText(rows[i]).toUpperCase() === 'MON') return i;
  }
  return -1;
}

/** Money rates read from the MON row, one per column pair. */
function moneyRates(monRow: unknown[]): (number | null)[] {
  const out: (number | null)[] = [];
  for (let c = 0; c < monRow.length; c += 2) {
    if (text(monRow[c]).toUpperCase() !== 'MON') { out.push(null); continue; }
    out.push(asMoneyRate(monRow[c + 1]));
  }
  return out;
}

/**
 * A money-over-money rate from a MON header cell.
 *
 * The cell reads "5.750%", and Number("5.750%") is NaN -- which is how every
 * money rate in these sheets came back null, collapsing the two side-by-side
 * rate sets into one key per term and silently discarding half the file. The
 * percent sign has to be stripped before parsing, and a value above 1 read as
 * a percent rather than a fraction.
 */
function asMoneyRate(cell: unknown): number | null {
  const raw = text(cell).replace(/[%\s,]/g, '');
  if (raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  const fraction = n > 1 ? n / 100 : n;
  // A money rate over 100% is not a rate; it is a misread cell.
  if (fraction >= 1) return null;
  return Math.round(fraction * 1e6) / 1e6;
}

/**
 * Which money rate a rep may quote, and which is Eakes' cost of funds.
 *
 * The leftmost set is the street rate (Andrea: "the highlighted rates on the
 * left side are the only ones that are visible to our sales reps"), and Eakes
 * loads it above what they pay the bank, so the street rate should also be the
 * higher of the two. When position and magnitude disagree the sheet's layout
 * has changed and this mapping can no longer be trusted, so it warns rather
 * than guessing -- mislabelling these would let a rep quote a customer off
 * Eakes' own cost.
 */
function audienceByMoneyRate(
  rates: (number | null)[], tabName: string, warnings: string[],
): Map<number, 'street' | 'bank'> {
  const distinct: number[] = [];
  for (const r of rates) {
    if (r !== null && !distinct.includes(r)) distinct.push(r);
  }
  const out = new Map<number, 'street' | 'bank'>();
  if (distinct.length < 2) return out;
  if (distinct.length > 2) {
    warnings.push(
      `Tab "${tabName}": ${distinct.length} money rates found (${distinct.join(', ')}). ` +
      `Expected two -- a street rate and a bank rate -- so none were labelled. ` +
      `Rates are stored, but which a rep may quote is unmarked.`,
    );
    return out;
  }
  const [first, second] = distinct;
  if (first < second) {
    warnings.push(
      `Tab "${tabName}": the leftmost money rate (${first}) is lower than the one beside ` +
      `it (${second}), but Eakes loads the rate they quote above what they pay the bank. ` +
      `The columns may have been reordered, so neither set was labelled.`,
    );
    return out;
  }
  out.set(first, 'street');
  out.set(second, 'bank');
  return out;
}

/**
 * Parse one workbook's worth of tabs.
 *
 * @param tabs one entry per worksheet; each worksheet is treated as a promotion
 */
export function parseRateMatrix(tabs: RateSheetTab[]): ParseResult {
  const warnings: string[] = [];
  const factors: ParsedFactor[] = [];
  const notes: string[] = [];
  let program: string | null = null;
  let effectiveFrom: string | null = null;
  let effectiveTo: string | null = null;
  let skipped = 0;

  if (!tabs.length) {
    return { program: null, effectiveFrom: null, effectiveTo: null, factors: [],
             warnings: ['The file contains no worksheets.'], notes: [], skipped: 0 };
  }

  for (const tab of tabs) {
    const rows = tab.rows ?? [];
    const promotion = text(tab.name) || 'default';

    const monIndex = findMonRow(rows);
    if (monIndex < 0) {
      warnings.push(`Tab "${promotion}": no MON row found, so no rate columns could be located. Skipped.`);
      continue;
    }

    // Header lines are whatever precedes the MON row: title, effective range,
    // payment structure, and sometimes a promotion line. Their order is stable
    // but their count is not, which is why the MON row is found rather than
    // assumed.
    const header = rows.slice(0, monIndex).map(leadText).filter(Boolean);
    const title = header[0] ?? null;
    if (title && !program) program = title;
    if (title && program && title !== program) {
      warnings.push(`Tab "${promotion}": titled "${title}" but the file started as "${program}". Using the first.`);
    }

    for (const line of header.slice(1)) {
      const range = parseEffectiveRange(line);
      if (range.from) {
        if (!effectiveFrom) { effectiveFrom = range.from; effectiveTo = range.to; }
        break;
      }
    }

    const paymentStructure = header.slice(1).find((l) => !parseEffectiveRange(l).from) ?? null;
    const rates = moneyRates(rows[monIndex]);
    const audiences = audienceByMoneyRate(rates, promotion, warnings);

    // Guard against the same (money rate, term) appearing twice in one tab,
    // which would otherwise silently store two different factors for one key.
    const seen = new Map<string, number>();

    for (let r = monIndex + 1; r < rows.length; r++) {
      const row = rows[r] ?? [];
      if (leadText(row).toUpperCase() === 'MON') continue; // a repeated banner

      // A single long prose cell below the ladder is a footnote, not a broken
      // data row. Counting it as skipped data would imply the parse lost
      // something, and the text itself is worth keeping.
      if (isFootnoteRow(row)) {
        const note = leadText(row);
        if (note && !notes.includes(note)) notes.push(note);
        continue;
      }

      for (let c = 0, pair = 0; c < row.length; c += 2, pair++) {
        if (isBlank(row[c]) && isBlank(row[c + 1])) continue;
        const termMonths = asTerm(row[c]);
        const rateFactor = asFactor(row[c + 1]);
        if (termMonths === null || rateFactor === null) { skipped++; continue; }

        const moneyRate = rates[pair] ?? null;
        const key = `${moneyRate ?? 'x'}|${termMonths}`;
        const prior = seen.get(key);
        if (prior !== undefined) {
          if (prior !== rateFactor) {
            warnings.push(
              `Tab "${promotion}": term ${termMonths} at money rate ${moneyRate ?? 'unknown'} appears twice ` +
              `with different factors (${prior} and ${rateFactor}). Kept the first.`,
            );
          }
          continue;
        }
        seen.set(key, rateFactor);

        factors.push({
          leasingCompany: null,
          program: program ?? title ?? 'Unknown program',
          promotion, paymentStructure, moneyRate,
          minAmount: null, maxAmount: null,
          termMonths, rateFactor,
          audience: moneyRate === null ? null : (audiences.get(moneyRate) ?? null),
        });
      }
    }

    if (!seen.size) warnings.push(`Tab "${promotion}": no usable rate factors found.`);
  }

  if (!factors.length && !warnings.length) warnings.push('No rate factors were found in this file.');
  if (!effectiveFrom) {
    warnings.push('No effective date range was found; the sheet will have no expiry.');
  }

  return { program, effectiveFrom, effectiveTo, factors, warnings, notes, skipped };
}
