# Document renderer

Turns a **template JSON + a data payload** into a paginated PDF with real,
selectable text. This is the piece the template-driven document engine is built
on, and it is deliberately a standalone service: the app owns templates and
data, this owns pagination and nothing else.

```
POST /render   { template, data, filename? }  ->  application/pdf
GET  /health                                  ->  { ok: true }
```

## Why this exists

The current in-app generator rasterises the DOM with `html2canvas` and slices
the resulting bitmap at page boundaries (`DocumentHub.tsx`,
`generateMultiPagePDF`). That approach cannot:

- repeat a table's column header on continuation pages,
- keep a totals row with the table that produced it,
- produce selectable, searchable, or accessible text,
- place an e-signature field, because there is no text to anchor to.

Here **Chromium does the pagination** and the stylesheet declares the rules.
`src/css.js` is where layout correctness actually lives — in particular
`thead { display: table-header-group }`, `tr { break-inside: avoid }`, and
`.summary { break-before: avoid }`.

## Layout guarantees

Verified on every commit by the corpus below:

| Guarantee | How |
|---|---|
| Column header repeats on every continuation page | `table-header-group` |
| A row never tears across a page | `break-inside: avoid` on `tr` |
| A group heading never ends a page alone | `break-after: avoid` |
| Totals never orphan onto their own page | `break-before: avoid` + assertion |
| Signature block never splits | `.keep` |
| `Page X of Y` on every page | Chromium footer template |
| Letterhead chrome on every page | Chromium header template |
| Text is selectable | asserted via `pdfjs` extraction |

## Running

```bash
npm install
npm test          # 14 unit tests + 20 corpus renders
npm run corpus    # renders the corpus, writes out/*.pdf, prints a report
npm run serve     # http://localhost:8080
npm run raster out/forty-rows.pdf /tmp/x 1,2   # PDF page -> PNG, to eyeball
```

`CHROMIUM_PATH` pins the browser binary; otherwise the resolver looks under
`PLAYWRIGHT_BROWSERS_PATH` and falls back to Playwright's own download.
`RENDER_TOKEN` gates `/render` with a bearer token — set it in any deployment.

## Template shape

```js
{
  name: 'Equipment Quotation',
  page:   { size: 'letter'|'legal'|'a4', orientation, margins: {top,right,bottom,left} },
  chrome: { companyName, lines: [], right: [], footerNote, logoDataUri },
  styles: { fontFamily, fontSize, color, ruleHard, ruleSoft },
  vars:     { taxRate: 0.087 },                       // constants
  computed: { tax: 'round(totals.subtotal * vars.taxRate, 2)' },  // expressions
  blocks: [
    { type: 'docTitle',  title, meta: [{label, value}] },
    { type: 'fieldGrid', title, columns: 2, hideEmpty: true, fields: [{label, value}] },
    { type: 'table',     bind: 'line_items', groupBy: 'site', subtotalPerGroup: true,
                         maxRows: 100, columns: [{key, label, align, width, format}] },
    { type: 'summary',   rows: [{label, expr, bold, rule}] },
    { type: 'richText',  title, html },
    { type: 'signature', title, signers: [{label, sublabel}] },
    { type: 'pageBreak' }, { type: 'spacer', height: 12 },
  ],
}
```

Tokens are `{{ dotted.path | formatter:arg }}`. Formatters: `text`, `currency`,
`number`, `percent`, `rate`, `date` (`long`/`medium`/`short`), `upper`.

`totals.subtotal`, `totals.qty` and `totals.count` are computed from bound
collections before any expression or token is evaluated, so a number is derived
exactly once. `resolve()`'s output is the only thing the HTML layer sees — that
boundary exists so preview, PDF, e-sign placement and CRM write-back all consume
one resolved payload and cannot disagree.

## Behaviour worth knowing

- **Absent is not zero.** A missing price renders empty, not `$0.00`, which on a
  customer quote would read as free. An *explicit* `0` still prints.
- **A dangling unit is empty.** With `hideEmpty`, `"{{lease.term}} months"`
  against a null term drops the whole field rather than printing ` months`.
- **Bare dates do not shift.** `2026-09-30` formats as September 30 in every
  timezone; it is treated as a calendar date, not an instant.
- **Templates are untrusted.** Expressions run through a hand-rolled
  shunting-yard evaluator (`src/expr.js`) — no `eval`, no `new Function`. Rich
  text is reduced to an inline formatting subset with all attributes stripped.
- **Row limits report, not truncate.** Past `maxRows` the document says how many
  line items are not shown and the response carries a warning.

## Corpus

`test/corpus.js` holds 16 cases (20 renders) chosen to break the layout engine
rather than to look good: an empty table, a row taller than a full page, counts
sweeping the page-1 boundary (22–26), 250 rows, six groups of one, one group of
sixty, null tokens, a 90-character customer name, row-limit overflow,
legal/landscape, and a terms entry containing `<script>`.

Two defects were found this way and neither was visible at nine rows: table rows
render at 19.75px rather than 19 (a 1px collapsed border compounding to ~15px
over 20 rows), and a `NaN` sentinel check that matched "fi**nan**ced". Real
documents would have caught neither.
