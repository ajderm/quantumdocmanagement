// Shared per-case verification, used by both the report tool (`npm run corpus`)
// and the test suite (`npm test`), so the two can never drift apart.

import { writeFile } from 'node:fs/promises';
import { render } from '../src/render.js';
import { inspectPdf, headerRepeat, measureOverflow } from './verify.js';

const ROW_MARKER = /imageRUNNER|bizhub|Ricoh IM|AltaLink|LaserJet|BP-70C31|Finisher|Cassette|FAX Board|Paper Deck|Staple|Card Reader|Copy Tray|Waste Toner/;

export async function checkCase({ id, why, template, data, expect, outDir }) {
  const failures = [];
  const { pdf, warnings, html, ms } = await render(template, data, { wantHtml: true });
  if (outDir) await writeFile(new URL(`${id}.pdf`, outDir), pdf);
  const info = await inspectPdf(pdf);
  const all = info.texts.join('\n');
  // pdfjs extracts rendered glyphs, so anything CSS uppercases (section heads)
  // comes back uppercased. Text assertions therefore compare case-insensitively.
  const allU = all.toUpperCase();

  if (expect.minPages && info.pages < expect.minPages) {
    failures.push(`pages ${info.pages} < min ${expect.minPages}`);
  }
  if (expect.maxPages && info.pages > expect.maxPages) {
    failures.push(`pages ${info.pages} > max ${expect.maxPages}`);
  }
  // Every document must contain real, extractable text — the old rasterised
  // pipeline would score zero here.
  if (all.replace(/\s/g, '').length < 200) {
    failures.push(`only ${all.replace(/\s/g, '').length} extractable text chars`);
  }
  for (const s of expect.mustContain ?? []) {
    if (!allU.includes(s.toUpperCase())) failures.push(`missing text: ${JSON.stringify(s)}`);
  }
  // Sentinels like "NaN"/"null" are literal leakage artifacts, so they are
  // matched case-sensitively and on word boundaries — folding case would make
  // "NaN" match "fiNANced", which is how this check first cried wolf.
  for (const s of expect.mustNotContain ?? []) {
    const isWord = /^[A-Za-z][A-Za-z0-9]*$/.test(s);
    const hit = isWord
      ? new RegExp(`\\b${s}\\b`).test(all)
      : all.includes(s);
    if (hit) failures.push(`forbidden text present: ${JSON.stringify(s)}`);
  }
  if (expect.headerRepeatsEveryTablePage) {
    const label = (template.blocks.find((b) => b.type === 'table').columns
      .find((c) => c.label === 'Description') ?? { label: 'Description' }).label;
    const hr = headerRepeat(info, label, ROW_MARKER);
    if (hr.pagesWithHeader < hr.pagesWithRows) {
      failures.push(`column header on ${hr.pagesWithHeader}/${hr.pagesWithRows} table pages`);
    }
  }
  if (expect.landscape) {
    const s = info.sizes[0];
    if (!(s.w > s.h)) failures.push(`not landscape: ${s.w}x${s.h}in`);
  }
  if (expect.warnings !== undefined && warnings.length !== expect.warnings) {
    failures.push(`warnings ${warnings.length} != ${expect.warnings}`);
  }
  let overflowPx = null;
  if (expect.noHorizontalOverflow) {
    const m = await measureOverflow(html);
    overflowPx = m.overflowPx;
    if (m.overflowPx > 1) failures.push(`horizontal overflow ${m.overflowPx}px`);
  }
  if (expect.rowsPreserved) {
    const serials = (data.line_items ?? []).map((r) => r.serial);
    const dropped = serials.filter((s) => !all.includes(s));
    const dupes = serials.filter((s) => all.split(s).length - 1 > 1);
    if (dropped.length) failures.push(`${dropped.length} row(s) missing from output`);
    if (dupes.length) failures.push(`${dupes.length} row(s) duplicated in output`);
  }

  // Independent of declared expectations: on a multi-page document the totals
  // block must never be the only thing on the final page. (On a single-page
  // document there is nothing to orphan from.)
  if (info.pages > 1) {
    const last = (info.texts.at(-1) ?? '').toUpperCase();
    const hasTotals = last.includes('TOTAL FINANCED');
    const hasCompany = ROW_MARKER.test(info.texts.at(-1) ?? '');
    const hasProse = last.includes('TERMS & CONDITIONS') || last.includes('ACCEPTANCE');
    if (hasTotals && !hasCompany && !hasProse) {
      failures.push('totals block orphaned on its own page');
    }
  }

  return { id, why, pages: info.pages, kb: Math.round(info.bytes / 1024),
    chars: all.replace(/\s/g, '').length, ms, warnings: warnings.length,
    overflowPx, failures, info };
}
