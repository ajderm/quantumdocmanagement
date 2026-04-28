// Shared helpers for segmented document font-size adjustments.
// Each Tailwind text-[Npx] class used in document previews maps to one of
// 5 semantic roles. Admins can adjust each role independently from
// Document Settings, in addition to a master offset.

export type FontSizeRole = 'title' | 'header' | 'body' | 'table' | 'fine';

export interface DocumentFontOffsets {
  master?: number;
  title?: number;
  header?: number;
  body?: number;
  table?: number;
  fine?: number;
}

export interface DocumentStyles {
  fontFamily?: string;
  fontColor?: string;
  tableBorderColor?: string;
  tableLineColor?: string;
  /** Master offset applied to every role (legacy, still respected). */
  fontSizeOffset?: number;
  /** Per-role offsets layered on top of the master offset. */
  fontSizeOffsets?: DocumentFontOffsets;
}

// All px sizes used across preview components.
export const KNOWN_DOC_FONT_SIZES = [6, 7, 8, 9, 10, 12, 13, 14, 16, 18, 20, 24] as const;

// Map each base size -> semantic role.
export function roleForSize(px: number): FontSizeRole {
  if (px >= 16) return 'title';
  if (px === 13 || px === 14) return 'header';
  if (px === 12) return 'body';
  if (px === 10 || px === 9) return 'table';
  return 'fine'; // 8, 7, 6
}

export const FONT_SIZE_ROLES: Array<{
  key: FontSizeRole;
  label: string;
  description: string;
  sample: number;
}> = [
  { key: 'title', label: 'Document Title', description: 'Main document headings (e.g. "QUOTE", "Lease Return Letter")', sample: 16 },
  { key: 'header', label: 'Section Headers', description: 'Bold underlined section titles inside documents', sample: 13 },
  { key: 'body', label: 'Body Text', description: 'Paragraphs, signature labels, table column headers', sample: 12 },
  { key: 'table', label: 'Table Rows', description: 'Equipment/line-item rows, dealer header address lines', sample: 10 },
  { key: 'fine', label: 'Fine Print / T&C', description: 'Terms & conditions and footnotes', sample: 7 },
];

/**
 * Build a scoped <style> string overriding every known text-[Npx] Tailwind
 * arbitrary class within `[data-doc-scope="<scopeId>"]` based on the configured
 * master + per-role offsets. Returns "" when no offsets apply.
 */
export function buildDocumentFontCss(scopeId: string, styles?: DocumentStyles): string {
  const master = styles?.fontSizeOffset ?? 0;
  const perRole = styles?.fontSizeOffsets ?? {};
  const anyRoleSet =
    perRole.title || perRole.header || perRole.body || perRole.table || perRole.fine;
  if (!master && !anyRoleSet) return '';

  return KNOWN_DOC_FONT_SIZES.map(n => {
    const roleOffset = perRole[roleForSize(n)] ?? 0;
    const final = Math.max(4, n + master + roleOffset);
    if (final === n) return '';
    return `[data-doc-scope="${scopeId}"] .text-\\[${n}px\\]{font-size:${final}px !important;}`;
  })
    .filter(Boolean)
    .join('');
}

/** Effective px size for a role (used for inline style previews). */
export function effectiveSize(basePx: number, styles?: DocumentStyles): number {
  const master = styles?.fontSizeOffset ?? 0;
  const roleOffset = styles?.fontSizeOffsets?.[roleForSize(basePx)] ?? 0;
  return Math.max(4, basePx + master + roleOffset);
}
