

# Commission Form Updates: Dealer Source + Special Pricing

## 1. Add "Dealer Source" Column to Equipment Table

**What**: Pull the `dealer` property from HubSpot line items and display it as a "Dealer Source" column in the Commission equipment table.

**Changes needed**:

### Backend (Edge Function)
- Add `'dealer'` to the `lineItemPropsNeeded` set in `hubspot-get-deal/index.ts`
- Add `dealer` as a top-level field on the returned line item object (same pattern as `condition`)

### Form
- Add `dealerSource: string` to `CommissionLineItem` interface
- Map from `item.dealer || item.properties?.dealer || ""`
- Apply the same fresh-data-merge pattern (when savedConfig exists, re-populate from HubSpot)
- Add column in the Equipment Items grid

### Preview
- Add "Dealer Source" column in the ITEM table

## 2. Add "Special Pricing / Credits" Field Per Line Item

**What**: A free-text input per line item where reps can note special pricing, promo discounts, DIR credits, or nonprofit credits.

### Form
- Add `specialPricing: string` to `CommissionLineItem` interface
- Add a text input below or beside each line item row
- Default to empty string

### Preview
- Show the special pricing note next to each line item (only if populated)

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/hubspot-get-deal/index.ts` | Add `'dealer'` to `lineItemPropsNeeded`, add `dealer` as top-level field |
| `src/components/commission/CommissionForm.tsx` | Add `dealerSource` and `specialPricing` to `CommissionLineItem`, map from HubSpot, add columns to form grid |
| `src/components/commission/CommissionPreview.tsx` | Add "Dealer Source" and "Special Pricing" columns to ITEM table |

## Technical Details

### CommissionLineItem interface update
```typescript
export interface CommissionLineItem {
  id: string;
  quantity: number;
  description: string;
  billed: number;
  repCost: number;
  condition: string;
  dealerSource: string;      // NEW - from HubSpot 'dealer' property
  specialPricing: string;    // NEW - free-text for pricing notes
}
```

### Edge function line item addition
```typescript
dealer: lineItemResponse.properties.dealer || '',
```

### Form grid layout change
The Equipment Items grid will expand from 4 columns to 6:
- Description | Billed | Rep Cost | Condition | Dealer Source | Special Pricing/Credits

### Fresh-data merge for dealerSource
Same pattern as `condition` -- when savedConfig exists, re-populate `dealerSource` from fresh HubSpot data to prevent stale values.

