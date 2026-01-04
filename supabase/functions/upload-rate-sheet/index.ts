import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RateRow {
  leasing_company: string;
  lease_program: string;
  min_amount: number | null;
  max_amount: number | null;
  term_months: number;
  rate_factor: number;
}

// Simple CSV parser
function parseCSV(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];
  
  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));
  
  // Parse data rows
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      const value = values[idx] || '';
      // Try to parse as number
      const num = parseFloat(value);
      row[header] = !isNaN(num) && value !== '' ? num : value;
    });
    rows.push(row);
  }
  return rows;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const portalId = formData.get("portalId") as string;

    if (!file) {
      console.error("No file provided");
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!portalId) {
      console.error("No portalId provided");
      return new Response(
        JSON.stringify({ error: "Portal ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing rate sheet upload for portal: ${portalId}, file: ${file.name}`);

    // Get dealer account
    const { data: dealerData, error: dealerError } = await supabase
      .from("dealer_accounts")
      .select("id")
      .eq("hubspot_portal_id", portalId)
      .maybeSingle();

    if (dealerError || !dealerData) {
      console.error("Dealer account not found:", dealerError);
      return new Response(
        JSON.stringify({ error: "Dealer account not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dealerAccountId = dealerData.id;
    console.log(`Found dealer account: ${dealerAccountId}`);

    // Read file content as text (CSV format)
    const text = await file.text();
    const jsonData = parseCSV(text);
    console.log(`Parsed ${jsonData.length} rows from CSV`);

    if (jsonData.length === 0) {
      return new Response(
        JSON.stringify({ error: "File is empty or invalid format. Please upload a CSV file." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and transform rows
    const rates: RateRow[] = [];
    const errors: string[] = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as Record<string, unknown>;
      const rowNum = i + 2; // Row number (1-indexed + header)

      // Find column names (handle variations)
      const leasingCompany = row["leasing_company"] || row["leasing_company_"] || "";
      const leaseProgram = row["lease_program"] || "";
      const minAmount = row["min_amount"] || null;
      const maxAmount = row["max_amount"] || null;
      const termMonths = row["term_months"] || row["term"] || 0;
      const rateFactor = row["rate_factor"] || row["rate"] || 0;

      // Validate required fields
      if (!leasingCompany) {
        errors.push(`Row ${rowNum}: Missing leasing_company`);
        continue;
      }
      if (!leaseProgram) {
        errors.push(`Row ${rowNum}: Missing lease_program`);
        continue;
      }
      if (!termMonths || isNaN(Number(termMonths))) {
        errors.push(`Row ${rowNum}: Invalid or missing term_months`);
        continue;
      }
      if (!rateFactor || isNaN(Number(rateFactor))) {
        errors.push(`Row ${rowNum}: Invalid or missing rate_factor`);
        continue;
      }

      rates.push({
        leasing_company: String(leasingCompany).trim(),
        lease_program: String(leaseProgram).trim(),
        min_amount: minAmount ? Number(minAmount) : null,
        max_amount: maxAmount ? Number(maxAmount) : null,
        term_months: Number(termMonths),
        rate_factor: Number(rateFactor),
      });
    }

    console.log(`Validated ${rates.length} rate rows, ${errors.length} errors`);

    if (rates.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No valid rate rows found", 
          details: errors.slice(0, 10) 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deactivate previous rate sheets for this dealer
    const { error: deactivateError } = await supabase
      .from("uploaded_rate_sheets")
      .update({ is_active: false })
      .eq("dealer_account_id", dealerAccountId)
      .eq("is_active", true);

    if (deactivateError) {
      console.error("Failed to deactivate old rate sheets:", deactivateError);
    }

    // Create new rate sheet
    const { data: rateSheet, error: rateSheetError } = await supabase
      .from("uploaded_rate_sheets")
      .insert({
        dealer_account_id: dealerAccountId,
        file_name: file.name,
        row_count: rates.length,
        is_active: true,
      })
      .select()
      .single();

    if (rateSheetError || !rateSheet) {
      console.error("Failed to create rate sheet:", rateSheetError);
      return new Response(
        JSON.stringify({ error: "Failed to save rate sheet" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Created rate sheet: ${rateSheet.id}`);

    // Insert all rate factors
    const rateFactors = rates.map((rate) => ({
      rate_sheet_id: rateSheet.id,
      leasing_company: rate.leasing_company,
      lease_program: rate.lease_program,
      min_amount: rate.min_amount,
      max_amount: rate.max_amount,
      term_months: rate.term_months,
      rate_factor: rate.rate_factor,
    }));

    const { error: insertError } = await supabase
      .from("lease_rate_factors")
      .insert(rateFactors);

    if (insertError) {
      console.error("Failed to insert rate factors:", insertError);
      // Rollback rate sheet
      await supabase.from("uploaded_rate_sheets").delete().eq("id", rateSheet.id);
      return new Response(
        JSON.stringify({ error: "Failed to save rate factors" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get unique leasing companies for response
    const uniqueCompanies = [...new Set(rates.map((r) => r.leasing_company))];
    const uniqueTerms = [...new Set(rates.map((r) => r.term_months))].sort((a, b) => a - b);

    console.log(`Successfully imported ${rates.length} rates for ${uniqueCompanies.length} companies`);

    return new Response(
      JSON.stringify({
        success: true,
        rateSheetId: rateSheet.id,
        fileName: file.name,
        rowCount: rates.length,
        leasingCompanies: uniqueCompanies,
        availableTerms: uniqueTerms,
        warnings: errors.length > 0 ? errors.slice(0, 5) : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing rate sheet:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process rate sheet", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
