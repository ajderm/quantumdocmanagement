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
    if (typeof value === 'number' && Number.isFinite(value)) {
      const text = String(value);
      if (/^\d{4}$/.test(text)) return text;
    } else if (typeof value === 'string' && value.trim() !== '') {
      const text = value.trim();
      if (/^\d{4}$/.test(text)) return text;
    }
  }
  return null;
}