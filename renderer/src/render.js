// HTML -> PDF via headless Chromium.
//
// One browser is reused across renders; a fresh page (and therefore a fresh
// JS/CSS context) is created per document. Callers must close() on shutdown.
// Which Chromium is used is decided by browser.js — the layout work is the
// same either way, because both drivers speak the same DevTools protocol.

import { launchBrowser, toBuffer } from './browser.js';
import { resolve as resolveTemplate, interpolate } from './resolve.js';
import { buildHtml } from './html.js';
import { buildHeader, buildFooter, pageGeometry } from './css.js';

export { chromiumExecutablePath, runtimeName } from './browser.js';

let handlePromise = null;

function launch() {
  handlePromise ??= launchBrowser();
  return handlePromise;
}

export async function close() {
  if (!handlePromise) return;
  const handle = await handlePromise;
  handlePromise = null;
  await handle.close();
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

  // Chrome strings are tokenised too, so a running header can carry the quote
  // number without the caller pre-formatting it.
  const chrome = { ...(template.chrome ?? {}) };
  chrome.lines = (chrome.lines ?? []).map((l) => interpolate(l, resolved.scope));
  chrome.right = (chrome.right ?? []).map((l) => interpolate(l, resolved.scope));
  chrome.companyName = interpolate(chrome.companyName ?? '', resolved.scope);
  chrome.footerNote = interpolate(chrome.footerNote ?? '', resolved.scope);

  const { size, landscape, margins } = pageGeometry(template.page);
  const { browser } = await launch();
  const page = await browser.newPage();
  try {
    page.setDefaultTimeout(opts.timeoutMs ?? 30_000);
    await page.setContent(html, { waitUntil: 'load' });
    // Web fonts must be settled before layout is measured, or the first render
    // paginates against fallback metrics and differs from every later one.
    await page.evaluate(() => document.fonts.ready);

    const pdf = toBuffer(await page.pdf({
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
    }));
    return {
      pdf, html: opts.wantHtml ? html : undefined,
      warnings: resolved.warnings, ms: Date.now() - started,
    };
  } finally {
    await page.close();
  }
}
