

# Fix: Condition Field Still Showing Product Type

## Root Cause Analysis

After thorough investigation, the code changes from the previous update ARE correctly in place:
- The edge function requests the `condition` property from HubSpot (confirmed in live logs)
- `CommissionForm.tsx` reads `item.properties?.condition`

However, **two issues** remain:

1. **Stale saved configuration**: When you previously saved/previewed this deal, the old code cached line items with `hs_product_type` values ("Hardware") in the `condition` field. The saved config overrides fresh HubSpot data (line 189-190 of CommissionForm), so you keep seeing the old cached values.

2. **Missing top-level field**: The edge function returns `category` (from `hs_product_type`) as a top-level line item field but does NOT return `condition` as a top-level field. It's only accessible via `item.properties.condition`. For consistency and reliability, `condition` should be a first-class field on the returned line item object.

## Changes

### File 1: `supabase/functions/hubspot-get-deal/index.ts`

Add `condition` as a top-level field on the line item response object (alongside `category`):

```typescript
return {
  id: lineItemResponse.id,
  name: lineItemResponse.properties.name,
  // ...existing fields...
  category: lineItemResponse.properties.hs_product_type,
  condition: lineItemResponse.properties.condition || '',  // ADD THIS
  properties: lineItemResponse.properties,
};
```

### File 2: `src/components/commission/CommissionForm.tsx`

Two changes:

**A.** Update condition mapping to use both the new top-level field AND `properties.condition`, to be robust:

```typescript
condition: item.condition || item.properties?.condition || "",
```

**B.** When a savedConfig exists, still re-populate line item conditions from fresh HubSpot data. This ensures stale cached values don't persist. After loading savedConfig, merge fresh line item conditions:

```typescript
if (savedConfig) {
  const merged = { ...getDefaultCommissionFormData(), ...savedConfig };
  // Re-apply fresh HubSpot condition values to line items
  if (lineItems?.length && merged.lineItems?.length) {
    merged.lineItems = merged.lineItems.map((savedItem, idx) => {
      const freshItem = lineItems[idx];
      if (freshItem) {
        return {
          ...savedItem,
          condition: freshItem.condition || freshItem.properties?.condition || savedItem.condition || "",
        };
      }
      return savedItem;
    });
  }
  setFormData(merged);
}
```

## Summary

| Change | Purpose |
|--------|---------|
| Add `condition` to edge function line item response | Make condition a first-class field, not buried in `properties` |
| Update form to read `item.condition` | Use the new top-level field with fallback |
| Merge fresh conditions into savedConfig | Prevent stale cached product type values from overriding |
