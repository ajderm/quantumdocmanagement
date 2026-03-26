import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validatePortalId, createErrorResponse, createJsonResponse } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAIL = 'marko@thequantumleap.business';

async function sendEmailNotification(feedback: Record<string, unknown>) {
  // Use Supabase's built-in email or a simple fetch to an email service
  // For now, use the HubSpot single-send API if available, or log for manual pickup
  try {
    const webhookUrl = Deno.env.get('FEEDBACK_WEBHOOK_URL');
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: ADMIN_EMAIL,
          subject: `[App Feedback] ${feedback.type === 'bug' ? '🐛' : '💡'} ${feedback.title}`,
          body: `New ${feedback.type} submitted by ${feedback.submitted_by_name || 'Unknown'}\n\nPortal: ${feedback.portal_id}\nTitle: ${feedback.title}\nDescription: ${feedback.description || 'No description'}\n\nSubmitted: ${feedback.created_at}`,
        }),
      });
    }
    // Also log to console for Supabase dashboard visibility
    console.log(`📧 Feedback notification: [${feedback.type}] ${feedback.title} from ${feedback.submitted_by_name}`);
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

        // Send email notification
        await sendEmailNotification(saved);

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
