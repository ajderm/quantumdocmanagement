// HTML -> PDF via headless Chromium.
//
// One browser is reused across renders; a fresh page (and therefore a fresh
// JS/CSS context) is created per document. Callers must close() on shutdown.

import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
import { resolve as resolveTemplate } from './resolve.js';
import { buildHtml } from './html.js';
import { buildHeader, buildFooter, pageGeometry } from './css.js';

let browserPromise = null;

/**
 * Resolve the Chromium binary.
 *
 * Playwright pins an exact browser revision per release, so a bundled
 * Chromium and a base image that ships its own can disagree. Rather than
 * download at deploy time, honour an explicit path and otherwise fall back to
 * whatever the image provides. Set CHROMIUM_PATH in the container.
 */
export function chromiumExecutablePath() {
  const explicit = process.env.CHROMIUM_PATH;
  if (explicit) return explicit;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root) return undefined; // let Playwright resolve its own download
  const { existsSync, readdirSync } = require('node:fs');
  const { join } = require('node:path');
  if (!existsSync(root)) return undefined;
  // Prefer the full Chromium build over the headless shell. Both can
  // print-to-PDF, but only the full build ships the PDF viewer, which the
  // raster tool uses to check a rendered document visually.
  const dirs = readdirSync(root)
    .filter((d) => d.startsWith('chromium'))
    .sort((a, b) => Number(a.includes('headless')) - Number(b.includes('headless')));
  const candidates = dirs.flatMap((d) => [
    join(root, d, 'chrome-linux', 'chrome'),
    join(root, d, 'chrome-linux', 'headless_shell'),
  ]);
  return candidates.find((p) => existsSync(p));
}

function launch() {
  browserPromise ??= chromium.launch({
    executablePath: chromiumExecutablePath(),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
  });
  return browserPromise;
}

export async function close() {
  if (!browserPromise) return;
  const b = await browserPromise;
  browserPromise = null;
  await b.close();
}

/**
 * @param {object} template  template JSON
 * @param {object} data      resolved data payload
 * @param {{timeoutMs?:number, wantHtml?:boolean}} [opts]
 * @returns {Promise<{pdf:Buffer, warnings:string[], html?:string, ms:number}>}
 */
export async function render(template, data, opts = {}) {
  const started = Date.now();
  const resolved = resolveTemplate(template, data);
  const html = buildHtml(resolved);
  const chrome = { ...(template.chrome ?? {}) };

  // Chrome strings are tokenised too, so a running header can carry the quote
  // number without the caller pre-formatting it.
  const { interpolate } = await import('./resolve.js');
  chrome.lines = (chrome.lines ?? []).map((l) => interpolate(l, resolved.scope));
  chrome.right = (chrome.right ?? []).map((l) => interpolate(l, resolved.scope));
  chrome.companyName = interpolate(chrome.companyName ?? '', resolved.scope);
  chrome.footerNote = interpolate(chrome.footerNote ?? '', resolved.scope);

  const { size, landscape, margins } = pageGeometry(template.page);
  const browser = await launch();
  const page = await browser.newPage();
  try {
    page.setDefaultTimeout(opts.timeoutMs ?? 30_000);
    await page.setContent(html, { waitUntil: 'load' });
    // Web fonts must be settled before layout is measured, or the first render
    // paginates against fallback metrics and differs from every later one.
    await page.evaluate(() => document.fonts.ready);

    const pdf = await page.pdf({
      format: size.css,
      landscape,
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: true,
      headerTemplate: buildHeader(template, chrome),
      footerTemplate: buildFooter(template, chrome),
      margin: {
        top: `${margins.top}in`, right: `${margins.right}in`,
        bottom: `${margins.bottom}in`, left: `${margins.left}in`,
      },
    });
    return {
      pdf, html: opts.wantHtml ? html : undefined,
      warnings: resolved.warnings, ms: Date.now() - started,
    };
  } finally {
    await page.close();
  }
}
