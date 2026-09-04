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

export default async function handler(req, res) {
  if (req.method === 'GET') return send(res, 200, { ok: true, service: 'renderer' });
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

    const { pdf, warnings, ms } = await render(body.template, body.data ?? {}, {
      timeoutMs: Number(body.timeoutMs) || undefined,
    });

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
