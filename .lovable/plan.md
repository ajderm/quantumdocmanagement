

# Fix Plan: Product Library, Product Grouping, and Rep Cost Pricing

## Issue 1: Product Search Modal Not Loading

**Root Cause**: The HubSpot OAuth app is missing the `crm.objects.products.read` scope. The edge function logs show a `403 MISSING_SCOPES` error from HubSpot's API.

**Fix**: This is a HubSpot app configuration issue, not a code issue. You need to add the `crm.objects.products.read` scope to your HubSpot app settings:
1. Go to your HubSpot Developer account > Apps > your app
2. Under "Auth" > "Scopes", add `crm.objects.products.read` (or `e-commerce`)
3. Re-authorize the app for each portal (existing installs need to re-approve the new scope)

No code changes needed for this issue.

---

## Issue 2: Product Grouping (Hardware + Accessories)

This is a significant feature addition. The goal is to let users associate accessories/software with specific hardware items in the Quote, so that when Installation documents are generated per-hardware-unit, the accompanying accessories flow through.

### Data Model Change

Add a `parentLineItemId` field to `QuoteLineItem` to create parent-child relationships:

```typescript
export interface QuoteLineItem {
  // ... existing fields
  productType?: string;        // 'Hardware' | 'Accessory' | 'Software' | 'Service'
  parentLineItemId?: string;   // ID of the hardware item this accessory is tied to
}
```

### UI Changes (QuoteForm Equipment Table)

- Add a `productType` column (auto-populated from HubSpot `hs_product_type`, editable)
- For non-hardware items, add a "Linked To" dropdown showing available hardware items
- Visually indent linked accessories under their parent hardware
- When a product is added from the library, carry over its `productType`

### Installation Form Changes

- When generating an Installation document for a hardware item, include its linked accessories/software in the equipment section
- The `InstallationForm` already filters by hardware. Extend it to also pull in child line items where `parentLineItemId` matches the selected hardware's ID

### Files to Create/Modify

| File | Change |
|------|--------|
| `src/components/quote/QuoteForm.tsx` | Add `productType` and `parentLineItemId` to line items; add "Linked To" column; visual grouping |
| `src/components/quote/QuotePreview.tsx` | Show grouped equipment in output |
| `src/components/installation/InstallationForm.tsx` | Include linked accessories for selected hardware |
| `src/components/installation/InstallationPreview.tsx` | Show accessories in output |

---

## Issue 3: Rep Cost $0 and Pricing Calculations

**Root Cause**: The backend fetches `hs_cost_of_goods_sold` for line item cost. The user says the correct property is `unit_cost`. Additionally, HubSpot line items may store cost in `unit_cost` (per-unit) vs `hs_cost_of_goods_sold` (which may be a total or may be empty).

### Backend Fix

In `supabase/functions/hubspot-get-deal/index.ts`:
- Add `unit_cost` to `lineItemPropsNeeded`
- Use `unit_cost` as primary cost source, fall back to `hs_cost_of_goods_sold`:
  ```typescript
  cost: parseFloat(lineItemResponse.properties.unit_cost) 
     || parseFloat(lineItemResponse.properties.hs_cost_of_goods_sold) 
     || 0,
  ```

In `supabase/functions/hubspot-get-products/index.ts`:
- Add `unit_cost` to the properties list
- Use `unit_cost` as primary, fall back to `hs_cost_of_goods_sold`

### Frontend Pricing Calculations (already correct, just need cost data)

The QuoteForm already has the correct calculation logic:
- Line 508-511: When `cost` or `markupPercent` changes, `price = cost * (1 + markup/100)`
- Line 479-487: `retailPrice` auto-recalculates as sum of `item.price * item.quantity`

Once Rep Cost populates correctly from the backend, these calculations will work. No frontend pricing logic changes needed.

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/hubspot-get-deal/index.ts` | Add `unit_cost` property; use as primary cost source |
| `supabase/functions/hubspot-get-products/index.ts` | Add `unit_cost` property; use as primary cost source |

---

## Implementation Order

1. **Rep Cost fix** (backend edge functions) - quick, unblocks pricing
2. **Product Grouping** (QuoteLineItem model + UI + Installation flow) - larger feature
3. **Product Search** - requires HubSpot app scope change (manual step by user)

