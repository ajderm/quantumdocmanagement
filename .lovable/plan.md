
# Updates: Document Styling, Commission Form Fixes, and Signatures

## 1. Document Style Customization (Admin Settings)

### Overview
Add a new "Document Styles" section in Admin Settings where dealers can customize the visual appearance of all output documents. Settings are stored using the existing `dealer_settings` table (key: `document_styles`).

### Configurable Options
- **Font Family**: Dropdown with options: Arial (default), Helvetica, Times New Roman, Georgia, Verdana, Calibri
- **Font Color**: Color picker input, default `#000000`
- **Table Border Color**: Color picker input, default `#000000` (for header borders like `border-b-2 border-black`)
- **Table Line Color**: Color picker input, default `#d1d5db` (for inner row borders like `border-gray-300`)

### Data Flow
- Stored in `dealer_settings` table as `setting_key = 'document_styles'` with JSON value
- Loaded in `DocumentHub.tsx` from the existing `dealerSettings` object
- Passed as a `documentStyles` prop to every Preview component
- Each Preview applies via inline `style` attributes, falling back to current defaults

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/AdminSettings.tsx` | Add "Document Styles" card with font selector, 3 color pickers, and save logic |
| `src/pages/DocumentHub.tsx` | Extract `document_styles` from `dealerSettings`, pass to all previews |
| All 13 Preview components | Accept optional `documentStyles` prop, apply font/colors via inline styles |

### Technical Detail
A shared `DocumentStyles` interface will be defined and used across all previews:

```typescript
interface DocumentStyles {
  fontFamily?: string;   // default: "Arial, sans-serif"
  fontColor?: string;    // default: "#000000"
  tableBorderColor?: string;  // default: "#000000"
  tableLineColor?: string;    // default: "#d1d5db"
}
```

Each Preview's root `<div>` will change from:
```tsx
style={{ fontFamily: "Arial, sans-serif" }}
```
To:
```tsx
style={{
  fontFamily: documentStyles?.fontFamily || "Arial, sans-serif",
  color: documentStyles?.fontColor || "#000000",
}}
```

Table borders will use inline styles for border colors instead of Tailwind classes (e.g., `border-black` becomes `style={{ borderColor: documentStyles?.tableBorderColor || '#000000' }}`).

---

## 2. Commission Form: Sold On Date from Deal Close Date

### Current Behavior
`soldOnDate` defaults to `new Date().toISOString().split("T")[0]` (today's date).

### Fix
In `CommissionForm.tsx`, update the HubSpot data initialization to pull from the deal's `closedate`:

```typescript
soldOnDate: deal?.properties?.closedate || deal?.closedate || new Date().toISOString().split("T")[0],
```

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/commission/CommissionForm.tsx` | Map `soldOnDate` from deal close date |

---

## 3. Commission Form: Condition Field Fix

### Current Behavior (Line 170)
```typescript
condition: item.properties?.condition || item.properties?.hs_product_type || "",
```
This falls back to `hs_product_type` which is the product type, not the condition.

### Fix
Only use the `condition` property, remove the `hs_product_type` fallback:

```typescript
condition: item.properties?.condition || "",
```

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/commission/CommissionForm.tsx` | Remove `hs_product_type` fallback from condition mapping |

---

## 4. Commission Document: 3 Signature Fields

### Overview
Add a signature block at the bottom of the Commission Preview with three signature lines:
- Sales Rep Signature (with date)
- Sales Manager Signature (with date)
- President Signature (with date)

### Form Changes
Add 3 new fields to `CommissionFormData`:

```typescript
salesRepSignature: string;
salesManagerSignature: string;
presidentSignature: string;
```

These will be text inputs in the Commission form's new "Signatures" card section.

### Preview Output
At the bottom of the Commission Preview, add a signature block following the project style guide:

```
SIGNATURES
─────────────────────────────────────────────────────
Sales Rep: ___________________  Date: ___________
Sales Manager: _______________  Date: ___________
President: ___________________  Date: ___________
```

If a name is entered in the form, it renders above the signature line (printed name).

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/commission/CommissionForm.tsx` | Add 3 signature fields to form data and UI |
| `src/components/commission/CommissionPreview.tsx` | Add signature block to output |

---

## Summary of All File Changes

| File | Changes |
|------|---------|
| `src/pages/admin/AdminSettings.tsx` | New "Document Styles" card with font/color settings |
| `src/pages/DocumentHub.tsx` | Extract and pass `documentStyles` to all previews |
| `src/components/commission/CommissionForm.tsx` | Fix `soldOnDate` (closedate), fix `condition` (remove fallback), add signature fields |
| `src/components/commission/CommissionPreview.tsx` | Add signature block, accept `documentStyles` |
| `src/components/quote/QuotePreview.tsx` | Accept and apply `documentStyles` |
| `src/components/installation/InstallationPreview.tsx` | Accept and apply `documentStyles` |
| `src/components/service-agreement/ServiceAgreementPreview.tsx` | Accept and apply `documentStyles` |
| `src/components/fmv-lease/FMVLeasePreview.tsx` | Accept and apply `documentStyles` |
| `src/components/lease-funding/LeaseFundingPreview.tsx` | Accept and apply `documentStyles` |
| `src/components/lease-return/LeaseReturnPreview.tsx` | Accept and apply `documentStyles` |
| `src/components/loi/LoiPreview.tsx` | Accept and apply `documentStyles` |
| `src/components/interterritorial/InterterritorialPreview.tsx` | Accept and apply `documentStyles` |
| `src/components/new-customer/NewCustomerPreview.tsx` | Accept and apply `documentStyles` |
| `src/components/relocation/RelocationPreview.tsx` | Accept and apply `documentStyles` |
| `src/components/removal/RemovalPreview.tsx` | Accept and apply `documentStyles` |
| `src/components/custom-document/CustomDocumentPreview.tsx` | Accept and apply `documentStyles` |
