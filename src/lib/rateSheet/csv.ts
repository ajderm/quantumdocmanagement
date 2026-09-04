/**
 * RFC4180-shaped CSV reader.
 *
 * The previous implementation was `line.split(',')`, which silently corrupts
 * any row containing a quoted comma — "Cornerstone Bank, N.A." shifts every
 * later column by one and lands a company name in a numeric field.
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const endField = () => { row.push(field); field = ''; };
  const endRow = () => { endField(); rows.push(row); row = []; };

  // Strip a UTF-8 BOM, which Excel writes and which otherwise becomes part of
  // the first header name.
  if (text.charCodeAt(0) === 0xfeff) i = 1;

  for (; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ',') { endField(); continue; }
    if (ch === '\r') { if (text[i + 1] === '\n') i++; endRow(); continue; }
    if (ch === '\n') { endRow(); continue; }
    field += ch;
  }
  // A trailing newline should not produce a phantom empty row.
  if (field !== '' || row.length) endRow();
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** Normalize a header cell to a snake_case key. */
export function headerKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}
