// HTTP wrapper around render(). Deliberately small: one render endpoint, one
// health endpoint, no template storage. The app owns templates and data; this
// service owns pagination and nothing else.

import { createServer } from 'node:http';
import { render, close } from './render.js';

const PORT = Number(process.env.PORT ?? 8080);
const MAX_BODY = Number(process.env.MAX_BODY_BYTES ?? 4_000_000);
const TOKEN = process.env.RENDER_TOKEN ?? '';

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload) });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('Payload too large'), { status: 413 });
    chunks.push(chunk);
  }
  if (!size) throw Object.assign(new Error('Empty request body'), { status: 400 });
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Body is not valid JSON'), { status: 400 });
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') return json(res, 200, { ok: true });

    if (req.method !== 'POST' || new URL(req.url, 'http://x').pathname !== '/render') {
      return json(res, 404, { error: 'Not found' });
    }
    // A shared token is the minimum bar: this service renders whatever it is
    // given, so it must not be reachable by anything but the app's backend.
    if (TOKEN) {
      const provided = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
      if (provided !== TOKEN) return json(res, 401, { error: 'Unauthorized' });
    }

    const body = await readBody(req);
    if (!body?.template || typeof body.template !== 'object') {
      return json(res, 400, { error: 'Missing "template" object' });
    }

    const { pdf, warnings, ms } = await render(body.template, body.data ?? {},
      { timeoutMs: Number(body.timeoutMs) || undefined });

    res.writeHead(200, {
      'content-type': 'application/pdf',
      'content-length': pdf.length,
      'x-render-ms': String(ms),
      'x-render-warnings': String(warnings.length),
      ...(warnings.length
        ? { 'x-render-warning-detail': encodeURIComponent(warnings.join(' | ')) }
        : {}),
      'content-disposition': `inline; filename="${(body.filename ?? 'document').replace(/[^\w.-]/g, '_')}.pdf"`,
    });
    res.end(pdf);
  } catch (err) {
    const status = err?.status ?? 500;
    if (status >= 500) console.error('render failed:', err);
    json(res, status, { error: err?.message ?? 'Render failed' });
  }
});

server.listen(PORT, () => console.log(`renderer listening on :${PORT}`));

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    server.close(async () => { await close(); process.exit(0); });
  });
}
