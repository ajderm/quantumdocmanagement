

# Audit & Fix Product Classification Logic

## Problem

The app relies entirely on HubSpot's `hs_product_type` property to classify products as Hardware, Accessory, Service, etc. The edge function (`hubspot-get-products`) passes the `productType` filter as an exact-match `EQ` filter to HubSpot's search API, and the `ProductSearchModal` displays whatever `hs_product_type` value HubSpot returns. There is **no normalization, validation, or override** in the pipeline.

This means:
1. If HubSpot products have inconsistent `hs_product_type` values (e.g., "hardware" vs "Hardware", blank, or wrong values), the app faithfully passes them through — causing misclassification in the Hardware vs Accessory filter tabs.
2. The filter badges use exact strings `"Hardware"`, `"Accessory"`, `"Service"` — any casing or naming mismatch means products silently disappear from filtered views or show up in the wrong category.
3. There is no mechanism for admins to correct a product's type without going back to HubSpot.

## Solution

### 1. Add product type override table (database)

Create `product_type_overrides` table allowing per-portal overrides of product classifications:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| portal_id | text NOT NULL | Tenant isolation |
| hs_product_id | text NOT NULL | HubSpot product ID |
| product_type | text NOT NULL | Corrected type: Hardware, Accessory, Service, Software |
| created_at | timestamptz | |

Unique constraint on `(portal_id, hs_product_id)`. RLS: service_role only.

### 2. Update `hubspot-get-products` edge function

After fetching products from HubSpot:
- Query `product_type_overrides` for the portal
- For each product, if an override exists, replace `productType` with the override value
- Normalize `hs_product_type` values: trim whitespace, title-case (e.g., "hardware" → "Hardware", "ACCESSORY" → "Accessory")
- When a `productType` filter is passed, apply it **after** normalization + overrides (client-side filter), not solely via HubSpot's `EQ` filter — this ensures overridden products appear in the correct category

### 3. Update `ProductSearchModal` 

- Show a small "reclassify" action on each product row (e.g., a dropdown or icon) so admins can correct the type inline
- When reclassified, save to `product_type_overrides` via a new edge function call
- Display the effective type (override > normalized HubSpot value)

### 4. New edge function: `product-type-override-save`

- Input: `{ portalId, hsProductId, productType }`
- Upserts into `product_type_overrides`
- Used by the product search modal reclassify action

### 5. Admin visibility (optional enhancement in AdminSettings)

- Add a "Product Overrides" section showing all overridden products for the portal, with ability to remove overrides

## Files Modified/Created

| File | Change |
|------|--------|
| **Database migration** | Create `product_type_overrides` table |
| `supabase/functions/hubspot-get-products/index.ts` | Add normalization + override lookup after HubSpot fetch |
| `supabase/functions/product-type-override-save/index.ts` | **New** — upsert product type overrides |
| `src/components/quote/ProductSearchModal.tsx` | Add reclassify dropdown per product row, call override save |
| `supabase/config.toml` | Register new edge function |

## Key Implementation Detail

The normalization mapping applied server-side:

```text
Normalize hs_product_type:
  - Trim whitespace
  - Title-case first letter
  - Map known variants: "hw" → "Hardware", "acc" → "Accessory", etc.
  - Then apply any portal-specific override from product_type_overrides
  - Then apply productType filter (if requested) on the normalized value
```

This ensures consistent classification regardless of how products are tagged in HubSpot, while giving admins a correction mechanism for genuinely misclassified items.

