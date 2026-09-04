/**
 * Rate-sheet ingestion entry point.
 *
 * Detects which of the supported layouts a file uses and normalizes it to one
 * shape. Dealers send whatever their funding partner publishes: the Eakes
 * cards are `.xls` cross-tab matrices, while the app's original import
 * expected a flat CSV. Both are accepted rather than asking anyone to
 * re-key 392 numbers by hand.
 */

// Value imports carry explicit .ts extensions so the pure parsers stay
// loadable by bare node for unit tests; Vite and tsc both accept them
// (allowImportingTsExtensions).
import type { ParseResult, SourceFormat } from './types.ts';
import { parseRateMatrix } from './matrix.ts';
import { parseFlatCsv } from './flat.ts';
import { tabsFromArrayBuffer, hasAcceptedExtension } from './workbook.ts';

export * from './types.ts';
export { parseRateMatrix, parseEffectiveRange } from './matrix.ts';
export { parseFlatCsv } from './flat.ts';
export { parseCsv } from './csv.ts';
export { hasAcceptedExtension, ACCEPTED_EXTENSIONS, tabsFromFile } from './workbook.ts';

export interface Ingested extends ParseResult {
  format: SourceFormat;
  fileName: string;
}

/**
 * A flat CSV is recognised by its header row, not by extension: some partners
 * publish the flat layout with an .xls extension and vice versa.
 */
function looksFlat(firstLine: string): boolean {
  const lower = firstLine.toLowerCase();
  return /term|month/.test(lower) && /rate|factor/.test(lower);
}

export async function ingestRateSheet(file: File): Promise<Ingested> {
  const fileName = file.name;
  if (!hasAcceptedExtension(fileName)) {
    return {
      format: 'flat', fileName, program: null, effectiveFrom: null, effectiveTo: null,
      factors: [], notes: [], skipped: 0,
      warnings: [`Unsupported file type. Upload a .xls, .xlsx, .xlsm or .csv file.`],
    };
  }

  if (fileName.toLowerCase().endsWith('.csv')) {
    const text = await file.text();
    return { ...parseFlatCsv(text), format: 'flat', fileName };
  }

  const buffer = await file.arrayBuffer();
  const tabs = tabsFromArrayBuffer(buffer);

  // A workbook can still hold the flat layout on its first sheet.
  const firstRow = (tabs[0]?.rows[0] ?? []).map((c) => String(c ?? '')).join(',');
  if (looksFlat(firstRow)) {
    const asCsv = (tabs[0]?.rows ?? [])
      .map((r) => r.map((c) => {
        const s = String(c ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(','))
      .join('\n');
    return { ...parseFlatCsv(asCsv), format: 'flat', fileName };
  }

  return { ...parseRateMatrix(tabs), format: 'matrix', fileName };
}
