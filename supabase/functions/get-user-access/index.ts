import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Role hierarchy: admin > manager > user > viewer
const ROLE_HIERARCHY: Record<string, number> = {
  admin: 4,
  manager: 3,
  user: 2,
  viewer: 1,
};

function meetsMinRole(userRole: string, minRole: string): boolean {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[minRole] || 0);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const portalId = url.searchParams.get("portalId");
    const userId = url.searchParams.get("userId");
    const dealStage = url.searchParams.get("dealStage") || "";
    const pipelineId = url.searchParams.get("pipelineId") || "";

    if (!portalId || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing portalId or userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find dealer account
    const { data: account } = await supabase
      .from("dealer_accounts")
      .select("id")
      .eq("hubspot_portal_id", portalId)
      .single();

    if (!account) {
      // No account set up yet - grant full access (first-time setup)
      return new Response(
        JSON.stringify({
          role: "admin",
          can_view: true,
          can_edit: true,
          can_download: true,
          can_generate: true,
          is_admin: true,
          reason: "no_account_setup",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user role
    const { data: userRole } = await supabase
      .from("app_user_roles")
      .select("role")
      .eq("dealer_account_id", account.id)
      .eq("hubspot_user_id", userId)
      .single();

    // Default to 'viewer' if not explicitly set (restrictive by default)
    const role = userRole?.role || "viewer";

    // If admin or manager, full access always
    if (role === "admin" || role === "manager") {
      return new Response(
        JSON.stringify({
          role,
          can_view: true,
          can_edit: true,
          can_download: true,
          can_generate: true,
          is_admin: role === "admin",
          reason: "role_override",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For regular users and viewers, check pipeline stage cutoff rules
    if (pipelineId && dealStage) {
      const { data: rule } = await supabase
        .from("access_rules")
        .select("*")
        .eq("dealer_account_id", account.id)
        .eq("pipeline_id", pipelineId)
        .single();

      if (rule) {
        // Fetch pipeline stages from HubSpot to determine ordering
        let isPastCutoff = dealStage === rule.cutoff_stage; // Fallback: exact match

        try {
          // Get HubSpot token to fetch pipeline stages
          const { data: tokenData } = await supabase
            .from("hubspot_tokens")
            .select("access_token")
            .eq("portal_id", portalId)
            .single();

          if (tokenData?.access_token) {
            const pipelineResp = await fetch(
              `https://api.hubapi.com/crm/v3/pipelines/deals/${pipelineId}`,
              { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
            );
            if (pipelineResp.ok) {
              const pipelineData = await pipelineResp.json();
              const stages = (pipelineData.stages || [])
                .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));
              
              const cutoffIndex = stages.findIndex((s: any) => s.id === rule.cutoff_stage);
              const currentIndex = stages.findIndex((s: any) => s.id === dealStage);
              
              if (cutoffIndex >= 0 && currentIndex >= 0) {
                isPastCutoff = currentIndex >= cutoffIndex;
              }
            }
          }
        } catch {
          // On error, fall back to exact match
          console.warn('Could not fetch pipeline stages for ordering, using exact match');
        }

        if (isPastCutoff) {
          // Past cutoff - check post_cutoff_min_role
          const hasAccess = meetsMinRole(role, rule.post_cutoff_min_role);
          return new Response(
            JSON.stringify({
              role,
              can_view: hasAccess,
              can_edit: false, // Users and viewers never edit past cutoff
              can_download: hasAccess,
              can_generate: false,
              is_admin: false,
              reason: "post_cutoff",
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          // Before cutoff - check pre_cutoff_min_role
          const hasAccess = meetsMinRole(role, rule.pre_cutoff_min_role);
          return new Response(
            JSON.stringify({
              role,
              can_view: hasAccess && role !== "viewer", // Viewers may see but not interact
              can_edit: hasAccess && role === "user",
              can_download: false, // Never download before cutoff for non-managers
              can_generate: hasAccess && role === "user",
              is_admin: false,
              reason: "pre_cutoff",
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // No pipeline rules set - default permissions by role
    const defaults: Record<string, any> = {
      user: { can_view: true, can_edit: true, can_download: true, can_generate: true, is_admin: false },
      viewer: { can_view: true, can_edit: false, can_download: false, can_generate: false, is_admin: false },
    };

    return new Response(
      JSON.stringify({
        role,
        ...defaults[role] || defaults.user,
        reason: "default",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-user-access error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
