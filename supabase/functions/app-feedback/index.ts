import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validatePortalId, createErrorResponse, createJsonResponse } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAIL = 'marko@thequantumleap.business';

async function sendEmailNotification(feedback: Record<string, unknown>) {
  try {
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.warn('RESEND_API_KEY not set — skipping email notification');
      console.log(`📧 Feedback (no email sent): [${feedback.type}] ${feedback.title} from ${feedback.submitted_by_name}`);
      return;
    }

    const typeEmoji = feedback.type === 'bug' ? '🐛 Bug Report' : '💡 Feature Request';
    const submitter = (feedback.submitted_by_name as string) || 'Unknown';
    const portalId = (feedback.portal_id as string) || 'Unknown';
    const title = feedback.title as string;
    const description = (feedback.description as string) || 'No description provided';
    const createdAt = new Date(feedback.created_at as string).toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto;">
        <div style="background: #1b2a4d; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 16px;">${typeEmoji}</h2>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
          <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #1b2a4d;">${title}</h3>
          <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 14px; line-height: 1.5;">${description.replace(/\n/g, '<br>')}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
          <table style="font-size: 13px; color: #6b7280;">
            <tr><td style="padding: 2px 12px 2px 0; font-weight: 600;">Submitted by</td><td>${submitter}</td></tr>
            <tr><td style="padding: 2px 12px 2px 0; font-weight: 600;">Portal</td><td>${portalId}</td></tr>
            <tr><td style="padding: 2px 12px 2px 0; font-weight: 600;">Date</td><td>${createdAt}</td></tr>
          </table>
        </div>
      </div>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Quantum App <notifications@thequantumleap.business>',
        to: [ADMIN_EMAIL],
        subject: `[QDM] ${typeEmoji}: ${title}`,
        html: htmlBody,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Resend API error:', response.status, errText);
    } else {
      console.log(`📧 Email sent for: [${feedback.type}] ${title}`);
    }
  } catch (err) {
    console.warn('Email notification failed:', err);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, portalId, feedbackId, title, description, type, status, adminResponse, userId, userName } = body;

    if (!portalId || !action) {
      return createErrorResponse('Missing required fields: portalId, action', 400, corsHeaders);
    }

    if (!validatePortalId(portalId)) {
      return createErrorResponse('Invalid portalId format', 400, corsHeaders);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    switch (action) {
      case 'submit': {
        if (!title) {
          return createErrorResponse('Missing title', 400, corsHeaders);
        }

        const { data: saved, error: saveError } = await supabase
          .from('app_feedback')
          .insert({
            portal_id: portalId,
            submitted_by: userId || null,
            submitted_by_name: userName || null,
            type: type || 'bug',
            title,
            description: description || '',
            status: 'new',
          })
          .select()
          .single();

        if (saveError) {
          console.error('Save feedback error:', saveError);
          return createErrorResponse('Failed to submit feedback', 500, corsHeaders);
        }

        // Send email notification (fire-and-forget — don't block the response)
        sendEmailNotification(saved).catch(err => console.warn('Notification error:', err));

        return createJsonResponse({ success: true, feedback: saved }, corsHeaders);
      }

      case 'list': {
        const { data: feedbackList, error: listError } = await supabase
          .from('app_feedback')
          .select('*')
          .eq('portal_id', portalId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (listError) {
          console.error('List feedback error:', listError);
          return createErrorResponse('Failed to list feedback', 500, corsHeaders);
        }

        return createJsonResponse({ feedback: feedbackList || [] }, corsHeaders);
      }

      case 'update_status': {
        if (!feedbackId || !status) {
          return createErrorResponse('Missing feedbackId or status', 400, corsHeaders);
        }

        const updateData: Record<string, unknown> = {
          status,
          updated_at: new Date().toISOString(),
        };
        if (adminResponse !== undefined) {
          updateData.admin_response = adminResponse;
        }

        const { error: updateError } = await supabase
          .from('app_feedback')
          .update(updateData)
          .eq('id', feedbackId)
          .eq('portal_id', portalId);

        if (updateError) {
          console.error('Update feedback error:', updateError);
          return createErrorResponse('Failed to update feedback', 500, corsHeaders);
        }

        return createJsonResponse({ success: true }, corsHeaders);
      }

      default:
        return createErrorResponse(`Unknown action: ${action}`, 400, corsHeaders);
    }
  } catch (error: unknown) {
    console.error('Feedback error:', error instanceof Error ? error.message : 'Unknown error');
    return createErrorResponse(
      error instanceof Error ? error.message : 'An error occurred',
      500,
      corsHeaders
    );
  }
});
