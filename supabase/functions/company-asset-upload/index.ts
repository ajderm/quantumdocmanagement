import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_PREFIXES = ["logos/", "proposals/", "document-packets/"];
const MAX_BYTES = 25 * 1024 * 1024;

function safeName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "_").replace(/\.\./g, "_").slice(0, 200);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const formData = await req.formData();
    const action = String(formData.get("action") || "upload");
    const portalId = String(formData.get("portalId") || "");
    const folder = String(formData.get("folder") || "");
    const dealId = formData.get("dealId") ? String(formData.get("dealId")) : "";

    if (!portalId || !/^\d{1,20}$/.test(portalId)) {
      return new Response(JSON.stringify({ error: "Invalid portalId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (dealId && !/^\d{1,20}$/.test(dealId)) {
      return new Response(JSON.stringify({ error: "Invalid dealId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!ALLOWED_PREFIXES.some((p) => `${folder}/`.startsWith(p) || folder === p.slice(0, -1))) {
      return new Response(JSON.stringify({ error: "Invalid folder" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const path = String(formData.get("path") || "");
      // Enforce path stays within allowed namespace per portal
      const allowed = (folder === "document-packets")
        ? path.startsWith(`document-packets/${portalId}/`)
        : ALLOWED_PREFIXES.some((p) => path.startsWith(p));
      if (!allowed || path.includes("..")) {
        return new Response(JSON.stringify({ error: "Invalid path" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.storage.from("company-assets").remove([path]);
      if (error) {
        console.error("Delete error:", error);
        return new Response(JSON.stringify({ error: "Delete failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing file" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (file.size > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "File too large" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanName = safeName(file.name);
    let storagePath: string;
    if (folder === "logos") {
      storagePath = `logos/${portalId}-logo-${Date.now()}-${cleanName}`;
    } else if (folder === "proposals") {
      storagePath = `proposals/${portalId}-proposal-${Date.now()}-${cleanName}`;
    } else if (folder === "document-packets") {
      if (!dealId) {
        return new Response(JSON.stringify({ error: "Missing dealId" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      storagePath = `document-packets/${portalId}/${dealId}/${Date.now()}-${cleanName}`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid folder" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(storagePath, new Uint8Array(arrayBuffer), {
        contentType: file.type || "application/octet-stream",
        upsert: folder !== "document-packets",
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Upload failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: urlData } = supabase.storage.from("company-assets").getPublicUrl(storagePath);

    return new Response(
      JSON.stringify({ success: true, path: storagePath, publicUrl: urlData.publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("company-asset-upload error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
