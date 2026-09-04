// Runtime parity: the container driver (playwright) and the serverless driver
// (puppeteer-core + @sparticuz/chromium) must produce the same document.
//
// They are different Chromium builds, so a font substitution or a metrics
// difference in either would silently change what a customer receives while
// every other test still passed. This compares glyph text and position, which
// is the thing that would actually move.
//
// Run: npm run test:parity   (needs both drivers installed)

import assert from 'node:assert/strict';
import { quoteTemplate } from './corpus.js';
import { deal, lineItems } from './fixtures.js';

const CASES = [
  ['single-row', lineItems(1, { sites: 0 })],
  ['forty-rows', lineItems(40, { sites: 3 })],
  ['hundred-rows', lineItems(100, { sites: 0 })],
  ['grouped', lineItems(43, { sites: 3 })],
];

async function renderWith(runtime, items) {
  // Each runtime is loaded in its own child process: browser.js decides from
  // the environment at import time, and the module caches its browser.
  const { execFileSync } = await import('node:child_process');
  const script = `
    process.env.RENDERER_RUNTIME = ${JSON.stringify(runtime)};
    const { render, close } = await import('./src/render.js');
    const { quoteTemplate } = await import('./test/corpus.js');
    const { deal, lineItems } = await import('./test/fixtures.js');
    const items = JSON.parse(process.env.ITEMS_JSON);
    const { pdf } = await render(quoteTemplate(), { ...deal(), line_items: items });
    process.stdout.write(pdf.toString('base64'));
    await close();
  `;
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    env: { ...process.env, ITEMS_JSON: JSON.stringify(items) },
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return Buffer.from(out.toString(), 'base64');
}

async function glyphRuns(buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer), useSystemFonts: false, isEvalSupported: false,
  }).promise;
  const runs = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent();
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      runs.push({
        page: i, text: it.str,
        x: +it.transform[4].toFixed(2), y: +it.transform[5].toFixed(2),
        width: +(it.width ?? 0).toFixed(2),
      });
    }
  }
  await doc.destroy();
  return runs;
}

let failures = 0;
for (const [name, items] of CASES) {
  const [a, b] = await Promise.all([
    renderWith('playwright', items), renderWith('serverless', items),
  ]);
  const [ra, rb] = await Promise.all([glyphRuns(a), glyphRuns(b)]);

  const problems = [];
  if (ra.length !== rb.length) problems.push(`glyph run count ${ra.length} vs ${rb.length}`);
  const n = Math.min(ra.length, rb.length);
  let maxDx = 0, maxDy = 0, textMismatches = 0;
  for (let i = 0; i < n; i++) {
    if (ra[i].text !== rb[i].text || ra[i].page !== rb[i].page) { textMismatches++; continue; }
    maxDx = Math.max(maxDx, Math.abs(ra[i].x - rb[i].x));
    maxDy = Math.max(maxDy, Math.abs(ra[i].y - rb[i].y));
  }
  if (textMismatches) problems.push(`${textMismatches} text/page mismatches`);
  // A tenth of a point is far below anything visible and leaves room for
  // harmless rounding; a font substitution would be orders of magnitude worse.
  if (maxDx > 0.1) problems.push(`max dx ${maxDx.toFixed(3)}pt`);
  if (maxDy > 0.1) problems.push(`max dy ${maxDy.toFixed(3)}pt`);

  const status = problems.length ? 'FAIL' : 'pass';
  if (problems.length) failures++;
  console.log(`${name.padEnd(16)} runs=${String(ra.length).padStart(4)} ` +
    `dx=${maxDx.toFixed(3)} dy=${maxDy.toFixed(3)}  ${status}` +
    (problems.length ? `\n    · ${problems.join('\n    · ')}` : ''));
}

console.log(`\n${CASES.length - failures}/${CASES.length} cases identical across runtimes`);
assert.equal(failures, 0, 'the two runtimes disagree about the rendered document');
