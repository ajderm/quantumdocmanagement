// The print stylesheet. This is where pagination correctness actually lives.
//
// Chromium does the pagination, not us. The previous generation of this app
// rasterised the DOM with html2canvas and sliced the bitmap at page
// boundaries, which is why it could not repeat a table header, keep a totals
// row with its table, or produce selectable text. Everything below is a
// declaration that lets the print engine make those decisions correctly.

const PAGE_SIZES = {
  letter: { w: 8.5, h: 11, css: 'Letter' },
  legal: { w: 8.5, h: 14, css: 'Legal' },
  a4: { w: 8.27, h: 11.69, css: 'A4' },
};

export function pageGeometry(page = {}) {
  const size = PAGE_SIZES[(page.size ?? 'letter').toLowerCase()] ?? PAGE_SIZES.letter;
  const landscape = page.orientation === 'landscape';
  const m = { top: 0.9, right: 0.6, bottom: 0.65, left: 0.6, ...(page.margins ?? {}) };
  return { size, landscape, margins: m };
}

export function buildCss(template) {
  const st = {
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: 9,
    color: '#16181d',
    muted: '#5c6472',
    ruleHard: '#16181d',
    ruleSoft: '#c9ced8',
    groupBand: 'rgba(22,24,29,0.055)',
    ...(template.styles ?? {}),
  };
  const { size, landscape } = pageGeometry(template.page);

  return `
@page { size: ${size.css}${landscape ? ' landscape' : ''}; }

html, body { margin: 0; padding: 0; }
body {
  font-family: ${st.fontFamily};
  font-size: ${st.fontSize}pt;
  line-height: 1.42;
  color: ${st.color};
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
* { box-sizing: border-box; }

/* ---- block rhythm ---------------------------------------------------- */
.block { margin: 0 0 14pt; }
.block:last-child { margin-bottom: 0; }

/* A block that must never be split across a page boundary. */
.keep { break-inside: avoid; page-break-inside: avoid; }

/* ---- document title -------------------------------------------------- */
.docTitle h1 {
  font-size: ${st.fontSize + 2}pt; font-weight: 700; margin: 0 0 4pt;
  letter-spacing: .06em; text-transform: uppercase;
  border-bottom: 1.5pt solid ${st.ruleHard}; padding-bottom: 3pt;
}
.docTitle .meta { display: flex; flex-wrap: wrap; gap: 3pt 22pt; }
.docTitle .meta > div { white-space: nowrap; }
.docTitle .meta .k { color: ${st.muted}; }
.docTitle .meta .v { font-weight: 600; }

/* ---- field grid ------------------------------------------------------ */
.fieldGrid .grid { display: grid; grid-template-columns: repeat(var(--cols, 2), 1fr); gap: 2.5pt 22pt; }
.fieldGrid .f { display: flex; gap: 6pt; align-items: baseline; }
.fieldGrid .f.full { grid-column: 1 / -1; }
.fieldGrid .k { color: ${st.muted}; flex: none; }
.fieldGrid .v { font-weight: 500; }
.sectionHead {
  font-size: ${st.fontSize - 0.5}pt; font-weight: 700; letter-spacing: .08em;
  text-transform: uppercase; border-bottom: 1pt solid ${st.ruleSoft};
  padding-bottom: 2pt; margin: 0 0 5pt;
}

/* ---- tables ---------------------------------------------------------- */
table.grid { width: 100%; border-collapse: collapse; table-layout: fixed; }

/* The single most important line in this file: it makes the column header
   reappear at the top of every continuation page. */
table.grid thead { display: table-header-group; }

table.grid th {
  border-bottom: 1.5pt solid ${st.ruleHard};
  text-align: left; padding: 2pt 3pt 4pt; font-weight: 700;
  font-size: ${st.fontSize - 0.5}pt; line-height: 1.35;
}
table.grid td {
  border-bottom: .75pt solid ${st.ruleSoft};
  padding: 2pt 3pt; vertical-align: top; line-height: 1.35;
}
/* A row with a long description must move to the next page whole rather than
   tear in half. */
table.grid tr { break-inside: avoid; page-break-inside: avoid; }
table.grid .num { text-align: right; font-variant-numeric: tabular-nums; }
table.grid .ctr { text-align: center; }

table.grid tr.group td {
  background: ${st.groupBand}; font-weight: 700;
  font-size: ${st.fontSize - 0.5}pt; letter-spacing: .05em; text-transform: uppercase;
  padding: 3pt; border-bottom: .75pt solid ${st.ruleSoft};
}
/* Keep a group heading with the first rows underneath it. */
table.grid tr.group { break-after: avoid; page-break-after: avoid; }
table.grid tr.groupSub td { font-weight: 700; border-bottom: 1.5pt solid ${st.ruleHard}; }
table.grid tr.empty td { color: ${st.muted}; font-style: italic; }
.tableOverflow { margin-top: 4pt; font-size: ${st.fontSize - 1}pt; color: ${st.muted}; font-style: italic; }

/* ---- summary --------------------------------------------------------- */
/* break-before:avoid asks the engine to keep the totals with the table that
   produced them, so a total never lands alone on a trailing page. */
.summary { display: flex; justify-content: flex-end; break-before: avoid; page-break-before: avoid; }
.summary .box { width: 2.9in; }
.summary .r { display: flex; justify-content: space-between; gap: 12pt; padding: 1.5pt 0; border-bottom: .75pt solid ${st.ruleSoft}; }
.summary .r:last-child { border-bottom: 0; }
.summary .r.rule { border-bottom: 0; border-top: 1.5pt solid ${st.ruleHard}; margin-top: 1.5pt; padding-top: 3pt; }
.summary .r.bold { font-weight: 700; font-size: ${st.fontSize + 0.5}pt; }
.summary .v { font-variant-numeric: tabular-nums; }

/* ---- prose ----------------------------------------------------------- */
.richText .body { font-size: ${st.fontSize - 1}pt; line-height: 1.5; color: ${st.muted}; }
.richText .body p { margin: 0 0 4pt; }
.richText .body p:last-child { margin-bottom: 0; }
.richText .body strong { color: ${st.color}; }
.richText .body ol, .richText .body ul { margin: 0 0 4pt; padding-left: 14pt; }

/* ---- signature ------------------------------------------------------- */
.signature .cols { display: flex; gap: 26pt; }
.signature .cols > div { flex: 1; }
.signature .line { border-bottom: 1pt solid ${st.ruleHard}; height: 20pt; }
.signature .cap { font-size: ${st.fontSize - 1.5}pt; color: ${st.muted}; margin-top: 2pt; }

.pageBreak { break-after: page; page-break-after: always; }
`.trim();
}

/** Chromium's header/footer templates are rendered in an isolated document:
 *  they inherit no page CSS and default to 0 font-size, so every style has to
 *  be inline and every length absolute. */
export function buildHeader(template, chrome = {}) {
  const st = template.styles ?? {};
  const font = st.fontFamily ?? 'Arial, Helvetica, sans-serif';
  if (chrome.suppress) return '<div></div>';

  // Sizes are in px because a header template is a separate document that
  // inherits no page CSS. The px-to-point conversion is what matters here and
  // is easy to get wrong: 9px is 6.75pt, which on paper is smaller than the
  // fine print. These values are chosen as points and converted, so the
  // letterhead reads at the size a letterhead should.
  const pt = (points) => `${(points * (96 / 72)).toFixed(1)}px`;
  const NAME_PT = 11.5;
  const LINE_PT = 8;
  const REF_PT = 8;

  // A logo must be a data URI: Chromium's header template does not reliably
  // load external images, so a plain URL silently renders nothing.
  const logo = chrome.logoDataUri
    ? `<img src="${chrome.logoDataUri}" style="height:${pt(20)};display:block;margin-bottom:3px">`
    : '';
  const name = chrome.companyName
    ? `<div style="font-weight:700;font-size:${pt(NAME_PT)};letter-spacing:.01em;color:#16181d;line-height:1.25">${esc(chrome.companyName)}</div>`
    : '';
  const lines = (chrome.lines ?? []).map(
    (l) => `<div style="font-size:${pt(LINE_PT)};color:#5c6472;line-height:1.35">${esc(l)}</div>`).join('');
  const right = (chrome.right ?? []).map(
    (l) => `<div style="font-size:${pt(REF_PT)};color:#5c6472;line-height:1.35">${esc(l)}</div>`).join('');

  return `<div style="width:100%;font-family:${font};padding:0 0.6in;box-sizing:border-box;
    display:flex;justify-content:space-between;align-items:flex-start;
    border-bottom:0.75px solid #c9ced8;padding-bottom:5px;">
    <div>${logo}${name}${lines}</div>
    <div style="text-align:right">${right}</div></div>`;
}

export function buildFooter(template, chrome = {}) {
  const font = template.styles?.fontFamily ?? 'Arial, Helvetica, sans-serif';
  const note = chrome.footerNote ? esc(chrome.footerNote) : '';
  // 9.3px is 7pt — small, as a footer should be, but still legible in print.
  return `<div style="width:100%;font-family:${font};font-size:9.3px;color:#5c6472;
    padding:0 0.6in;box-sizing:border-box;display:flex;justify-content:space-between;align-items:flex-end;">
    <span>${note}</span>
    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`;
}

export function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
