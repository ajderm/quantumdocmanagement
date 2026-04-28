/**
 * Document Font Scale Helper
 *
 * Generates a scoped <style> block that applies a master font-size offset
 * to all `text-[Npx]` Tailwind arbitrary classes inside a preview container.
 *
 * Used by every output document preview so admins can adjust the overall
 * font size from Document Settings without editing each component.
 */

// Pixel sizes currently used across preview components. Keep in sync with
// the audit in src/components/**/*Preview.tsx.
const KNOWN_PX_SIZES = [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24] as const;

export const DEFAULT_FONT_SIZE_OFFSET = 0;

/**
 * Build a CSS string that bumps every `text-[Npx]` class by `offset` pixels,
 * scoped to elements inside `[data-doc-scope="<scopeId>"]`.
 *
 * Result is safe to inject as the children of a <style> tag.
 */
export function buildDocumentFontScaleCss(scopeId: string, offset: number): string {
  if (!offset) return '';
  const safeOffset = Math.max(-4, Math.min(12, Math.round(offset)));
  if (!safeOffset) return '';

  const scope = `[data-doc-scope="${scopeId}"]`;
  const rules = KNOWN_PX_SIZES.map((px) => {
    const next = Math.max(4, px + safeOffset);
    // Escape the brackets for a valid CSS selector matching Tailwind's class name.
    return `${scope} .text-\\[${px}px\\]{font-size:${next}px !important;}`;
  });
  // Also bump the inherited base font-size for elements not using a class.
  rules.push(`${scope}{font-size:calc(1em + ${safeOffset}px);}`);
  return rules.join('\n');
}

/**
 * Convenience: build a deterministic scope id from a document type name.
 */
export function makeDocScopeId(name: string): string {
  return `doc-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}
