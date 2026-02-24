

# Phase 2 -- Enhancements (Tasks 5-11)

## Status of Each Task

| # | Task | Status | Work Needed |
|---|------|--------|-------------|
| 5 | Mono vs. Color classification | Not started | Full implementation |
| 6 | Sold-On date default to close date | Already done | No work needed |
| 7 | Transaction Type dropdown | Partial | Convert text input to dropdown with dynamic leasing partners |
| 8 | Backend per-rep commission defaults | Partial | Add dynamic HubSpot owner fetching alongside manual fallback |
| 9 | Default cost fields | Partial | Set connectivity default to $100, convert promo/discount to text, add split rep selector |
| 10 | Lease term constraints by company | Already done | No work needed |
| 11 | Build vs. Rep Cost columns | Already done | No work needed |

---

## Task 5: Mono vs. Color Machine Classification

Add a "Machine Type" toggle per line item on forms that have equipment tables.

**Changes:**

1. **CommissionForm.tsx** -- Add a `machineType` field ("Color" | "Mono") to `CommissionLineItem`. Add a dropdown column in the line items table. When "Mono" is selected, grey out any color-related fields on that row (currently the commission form does not have separate color/mono rate fields, so this is primarily a data classification for now).

2. **QuoteForm.tsx** -- Add the same `machineType` field to quote line items. When "Mono" is selected, disable/grey-out and zero any color overage fields (e.g., "Overage Color Rate", "Included Color") on that line item.

3. **hubspot-get-deal/index.ts** -- Add `color_mono` or `machine_type` to `lineItemPropsNeeded` to attempt auto-detection from HubSpot. Default to "Color" if not set.

**Files:** `CommissionForm.tsx`, `QuoteForm.tsx`, `hubspot-get-deal/index.ts`

---

## Task 7: Transaction Type Dropdown

Replace the plain text input with a structured dropdown.

**Changes in CommissionForm.tsx:**

1. Replace the Transaction Type `<Input>` with a `<Select>` dropdown containing:
   - "Purchase"
   - Dynamic entries from `leasingCompanies` (already fetched), formatted as "Lease -- {Company Name}"
2. When a lease option is selected, auto-populate `leaseCompany` in the Lease Information section with the matching company name.
3. When "Purchase" is selected, clear lease-related fields and optionally visually dim the Lease Information card.

**Files:** `CommissionForm.tsx`

---

## Task 8: Dynamic HubSpot Owner Fetching for Commission Defaults

Currently, commission users are added manually in Admin Settings. This task adds dynamic fetching of HubSpot owners as a convenience, with manual fallback.

**Changes:**

1. **New edge function: `hubspot-get-owners/index.ts`** -- Fetches all owners from the HubSpot portal (`/crm/v3/owners`) and returns their names, IDs, and emails. Requires `portalId` for token lookup.

2. **AdminSettings.tsx** -- Add a "Fetch from HubSpot" button next to the Commission Users section. When clicked, it calls the new edge function, retrieves active owners, and offers to add any that are not already in the manual list. Users can still manually add/remove reps.

**Files:** `supabase/functions/hubspot-get-owners/index.ts` (new), `AdminSettings.tsx`

---

## Task 9: Default Cost Field Corrections

**Changes in CommissionForm.tsx:**

1. Set `connectivity` default to `100` (currently `0`) in `getDefaultCommissionFormData()` and the initial text state.
2. Convert `promoDiscounts` from a currency input to a **text input** (notes field) -- change the type from `number` to `string` in the form data interface. Update the field to accept free text like "DIR deal" instead of dollar amounts. Remove it from commission calculations (it was being subtracted from net equipment rev).
3. Add a split rep selector: when `splitPercentage > 0`, show a dropdown of commission users (from the `commissionUsers` prop) to select who the split is with. Store as `splitRepName` in the form data.

**Files:** `CommissionForm.tsx`, `CommissionPreview.tsx` (if the preview displays promo as currency)

---

## Technical Details

### New Edge Function: hubspot-get-owners

```text
supabase/functions/hubspot-get-owners/index.ts
- Accepts { portalId }
- Validates portalId format
- Verifies portal has valid HubSpot token
- Calls GET /crm/v3/owners?limit=100
- Returns array of { id, firstName, lastName, email }
```

### CommissionForm.tsx Changes

```text
Interface changes:
- Add machineType: "Color" | "Mono" to CommissionLineItem
- Change promoDiscounts from number to string
- Add splitRepName: string to CommissionFormData

UI changes:
- Transaction Type: Replace Input with Select dropdown
- Add Machine Type column to line items table
- Promo/Discount: Change to text Input (no currency formatting)
- Split section: Show rep selector dropdown when split % > 0
- Connectivity default: 100 instead of 0

Calculation changes:
- Remove promoDiscounts from netEquipRev calculation
  (it becomes a notes field, not a dollar amount)
```

### QuoteForm.tsx Changes

```text
- Add machineType field to quote line items
- When "Mono" selected, disable color-specific fields on that row
- Auto-detect from HubSpot line item property if available
```

### AdminSettings.tsx Changes

```text
- Add "Fetch HubSpot Owners" button in Commission Users section
- On click: call hubspot-get-owners edge function
- Merge returned owners with existing manual list
- Preserve existing commission percentages for known users
```

### hubspot-get-deal/index.ts Changes

```text
- Add 'color_mono' and 'machine_type' to lineItemPropsNeeded
- Map machineType in line item response: 
  properties.color_mono || properties.machine_type || 'Color'
```

### Files Modified Summary

| File | Changes |
|------|---------|
| `src/components/commission/CommissionForm.tsx` | Transaction Type dropdown, machine type column, promo as text, connectivity default, split rep selector |
| `src/components/commission/CommissionPreview.tsx` | Update promo display from currency to text |
| `src/components/quote/QuoteForm.tsx` | Machine type per line item, disable color fields for mono |
| `src/pages/admin/AdminSettings.tsx` | Fetch HubSpot Owners button |
| `supabase/functions/hubspot-get-owners/index.ts` | New -- fetch portal owners from HubSpot API |
| `supabase/functions/hubspot-get-deal/index.ts` | Add color_mono/machine_type to line item properties |

### Backward Compatibility

- Existing saved configs without `machineType` default to "Color" (no behavior change).
- Existing saved `promoDiscounts` as a number will be converted to string on load.
- `splitRepName` defaults to empty string if not present in saved config.
- Connectivity default change only affects new forms; saved configs preserve their value.
- Tasks 6, 10, and 11 require no changes as they are already implemented.

