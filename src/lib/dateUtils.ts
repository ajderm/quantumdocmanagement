// Date helpers that avoid the classic date-only timezone shift.
//
// A bare date-only string ("YYYY-MM-DD") is parsed by `new Date(str)` as
// midnight UTC. Formatting that with `toLocaleDateString` then renders it in the
// viewer's local zone, which for any negative-offset (US) timezone rolls the
// calendar day BACK by one — so a stored "2026-07-20" prints "July 19, 2026".
// These helpers keep the calendar day stable for date-only values while leaving
// genuine timestamps (which SHOULD localize) untouched.

/**
 * Format a date value for display. If it's a date-only string ("YYYY-MM-DD"),
 * it is interpreted in LOCAL time (no UTC shift) so the calendar day is
 * preserved. Anything with a time component / full ISO timestamp keeps normal
 * local conversion. Empty input returns "".
 */
export function formatDateOnly(
  dateString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" },
): string {
  if (!dateString) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString.trim());
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) // local midnight
    : new Date(dateString); // genuine timestamp — localize as before
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", options);
}

/**
 * Today's date as a LOCAL "YYYY-MM-DD" string. Use this for user-facing date
 * defaults instead of `new Date().toISOString().split("T")[0]`, which is UTC and
 * therefore returns tomorrow's date for US users working in the evening.
 */
export function todayLocalDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
