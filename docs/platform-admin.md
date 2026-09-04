# Platform admins and document engine modes

## What this is

A **platform admin** is a QBS operator who can switch a document type between
the two generators, in **any** portal where the app is installed:

- `native` — the existing hardcoded form/preview pair
- `template` — the template-driven engine

That capability crosses tenant boundaries, so its authorization is deliberately
stricter than anything else in the app.

Current allowlist (seeded in `platform_admins`, changeable without a redeploy):

- `marko@thequantumleap.business`
- `shawn@thequantumleap.business`

## Why identity is an email, not a HubSpot user id

The app is a HubSpot CRM card, so it receives `portalId` and `userId` as URL
query parameters. Those are supplied by the browser and **any portal user can
edit them**. A HubSpot user id is also portal-scoped, so the same person has a
different id in every portal — it cannot express "this operator, everywhere".

An email address is stable across portals, and HubSpot will verify it for us:
`GET /crm/v3/owners` returns each user's email, and the app already holds an
OAuth token per portal. So `userId -> email` is resolved **server-side** with
the portal's own credentials. No new scopes and no re-consent were needed;
`hubspot-get-owners` already used this endpoint.

## The two tiers

Resolving the email server-side makes the *mapping* trustworthy, but not the
*claim*: the `userId` it started from is still attacker-supplied. Someone in
the portal who knows an operator's numeric id could ask for that mapping. So
the gate is split.

| | Decides | Basis | Endpoint |
|---|---|---|---|
| **Visibility** | whether the panel is offered | HubSpot-resolved email | `platform-admin-verify` |
| **Authority** | whether a mode may change | Supabase session with a confirmed, allowlisted email | `document-engine-mode` |

The forgeable path may decide what the UI shows. It may never decide what is
permitted. `document-engine-mode` re-checks the session on **every** write, so
a tampered client gains nothing — the worst it can do is reveal a settings
panel whose controls the server refuses.

`document-engine-mode` is deployed with `verify_jwt = true`, the only function
in the app that requires one. An anon-key request is a valid JWT with no user
attached, which is how a rep's read is distinguished from an operator's write
without needing two endpoints.

## Sign-in

Email OTP — a six-digit code, not a magic link. The app runs inside a HubSpot
iframe where redirect flows and third-party cookies are unreliable; code entry
is plain fetch calls and completes in place. On Lovable preview surfaces the
session is brokered to the editor by `previewAuthStorage.ts`, so it survives
across those surfaces rather than being trapped in a partitioned iframe.

**Accounts are self-provisioning.** The panel asks the server whether an
address is on the allowlist (`action: 'check-email'`, rate limited) and only
then requests a code; the first successful sign-in creates the account and
confirms the address. Nobody has to create operators by hand in a backend the
app does not control.

That is safe because **account existence confers nothing**. Authority is the
allowlist, re-read from the database on every single write. Someone who calls
Supabase Auth directly, bypassing the pre-check, can create an account for
their own address and will find every mode change refused.

Being a HubSpot super admin in the portal is **not** sufficient and is not
intended to be.

## Audit

Every change and **every refusal** is written to `platform_admin_audit` with
the actor, portal, document type, before/after values, and the reason a denial
was denied. A cross-tenant capability needs its near misses on the record, not
just its successes.

```sql
select created_at, actor_email, outcome, portal_id, document_code,
       from_value, to_value, reason
from platform_admin_audit
order by created_at desc
limit 50;
```

## Tables

All three have RLS enabled with **no policies**, deliberately: they are
reachable only with the service-role key, so a leaked anon key exposes none of
it.

- `platform_admins` — the allowlist. Add or remove a row to change who qualifies.
- `document_engine_modes` — `(dealer_account_id, document_code) -> engine`.
  An absent row means `native`, so an unconfigured portal keeps working.
- `platform_admin_audit` — append-only history.

## Current limitation

`document_engine_modes` is written and read (`useDocumentEngine`), but nothing
yet **branches** on it: the template engine is not wired into document
generation, so every document still renders through the native layout. The
panel says so plainly rather than offering a toggle that appears to do nothing.
When the engine lands, `useDocumentEngine.engineFor(code)` is the one place the
branch goes.

## Deploying this change

```bash
supabase db push                                  # the migration
supabase functions deploy platform-admin-verify
supabase functions deploy document-engine-mode    # verify_jwt = true
```

No accounts need creating: the first sign-in provisions the operator.

One optional setting: an SMTP sender for OTP delivery. Without one, codes go
through the built-in mailer, which is rate limited to a handful per hour —
fine for two operators, worth configuring before it matters.

## Known unrelated weakness

`get-user-access` grants `role: admin, is_admin: true` to **any** unrecognised
`portalId`, with `reason: "no_account_setup"`. That is load-bearing for
first-run onboarding, so it was left alone here, but it means an unknown portal
id currently receives admin-level answers from that endpoint. It should be
revisited when the HubSpot signed-request handshake lands.
