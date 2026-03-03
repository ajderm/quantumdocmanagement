

# In-App Product Selection with HubSpot Sync

## Summary

Move line item configuration from HubSpot into the quote form. Reps will: (1) select a pricing tier, (2) search/add hardware from HubSpot's product library, (3) add accessories filtered to the same pricing tier, (4) configure quantities and pricing, and (5) on save, push all line items back to the HubSpot deal (replacing existing ones).

## Architecture

```text
┌─────────────────────────────────────────────────┐
│ QuoteForm                                       │
│  1. Special Pricing dropdown (existing)         │
│  2. "Add Product" button → product search modal │
│     - Fetches from HubSpot product library      │
│     - Filtered by hs_product_type + tier        │
│  3. Equipment grid (existing, now populated     │
│     from product search instead of deal)        │
│  4. On save → sync line items to HubSpot deal   │
└─────────────────────────────────────────────────┘
```

## Changes

### 1. New Edge Function: `hubspot-get-products`

Fetches products from HubSpot's product library using the CRM search API. Supports:
- Pagination (HubSpot returns 100 per page)
- Filtering by `hs_product_type` (hardware vs accessory)
- Search by name/SKU
- Returns: `id, name, hs_sku, description, price, hs_cost_of_goods_sold, hs_product_type, dealer/manufacturer/vendor`

```typescript
// POST body: { portalId, search?, productType?, after? }
// HubSpot API: POST /crm/v3/objects/products/search
```

### 2. New Edge Function: `hubspot-sync-line-items`

Replaces all line items on a HubSpot deal:
1. Fetch existing line item associations for the deal
2. Delete all existing line items (batch delete via `POST /crm/v3/objects/line_items/batch/archive`)
3. Create new line items from the quote configuration (batch create via `POST /crm/v3/objects/line_items/batch/create`)
4. Associate new line items with the deal

```typescript
// POST body: { portalId, dealId, lineItems: [{ hs_product_id, quantity, price, ... }] }
```

### 3. QuoteForm UI Changes (`QuoteForm.tsx`)

**Product Search Modal**: New dialog component triggered by "Add Product" button (replaces current "Add Item" which adds a blank row). The modal shows:
- Search input (filters by name/SKU)
- Product type toggle: "Hardware" | "Accessories" 
- When a pricing tier is selected, only show products that exist in that tier's price list (match by model/SKU)
- When no tier selected (Standard), show all products
- Product list with name, SKU, MSRP, and "Add" button
- Adding a product inserts it into the line items grid with tier pricing applied

**Equipment grid**: Mostly unchanged. The "Add Item" button becomes "Add Product" and opens the modal. Manual blank row add still available as secondary option.

**Accessory filtering logic**: When tier is selected, fetch products → filter to only those whose `hs_sku` appears in the tier's price list. This enforces "same pricing list = compatible."

### 4. Line Item Sync on Save (`DocumentHub.tsx`)

After the existing `save-configuration` call for the quote, add a call to `hubspot-sync-line-items` to push line items back to the deal. This ensures HubSpot stays in sync.

Add a "Sync to HubSpot" button or make it part of the save flow. Show a toast on success/failure.

### 5. Config Changes (`supabase/config.toml`)

Register new edge functions with `verify_jwt = false`.

## Files Modified/Created

| File | Change |
|------|--------|
| `supabase/functions/hubspot-get-products/index.ts` | **New** — Fetch products from HubSpot product library |
| `supabase/functions/hubspot-sync-line-items/index.ts` | **New** — Replace deal line items in HubSpot |
| `supabase/config.toml` | Register new functions |
| `src/components/quote/QuoteForm.tsx` | Add product search modal, "Add Product" button, accessory filtering by tier |
| `src/pages/DocumentHub.tsx` | Add line item sync call after quote save |

## Key Implementation Details

- **Pricing tier filtering**: When a tier is selected, the product modal fetches all products but only shows those whose SKU matches an entry in the tier's `pricing_tier_prices` table. Rep cost is set from the tier price, not HubSpot's price.
- **Standard pricing**: When "Standard" is selected, all products are shown and rep cost comes from `hs_cost_of_goods_sold`.
- **Product type**: Uses `hs_product_type` property to separate hardware vs accessories in the modal tabs/filter.
- **Line item sync**: Runs on explicit save (not auto-save) to avoid accidental overwrites. Replaces all deal line items.

