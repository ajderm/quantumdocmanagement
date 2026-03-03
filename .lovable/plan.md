

# Add MSRP Column to Quote Form Equipment Grid

## Summary

Add an "MSRP" column to the quote form's line item grid (the rep-facing editing UI) so reps can see the manufacturer's suggested retail price alongside their rep cost, markup, and sell price — mirroring how the commission document shows "Billed" and "Rep Cost" side by side.

## Changes

### `src/components/quote/QuoteForm.tsx`

**Equipment grid header (line 508-516):** Add an "MSRP" column between Description and Rep Cost. Adjust the `grid-cols-12` layout to accommodate the new column — change to `grid-cols-13` or redistribute existing spans:

Current: `Qty(1) | Model(2) | Description(3) | Rep Cost(2) | Markup%(1) | Your Price(2) | Delete(1)` = 12

New: `Qty(1) | Model(2) | Description(2) | MSRP(2) | Rep Cost(2) | Markup%(1) | Your Price(2) | Delete(1)` = 13

Use a custom grid template (`grid grid-cols-[50px_1fr_1.5fr_100px_100px_70px_100px_40px]`) for better control since we're exceeding 12 columns.

**Each line item row (lines 517-549):** Add a read-only MSRP input field showing `item.msrp`, styled the same as the read-only "Your Price" field (`bg-muted/50`).

### Files Modified

| File | Change |
|------|--------|
| `src/components/quote/QuoteForm.tsx` | Add MSRP column to equipment grid header and each line item row |

Single file, ~15 lines changed. No interface or data changes needed — `msrp` already exists on `QuoteLineItem`.

