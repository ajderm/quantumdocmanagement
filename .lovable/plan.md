

# Replace Quote Pricing with Rep Cost / Markup % / Sell Price Model

## Summary

Replace the current Retail Price + Discount % + Cash Discount pricing fields with a cost-up markup model per line item. Each line item gets a `cost` (from HubSpot's `hs_cost_of_goods_sold`), an editable `markupPercent`, and an auto-calculated `sellPrice`. The total sell price drives lease payment calculations.

## Changes

### 1. QuoteLineItem Interface (`QuoteForm.tsx`)

Add `cost` and `markupPercent` fields to `QuoteLineItem`:

```typescript
export interface QuoteLineItem {
  id: string;
  quantity: number;
  model: string;
  description: string;
  price: number;        // kept for backward compat — becomes the "sell price" (cost × (1 + markup%))
  cost: number;         // rep/dealer cost from HubSpot hs_cost_of_goods_sold
  markupPercent: number; // editable markup percentage
}
```

### 2. QuoteFormData Interface

- Remove `cashDiscountPercent` and `cashDiscount` fields
- `retailPrice` remains as the total sell price (sum of all line item sell prices × quantities)

### 3. Initialization (line 338-344)

Map HubSpot line items to include `cost`:

```typescript
lineItems: lineItems.map((item: any) => ({
  id: item.id,
  quantity: item.quantity,
  model: item.model || item.sku || '',
  description: item.description || item.name || '',
  cost: item.cost || 0,
  markupPercent: 0,
  price: item.price || 0,  // HubSpot sell price as initial price
}))
```

When `savedConfig` exists, use saved line items (which already have `cost`/`markupPercent`).

### 4. Equipment Card UI (line 499-506)

Restructure the grid columns from `Qty | Model | Description | Price` to:

`Qty | Model | Description | Rep Cost | Markup % | Your Price`

- **Rep Cost**: read-only, shows `item.cost`
- **Markup %**: editable number input
- **Your Price**: auto-calculated as `cost × (1 + markupPercent / 100)`, displayed read-only. This value is stored as `item.price`.

When markup % changes, auto-calculate and update `item.price` in state.

### 5. Pricing Card (lines 573-697)

- Replace "Retail Price" label with "Total Sell Price" — still shows `formData.retailPrice` (sum of all sell prices × qty), still editable as override
- Remove the "Discount %" and "Cash Discount Price" fields entirely
- Keep lease terms section unchanged

### 6. Recalculation Effects

- **Line item sell price**: When `markupPercent` or `cost` changes on a line item, recalculate `price = cost × (1 + markupPercent / 100)`
- **retailPrice effect** (line 395-406): stays the same — sums `item.price × item.quantity` across all line items
- **Remove cash discount effect** (lines 408-414)

### 7. QuotePreview (preview document)

- In the PURCHASE section, replace "RETAIL" / "CASH DISCOUNT" headers with just "YOUR PRICE"
- Show `formData.retailPrice` as the single purchase price
- Remove `cashDiscount` display

### 8. Backward Compatibility

- Keep `cashDiscountPercent` and `cashDiscount` in the interface as optional fields so existing saved configs don't break on deserialization
- New saves will have `cost` and `markupPercent` on each line item

## Files Modified

| File | Changes |
|------|---------|
| `src/components/quote/QuoteForm.tsx` | Update interfaces, init mapping, equipment UI grid, pricing card, remove discount logic |
| `src/components/quote/QuotePreview.tsx` | Replace RETAIL/CASH DISCOUNT columns with single YOUR PRICE column |

