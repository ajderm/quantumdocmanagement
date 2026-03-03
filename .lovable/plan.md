

# Add MSRP Strikethrough on Quote Preview

## Summary

Show the HubSpot MSRP (unit_price) with a strikethrough next to the sell price on the customer-facing quote document, creating a "Retail ~~$X~~ → Your Price $Y" visual.

## Changes

### 1. QuoteLineItem Interface — add `msrp` field

```typescript
export interface QuoteLineItem {
  // ... existing fields
  msrp: number; // HubSpot's price (unit_price) — the manufacturer's suggested retail price
}
```

### 2. QuoteForm.tsx — Initialization

Map HubSpot `item.price` to both `msrp` (permanent reference) and `price` (initial sell price):

```typescript
lineItems: lineItems.map((item: any) => ({
  ...existing fields,
  msrp: item.price || 0,  // NEW: capture MSRP from HubSpot
  cost: item.cost || 0,
  markupPercent: 0,
  price: item.price || 0,
}))
```

Add backward compat in the savedConfig merge (same pattern as `cost`/`markupPercent`):
```typescript
msrp: item.msrp ?? item.price ?? 0,
```

### 3. QuotePreview.tsx — Equipment Table

Add two price columns to the equipment table: "Retail" (strikethrough) and "Your Price".

Only show the strikethrough when MSRP differs from the sell price (no point showing identical crossed-out and regular prices).

```text
Equipment table columns:
  Qty | Model | Description | Retail | Your Price

Retail column: shows $MSRP with line-through styling (text-gray-500 line-through)
Your Price column: shows sell price in bold
```

### 4. QuotePreview.tsx — Purchase Price Section

The existing "YOUR PRICE" header already shows `retailPrice` (total sell price). Add the total MSRP with strikethrough above or beside it:

```text
Retail: ~~$totalMSRP~~
Your Price: $retailPrice
```

Calculate `totalMSRP` as sum of `item.msrp × item.quantity` across all line items.

## Files Modified

| File | Changes |
|------|---------|
| `src/components/quote/QuoteForm.tsx` | Add `msrp` to interface, init mapping, and savedConfig merge |
| `src/components/quote/QuotePreview.tsx` | Add Retail (strikethrough) + Your Price columns to equipment table; show MSRP strikethrough in purchase price section |

