

# Field Renaming & Section Visibility Across All Document Forms

## Problem

All 12+ document forms have hardcoded field labels and section titles. There is no mechanism to rename fields or hide sections, and no way to ensure those changes carry through to the output (preview/PDF).

## Architecture

```text
┌─────────────────────────────────────────────────────┐
│ Admin Settings → "Form Customization" tab           │
│  - Select document type                             │
│  - Per-section: toggle visibility (show/hide)       │
│  - Per-field: edit label (inline rename)             │
│  - Saved to dealer_settings table                   │
└──────────────┬──────────────────────────────────────┘
               │ stored as JSON in dealer_settings
               ▼
┌─────────────────────────────────────────────────────┐
│ useFormCustomization(docType, portalId) hook         │
│  - getLabel(fieldKey, defaultLabel) → custom or def  │
│  - isSectionVisible(sectionKey) → boolean            │
│  - Returns customization config for Preview too      │
└──────────────┬──────────────────────────────────────┘
               │ consumed by
               ▼
┌─────────────────┐    ┌──────────────────┐
│ *Form.tsx (x12)  │    │ *Preview.tsx (x12)│
│ - Labels use     │    │ - Labels use      │
│   getLabel()     │    │   getLabel()      │
│ - Sections wrap  │    │ - Sections wrap   │
│   isSectionVis() │    │   isSectionVis()  │
└─────────────────┘    └──────────────────┘
```

## Data Model

Stored in existing `dealer_settings` table with `setting_key = 'form_customization'` and `setting_value` as:

```json
{
  "quote": {
    "fieldLabels": {
      "quoteNumber": "Proposal Number",
      "companyName": "Client Name"
    },
    "hiddenSections": ["buyout", "serviceAgreement"]
  },
  "installation": {
    "fieldLabels": { "meterBlack": "B/W Meter" },
    "hiddenSections": ["networking"]
  }
}
```

No new database table needed — reuses existing `dealer_settings` infrastructure.

## Section & Field Registry

Each document type needs a static registry defining its sections and fields with default labels. This serves as the source of truth for the admin customization UI:

```typescript
// src/lib/formCustomizationRegistry.ts
export const FORM_REGISTRIES: Record<string, FormRegistry> = {
  quote: {
    sections: [
      { key: 'customerInfo', defaultTitle: 'Customer Information' },
      { key: 'equipment', defaultTitle: 'Equipment' },
      { key: 'pricing', defaultTitle: 'Pricing' },
      { key: 'serviceAgreement', defaultTitle: 'Service Agreement' },
      { key: 'buyout', defaultTitle: 'Buyout' },
      { key: 'leaseTerms', defaultTitle: 'Lease Terms' },
    ],
    fields: [
      { key: 'quoteNumber', defaultLabel: 'Quote Number', section: 'customerInfo' },
      { key: 'companyName', defaultLabel: 'Company Name', section: 'customerInfo' },
      // ... all fields
    ]
  },
  // ... all 12 document types
};
```

## Shared Hook

```typescript
// src/hooks/useFormCustomization.ts
function useFormCustomization(docType: string, portalId: string) {
  // Fetches from dealer_settings via existing get-configuration edge function
  // Returns:
  //   getLabel(fieldKey, defaultLabel) → string
  //   getSectionTitle(sectionKey, defaultTitle) → string
  //   isSectionVisible(sectionKey) → boolean
  //   customization (raw config for passing to Preview)
}
```

## Edge Function Changes

Reuse existing `get-configuration` / `save-configuration` pattern with `config_type = 'form_customization'`. Alternatively, use `dealer-account-save` to update `dealer_settings`. The customization is portal-level (not deal-level), so it fits `dealer_settings`.

New edge function: `form-customization-save` — saves the customization JSON for a portal. New edge function: `form-customization-get` — loads it.

## Admin UI

Add a new tab "Form Customization" in AdminSettings:
- Dropdown to select document type
- List of sections with show/hide toggle (eye icon)
- Under each section, list of fields with editable label input
- Save button persists to `dealer_settings`

## Form & Preview Changes (All 12 types)

Each form/preview gets two changes:
1. **Section wrapping**: Each `<Card>` section gets wrapped with `{isSectionVisible('sectionKey') && (<Card>...</Card>)}`
2. **Label replacement**: Each `<Label>` or header text becomes `{getLabel('fieldKey', 'Default Label')}` in forms, and the same in preview text

The customization config object is passed from DocumentHub → Form → Preview via props.

## Files Created/Modified

| File | Change |
|------|--------|
| `src/lib/formCustomizationRegistry.ts` | **New** — Section/field definitions for all 12 doc types |
| `src/hooks/useFormCustomization.ts` | **New** — Shared hook for label/visibility lookups |
| `supabase/functions/form-customization-save/index.ts` | **New** — Save customization config |
| `supabase/functions/form-customization-get/index.ts` | **New** — Load customization config |
| `src/pages/admin/AdminSettings.tsx` | Add "Form Customization" tab |
| `src/pages/DocumentHub.tsx` | Load customization, pass to forms/previews |
| `src/components/quote/QuoteForm.tsx` | Apply getLabel + isSectionVisible |
| `src/components/quote/QuotePreview.tsx` | Apply getLabel + isSectionVisible |
| `src/components/installation/InstallationForm.tsx` | Apply getLabel + isSectionVisible |
| `src/components/installation/InstallationPreview.tsx` | Apply getLabel + isSectionVisible |
| `src/components/service-agreement/ServiceAgreementForm.tsx` | Apply getLabel + isSectionVisible |
| `src/components/service-agreement/ServiceAgreementPreview.tsx` | Apply getLabel + isSectionVisible |
| `src/components/fmv-lease/FMVLeaseForm.tsx` | Apply getLabel + isSectionVisible |
| `src/components/fmv-lease/FMVLeasePreview.tsx` | Apply getLabel + isSectionVisible |
| `src/components/loi/LoiForm.tsx` | Apply getLabel + isSectionVisible |
| `src/components/loi/LoiPreview.tsx` | Apply getLabel + isSectionVisible |
| `src/components/new-customer/NewCustomerForm.tsx` | Apply getLabel + isSectionVisible |
| `src/components/new-customer/NewCustomerPreview.tsx` | Apply getLabel + isSectionVisible |
| `src/components/removal/RemovalForm.tsx` | Apply getLabel + isSectionVisible |
| `src/components/removal/RemovalPreview.tsx` | Apply getLabel + isSectionVisible |
| `src/components/relocation/RelocationForm.tsx` | Apply getLabel + isSectionVisible |
| `src/components/relocation/RelocationPreview.tsx` | Apply getLabel + isSectionVisible |
| `src/components/lease-funding/LeaseFundingForm.tsx` | Apply getLabel + isSectionVisible |
| `src/components/lease-funding/LeaseFundingPreview.tsx` | Apply getLabel + isSectionVisible |
| `src/components/lease-return/LeaseReturnForm.tsx` | Apply getLabel + isSectionVisible |
| `src/components/lease-return/LeaseReturnPreview.tsx` | Apply getLabel + isSectionVisible |
| `src/components/interterritorial/InterterritorialForm.tsx` | Apply getLabel + isSectionVisible |
| `src/components/interterritorial/InterterritorialPreview.tsx` | Apply getLabel + isSectionVisible |
| `src/components/commission/CommissionForm.tsx` | Apply getLabel + isSectionVisible |
| `src/components/commission/CommissionPreview.tsx` | Apply getLabel + isSectionVisible |
| `supabase/config.toml` | Register new edge functions |

## Implementation Order

Given the scale (~30 files), implementation will proceed in phases:
1. Registry, hook, edge functions, admin UI
2. Quote form + preview (as proof of concept)
3. All remaining forms + previews

