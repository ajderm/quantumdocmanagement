# The document engine: what it is, and what not to "fix"

Written for another session picking up work on document types, previews and
renders. Several things in here look like bugs and are deliberate, with the
reason recorded. Read the landmines before changing behaviour.

## What we were trying to accomplish

The app generated documents by rasterising React DOM to PDF (`html2canvas` +
`jsPDF`). That works for a fixed one-pager and fails for Eakes, whose documents
carry an equipment table of unknown length: page breaks landed mid-row, headers
did not repeat, and content ran under the footer.

The goal was a **template-driven renderer** that paginates correctly, where a
document's layout is data in the database rather than JSX — so a dealer's own
paperwork can be reproduced without a code change, and a document type can be
switched over one at a time instead of in a big-bang rewrite.

Eakes Office Solutions (portal `43692327`) is the first tenant. Their signed
Lease Agreement is the reference document.

## Three layers, three deploy targets

| Layer | Path | Deploys via |
| --- | --- | --- |
| React app (the HubSpot CRM card iframe) | `src/` | Lovable → Vercel |
| Edge functions | `supabase/functions/` | Lovable → Supabase |
| **Renderer — a separate service** | `renderer/` | GitHub → its own Vercel project |

`renderer/` is not part of the app bundle. It is a standalone Node service with
its own `package.json`, deployed as its own Vercel project rooted at
`renderer/`, and reached over HTTP with a bearer `RENDER_TOKEN`.
`generate-document` is its **only** caller. Changing renderer code does nothing
until that Vercel project redeploys.

## Two engines, per document type

`document_engine_modes` holds a mode per document code; `useDocumentEngine()`
exposes `engineFor(code)` returning `'native' | 'template'`.

- **`native`** — the original `generateMultiPagePDF` path. Still used by
  **13 of 14** document types.
- **`template`** — `generate-document` → renderer. Currently **only `quote`**.

So "the new doc types are broken" is usually one of: the type is still on
`native` and was never converted; or it is on `template` with no published
template row, which returns a 409 telling you to publish one.

## Landmines

### The preview is HTML, not a PDF. On purpose.

Chrome refuses to run its PDF viewer inside a **sandboxed iframe**, which is
what HubSpot serves this app in. An inline `blob:` PDF preview cannot load
there however it is built — it renders a browser error page.

So `handlePreview` sends `format: 'html'`, the renderer returns the markup the
PDF is printed from, and the app shows it via `srcDoc` with `sandbox=""`.
Same content, wording and totals as the PDF; it reflows to the viewport rather
than paginating, which is why the label points at the download for exact page
breaks.

**Do not "fix" this back to a blob-URL PDF iframe.** It was that, and it failed
in production.

### Absence is tracked separately from value, and firstNonZero inverts the rule

In `renderer/src/expr.js` an unresolvable reference evaluates to `0`. That is
deliberate — arithmetic must never throw on a document. But `0` and "missing"
are different things on customer paperwork: a missing rate factor printing
"Monthly payment $0.00" reads as free.

So `renderer/src/resolve.js` keeps a separate `absent` set, and a computed
value built from anything absent renders blank rather than `$0.00`.

`firstNonZero(a, b)` exists to fall back, so it needs the opposite rule: it is
missing only when **every branch** is. `coalesceBranches()` splits the top-level
arguments and each branch is judged by the ordinary rule.

**This caused two real bugs, both of which printed or erased a total:**

- `grand` vanished whenever no tax rate was set, because it was built from the
  tax line.
- `total_monthly` did the same, later, for the same reason.

Both are now `firstNonZero(<with>, <without>)`. **If a total disappears from a
document, look here first.** If a `$0.00` appears where a value is merely
absent, look here too.

### Eakes' tax is on the monthly payment, not the equipment subtotal

Verified to the cent against their signed Cornerstone Bank agreement
(4/24/2026) and the Hometown worksheet:

```
Equipment Total 4,391.84  x  rate 0.019980  =  87.75   base monthly
87.75  x  7% sales tax                      =   6.14   monthly tax
                                               93.89   total monthly
```

Two earlier versions of this template were wrong: tax was applied to the
equipment subtotal, and the payment was derived from a tax-inclusive grand
total. Both are corrected and **locked by a test** in
`renderer/test/unit.test.js` ("Eakes' own payment arithmetic, to the cent").

Their bank worksheet uses a *different* tax base — `(Equipment Total − admin
fee) × 7%` = 303.58, also verified — so the two are genuinely not the same
calculation. Do not unify them.

The 7% is not a guess: their Hometown worksheet states "Sales Tax Rate = 7%"
and the CLT sheet "Tax Rate 7.00%". It is seeded per portal, not hardcoded —
an earlier template carried an invented 8.7%.

### Line classification defaults to SHOWING

`classifyLine()` in `src/lib/render/payload.ts` returns:

- `suppressed` — name matches chart/zone. Neither listed nor counted.
- `nonTaxable` — name matches buyout/rollover/knockout. Counted, never listed.
- `equipment` — **everything else.** Listed and taxable.

An earlier version keyed off `hs_sku` absence, because every hidden line on the
reference deal has a null SKU. That is true and still the wrong rule: **every
line a rep types by hand also has no SKU**, so it silently dropped real
equipment off customer paperwork. Hiding equipment is invisible and
unrecoverable; showing a line that should have been hidden is neither.

### Totals come from `amounts.*`, not `totals.subtotal`

`totals.subtotal` is derived by the renderer from the table's own rows, so it
only ever knew about lines it could see. Since buyouts are counted without
being listed, the template reads `amounts.taxable`, `amounts.non_taxable` and
`amounts.total` from the payload instead.

`amounts.non_taxable` is **null, not 0**, when there are none, so its row
disappears rather than asserting an empty claim on paperwork the bank
reconciles.

### Exhibit A carries no pricing

`RenderLineItem` has `unit` and `extended` because the taxable total derives
from them — but no customer-facing column may bind them. Their signed Exhibit A
reads Qty / Make & Model / Serial / Initial Meter / Location. The Amount column
exists only on their internal CLT input sheet.

The rate factor is also off the customer page; it belongs on the Hometown
worksheet.

### Terms are the dealer's, never the template's

An early template shipped four paragraphs of plausible-sounding legal prose
written by its author, on a page a customer signs. Terms now come from
`document_terms` (per lease program, with a per-document override winning), and
the `richText` block carries `hideEmpty: true` so the section is **omitted**
when a dealer has entered none. Text from a settings field is escaped on the
way to HTML.

Eakes' real terms (page 2 of their signed agreement, "Version 260123") are
seeded for their portal only.

## Deploy order matters: app BEFORE migration

A partial unique index permits one published `render_templates` row per
(dealer, document_code), and each seed migration unpublishes the previous
version in the same transaction. Current published version for `quote` is
**v6** (`20260909140000_eakes_real_lease_document.sql`).

v5 and v6 read payload fields (`amounts.*`, `dealer.tax_rate`, `terms.html`)
that **only a newer app build sends**. Applying the migration before
republishing the app makes every total on the document resolve to nothing.

Correct order: renderer (Vercel, automatic) → edge functions → **republish the
app** → apply migrations.

## Tests, and what each one protects

```bash
npm run test:all                 # 25 edge-function + 66 lib tests
cd renderer && npm test          # 41 unit + render tests
cd renderer && npm run corpus    # 20 renders, pagination assertions
cd renderer && npm run test:parity  # both browser drivers, expect 0.000pt
```

The corpus is the pagination regression suite: boundary sweeps at 22–26 rows, a
row taller than a page, 40/100/250 rows, grouping variants, a row-limit
overflow, legal/landscape, and hostile terms content. **Run it after any change
to `renderer/src/css.js`, `html.js` or `resolve.js`** — table row height is
1px-sensitive, and a collapsed-border regression once compounded ~15px over 20
rows and pushed content under the footer while looking fine at 9 rows.

`test:parity` compares glyph positions across Playwright and Puppeteer. It
catches a change that renders correctly on one driver and not the other.

## Genuinely unfinished

- **13 document types still on `native`.** Nobody has confirmed which ones
  Eakes actually uses; if it is two, the remaining scope is two, not thirteen.
- **No Exhibit A / Letter of Instruction pagination.** Their document is a
  four-page packet; the template currently renders the first page's content plus
  terms. The letter's six clauses are in the source PDF, extracted but not built.
- **Rate differential formula unknown.** Its position in the bank worksheet is
  known and one worked example exists ($67.80); the derivation is not shown.
- **Rate sheet parser** reads both money-rate sets and labels them
  `street`/`bank` (see `src/lib/rateSheet/matrix.ts`), but nothing consumes the
  bank rate yet.
- **CPC volumes and overage rates** are fetched but always null — they need a
  QuoteIQ writeback that does not exist.

## Where the numbers came from

`/root/.claude/uploads/` in the originating session held nine Eakes PDFs and
three spreadsheets. Three times during that session something was declared
"blocked on the client" that was in fact in a file already shared — the terms,
the tax rate, and the bank worksheet — each time because only page 1 of a
multi-page PDF or the first tab of a workbook had been read. If something seems
missing, read the whole file before concluding it is.
