

# Special Pricing Tiers — Dropdown with Fixed Price Lists

## Summary

Replace the free-text "Special Pricing / Credits" field on both the Commission and Quote forms with a dropdown selector. Each pricing tier (Standard, DIR, NASPO, SourceWell, Nonprofit, etc.) has a fixed price list mapping product models to rep costs. Selecting a tier applies the corresponding rep cost to all matching line items. Admins configure tiers and their price lists via a new admin settings tab.

## Database Changes

### New table: `pricing_tiers`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| portal_id | text NOT NULL | Tenant isolation |
| name | text NOT NULL | e.g. "DIR", "NASPO" |
| sort_order | int DEFAULT 0 | Display order |
| is_active | boolean DEFAULT true | |
| created_at / updated_at | timestamptz | |

Unique constraint on `(portal_id, name)`. RLS: service_role only (accessed via edge functions).

### New table: `pricing_tier_prices`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| pricing_tier_id | uuid FK → pricing_tiers | |
| product_model | text NOT NULL | Matches line item model |
| rep_cost | numeric NOT NULL | Fixed cost for this tier |
| created_at | timestamptz | |

Unique constraint on `(pricing_tier_id, product_model)`. RLS: service_role only.

## Backend Changes

### New edge function: `pricing-tiers-get`

- Input: `{ portalId }`
- Returns all active pricing tiers for the portal, each with their price list (array of `{ product_model, rep_cost }`)
- Used by both Quote and Commission forms on load

### New edge function: `pricing-tiers-save`

- Input: `{ portalId, tiers: [{ name, prices: [{ product_model, rep_cost }] }] }`
- Admin-only: upserts tiers and their price lists
- Used by admin settings page

## Frontend Changes

### 1. Commission Form (`CommissionForm.tsx`)

- Add `specialPricingTier: string` to `CommissionFormData` (deal-level, not per-line-item)
- Replace per-item `specialPricing` text input with a single dropdown above the equipment grid
- On tier selection: look up each line item's model in the tier's price list → update `repCost` for all matching items
- Remove `specialPricing` column from the per-item grid (replaced by deal-level dropdown)
- Keep `specialPricing` on `CommissionLineItem` for backward compatibility / display on preview

### 2. Quote Form (`QuoteForm.tsx`)

- Add `specialPricingTier: string` to `QuoteFormData`
- Add dropdown above the equipment grid (near leasing company / config section)
- On tier selection: look up each line item's model in the tier's price list → update `cost` (rep cost) for all matching items
- Recalculate `price` (sell price) based on new cost + existing markup%

### 3. Commission Preview (`CommissionPreview.tsx`)

- Show selected tier name in the "Special Pricing" column or as a header-level label

### 4. Admin Settings (`AdminSettings.tsx`)

- New "Pricing Tiers" tab
- List existing tiers with ability to add/remove
- Each tier has a price list table: product model + rep cost
- Support CSV upload for bulk price list entry (similar to rate sheet upload pattern)

## Repricing Logic (both forms)

```text
When user selects a tier:
  1. Fetch tier's price list (already loaded on form init)
  2. For each line item:
     a. Match item.model against price list entries
     b. If match found → set repCost/cost to the tier's rep_cost
     c. If no match → leave repCost/cost unchanged
  3. Recalculate derived fields (sell price, totals)

When user changes tier:
  - Same logic re-runs with new tier's prices
  - "Standard" tier = original HubSpot costs (reset to initial values)
```

## Files Modified

| File | Changes |
|------|---------|
| **Database** | Create `pricing_tiers` and `pricing_tier_prices` tables |
| `supabase/functions/pricing-tiers-get/index.ts` | New — fetch tiers + prices for portal |
| `supabase/functions/pricing-tiers-save/index.ts` | New — admin upsert tiers + prices |
| `src/components/commission/CommissionForm.tsx` | Add tier dropdown, repricing logic |
| `src/components/commission/CommissionPreview.tsx` | Show selected tier |
| `src/components/quote/QuoteForm.tsx` | Add tier dropdown, repricing logic |
| `src/pages/admin/AdminSettings.tsx` | New "Pricing Tiers" management tab |

