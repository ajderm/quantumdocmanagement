# Three changes from the client call

## 1. Serial numbers editable on Service Agreement and Lease Agreement

**Lease Agreement (Quote tab)**
Each equipment line already carries a serial number pulled from HubSpot, but there is
nowhere to type one. Add a Serial field to the expanded detail area of each line item,
next to Model and Item Number. Typing a serial saves with the rest of the quote and
flows straight onto the printed document (the document layer already reads it).

**Service Agreement**
The Equipment table shows Serial as plain read-only text. Turn that column into an
editable box per row. Values are stored on the Service Agreement's own saved data, so
editing here never overwrites the quote.

Value shown in the box, in order:
1. what the user typed on this Service Agreement
2. the serial on the quote line
3. the serial captured on the installation document (already wired)

The printed Service Agreement uses the same order.

## 2. Lease fields read from the deal

The deal already carries QuoteIQ's values (provider, term in months, lease type,
payment, locked-for-term) and they already reach the app — they are just not used to
fill the form. Pre-fill the lease section on the Quote tab from them:

| Deal value | Fills |
| --- | --- |
| lease_provider | Leasing company |
| lease_term_months | Selected term |
| lease_type | Lease program (FMV / $1 buyout / rental, matched by wording) |
| lease_payment | Payment for that term |
| locked_for_term | New "Locked for term" field in the lease section |

Rules:
- Every pre-filled value stays fully editable — a manual edit always wins and is never
  overwritten afterwards.
- Each auto-filled field gets the existing green "From HubSpot" marker, plus a small
  reset control to go back to the deal's value after an edit.
- Saved work wins over the deal on reopen, matching how the rest of the app behaves.
- A blank or missing value on the deal changes nothing — the field keeps its current
  behaviour (rate-sheet lookup, defaults) rather than going blank or zero.

## 3. Staples options

On the Service Agreement terms:
- Rename the "Paper & Staples" choice to "Staples".
- Exactly two options: **Excludes staples** (default for new agreements) and
  **Includes staples**. All paper wording is removed.
- Remove the separate Drum & Toner selector from the form.
- Update the admin label list so the renamed field shows correctly there too.

Existing saved agreements that hold an old paper value keep displaying it until someone
picks one of the two new options.

## Technical notes

- Files: `src/components/quote/QuoteForm.tsx`, `src/components/service-agreement/ServiceAgreementForm.tsx`
  and `ServiceAgreementPreview.tsx`, `src/lib/formCustomization.ts`, and the Service
  Agreement defaults in `src/pages/DocumentHub.tsx`.
- Service Agreement form data gains `serials: Record<lineItemId, string>`; the preview
  receives it and resolves serial as override → line item → installation config.
- Lease pre-fill reads `deal.quoteiq` (already returned by `hubspot-get-deal` for both
  deal and project anchors); no backend change, no migration, no function redeploy.
- Pre-fill is applied once during the quote form's existing initialization, alongside
  saved-config merging, and tracked per field so later edits are not clobbered.
- Document templates are untouched.
