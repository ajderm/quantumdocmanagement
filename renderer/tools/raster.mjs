// Rasterize PDF pages to PNG so a layout can be eyeballed (or attached to a CI
// run) rather than only asserted on. Not used by the service at runtime.
//
// Uses Chromium's own PDF viewer: pdfjs + a Node canvas cannot render glyph
// paths compatibly, and PDFium is the same engine that produced the file.
//
//   node tools/raster.mjs out/forty-rows.pdf /tmp/forty 1,2
import { resolve as resolvePath } from 'node:path';
import { chromium } from 'playwright';
import { chromiumExecutablePath } from '../src/render.js';

const [file, outPrefix, pagesArg] = process.argv.slice(2);
if (!file || !outPrefix) {
  console.error('usage: node tools/raster.mjs <in.pdf> <out-prefix> [pages]');
  process.exit(2);
}
const pages = (pagesArg ? pagesArg.split(',').map(Number) : [1]);
const url = 'file://' + resolvePath(file);

const browser = await chromium.launch({
  executablePath: chromiumExecutablePath(),
  args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage({
    viewportSize: { width: 850, height: 1100 }, deviceScaleFactor: 2,
  });
  for (const n of pages) {
    await page.goto(`${url}#page=${n}&zoom=page-fit`, { waitUntil: 'load' });
    await page.waitForTimeout(1800); // PDFium paints asynchronously
    // Note: the viewer treats #zoom as advisory, so a page may render at 100%
    // rather than fit. The sidebar thumbnails still show whole-page structure.
    const out = `${outPrefix}-p${n}.png`;
    await page.screenshot({ path: out });
    console.log(out);
  }
} finally {
  await browser.close();
}
