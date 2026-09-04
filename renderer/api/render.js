// Vercel serverless entry point for the render service.
//
// Same renderer, different host: browser.js picks puppeteer-core plus
// @sparticuz/chromium when VERCEL is set, so the pagination rules, corpus and
// tests are shared with the container path rather than forked.
//
// Deployed as its own Vercel project rooted at renderer/, so it is isolated
// from the HubSpot card app that Lovable publishes out of the same repo.

import { render } from '../src/render.js';

const MAX_BODY = Number(process.env.MAX_BODY_BYTES ?? 4_000_000);
const TOKEN = process.env.RENDER_TOKEN ?? '';

function send(res, status, body) {
  res.status(status).setHeader('content-type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(body));
}

/**
 * Browser-clickable smoke test.
 *
 * A green build only proves the function bundled; it says nothing about
 * whether Chromium launches in this runtime. Verifying that with a POST needs
 * a bearer header, which a browser address bar cannot send -- so this renders
 * a fixed built-in sample from a GET.
 *
 * Allowed only where it cannot be abused: on non-production deployments, or on
 * a deployment with no RENDER_TOKEN configured (which is unprotected anyway).
 * Production with a token set refuses it. The payload is fixed, so it can
 * never be used to render caller-supplied content.
 */
function smokeAllowed() {
  return process.env.VERCEL_ENV !== 'production' || !TOKEN;
}

async function smokeTest(res, rows) {
  const { render } = await import('../src/render.js');
  const { quoteTemplate, deal, lineItems } = await import('../src/sample.js');
  const { pdf, ms } = await render(quoteTemplate(), {
    ...deal(), line_items: lineItems(rows, { sites: 3 }),
  });
  res.status(200);
  res.setHeader('content-type', 'application/pdf');
  res.setHeader('content-length', String(pdf.length));
  res.setHeader('x-render-ms', String(ms));
  res.setHeader('content-disposition', 'inline; filename="smoke.pdf"');
  res.end(pdf);
}

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x');

  if (req.method === 'GET') {
    if (url.searchParams.get('smoke') === '1') {
      if (!smokeAllowed()) {
        return send(res, 403, { error: 'Smoke test is disabled on protected production deployments' });
      }
      const rows = Math.min(Math.max(Number(url.searchParams.get('rows')) || 40, 0), 250);
      try {
        return await smokeTest(res, rows);
      } catch (err) {
        console.error('smoke failed:', err);
        return send(res, 500, {
          ok: false, error: String(err?.message ?? err),
          stack: String(err?.stack ?? '').split('\n').slice(0, 8),
        });
      }
    }
    return send(res, 200, {
      ok: true, service: 'renderer',
      runtime: process.env.VERCEL_ENV ?? 'local',
      node: process.version,
      protected: Boolean(TOKEN),
      smoke: smokeAllowed() ? '/api/render?smoke=1&rows=40' : 'disabled',
    });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST' });

  // A shared token is the minimum bar: this service renders whatever it is
  // given, so it must not be reachable by anything but the app's backend.
  if (TOKEN) {
    const provided = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    if (provided !== TOKEN) return send(res, 401, { error: 'Unauthorized' });
  }

  try {
    // Vercel parses JSON bodies, but guard the size regardless: a template
    // with an inlined logo can be large, and an unbounded body is a cheap
    // way to exhaust a function.
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    if (Buffer.byteLength(raw) > MAX_BODY) return send(res, 413, { error: 'Payload too large' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});
    if (!body?.template || typeof body.template !== 'object') {
      return send(res, 400, { error: 'Missing "template" object' });
    }

    // `format: 'html'` returns the markup the PDF is printed from.
    //
    // The app is embedded in a HubSpot iframe, and Chrome refuses to run its
    // PDF viewer inside a sandboxed one -- an inline PDF preview there fails
    // with a browser error page rather than rendering. The HTML costs no extra
    // work (it is built before Chromium is ever asked for a PDF) and needs no
    // plugin, so it is what an in-app preview should ask for. It reflows to the
    // viewport rather than paginating, so it previews content and wording, not
    // page breaks; the PDF remains the authority on those.
    const wantHtml = body.format === 'html';

    const { pdf, warnings, ms, html } = await render(body.template, body.data ?? {}, {
      timeoutMs: Number(body.timeoutMs) || undefined,
      wantHtml,
    });

    if (wantHtml) {
      res.status(200);
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.setHeader('x-render-ms', String(ms));
      res.setHeader('x-render-warnings', String(warnings.length));
      if (warnings.length) {
        res.setHeader('x-render-warning-detail', encodeURIComponent(warnings.join(' | ')));
      }
      return res.end(html);
    }

    res.status(200);
    res.setHeader('content-type', 'application/pdf');
    res.setHeader('content-length', String(pdf.length));
    res.setHeader('x-render-ms', String(ms));
    res.setHeader('x-render-warnings', String(warnings.length));
    if (warnings.length) {
      res.setHeader('x-render-warning-detail', encodeURIComponent(warnings.join(' | ')));
    }
    res.setHeader(
      'content-disposition',
      `inline; filename="${String(body.filename ?? 'document').replace(/[^\w.-]/g, '_')}.pdf"`,
    );
    // A Buffer must be sent as-is; res.send would otherwise stringify it.
    res.end(pdf);
  } catch (err) {
    console.error('render failed:', err);
    send(res, 500, { error: err?.message ?? 'Render failed' });
  }
}
