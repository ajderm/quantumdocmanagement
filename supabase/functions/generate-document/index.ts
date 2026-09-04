/**
 * Generates a document through the template-driven renderer.
 *
 *   POST { portalId, documentCode, recordId, objectType?, data, attach? }
 *     -> { pdfBase64, pageCount, renderMs, warnings, hubspotFileId? }
 *
 * The renderer runs as a separate service because it needs a real Chromium,
 * which an edge function cannot provide. This function is the only thing that
 * talks to it: RENDER_TOKEN stays a server-side secret, so the browser can
 * never call the renderer directly and nobody outside this portal can spend
 * its capacity.
 *
 * The caller supplies `data` -- the form state the rep has already filled in.
 * That is deliberate: it reuses every bit of existing form logic rather than
 * duplicating HubSpot fetching and pricing here, and it means template mode
 * and native mode are fed from the same numbers.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  validatePortalId, getCorsHeaders, createErrorResponse, createJsonResponse,
} from '../_shared/validation.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';

const corsHeaders = getCorsHeaders();

const DOCUMENT_CODE = /^[a-z][a-z0-9_]{1,48}$/;

/**
 * Inline the dealer's logo as a data URI.
 *
 * Chromium renders a PDF header template as a separate document and does not
 * reliably load external images from it, so a plain URL silently renders
 * nothing at all — which is why the logo was missing rather than broken.
 *
 * Failure is never fatal: a document without a logo is still a usable
 * document, so the caller gets a warning and the render proceeds.
 */
const MAX_LOGO_BYTES = 512 * 1024;

async function logoDataUri(url: string | null): Promise<{ uri: string | null; warning?: string }> {
  if (!url) return { uri: null };
  try {
    const res = await fetch(url);
    if (!res.ok) return { uri: null, warning: `The dealer logo could not be fetched (${res.status}).` };

    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim();
    if (!/^image\/(png|jpeg|jpg|gif|webp|svg\+xml)$/.test(type)) {
      return { uri: null, warning: `The dealer logo is not a supported image type (${type || 'unknown'}).` };
    }

    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length > MAX_LOGO_BYTES) {
      return {
        uri: null,
        warning: `The dealer logo is ${Math.round(bytes.length / 1024)}KB, over the ` +
                 `${MAX_LOGO_BYTES / 1024}KB limit for inlining. Upload a smaller one.`,
      };
    }

    let binary = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return { uri: `data:${type};base64,${btoa(binary)}` };
  } catch (err) {
    console.error('logo fetch failed', err);
    return { uri: null, warning: 'The dealer logo could not be loaded.' };
  }
}

function normalizeObjectType(raw: unknown): 'deals' | 'projects' | null {
  const v = String(raw ?? 'deals').toLowerCase().trim();
  if (['deals', 'deal', '0-3'].includes(v)) return 'deals';
  if (['projects', 'project', '0-54'].includes(v)) return 'projects';
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const rendererUrl = Deno.env.get('RENDERER_URL');
    const renderToken = Deno.env.get('RENDER_TOKEN');
    if (!rendererUrl) {
      return createErrorResponse(
        'The renderer is not configured (RENDERER_URL is unset).', 503, corsHeaders);
    }

    const body = await req.json().catch(() => ({}));
    const { portalId, documentCode, recordId } = body;
    const objectType = normalizeObjectType(body.objectType);

    if (!validatePortalId(portalId)) {
      return createErrorResponse('Invalid portal ID format', 400, corsHeaders);
    }
    if (!DOCUMENT_CODE.test(String(documentCode ?? ''))) {
      return createErrorResponse('Invalid document code', 400, corsHeaders);
    }
    if (!objectType) return createErrorResponse('Unsupported objectType', 400, corsHeaders);
    if (!/^\d{1,20}$/.test(String(recordId ?? ''))) {
      return createErrorResponse('Invalid record ID', 400, corsHeaders);
    }
    if (!body.data || typeof body.data !== 'object') {
      return createErrorResponse('Missing "data" payload', 400, corsHeaders);
    }

    // Rendering costs real compute, so it is rate limited per portal.
    const limited = await checkRateLimit(supabase, String(portalId), 'generate-document', 30, corsHeaders);
    if (limited) return limited;

    const { data: dealer } = await supabase
      .from('dealer_accounts')
      .select('id, logo_url, company_name, address_line1, address_line2, phone, website')
      .eq('hubspot_portal_id', portalId).maybeSingle();
    if (!dealer) return createErrorResponse('Dealer account not found', 404, corsHeaders);

    // Only a published template is renderable: a draft being edited must never
    // reach a customer-facing document.
    const { data: tmpl, error: tmplError } = await supabase
      .from('render_templates')
      .select('id, version, template, name')
      .eq('dealer_account_id', dealer.id)
      .eq('document_code', documentCode)
      .eq('is_published', true)
      .maybeSingle();

    if (tmplError) throw tmplError;
    if (!tmpl) {
      return createErrorResponse(
        `No published template for "${documentCode}". Publish one before switching this ` +
        `document type to the template engine.`, 409, corsHeaders);
    }

    // The dealer's branding belongs to the dealer record, not the template, so
    // one template serves every dealer and each still gets their own letterhead.
    const logo = await logoDataUri(dealer.logo_url ?? null);
    const preWarnings: string[] = logo.warning ? [logo.warning] : [];

    const template = {
      ...(tmpl.template as Record<string, unknown>),
      chrome: {
        ...((tmpl.template as { chrome?: Record<string, unknown> })?.chrome ?? {}),
        ...(logo.uri ? { logoDataUri: logo.uri } : {}),
      },
    };

    const renderRes = await fetch(`${rendererUrl.replace(/\/$/, '')}/api/render`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(renderToken ? { authorization: `Bearer ${renderToken}` } : {}),
      },
      body: JSON.stringify({
        template,
        data: body.data,
        filename: `${documentCode}-${recordId}`,
      }),
    });

    if (!renderRes.ok) {
      const detail = await renderRes.text().catch(() => '');
      console.error('renderer rejected the request', renderRes.status, detail.slice(0, 500));
      // The renderer's own status is surfaced rather than flattened to 500, so
      // a misconfigured token (401) reads differently from a broken template.
      return createErrorResponse(
        `The renderer returned ${renderRes.status}. ${detail.slice(0, 200)}`,
        renderRes.status === 401 ? 502 : 502, corsHeaders);
    }

    const pdf = new Uint8Array(await renderRes.arrayBuffer());
    const renderMs = Number(renderRes.headers.get('x-render-ms')) || null;
    const warningDetail = renderRes.headers.get('x-render-warning-detail');
    const warnings = [
      ...preWarnings,
      ...(warningDetail ? decodeURIComponent(warningDetail).split(' | ') : []),
    ];

    // Base64 in chunks: a 250-row document is a few hundred KB, and spreading
    // that into String.fromCharCode in one call overflows the argument limit.
    let binary = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < pdf.length; i += CHUNK) {
      binary += String.fromCharCode(...pdf.subarray(i, i + CHUNK));
    }
    const pdfBase64 = btoa(binary);

    let hubspotFileId: string | null = null;
    if (body.attach) {
      const attachRes = await supabase.functions.invoke('hubspot-attach-file', {
        body: {
          portalId, dealId: recordId, objectType,
          fileName: `${body.fileName ?? documentCode}.pdf`,
          fileBase64: pdfBase64,
        },
      });
      if (attachRes.error) {
        // A failed attach must not lose the document: the PDF is still
        // returned and the caller can retry or download it.
        console.error('attach failed', attachRes.error);
        warnings.push('The document was generated but could not be attached to the record.');
      } else {
        hubspotFileId = attachRes.data?.fileId ?? attachRes.data?.id ?? null;
      }
    }

    // Record what was produced, from which version, against which input. A
    // reissued document must be reproducible from this row alone.
    const { error: logError } = await supabase.from('rendered_documents').insert({
      dealer_account_id: dealer.id,
      document_code: documentCode,
      object_type: objectType,
      record_id: String(recordId),
      render_template_id: tmpl.id,
      template_version: tmpl.version,
      data_snapshot: body.data,
      byte_size: pdf.length,
      render_ms: renderMs,
      warnings: warnings.length ? warnings : null,
      hubspot_file_id: hubspotFileId,
      created_by: body.createdBy ?? null,
    });
    if (logError) console.error('rendered_documents insert failed', logError.message);

    return createJsonResponse({
      pdfBase64, byteSize: pdf.length, renderMs, warnings,
      hubspotFileId, templateVersion: tmpl.version, templateName: tmpl.name,
    }, corsHeaders);
  } catch (err) {
    console.error('generate-document failed', err);
    return createErrorResponse('Document generation failed', 500, corsHeaders);
  }
});
