/**
 * The sales rep's phone number for documents.
 *
 * The number printed on a quote is the one the dealer entered in Settings
 * (Admin -> Commission users -> Phone), never HubSpot's owner record. HubSpot
 * owner phones are frequently blank, or carry a main-office number that is
 * wrong on a rep's paperwork, and a dealer cannot correct them from this app.
 * Settings is the field they can edit, so Settings is the source of truth.
 *
 * Matching is deliberately two-stage. Rows added from the HubSpot owners list
 * carry `hubspot_user_id`; rows a dealer typed in by hand carry an empty one
 * (AdminSettings adds them with `hubspot_user_id: ""`). Matching on the id
 * alone therefore resolved a phone for some reps and silently not for others,
 * with nothing on screen to tell them apart — so a name match backs it up.
 *
 * The caller is responsible for passing only rows belonging to the current
 * portal's dealer account; this function does no scoping of its own.
 */

export interface RepPhoneRow {
  hubspot_user_id?: string | number | null;
  hubspot_user_name?: string | null;
  phone?: string | null;
}

export interface OwnerIdentity {
  id?: string | number | null;
  /** HubSpot returns the app-user id separately from the owner id on some records. */
  userId?: string | number | null;
  firstName?: string | null;
  lastName?: string | null;
}

const asKey = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());

/** Collapse internal whitespace and case so "Stephen  ROSS" matches "stephen ross". */
const normalizeName = (v: unknown): string =>
  asKey(v).replace(/\s+/g, ' ').toLowerCase();

/**
 * The rep's phone from the dealer's commission-user settings, or null when the
 * dealer has not given one. An empty or whitespace-only phone is null, not "",
 * so callers can treat absence uniformly.
 */
export function resolveRepPhone(
  rows: RepPhoneRow[] | null | undefined,
  owner: OwnerIdentity | null | undefined,
): string | null {
  if (!rows?.length || !owner) return null;

  // Only rows that actually carry a number are candidates. A dealer can have
  // two rows for the same rep — one from the owners list with no phone, one
  // typed in with the phone — and the question being asked is "what is this
  // rep's number", so a row without one must not shadow a row with one.
  const candidates = rows.filter((r) => asKey(r.phone));
  if (!candidates.length) return null;

  // Prefer the id: it survives a rep being renamed.
  const ownerId = asKey(owner.userId) || asKey(owner.id);
  if (ownerId) {
    const byId = candidates.find((r) => asKey(r.hubspot_user_id) === ownerId);
    if (byId) return asKey(byId.phone);
  }

  // Fall back to the name, for rows a dealer typed in without an id.
  const ownerName = normalizeName(`${owner.firstName ?? ''} ${owner.lastName ?? ''}`);
  if (ownerName) {
    const byName = candidates.find((r) => normalizeName(r.hubspot_user_name) === ownerName);
    if (byName) return asKey(byName.phone);
  }

  return null;
}
