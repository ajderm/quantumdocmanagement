/**
 * Parser for the flat one-row-per-factor CSV the app originally accepted.
 *
 * Kept so existing dealer uploads continue to work, and normalized to the same
 * shape as the matrix parser so storage sees one representation.
 */

import type { ParseResult, ParsedFactor } from './types.ts';
import { parseCsv, headerKey } from './csv.ts';

const NUM = (v: string | undefined): number | null => {
  if (v === undefined) return null;
  const cleaned = v.replace(/[$,\s]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

/** Column aliases seen in the wild, mapped to one canonical key. */
const ALIASES: Record<string, string> = {
  leasing_company: 'leasing_company', company: 'leasing_company', partner: 'leasing_company',
  lease_program: 'lease_program', program: 'lease_program',
  promotion: 'promotion', promo: 'promotion',
  money_rate: 'money_rate', mon: 'money_rate',
  min_amount: 'min_amount', minimum: 'min_amount',
  max_amount: 'max_amount', maximum: 'max_amount',
  term_months: 'term_months', term: 'term_months', months: 'term_months',
  rate_factor: 'rate_factor', rate: 'rate_factor', factor: 'rate_factor',
};

export function parseFlatCsv(text: string): ParseResult {
  const warnings: string[] = [];
  const factors: ParsedFactor[] = [];
  let skipped = 0;

  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { program: null, effectiveFrom: null, effectiveTo: null, factors: [],
             warnings: ['The file has no data rows.'], notes: [], skipped: 0 };
  }

  const headers = rows[0].map((h) => ALIASES[headerKey(h)] ?? headerKey(h));
  const col = (key: string) => headers.indexOf(key);
  const iTerm = col('term_months');
  const iFactor = col('rate_factor');

  if (iTerm < 0 || iFactor < 0) {
    return { program: null, effectiveFrom: null, effectiveTo: null, factors: [],
             warnings: [`Missing required column${iTerm < 0 && iFactor < 0 ? 's' : ''}: ` +
               [iTerm < 0 && 'term_months', iFactor < 0 && 'rate_factor'].filter(Boolean).join(', ')],
             notes: [], skipped: 0 };
  }

  const iCompany = col('leasing_company');
  const iProgram = col('lease_program');
  const iPromo = col('promotion');
  const iMoney = col('money_rate');
  const iMin = col('min_amount');
  const iMax = col('max_amount');

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const term = NUM(row[iTerm]);
    const factor = NUM(row[iFactor]);
    if (term === null || !Number.isInteger(term) || term < 1 || term > 120
        || factor === null || factor <= 0 || factor >= 1) {
      skipped++;
      if (skipped <= 5) {
        warnings.push(`Row ${r + 1}: term "${row[iTerm] ?? ''}" / factor "${row[iFactor] ?? ''}" is not usable.`);
      }
      continue;
    }
    factors.push({
      leasingCompany: iCompany >= 0 ? (row[iCompany]?.trim() || null) : null,
      program: (iProgram >= 0 ? row[iProgram]?.trim() : '') || 'default',
      promotion: (iPromo >= 0 ? row[iPromo]?.trim() : '') || 'default',
      paymentStructure: null,
      moneyRate: iMoney >= 0 ? NUM(row[iMoney]) : null,
      // A flat CSV states one rate per row, so the street/bank distinction the
      // partner matrices carry side by side does not arise here.
      audience: null,
      minAmount: iMin >= 0 ? NUM(row[iMin]) : null,
      maxAmount: iMax >= 0 ? NUM(row[iMax]) : null,
      termMonths: term,
      rateFactor: factor,
    });
  }

  if (skipped > 5) warnings.push(`${skipped - 5} further unusable row(s) were skipped.`);
  const programs = [...new Set(factors.map((f) => f.program))];
  return {
    program: programs.length === 1 ? programs[0] : null,
    effectiveFrom: null, effectiveTo: null,
    factors, warnings, notes: [], skipped,
  };
}
