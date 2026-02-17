

# Fix Commission Form Data Mapping + Add Proposal Upload for Quotes

## Issue 1: Sold On Date Not Pulling Deal Close Date

**Root Cause**: The deal object returned by `hubspot-get-deal` has `closeDate` (camelCase "D") at the top level (line 390 of the edge function). However, `CommissionForm.tsx` checks `deal?.properties?.closedate` and `deal?.closedate` (lowercase "d"). Neither path matches because:
- The returned deal object has no `properties` sub-object -- it's flattened
- The property is `closeDate` (capital D), not `closedate`

**Fix**: Update `CommissionForm.tsx` line 161 to use the correct property path:
```typescript
const closeDate = deal?.closeDate || deal?.properties?.closedate;
```

## Issue 2: Condition Field Not Pulling from HubSpot

**Root Cause**: The `hubspot-get-deal` edge function never requests the `condition` property from HubSpot. Line 351 defines `lineItemPropsNeeded` with a fixed set of properties (`name, description, quantity, price, hs_sku, hs_product_type, hs_recurring_billing_period, hs_cost_of_goods_sold`), but `condition` is not in the list.

Even though `CommissionForm.tsx` correctly accesses `item.properties?.condition`, the property is never fetched from HubSpot's API, so it's always undefined.

**Fix**: Add `'condition'` to the default `lineItemPropsNeeded` set in `hubspot-get-deal/index.ts`:
```typescript
const lineItemPropsNeeded = new Set([
  'name', 'description', 'quantity', 'price', 'hs_sku', 
  'hs_product_type', 'hs_recurring_billing_period', 'hs_cost_of_goods_sold',
  'condition'  // ADD THIS
]);
```

## Issue 3: Proposal Document Upload for Quotes

### Overview
Allow dealers to upload a proposal document (PDF) in Admin Settings. When generating the Quote PDF, the uploaded proposal pages are prepended before the quote page.

### Admin Settings Changes
Add a "Proposal Template" section in Admin Settings (Document Settings tab) with:
- File upload button (accepts PDF only, max 20MB)
- Upload goes to `company-assets` storage bucket under `proposals/{portalId}/` folder
- Save the URL in `dealer_settings` table as `proposal_template_url`
- Show current file name with a "Remove" option

### Storage Changes
- Use existing `company-assets` bucket with a new `proposals` folder
- Update the storage policy migration to allow the `proposals` folder (currently restricted to `logos` only for INSERT)

### Quote PDF Generation Changes
When generating the Quote PDF (`handleGeneratePDF` in DocumentHub):
1. Check if `dealerSettings.proposal_template_url` exists
2. If yes, fetch the PDF, extract its pages using `pdf-lib` (a lightweight PDF manipulation library)
3. Create a new PDF document, copy all proposal pages first, then append the quote page(s)
4. Save the combined PDF

**Library**: Use `pdf-lib` (pure JavaScript, no native dependencies, works in browser) to merge PDFs.

### Quote Preview Changes
When showing the preview dialog, if a proposal template exists:
- Display a note/badge indicating "Proposal template will be prepended"
- The preview still shows just the quote page (proposal pages aren't rendered in HTML preview -- only in the final PDF)

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/commission/CommissionForm.tsx` | Fix `closeDate` property path (line 161) |
| `supabase/functions/hubspot-get-deal/index.ts` | Add `'condition'` to `lineItemPropsNeeded` (line 351) |
| `src/pages/admin/AdminSettings.tsx` | Add "Proposal Template" upload section |
| `src/pages/DocumentHub.tsx` | Merge proposal PDF with quote in `handleGeneratePDF`; pass `proposalTemplateUrl` to preview dialog |
| Migration SQL | Update storage policy to allow `proposals` folder uploads |

## Technical Details

### Storage Policy Update (Migration)
```sql
-- Drop the logos-only INSERT policy
DROP POLICY IF EXISTS "Allow logo uploads to company-assets" ON storage.objects;

-- Allow uploads to logos OR proposals folders
CREATE POLICY "Allow uploads to company-assets"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'company-assets' 
  AND (
    (storage.foldername(name))[1] = 'logos' 
    OR (storage.foldername(name))[1] = 'proposals'
  )
);
```

### Proposal Upload in AdminSettings
- New state: `proposalTemplateUrl`, `proposalUploading`
- Upload handler: uploads file to `company-assets/proposals/{portalId}/{filename}`
- Saves URL via existing `dealer-account-save` edge function as part of dealer settings
- Shows current file with remove button

### PDF Merging in DocumentHub
```typescript
import { PDFDocument } from 'pdf-lib';

// In handleGeneratePDF:
if (proposalTemplateUrl) {
  const proposalBytes = await fetch(proposalTemplateUrl).then(r => r.arrayBuffer());
  const proposalPdf = await PDFDocument.load(proposalBytes);
  const quotePdfBytes = pdf.output('arraybuffer');
  const quotePdf = await PDFDocument.load(quotePdfBytes);
  
  const mergedPdf = await PDFDocument.create();
  // Copy proposal pages first
  const proposalPages = await mergedPdf.copyPages(proposalPdf, proposalPdf.getPageIndices());
  proposalPages.forEach(p => mergedPdf.addPage(p));
  // Then quote pages
  const quotePages = await mergedPdf.copyPages(quotePdf, quotePdf.getPageIndices());
  quotePages.forEach(p => mergedPdf.addPage(p));
  
  const mergedBytes = await mergedPdf.save();
  // Save/download merged PDF
}
```

### New Dependency
- `pdf-lib` -- pure JS PDF creation/manipulation, ~200KB, no native deps

### DealerSettings Interface Update
```typescript
interface DealerSettings {
  // ...existing
  proposal_template_url?: string;
}
```

