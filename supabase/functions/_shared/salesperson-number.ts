/** Resolve the salesperson number used for branch matching. */
export function salespersonNumberFrom(
  ...propSets: (Record<string, unknown> | undefined | null)[]
): string | null {
  for (const props of propSets) {
    const value = props?.sales_rep_number;
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  for (const props of propSets) {
    const value = props?.salesperson__;
    const text = typeof value === 'number' ? String(value) : value?.trim();
    if (typeof text === 'string' && /^\d{4}$/.test(text)) return text;
  }
  return null;
}