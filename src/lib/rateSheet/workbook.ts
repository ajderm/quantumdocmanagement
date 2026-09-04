/**
 * Spreadsheet adapter: turns an uploaded workbook into raw tabs for the
 * parsers. Kept separate so the layout rules in matrix.ts stay dependency-free
 * and testable without a spreadsheet library.
 *
 * Parsing happens in the browser rather than in an edge function so the admin
 * can see what was understood before anything is stored, and so no binary
 * format handling is needed server-side.
 */

import * as XLSX from 'xlsx';
import type { RateSheetTab } from './types';

/** Worksheets that are documentation rather than rates. */
const IGNORED_TAB = /^(instructions?|readme|notes?|help|cover)$/i;

export function tabsFromArrayBuffer(buffer: ArrayBuffer): RateSheetTab[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  return wb.SheetNames
    .filter((name) => !IGNORED_TAB.test(name.trim()))
    .map((name) => ({
      name: name.trim(),
      // raw:true keeps numbers as numbers, so a rate factor never arrives as
      // a locale-formatted string. blankrows:false keeps spacer rows out.
      rows: XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], {
        header: 1, blankrows: false, defval: '', raw: true,
      }),
    }));
}

export async function tabsFromFile(file: File): Promise<RateSheetTab[]> {
  return tabsFromArrayBuffer(await file.arrayBuffer());
}

/** Extensions the upload accepts. `.xls` matters: real rate cards still ship as it. */
export const ACCEPTED_EXTENSIONS = ['.xls', '.xlsx', '.xlsm', '.csv'] as const;

export function hasAcceptedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
