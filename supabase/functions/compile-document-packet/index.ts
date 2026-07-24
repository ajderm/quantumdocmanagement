import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PacketFile {
  storagePath: string;
  type: string;
  name: string;
  order: number;
  // When true, this file (e.g. a brochure) already has its own page numbers,
  // so the compiler must not stamp packet page numbers on its pages.
  skipPageNumbers?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { portalId, dealId, files, title, includeCoverPage, includePageNumbers, dealName, companyName } = body;

    // Anchor object type: deal-anchored packets keep the legacy path, other
    // anchors (e.g. projects) get their own namespace so a project and a deal
    // with the same record ID can't mix packet files.
    const rawObjectType = String(body.objectType || 'deals').toLowerCase().trim();
    const objectType = ['deals', 'deal', '0-3'].includes(rawObjectType) ? 'deals'
      : ['projects', 'project', '0-54'].includes(rawObjectType) ? 'projects'
      : null;
    if (!objectType) {
      return new Response(
        JSON.stringify({ error: "Unsupported objectType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const recordSegment = objectType === 'deals' ? String(dealId) : `${objectType}-${dealId}`;

    if (!portalId || !dealId || !files || files.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: portalId, dealId, files" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Security: validate portalId is numeric only (prevents path traversal)
    if (!/^\d{1,20}$/.test(String(portalId))) {
      return new Response(
        JSON.stringify({ error: "Invalid portalId format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Security: validate dealId is numeric only
    if (!/^\d{1,20}$/.test(String(dealId))) {
      return new Response(
        JSON.stringify({ error: "Invalid dealId format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Security: enforce all file storagePaths belong to this portal's namespace
    const allowedPrefix = `document-packets/${portalId}/`;
    const validatedFiles = (files as PacketFile[]).filter(f => {
      const path = String(f.storagePath || '');
      if (path.includes('..') || !path.startsWith(allowedPrefix)) {
        console.warn(`Blocked unauthorized file access attempt: ${path}`);
        return false;
      }
      return true;
    });

    if (validatedFiles.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid files to compile" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sortedFiles = [...validatedFiles].sort((a, b) => a.order - b.order);
    const masterPdf = await PDFDocument.create();
    const font = await masterPdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await masterPdf.embedFont(StandardFonts.HelveticaBold);

    // Cover page
    if (includeCoverPage) {
      const coverPage = masterPdf.addPage([612, 792]);
      const { width, height } = coverPage.getSize();

      coverPage.drawText(title || "Document Packet", {
        x: 72, y: height - 200, size: 28, font: fontBold, color: rgb(0, 0, 0),
      });

      if (companyName) {
        coverPage.drawText(`Prepared for: ${companyName}`, {
          x: 72, y: height - 250, size: 14, font, color: rgb(0.3, 0.3, 0.3),
        });
      }

      if (dealName) {
        coverPage.drawText(`Deal: ${dealName}`, {
          x: 72, y: height - 275, size: 12, font, color: rgb(0.4, 0.4, 0.4),
        });
      }

      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      coverPage.drawText(`Generated: ${dateStr}`, {
        x: 72, y: height - 310, size: 11, font, color: rgb(0.5, 0.5, 0.5),
      });

      coverPage.drawText("Contents:", {
        x: 72, y: height - 370, size: 14, font: fontBold, color: rgb(0, 0, 0),
      });

      sortedFiles.forEach((file, i) => {
        const yPos = height - 400 - (i * 22);
        if (yPos > 72) {
          coverPage.drawText(`${i + 1}. ${file.name}`, {
            x: 90, y: yPos, size: 11, font, color: rgb(0.2, 0.2, 0.2),
          });
        }
      });
    }

    const errors: string[] = [];
    let totalPagesAdded = includeCoverPage ? 1 : 0;
    // Master-PDF page indices that must NOT receive a packet page number
    // (files flagged as already having their own page numbers).
    const skipNumberPageIndices = new Set<number>();

    for (const file of sortedFiles) {
      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("company-assets")
          .download(file.storagePath);

        if (downloadError || !fileData) {
          errors.push(`${file.name}: Download failed`);
          continue;
        }

        const arrayBuffer = await fileData.arrayBuffer();

        if (file.type === "pdf") {
          try {
            const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const copiedPages = await masterPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
            copiedPages.forEach(page => {
              const idx = masterPdf.getPageCount(); // index this page will occupy
              masterPdf.addPage(page);
              if (file.skipPageNumbers) skipNumberPageIndices.add(idx);
              totalPagesAdded++;
            });
          } catch {
            errors.push(`${file.name}: Could not read PDF (may be encrypted or corrupted)`);
          }
        } else if (file.type === "png" || file.type === "jpg" || file.type === "jpeg") {
          try {
            const image = file.type === "png"
              ? await masterPdf.embedPng(arrayBuffer)
              : await masterPdf.embedJpg(arrayBuffer);

            const pageWidth = 612;
            const pageHeight = 792;
            const margin = 36;
            const availWidth = pageWidth - (margin * 2);
            const availHeight = pageHeight - (margin * 2);
            const imgAspect = image.width / image.height;
            const pageAspect = availWidth / availHeight;

            let drawWidth: number, drawHeight: number;
            if (imgAspect > pageAspect) {
              drawWidth = availWidth;
              drawHeight = availWidth / imgAspect;
            } else {
              drawHeight = availHeight;
              drawWidth = availHeight * imgAspect;
            }

            const page = masterPdf.addPage([pageWidth, pageHeight]);
            page.drawImage(image, {
              x: margin + (availWidth - drawWidth) / 2,
              y: margin + (availHeight - drawHeight) / 2,
              width: drawWidth,
              height: drawHeight,
            });
            totalPagesAdded++;
          } catch {
            errors.push(`${file.name}: Could not process image`);
          }
        } else if (file.type === "docx") {
          // Placeholder for DOCX - instruct user to convert to PDF
          const page = masterPdf.addPage([612, 792]);
          page.drawText(`[Document: ${file.name}]`, {
            x: 72, y: 720, size: 14, font: fontBold, color: rgb(0.3, 0.3, 0.3),
          });
          page.drawText("Word document included in packet. For best results,", {
            x: 72, y: 695, size: 11, font, color: rgb(0.5, 0.5, 0.5),
          });
          page.drawText("please convert this file to PDF before uploading.", {
            x: 72, y: 675, size: 11, font, color: rgb(0.5, 0.5, 0.5),
          });
          totalPagesAdded++;
          errors.push(`${file.name}: DOCX files are included as placeholder pages. Convert to PDF for best results.`);
        }
      } catch {
        errors.push(`${file.name}: Unexpected error processing file`);
      }
    }

    // Page numbers
    if (includePageNumbers && totalPagesAdded > 0) {
      const pages = masterPdf.getPages();
      const startIndex = includeCoverPage ? 1 : 0;
      for (let i = startIndex; i < pages.length; i++) {
        // Task 13: do not double-number pages that already carry their own numbers
        // (e.g. brochures flagged as already numbered).
        if (skipNumberPageIndices.has(i)) continue;
        const page = pages[i];
        const { width } = page.getSize();
        const pageNum = includeCoverPage ? i : i + 1;
        const totalPages = includeCoverPage ? pages.length - 1 : pages.length;
        const text = `Page ${pageNum} of ${totalPages}`;
        const textWidth = font.widthOfTextAtSize(text, 9);
        page.drawText(text, {
          x: width - textWidth - 36, y: 24, size: 9, font, color: rgb(0.6, 0.6, 0.6),
        });
      }
    }

    // Save compiled PDF
    const pdfBytes = await masterPdf.save();
    const outputPath = `document-packets/${portalId}/${recordSegment}/compiled-${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(outputPath, pdfBytes, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: `Failed to save compiled PDF: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: urlData } = supabase.storage.from("company-assets").getPublicUrl(outputPath);

    return new Response(
      JSON.stringify({
        pdfUrl: urlData.publicUrl,
        totalPages: totalPagesAdded,
        filesProcessed: sortedFiles.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Compile error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
