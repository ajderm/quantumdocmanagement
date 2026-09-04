import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validatePortalId, createErrorResponse } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { portalId } = await req.json();

    // Validate portal ID format
    if (!validatePortalId(portalId)) {
      return createErrorResponse("Invalid portal ID format", 400, corsHeaders);
    }

    console.log(`Fetching rate factors for portal: ${portalId}`);

    // Get dealer account
    const { data: dealerData, error: dealerError } = await supabase
      .from("dealer_accounts")
      .select("id")
      .eq("hubspot_portal_id", portalId)
      .maybeSingle();

    if (dealerError || !dealerData) {
      console.log("Dealer account not found, returning empty rates");
      return new Response(
        JSON.stringify({ 
          rateSheet: null,
          rateFactors: [],
          leasingCompanies: [],
          availableTerms: []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The lenders a dealer works with, configured in the backend.
    //
    // This list is the reason the picker can be used at all before any rate
    // sheet exists: a dealer who quotes from an external system still has to
    // name the lender on the paperwork. Rate sheets, when they exist, add to
    // this list rather than being the only source of it.
    const { data: configuredSetting } = await supabase
      .from("dealer_settings")
      .select("setting_value")
      .eq("dealer_account_id", dealerData.id)
      .eq("setting_key", "leasing_companies")
      .maybeSingle();

    const configuredCompanies: string[] = Array.isArray(configuredSetting?.setting_value)
      ? (configuredSetting.setting_value as unknown[])
          .map((c) => (typeof c === "string" ? c.trim() : ""))
          .filter((c) => c !== "")
      : [];

    // Every active rate sheet, not one.
    //
    // A dealer can legitimately run more than one at a time -- Eakes has a
    // Commercial sheet and a Municipal sheet -- and the previous
    // `.maybeSingle()` turned that into an error, which fell through to the
    // "no rate sheet" branch and emptied the lender dropdown even though the
    // rates were sitting right there.
    const { data: activeSheets, error: rateSheetError } = await supabase
      .from("uploaded_rate_sheets")
      .select("*")
      .eq("dealer_account_id", dealerData.id)
      .eq("is_active", true)
      .order("uploaded_at", { ascending: false });

    if (rateSheetError) {
      console.error("Failed to fetch rate sheets:", rateSheetError);
    }

    const sheets = activeSheets ?? [];
    if (sheets.length === 0) {
      console.log(
        `No active rate sheet; returning ${configuredCompanies.length} configured lender(s)`,
      );
      return new Response(
        JSON.stringify({
          rateSheet: null,
          rateFactors: [],
          leasingCompanies: configuredCompanies,
          availableTerms: []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The newest sheet is the one reported for display; factors come from all
    // of them, so a Municipal sheet's lenders are not hidden by a Commercial
    // one uploaded later.
    const rateSheet = sheets[0];

    const { data: rateFactors, error: factorsError } = await supabase
      .from("lease_rate_factors")
      .select("*")
      .in("rate_sheet_id", sheets.map((s) => s.id))
      .order("leasing_company")
      .order("term_months");

    if (factorsError) {
      console.error("Failed to fetch rate factors:", factorsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch rate factors" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Configured lenders first, then any the rate sheets add. A dealer who has
    // ordered the backend list sees that order preserved.
    const leasingCompanies = [
      ...new Set([...configuredCompanies, ...(rateFactors ?? []).map((r) => r.leasing_company)]),
    ].filter((c) => typeof c === "string" && c.trim() !== "");
    const availableTerms = [...new Set((rateFactors ?? []).map((r) => r.term_months))].sort((a, b) => a - b);

    console.log(`Found ${(rateFactors ?? []).length} rate factors across ${sheets.length} sheet(s) for ${leasingCompanies.length} companies`);

    return new Response(
      JSON.stringify({
        rateSheet: {
          id: rateSheet.id,
          fileName: rateSheet.file_name,
          uploadedAt: rateSheet.uploaded_at,
          rowCount: rateSheet.row_count,
        },
        rateFactors,
        leasingCompanies,
        availableTerms,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error fetching rate factors:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch rate factors", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
