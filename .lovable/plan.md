

# Fix: Race Condition in Form Initialization Across All Document Types

## Problem Summary

Saved form data is overwritten by HubSpot defaults on page reload because forms initialize before the database-saved configurations have loaded. Two parallel async operations -- HubSpot data fetch and Supabase config bulk load -- complete at different times, but forms begin rendering as soon as HubSpot data arrives.

## Root Causes

### Race Condition (All Document Types)
1. `useHubSpot()` fetches deal data. When it completes, `loading` becomes `false` and `DocumentHubContent` renders all forms.
2. `loadAllConfigs` (bulk Supabase fetch) runs in a separate `useEffect`. It depends on `deal?.hsObjectId`, which is only available after HubSpot loads.
3. Forms mount and initialize with HubSpot defaults before `savedConfig` arrives from the bulk load.
4. When `savedConfig` finally arrives, some forms (like ServiceAgreement) have already set `hasInitializedRef = true`, so they ignore the saved data entirely.

### retailPrice Override (Quote)
The Quote init effect always sets `retailPrice = deal.amount`, even when `savedConfig` exists. If the user edited line item prices or manually adjusted the retail price, those edits are lost on every reload.

### No hasInitializedRef Guard (Quote)
Unlike other forms, the Quote init `useEffect` does NOT use `hasInitializedRef` as a guard. It re-runs on every `deal`, `company`, `dealOwner`, `lineItems`, or `savedConfig` change, repeatedly overwriting form state.

---

## Solution

### Step 1: Add `configsLoaded` Gate in DocumentHub

Add a `configsLoaded` boolean state that starts as `false` and becomes `true` only after the `loadAllConfigs` call completes (whether it finds data or not). Gate the rendering of all form content on BOTH `!loading` (HubSpot done) AND `configsLoaded` (Supabase done). While either is pending, show a loading skeleton.

```text
// New state
const [configsLoaded, setConfigsLoaded] = useState(false);

// In loadAllConfigs effect:
// Set to true in finally block, even if there's an error
// This ensures forms never render before we know whether saved data exists

// In the render:
if (loading || !configsLoaded) {
  return <LoadingSkeleton />;
}
```

### Step 2: Fix QuoteForm retailPrice Logic

Change QuoteForm init effect (lines 319-394):
- Add `hasInitializedRef` guard (same pattern as other forms)
- When `savedConfig` exists: use `savedConfig.retailPrice` instead of `deal.amount`
- The existing line-item recalculation effect (lines 396-403) will still reactively update `retailPrice` when the user edits line items

```text
// Current (broken):
const retailPriceToUse = hubspotData.retailPrice; // Always deal.amount

// Fixed:
const retailPriceToUse = savedConfig.retailPrice || hubspotData.retailPrice;
```

### Step 3: Add hasInitializedRef Guard to QuoteForm

Add the same `if (hasInitializedRef.current) return;` guard at the top of the Quote init effect, matching the pattern used by ServiceAgreement, LeaseReturn, and other forms.

### Step 4: Add Autosave Status Indicator

Add a small "Saving..." / "Saved" text indicator near each save button. This uses existing auto-save infrastructure -- just surface the state visually.

---

## Technical Details

### DocumentHub.tsx Changes

```text
New state variable:
  const [configsLoaded, setConfigsLoaded] = useState(false);

In loadAllConfigs effect (around line 468):
  - Wrap the async function body in try/finally
  - Add setConfigsLoaded(true) in the finally block
  - Also set configsLoaded = true if the early return fires (no portalId/dealId)

In the loading check (around line 2690):
  Change: if (loading) { return <Loader /> }
  To:     if (loading || !configsLoaded) { return <Loader /> }

Add save status indicator near each Save button:
  - Show "Saving..." text while auto-save is in progress
  - Show "Saved" text briefly after successful save
  - Uses existing hasUnsavedChanges / lastSavedData state
```

### QuoteForm.tsx Changes

```text
Init effect (lines 319-394):
  1. Add guard: if (hasInitializedRef.current) return;
  2. Change retailPrice logic:
     - If savedConfig exists: retailPriceToUse = savedConfig.retailPrice || hubspotData.retailPrice
     - If no savedConfig: retailPriceToUse = hubspotData.retailPrice (current behavior)
  3. Set hasInitializedRef.current = true at end of both branches
```

### ServiceAgreementForm.tsx -- No Changes Needed

The existing `hasInitializedRef` guard is correct. The race condition fix in DocumentHub (gating on `configsLoaded`) ensures `savedConfig` is available before the form mounts, so the guard works as intended.

### Other Forms -- No Changes Needed

LeaseReturnForm, CommissionForm, InterterritorialForm, FMVLeaseForm, LoiForm, NewCustomerForm, RelocationForm, RemovalForm, InstallationForm, LeaseFundingForm all use `hasInitializedRef` or receive data directly via props from DocumentHub. The `configsLoaded` gate in DocumentHub fixes all of them simultaneously.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/DocumentHub.tsx` | Add `configsLoaded` state, set it in `loadAllConfigs`, gate form rendering, add save status indicators |
| `src/components/quote/QuoteForm.tsx` | Add `hasInitializedRef` guard to init effect, fix `retailPrice` to use saved value when available |

## What This Does NOT Change

- Save/auto-save logic (already working correctly)
- Edge functions (no changes)
- Database schema (no changes)
- Other form components (fixed by the DocumentHub gate)

## Why This Works

By preventing forms from mounting until both data sources are ready, we eliminate the race condition at the architectural level. Every form's init effect will see the correct `savedConfig` on its first (and only) run. The `hasInitializedRef` guard then prevents re-initialization if props change later.

