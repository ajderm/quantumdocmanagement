

# Phase 1 -- Bug Fixes + Blank Screen Fix

## Priority 0: Fix the Blank Screen

The app loads briefly then goes blank inside HubSpot. This is caused by an unhandled promise rejection crashing React after the initial render. The fix adds:

1. A global `unhandledrejection` event listener in `App.tsx` to prevent React from crashing on uncaught async errors.
2. Try/catch wrappers around all async operations in `DocumentHub.tsx` that currently lack them (specifically the dealer info fetch and config bulk load).
3. An error boundary component that catches render-time errors and shows a recovery UI instead of a blank screen.

---

## Task 1: Equipment Price Edits Not Updating Retail Price Total

**Problem:** In the Quote form, editing a line item's Price or Quantity does not recalculate the "Retail Price" field. It stays at whatever value was loaded from the HubSpot deal amount.

**Root Cause:** `retailPrice` is set once from `deal.amount` during initialization (QuoteForm.tsx line 338) and is never recalculated when line items change.

**Fix:**
- Add a `useEffect` in `QuoteForm.tsx` that watches `formData.lineItems` and recalculates `retailPrice = SUM(price x quantity)` whenever any line item's price, quantity, or the number of items changes.
- Only auto-recalculate if the line items total is greater than 0 (to avoid zeroing out the field before items load).
- The field remains manually editable (user can override), but any line item change resets it to the calculated value.

**Scope:** `QuoteForm.tsx` primarily. Will audit `CommissionForm.tsx` as well -- the commission form already computes `totalBilled` reactively from line items, so no fix is needed there.

**Files:** `src/components/quote/QuoteForm.tsx`

---

## Task 2: Lease Vendor Selection Not Persisting After Save

**Problem:** Changing the leasing company, saving, and reopening reverts to the previous value.

**Root Cause:** Race condition between two async effects:
1. The rate factors fetch (`useEffect` on `[portalId]`) runs and may auto-select the first leasing company if `formData.leasingCompanyId` is empty.
2. The saved config initialization (`useEffect` on `[deal, company, ...]`) runs later and spreads `savedConfig`, but the auto-select may have already fired.

Additionally, the initialization effect (line 342-388) always overrides `retailPrice` with the fresh HubSpot deal amount, which is correct, but the same pattern of "fresh HubSpot overrides saved config" may be accidentally applied to other fields depending on timing.

**Fix:**
- In the rate factors fetch effect, change the auto-select guard to also check `savedConfig?.leasingCompanyId` (already partially done but `formData.leasingCompanyId` may not be set yet due to timing).
- Add a `hasInitializedRef` guard (similar to CommissionForm) to prevent race conditions. The form should not auto-select a leasing company until after the saved config has been applied.
- Audit all document forms for the same "saved value overwritten by HubSpot default" pattern and apply the "saved value takes priority" rule globally.

**Files:** `src/components/quote/QuoteForm.tsx` (primary), plus audit of other form components.

---

## Task 3: Condition Field Not Pulling from Line Items (Commission Tab)

**Problem:** The Condition field (New/Used/Refurbished) for each line item on the Commission tab is blank, even though HubSpot line items have condition values.

**Root Cause:** The HubSpot API property name for condition may not match what's being requested. Currently `hubspot-get-deal` requests `condition` as a line item property (line 351), but the actual HubSpot property could be named differently (e.g., `hs_product_condition`, or a custom property). The value comes back empty.

**Fix:**
1. In `hubspot-get-deal/index.ts`, add `hs_product_condition` to `lineItemPropsNeeded` alongside the existing `condition`.
2. Update the line item mapping (line 570) to try multiple property names: `lineItemResponse.properties.condition || lineItemResponse.properties.hs_product_condition || ''`.
3. In `CommissionForm.tsx` initialization (line 218), ensure `item.condition` or `item.properties?.hs_product_condition` is checked.
4. Default to "New" if the value is empty (per the brief).

**Files:** `supabase/functions/hubspot-get-deal/index.ts`, `src/components/commission/CommissionForm.tsx`

---

## Task 4: Commission Rate and Percentage Overwrite Prevention

**Problem:** The lease rate and commission percentage fields on the commission form are freely editable by any user.

**Fix:**
- **Lease Rate (`rateUsed`):** Make the field read-only on the commission form. It auto-populates from the rate factors when a term is selected. The field should appear visually disabled (greyed out background). Users can edit the rate on the deal itself, not on the commission sheet.
- **Commission Percentage:** Make the field read-only on the commission form. It auto-populates from the backend commission user settings (already implemented). The field should appear visually disabled. Only editable in Admin Settings.
- Both fields will use `readOnly` attribute and a `bg-muted/50` class to indicate they are locked.

**Files:** `src/components/commission/CommissionForm.tsx`

---

## Technical Details

### Error Boundary Component

```text
src/components/ErrorBoundary.tsx (new file)
- Class component that catches render errors
- Displays a "Something went wrong" message with a Retry button
- Logs errors to console for debugging
```

### App.tsx Changes

```text
- Wrap <BrowserRouter> with <ErrorBoundary>
- Add useEffect for global unhandledrejection listener
```

### QuoteForm.tsx Changes

```text
- Add useEffect watching formData.lineItems to recalculate retailPrice
- Add hasInitializedRef to prevent race condition with rate factors auto-select
- Ensure leasingCompanyId from savedConfig is preserved during initialization
```

### CommissionForm.tsx Changes

```text
- Make rateUsed Input: readOnly + bg-muted/50 styling
- Make commissionPercentage Input: readOnly + bg-muted/50 styling
- Update condition default to "New" when empty
- Update condition mapping to check hs_product_condition
```

### hubspot-get-deal/index.ts Changes

```text
- Add 'hs_product_condition' to lineItemPropsNeeded set
- Update line item mapping to fall through: condition || hs_product_condition || 'New'
```

### Files Modified Summary

| File | Changes |
|------|---------|
| `src/components/ErrorBoundary.tsx` | New error boundary component |
| `src/App.tsx` | Wrap with ErrorBoundary, add unhandledrejection handler |
| `src/components/quote/QuoteForm.tsx` | Reactive retailPrice recalc, race condition fix for leasingCompanyId |
| `src/components/commission/CommissionForm.tsx` | Read-only rate and commission %, condition default to "New" |
| `supabase/functions/hubspot-get-deal/index.ts` | Add hs_product_condition to line item properties |

### Backward Compatibility

- `retailPrice` recalculation is additive; manually typing in the field still works.
- Read-only fields on commission form still save their values; they just can't be changed on the form itself.
- Condition defaulting to "New" only applies when the value is truly empty.

