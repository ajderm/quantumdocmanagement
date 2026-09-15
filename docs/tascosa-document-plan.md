# Tascosa: outstanding document work, and how to ship it beside Eakes

Written 15 Sep 2026 for whoever picks up Tascosa (portal `244111826`) while the
Eakes conversion (portal `43692327`) is still in flight. Read
`docs/document-engine.md` first — this plan assumes its landmines.

Sources: the last 10 Tascosa weekly calls (2 Jun → 3 Sep 2026) and Stephen
Ross's email of 8 Sep (required-document list) and 9 Sep (samples + client
survey form).

## 1. Already shipped — do not rebuild

Every one of these came out of the calls and is in `main` today:

| Ask | Call | Where |
| --- | --- | --- |
| Quote date one day early | 21 Jul | `src/lib/dateUtils.ts` |
| Additional costs zeroes reverting to defaults | 28 Jul | `CommissionForm` `restoreText` |
| Additional Costs section on the quote page | 28 Jul | `QuoteAdditionalCosts.tsx` |
| Negative-commission warning / block | 28 Jul, 16 Jun | `commissionCalc.ts`, `handleGeneratePDF` |
| Confirmation dialogs on every delete | 28 Jul | `useConfirm.tsx` |
| Packet includes in-app generated documents | 28 Jul | `compile-document-packet` |
| Rep-editable lease rate (bidirectional rate ↔ payment) | 11 Aug | `pricing.ts`, commit `6526a25` |
| Default lease terms, backend-configurable | 26 Aug, 3 Sep | `dealer_settings.default_terms`, `07f6539` |
| "Financing provided by" off by default | 26 Aug | `cc87a46` |
| Lease buyout included in Total Cost | 3 Sep | `e7d613b` |
| Manually-keyed buyout total included in Total Cost | 3 Sep | `f461c16` |
| Service agreement billing-period selector | 16 Jun | `serviceBillingPeriod` |

## 2. Outstanding — the real backlog

### 2.1 Four document types Tascosa does not have

Stephen's 8 Sep email lists what must exist per sale. Mapping it against
`ALL_FORM_TYPES`:

| Required doc | Status |
| --- | --- |
| Quote | exists |
| Signed Install Report | exists (`installation`) |
| Signed Maintenance Contract *(conditional)* | exists (`service_agreement`) |
| Signed Lease/Rental Contract *(conditional)* | exists (`fmv_lease` / `lease_funding`) |
| Credit Approval / Funding docs *(conditional, lease only)* | exists (`lease_funding`) |
| **Invoice** | **missing** |
| **Configuration Sheet** | **missing** |
| **Network Survey** | **missing** |
| **Customer Contact Form** | **missing** — `new_customer` is an application, not this |

Samples for these are in the shared Google Drive (Stephen, 9 Sep). Build them as
**template-engine documents**, not new React preview components — that is what
the engine exists for, and it keeps them out of the `native` rasteriser.

### 2.2 Required-documents checklist

From the 3 Sep call: a per-deal checklist tracking which required documents are
present, with date stamping. Two lists, driven by transaction type:

- **Lease/Rental:** Invoice, Quote, Configuration Sheet, Signed Install Report,
  Network Survey, Customer Contact Form, + conditional Signed Maintenance
  Contract, Signed Lease/Rental Contract, Credit Approval / Funding docs.
- **Purchase:** the same first six, + conditional Signed Maintenance Contract,
  Signed Quote or Customer PO.

Conditional items must be skippable with a reason ("not all take the service
agreement") rather than blocking. Nothing like this exists in the codebase today
(`grep -i checklist` returns nothing).

### 2.3 Client survey / inbound qualification questionnaire

Attached to Stephen's 9 Sep email; originally agreed 18 Aug. Reps fill it per new
opportunity. This is most likely a **HubSpot-side** artifact (property group or
form on the deal), not a document in this app — confirm with Stephen before
building it here.

### 2.4 Smaller, unverified

Raised on calls, not confirmed fixed — verify before quoting work: serials into
every document (the Eakes session is doing this now, see §4), meter method
carrying into install docs, ITT document billing the originating dealer and
showing equipment cost, deal last-modified stamp on in-app activity.

## 3. Why this is safe to do beside Eakes

Isolation is real and already enforced at the data layer:

- `document_engine_modes` is keyed **`(dealer_account_id, document_code)`**.
  Turning a document type onto the template engine for Tascosa cannot move Eakes.
- `render_templates` permits one published row per **`(dealer, document_code)`**.
  Tascosa templates are separate rows from Eakes templates.
- Eakes is currently `template` on `quote` (v6) plus `loi`, `lease_funding` and
  `installation`; everything else, for everyone, is still `native`.

**The precedent to respect:** `20260911090000_fix_eakes_template_portal_leak.sql`
and the two `tidy_leaked_quote_templates` migrations exist because a seed
migration once published templates without scoping them to a dealer, and they
surfaced in other portals. **Every Tascosa seed migration must filter on
`da.hubspot_portal_id = '244111826'`**, the same way the Eakes ones filter on
`43692327`.

### What is genuinely shared — change with care

`renderer/src/*` (`expr.js`, `resolve.js`, `css.js`, `html.js`),
`src/lib/render/payload.ts` and `classifyLine()` are **one codebase for all
tenants**. A Tascosa-driven change here can break Eakes' signed-agreement
arithmetic. Rules:

1. Prefer expressing a difference as **template data**, not renderer code.
2. If renderer code must change, run the full suite before pushing:
   `npm run test:all`, then in `renderer/`: `npm test`, `npm run corpus`,
   `npm run test:parity`. The corpus is the pagination regression suite and is
   1px-sensitive.
3. Never touch the Eakes tax arithmetic locked by
   "Eakes' own payment arithmetic, to the cent" in `renderer/test/unit.test.js`.

## 4. Coordination with the in-flight Eakes work

`.lovable/plan/three-changes-from-the-client-call-2026-09-14.md` has the Eakes
session editing **`src/components/quote/QuoteForm.tsx`** right now, to pre-fill
the lease section from the deal's QuoteIQ values — provider, **term**, lease
type, **payment**, locked-for-term.

That lands on the same code paths as Tascosa's `pickDefaultTerms()` (the backend
default-terms setting) and the `rateOverrides` / `paymentOverrides` pair. Agree
the precedence before either side edits, or the last writer silently wins:

> **Proposed precedence for selected term and payment:**
> saved config → deal (QuoteIQ) pre-fill → portal default terms → first three
> terms the funder offers. A manual edit always wins and is never overwritten.

This is consistent with both plans ("a manual edit always wins", and default
terms only applying when nothing else has chosen). It needs one line of
agreement, not a redesign.

## 5. Sequence

1. **Agree the term/payment precedence above** with the Eakes session. Blocking
   for anything touching `QuoteForm`'s lease section; nothing else waits on it.
2. **Confirm scope with Stephen** — the four new documents against the Drive
   samples, and whether the client survey belongs in HubSpot rather than here.
3. **Build the four documents as Tascosa-scoped template rows.** One document
   type at a time: seed the template, flip `document_engine_modes` for
   `244111826` only, verify, move on. No renderer code changes expected.
4. **Build the checklist** once the document codes exist, so it has something to
   check against. Transaction-type driven, conditional items skippable.
5. **Verify §2.4** and fold whatever is genuinely outstanding into the queue.

## 6. Deploy order — getting this wrong blanks totals

From `docs/document-engine.md`, and it has already bitten once:

> renderer (its own Vercel project) → edge functions → **republish the app** →
> apply migrations.

A template seeded before the app that sends its payload fields is published will
render every total as nothing.
