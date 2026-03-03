

# Continue: Wire Form Customization into AdminSettings, DocumentHub, and All Forms/Previews

## Current State

The core infrastructure is built:
- `src/lib/formCustomization.ts` — registry of all 12 doc types with sections/fields, plus `getLabel()` and `isSectionVisible()` utilities
- `src/components/admin/FormCustomizationTab.tsx` — admin UI component for toggling sections and renaming fields

**Not yet done:**
1. FormCustomizationTab is not wired into AdminSettings
2. `form_customization` is not loaded/saved via dealer settings
3. DocumentHub doesn't load or pass customization config to forms/previews
4. None of the 24 form/preview files use `getLabel()` or `isSectionVisible()`

## Plan

### Phase 1: Wire AdminSettings + Persistence

**`src/pages/admin/AdminSettings.tsx`**
- Add state: `formCustomization` (type `FormCustomizationMap`)
- Load from `dealerSettings.form_customization` on fetch
- Include `form_customization: formCustomization` in `dealerSettings` object passed to `dealer-account-save`
- Add a new tab trigger "Form Customization" with `Settings2` icon
- Add `<TabsContent value="form-customization">` rendering `<FormCustomizationTab value={formCustomization} onChange={setFormCustomization} />`

No edge function changes needed — the existing `dealer-account-save` already iterates `dealerSettings` entries and upserts each `setting_key`. The `form_customization` key will be stored as a single JSON object.

### Phase 2: Load Customization in DocumentHub

**`src/pages/DocumentHub.tsx`**
- Import `FormCustomizationConfig` and `FormCustomizationMap` from `formCustomization.ts`
- Add state: `formCustomization` (type `FormCustomizationMap`, default `{}`)
- In the `fetchDealerInfo` effect, extract `data.dealerSettings.form_customization` and set it
- Pass the appropriate `FormCustomizationConfig` to each form and preview component as a new `formCustomization` prop (e.g., `formCustomization={formCustomization['quote']}`)

### Phase 3: Update All Form + Preview Components

For each of the 12 document types, update both the Form and Preview to:

1. **Accept new prop**: `formCustomization?: FormCustomizationConfig`
2. **Import utilities**: `import { getLabel, isSectionVisible, FormCustomizationConfig } from '@/lib/formCustomization'`
3. **Wrap sections**: `{isSectionVisible(formCustomization, 'sectionKey') && (<Card>...</Card>)}`
4. **Replace labels**: Change hardcoded strings to `{getLabel(formCustomization, 'fieldKey', 'Default Label')}`

Files to modify (24 total):

| Form | Preview |
|------|---------|
| QuoteForm.tsx | QuotePreview.tsx |
| InstallationForm.tsx | InstallationPreview.tsx |
| ServiceAgreementForm.tsx | ServiceAgreementPreview.tsx |
| FMVLeaseForm.tsx | FMVLeasePreview.tsx |
| LeaseFundingForm.tsx | LeaseFundingPreview.tsx |
| LoiForm.tsx | LoiPreview.tsx |
| LeaseReturnForm.tsx | LeaseReturnPreview.tsx |
| InterterritorialForm.tsx | InterterritorialPreview.tsx |
| NewCustomerForm.tsx | NewCustomerPreview.tsx |
| RelocationForm.tsx | RelocationPreview.tsx |
| RemovalForm.tsx | RemovalPreview.tsx |
| CommissionForm.tsx | CommissionPreview.tsx |

Each form/preview change is mechanical: add the prop, wrap sections with `isSectionVisible`, replace label strings with `getLabel`. The section keys and field keys match those defined in `FORM_REGISTRIES`.

### Implementation Order

Given the volume (~28 files), I'll implement in batches:
1. AdminSettings + DocumentHub wiring (2 files)
2. Quote form + preview (proof of concept, 2 files)
3. Remaining 10 form/preview pairs (20 files) in parallel batches

### No Database or Edge Function Changes

The existing `dealer_settings` table and `dealer-account-save`/`dealer-account-get` edge functions already support arbitrary key-value settings. `form_customization` will be stored as one JSON value under that key.

