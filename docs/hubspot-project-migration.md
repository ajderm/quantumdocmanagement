# Moving the HubSpot project into git, and onto a newer platform version

Handoff written from a cloud session that could not reach the HubSpot project
folder, the `hs` CLI, or HubSpot's developer docs. All three work on a local
machine, which is why this work belongs there.

## The three pieces, and which one this is about

Verified against this repository: it contains **no** `hsproject.json`, no
`*-hsmeta.json`, and no app configuration. The HubSpot project is a separate
codebase living on Marko's device.

| Piece | Lives in | Deploys via | Platform version applies? |
| --- | --- | --- | --- |
| HubSpot project — app config, CRM card, scopes | local folder (not in git yet) | `hs project upload` | **yes, this is the 2025.2** |
| Iframe app — the React UI the card embeds | this repo | Lovable → Vercel | no |
| All persisted data | Supabase | migrations in `supabase/migrations` | no |

## What a HubSpot-side deploy can and cannot touch

One client has months of real work in the app. It is not in the blast radius
of anything described here.

**Cannot be reached by a project upload, a GitHub link, or a platform-version
bump** — all of it is Supabase, keyed by `hubspot_portal_id`:

- `dealer_accounts`, `dealer_settings` (tax rate, lender list, document names)
- `document_terms` (their real T&Cs)
- saved quote configurations, `render_templates`, `rendered_documents`

**Can be affected:**

- **The card rendering.** A bad project deploy breaks the iframe. Recoverable
  by redeploying; no data touched.
- **OAuth tokens, only if scopes change.** A refresh token keeps the scopes it
  was granted with, so adding a scope forces the portal to reauthorize. That
  overwrites the `hubspot_tokens` row for that portal and nothing else —
  settings, terms and saved documents are keyed by portal id, which does not
  change.

So the worst realistic outcome of the migration is a broken card for a few
minutes, not lost work.

## Where it goes

Local path: `/Users/macbookpro/Quantum Document Management` (note the spaces --
quote it in shell commands).

Destination: the **Quantum-Business-Solutions** org, not a personal account.
Continuity is the reason: a live client's app configuration on one person's
account is inaccessible the moment that person is.

Stand up a **new private repo**. Suggested name:
`Quantum-Business-Solutions/doccommand-hubspot-project` -- it follows the
org's `<thing>command` convention while saying which of the two codebases it
holds, so it cannot be mistaken for the React app.

Private, not public: this is app configuration for a live client, including
which scopes the app requests.

Do NOT reuse `Quantum-Business-Solutions/doccommand`. It already exists
(private, last pushed 2026-07-21) and is Shawn's version of this app. Worth
noting separately that two divergent codebases exist for one product -- not a
blocker here, but somebody should reconcile them before the wrong one gets
deployed.

Related, and a separate task: **`ajderm/quantumdocmanagement`** -- the React
app this live client actually runs -- is also on a personal account, with the
same continuity problem. GitHub can transfer a repo to an org preserving
history and redirecting the old URL, but Lovable's git connection would need
re-pointing afterwards, so it should not be done in the middle of this
migration.

## Use a separate repository, not the app repo

Lovable commits to `ajderm/quantumdocmanagement`'s `main` branch autonomously. Over a single
afternoon it pushed four commits, re-filed hand-written migrations under its
own generated names, and forced a rebase on every push. The HubSpot project
definition controls a live client's app scopes and CRM cards; putting it where
another tool writes unsupervised invites an outage that is hard to attribute.

Separate repositories also give each piece exactly one deploy target:
GitHub → HubSpot for the project, GitHub → Vercel/Lovable for the UI.

## Order of operations, to keep the live portal running

1. **Git first, deploy nowhere.** Push the folder as it is, still on 2025.2,
   with no HubSpot-side changes. Pure backup: zero risk, and it makes the
   current working state recoverable before anything else happens.
2. **Link GitHub to HubSpot**, but keep deploying the existing way until a
   linked build has succeeded at least once.
3. **Platform upgrade on its own branch**, proven in a developer test portal.
   Not in the client's portal. If no test portal exists, creating one is the
   real first task — step 3 otherwise has nowhere safe to happen.
4. **The client's portal last**, once 2 and 3 are proven.

## Fact-finding to run first

```bash
cd <hubspot project folder>
hs --version
cat hsproject.json          # platform version, project name, components
ls -R . | head -40          # which component types exist
git status 2>&1 | head -3   # already under git?
hs project --help           # subcommands this CLI version offers
```

`hsproject.json` and the component list determine what the platform upgrade
actually involves. Nothing about the 2025.2 → 2026.x delta should be assumed
before reading HubSpot's own migration notes for those two versions —
developers.hubspot.com was unreachable from the cloud session, so that lookup
is still outstanding.

## Open questions

- Is there a HubSpot **developer test portal**? Step 3 depends on it.
- Are the app's current scopes known, and do they include `tickets`? The
  ticket anchor shipped in this repo needs it; `hubspot-get-deal` now returns
  a 403 whose message says exactly this when the scope is absent.

## Where the Eakes build stands

See `docs/platform-admin.md` for the admin/security model. The document engine,
the Eakes lease template and the ticket anchor are in this repo and deployed.
The remaining Eakes work is application-side, not HubSpot-project-side, with
one exception: the CRM card must list **Tickets** as a target object and pass
`objectType=tickets` in the card URL, or the shipped ticket anchor is
unreachable.
