

# Fix: Line Item Price Changes Not Recalculating Quote Total

## Problem

The retailPrice recalculation effect (line 396-402 in QuoteForm.tsx) has two issues:

1. **`total > 0` guard** prevents updating retailPrice when all line item prices are zero (e.g., user clears a price field). This means if you go from $10,000 back to $0, the total stays stuck.

2. **Stale closure comparison** -- the effect compares `total` against `formData.retailPrice` from the render closure rather than using `prev` state in the setter. While this normally works, it can miss updates in rapid-edit scenarios due to React 18 batching.

3. **Missing recalculation on item removal** -- when `removeLineItem` deletes an item, if remaining items sum to 0, the `total > 0` guard prevents the update.

## Fix

**File:** `src/components/quote/QuoteForm.tsx` (lines 395-402)

Replace the current recalculation effect with a version that:
- Removes the `total > 0` guard (allow total to go to zero)
- Uses the functional `prev` pattern inside `setFormData` to compare against the latest state
- Returns `prev` unchanged when no update is needed (avoids unnecessary re-renders)

```typescript
// Auto-recalculate retailPrice when line items change
useEffect(() => {
  if (!formData.lineItems || formData.lineItems.length === 0) return;
  const total = formData.lineItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  setFormData(prev => {
    if (Math.abs(total - prev.retailPrice) > 0.01) {
      const discountPercent = prev.cashDiscountPercent;
      return { ...prev, retailPrice: total, cashDiscount: total * (1 - discountPercent / 100) };
    }
    return prev;
  });
}, [formData.lineItems]);
```

This also recalculates `cashDiscount` inline to avoid a double-render (currently handled by a separate chained effect on lines 404-410, which still serves as a safety net if retailPrice is changed manually via the input field).

### Files Modified
| File | Change |
|------|--------|
| `src/components/quote/QuoteForm.tsx` | Fix retailPrice recalculation effect (lines 395-402) |

Single file, ~8 lines changed.

