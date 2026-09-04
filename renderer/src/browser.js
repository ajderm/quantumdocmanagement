// Browser adapter.
//
// The renderer needs exactly five things from a browser: a page, setContent,
// evaluate, pdf, close. Playwright and Puppeteer both expose those with the
// same names because both are driving Chrome DevTools Protocol's
// Page.printToPDF underneath. So the layout work is portable and only the
// launch differs:
//
//   local / container  -> playwright, with the image's own Chromium
//   serverless (Vercel) -> puppeteer-core + @sparticuz/chromium, a
//                          Brotli-packed build small enough for a function
//
// Chosen by RENDERER_RUNTIME, or inferred from the environment. Keeping both
// matters: the corpus runs against the same engine that serves production.

const isServerless = () =>
  Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

export function runtimeName() {
  const explicit = process.env.RENDERER_RUNTIME;
  if (explicit === 'playwright' || explicit === 'serverless') return explicit;
  return isServerless() ? 'serverless' : 'playwright';
}

/**
 * Resolve the Chromium binary for the Playwright path.
 *
 * Playwright pins an exact browser revision per release, so a bundled
 * Chromium and a base image that ships its own can disagree. Rather than
 * download at deploy time, honour an explicit path and otherwise fall back to
 * whatever the image provides.
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

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

/** Flags that keep Chromium alive in a constrained sandbox. */
const HARDENED_ARGS = [
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--font-render-hinting=none',
  '--disable-gpu',
];

/**
 * @returns {Promise<{ browser: object, close: () => Promise<void> }>}
 *   a browser exposing newPage(); the caller closes pages, we close the browser
 */
export async function launchBrowser() {
  if (runtimeName() === 'serverless') {
    // Imported lazily so a container deployment never needs these installed,
    // and a local checkout without them still runs the test suite.
    const [{ default: chromium }, puppeteer] = await Promise.all([
      import('@sparticuz/chromium'),
      import('puppeteer-core'),
    ]);
    const browser = await (puppeteer.default ?? puppeteer).launch({
      args: [...chromium.args, ...HARDENED_ARGS],
      executablePath: await chromium.executablePath(),
      headless: true,
    });
    return { browser, close: () => browser.close() };
  }

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({
    executablePath: chromiumExecutablePath(),
    args: HARDENED_ARGS,
  });
  return { browser, close: () => browser.close() };
}

/**
 * Normalize what page.pdf() returns.
 *
 * Playwright hands back a Buffer; recent Puppeteer hands back a Uint8Array.
 * Callers set Content-Length from this, so the difference matters.
 */
export function toBuffer(pdf) {
  return Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
}
