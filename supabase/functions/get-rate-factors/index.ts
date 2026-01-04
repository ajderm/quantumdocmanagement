import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    if (!portalId) {
      return new Response(
        JSON.stringify({ error: "Portal ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    // Get active rate sheet
    const { data: rateSheet, error: rateSheetError } = await supabase
      .from("uploaded_rate_sheets")
      .select("*")
      .eq("dealer_account_id", dealerData.id)
      .eq("is_active", true)
      .maybeSingle();

    if (rateSheetError || !rateSheet) {
      console.log("No active rate sheet found");
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

    // Get all rate factors for this sheet
    const { data: rateFactors, error: factorsError } = await supabase
      .from("lease_rate_factors")
      .select("*")
      .eq("rate_sheet_id", rateSheet.id)
      .order("leasing_company")
      .order("term_months");

    if (factorsError) {
      console.error("Failed to fetch rate factors:", factorsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch rate factors" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract unique values
    const leasingCompanies = [...new Set(rateFactors.map((r) => r.leasing_company))];
    const availableTerms = [...new Set(rateFactors.map((r) => r.term_months))].sort((a, b) => a - b);

    console.log(`Found ${rateFactors.length} rate factors for ${leasingCompanies.length} companies`);

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
