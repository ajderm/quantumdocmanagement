

# Auto-populate Dealer Source from HubSpot Line Items

## Problem

The "Dealer Source" field on the commission document (and quote document) shows blank even though the backend already fetches `dealer` from HubSpot line item properties. The property name `dealer` is a custom property — some portals may store this under a different name like `hs_line_item_dealer`, `manufacturer`, or `vendor`. The backend mapping at line 571 does `lineItemResponse.properties.dealer || ''`, and the commission form at line 221 reads `item.dealer`. The pipeline is wired correctly, so the issue is likely the HubSpot property name mismatch.

## Investigation Needed

The `dealer` custom property must exist on the line items in the user's HubSpot portal. Since `properties: lineItemResponse.properties` is already passed as raw properties (line 574), we can also try fallback property names.

## Changes

### 1. Backend — Add fallback property names (`hubspot-get-deal/index.ts`)

Update the line item properties request set and the mapping to try multiple common property names for dealer/manufacturer:

```typescript
// Add to lineItemPropsNeeded set:
'manufacturer', 'vendor', 'hs_line_item_dealer'

// Update mapping (line 571):
dealer: lineItemResponse.properties.dealer 
  || lineItemResponse.properties.manufacturer 
  || lineItemResponse.properties.vendor 
  || '',
```

### 2. Quote Form — Add `dealerSource` field (`QuoteForm.tsx`)

The quote form's `QuoteLineItem` interface doesn't have a `dealerSource` field. Add it and map from `item.dealer` during initialization — same pattern as the commission form. Display it as a read-only or editable column in the equipment grid.

- Add `dealerSource: string` to `QuoteLineItem` interface
- Map during init: `dealerSource: item.dealer || item.properties?.dealer || ''`
- Add backward compat in savedConfig merge: `dealerSource: savedItem.dealerSource || freshItem.dealer || ''`
- Add a "Dealer" column to the equipment grid header and rows
- Update grid template to accommodate the new column

### 3. Quote Preview — Show Dealer Source (`QuotePreview.tsx`)

This is optional for the customer-facing output. The dealer source is primarily rep-facing info. Skip unless explicitly requested.

## Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/hubspot-get-deal/index.ts` | Add fallback property names for dealer/manufacturer |
| `src/components/quote/QuoteForm.tsx` | Add `dealerSource` to interface, init mapping, equipment grid column |

