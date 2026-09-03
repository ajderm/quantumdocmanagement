// PDF verification helpers. These assert on the produced artifact, not on our
// own layout maths — the whole point is to catch the engine disagreeing with us.

// pdfjs-dist v4 ships ESM only; the legacy build is the Node-friendly one.
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

/** @returns {Promise<{pages:number, texts:string[], sizes:{w:number,h:number}[], bytes:number}>} */
export async function inspectPdf(buffer) {
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer), useSystemFonts: false, isEvalSupported: false,
  }).promise;
  const texts = [];
  const sizes = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    sizes.push({ w: +(vp.width / 72).toFixed(2), h: +(vp.height / 72).toFixed(2) });
    const content = await page.getTextContent();
    texts.push(content.items.map((it) => ('str' in it ? it.str : '')).join(''));
  }
  const out = { pages: doc.numPages, texts, sizes, bytes: buffer.length };
  await doc.destroy();
  return out;
}

/** Count how many pages contain table rows vs. how many repeat the column header. */
export function headerRepeat(info, headerLabel, rowMarker) {
  let pagesWithRows = 0, pagesWithHeader = 0;
  for (const t of info.texts) {
    const hasRows = rowMarker.test(t);
    if (hasRows) pagesWithRows++;
    if (hasRows && t.includes(headerLabel)) pagesWithHeader++;
  }
  return { pagesWithRows, pagesWithHeader };
}

/**
 * Horizontal overflow can only be measured in the DOM: a PDF has already
 * clipped whatever ran past the page edge.
 */
export async function measureOverflow(html) {
  const { chromium } = await import('playwright');
  const { chromiumExecutablePath } = await import('../src/render.js');
  const browser = await chromium.launch({
    executablePath: chromiumExecutablePath(), args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    return await page.evaluate(() => {
      const de = document.documentElement;
      const widest = [...document.querySelectorAll('body *')].reduce((mx, el) => {
        const r = el.getBoundingClientRect();
        return Math.max(mx, r.right);
      }, 0);
      return {
        docScrollWidth: de.scrollWidth,
        docClientWidth: de.clientWidth,
        widestRight: Math.round(widest),
        overflowPx: Math.max(0, Math.round(widest) - de.clientWidth),
      };
    });
  } finally {
    await browser.close();
  }
}
