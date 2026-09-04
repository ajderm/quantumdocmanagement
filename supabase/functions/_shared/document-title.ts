/**
 * Applying a portal's own name for a document to the printed heading.
 *
 * A dealer's word for a document is not ours: Eakes calls the equipment
 * quotation a Lease Agreement. The rename is stored per portal and travels in
 * the render payload as `document.title`, so one published template serves
 * every portal and each still prints its own heading.
 *
 * Pure so it can be unit-tested outside Deno.
 */

/**
 * The rename to print, or null when the template's own title stands.
 *
 * Only a non-blank string counts. Blank must read as "no rename" rather than
 * as an empty title, or a stray space in the settings field would publish a
 * document with no heading at all.
 */
export function printedTitle(data: unknown): string | null {
  const title = (data as { document?: { title?: unknown } } | null | undefined)
    ?.document?.title;
  if (typeof title !== 'string') return null;
  const trimmed = title.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * The template's blocks with every docTitle heading replaced by `title`.
 *
 * Returns the blocks untouched when there is no rename, so an unrenamed portal
 * prints exactly what it printed before. Non-array input passes through: the
 * renderer already treats a template without blocks as empty, and this is not
 * the place to start rejecting one.
 */
export function retitleBlocks(blocks: unknown, title: string | null): unknown {
  if (!title || !Array.isArray(blocks)) return blocks;
  return blocks.map((block) =>
    block && typeof block === 'object' && (block as { type?: unknown }).type === 'docTitle'
      ? { ...(block as Record<string, unknown>), title }
      : block
  );
}
