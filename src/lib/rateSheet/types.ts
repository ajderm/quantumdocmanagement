/**
 * Normalized rate-sheet rows.
 *
 * Every supported upload format is reduced to this shape, so the storage layer
 * and the pricing engine see one representation regardless of whether a dealer
 * sent a flat CSV or a leasing partner's cross-tab spreadsheet.
 */

export interface RateSheetTab {
  name: string;
  /** Rows of raw cell values, as produced by a spreadsheet reader. */
  rows: unknown[][];
}

export interface ParsedFactor {
  /** Funding partner, when the format states one (the flat CSV does). */
  leasingCompany: string | null;
  /** Rate program, e.g. "EAKES COMMERCIAL LEASE RATES". */
  program: string;
  /** Which promotion/tab this factor belongs to, e.g. "Net New 0 pmts". */
  promotion: string;
  /** Payment structure line, e.g. "ZERO PAYMENTS UPFRONT". */
  paymentStructure: string | null;
  /**
   * The money-over-money rate the column group was priced at (0.07875).
   *
   * This is the dimension these sheets actually tier on. It is NOT a deal-size
   * band — the existing schema's min_amount/max_amount describe a different
   * concept and cannot represent it.
   */
  moneyRate: number | null;
  /**
   * Deal-size band, when the format states one.
   *
   * A different tiering dimension from moneyRate, and the two are not
   * interchangeable: the flat CSV bands by amount financed, the partner
   * matrices band by money rate. Both are carried so neither format loses
   * information on the way in.
   */
  minAmount: number | null;
  maxAmount: number | null;
  termMonths: number;
  rateFactor: number;
}

export interface ParseResult {
  program: string | null;
  /** ISO calendar dates (YYYY-MM-DD), never timestamps: these are date ranges. */
  effectiveFrom: string | null;
  effectiveTo: string | null;
  factors: ParsedFactor[];
  warnings: string[];
  /**
   * Free-text lines below the rate ladder — e.g. "These are FMV leases with a
   * $1.00 BuyBack of the lease rights at the end of the Term."
   *
   * Captured rather than discarded: it states the lease type and the buyout
   * terms, which belong on the documents these rates price.
   */
  notes: string[];
  /** Numeric-looking cells that failed validation. Footnotes do not count. */
  skipped: number;
}

export type SourceFormat = 'matrix' | 'flat';
