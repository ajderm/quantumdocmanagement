

# Fix: "Cannot read properties of undefined (reading 'toLocaleString')" Crash

## Root Cause

When saved configurations are loaded from the database (via `get-configurations-bulk`), numeric fields may be `null` or `undefined` if they were saved before those fields existed, or if the save only captured partial data. Preview components (especially CommissionPreview, InterterritorialPreview, QuotePreview, QuoteForm) then call `.toLocaleString()` directly on these values, causing a crash caught by the ErrorBoundary.

The crash path:
1. `DocumentHub` loads saved configs → e.g., `setCommissionFormData(savedCommission)` (line 565)
2. Hidden preview div renders: `{commissionFormData && <CommissionPreview formData={commissionFormData} ... />}` 
3. `CommissionPreview` calls `fmt(formData.buyoutTradeUp)` → `undefined.toLocaleString()` → crash

Additionally, there's a duplicate "Prepared By" field in QuoteForm (lines 571-572) from the recent formCustomization edit that should be cleaned up.

## Fix Strategy

Add defensive null-coalescing (`?? 0` or `|| 0`) to all `.toLocaleString()` call sites across the codebase where the value could come from saved config data. This is a lightweight, surgical fix.

### Files to modify:

| File | Fix |
|------|-----|
| `src/components/commission/CommissionPreview.tsx` | Change `fmt` to: `const fmt = (v: number) => (v ?? 0).toLocaleString(...)` |
| `src/components/interterritorial/InterterritorialPreview.tsx` | Same pattern for `formatCurrency` |
| `src/components/quote/QuoteForm.tsx` | Guard `calculatedPayment?.toLocaleString()` and `effectivePayment?.toLocaleString()` with `?? 0`; remove duplicate Prepared By field at line 572 |
| `src/components/quote/QuotePreview.tsx` | Guard `getLeasePayment().toLocaleString()` and `.toLocaleString()` calls on formData fields with `?? 0` |
| `src/components/quote/ProductSearchModal.tsx` | Guard `product.price?.toLocaleString()` and `product.cost?.toLocaleString()` |
| `src/components/fmv-lease/FMVLeaseForm.tsx` | Guard `formatCurrency` input |
| `src/pages/admin/LeasingPartners.tsx` | Guard `rateData.rateSheet.rowCount?.toLocaleString()` |

### Pattern applied everywhere:

```typescript
// Before (crashes if v is undefined)
const fmt = (v: number) => v.toLocaleString("en-US", {...});

// After (safe)
const fmt = (v: number) => (v ?? 0).toLocaleString("en-US", {...});
```

For inline calls:
```typescript
// Before
${calculatedPayment.toLocaleString()}/mo

// After  
${(calculatedPayment ?? 0).toLocaleString()}/mo
```

This is ~7 files with small, mechanical changes. No architectural changes needed.

