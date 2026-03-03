

# Fix Product Library Modal Layout

## Problem

The Product Library modal has layout overflow issues visible in the screenshot:
- Long product names push the Add button and type badge off-screen to the right
- The product name text isn't truncating properly because the flex container doesn't constrain width
- The type badges (Accessory, Hardware, etc.) are missing from most rows — they're being pushed off by long names

## Root Cause

The product row uses `flex items-center justify-between` with `flex-1 min-w-0` on the left content div, which should truncate. However, the inner flex row with the name + badge doesn't have `min-w-0` or `overflow-hidden`, so the name span's `truncate` class has no bounded parent to trigger truncation.

## Fix

**`src/components/quote/ProductSearchModal.tsx`** — Two changes:

1. **Constrain the name row** — Add `min-w-0 overflow-hidden` to the inner flex div containing name + badge, and ensure the name span gets a `max-w-[300px]` or uses block-level truncation so the badge stays visible.

2. **Widen the modal** — Change `max-w-2xl` to `max-w-3xl` to give more room for the product info + buttons.

```text
Before:
  <div className="flex items-center gap-2">
    <span className="font-medium text-sm truncate">{product.name}</span>
    <Badge ...>

After:
  <div className="flex items-center gap-2 min-w-0">
    <span className="font-medium text-sm truncate max-w-[280px]">{product.name}</span>
    <Badge ...>
```

This ensures the product name truncates at a fixed max-width, the type badge always shows, and the Add button stays visible on the right.

### Cost $0.00

The cost showing $0.00 is a data issue — those products don't have `unit_cost` or `hs_cost_of_goods_sold` set in HubSpot. The code already correctly uses `parseFloat(unit_cost) || parseFloat(hs_cost_of_goods_sold) || 0`. No code change needed for this.

