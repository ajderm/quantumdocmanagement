

# Fix: Data Persistence Failures (Quote + Service Agreement)

## Root Cause Analysis

Two separate bugs are causing saved data to be lost on reload:

### Bug 1: Quote Leasing Company Reverts (Stale Closure)

The rate factors fetch effect in `QuoteForm.tsx` runs once when `portalId` is set. Its async callback captures `formData.leasingCompanyId` and `savedConfig` in a closure at mount time -- when both are still empty/undefined. When the rate factors response arrives (even seconds later), the guard check uses these stale values:

```text
// At mount time: formData.leasingCompanyId = '' and savedConfig = undefined
// By the time this code runs, savedConfig may have loaded,
// but the closure still sees the old values
if (!formData.leasingCompanyId && !savedConfig?.leasingCompanyId) {
  setFormData(prev => ({ ...prev, leasingCompanyId: firstCompany }));
}
```

This overwrites the correctly-loaded `leasingCompanyId` from the saved config.

### Bug 2: Service Agreement Data Lost (savedConfig Not Updated After Save)

The explicit Save button and auto-save for the service agreement both write to the database, but neither updates the `serviceAgreementSavedConfig` state in `DocumentHub.tsx`. Since Radix UI tabs unmount inactive tab content by default, whenever the user switches away from the Service Agreement tab and comes back, the `ServiceAgreementForm` remounts with the OLD `savedConfig` from the initial bulk load. The init effect then overwrites the user's changes with stale data.

This same bug affects ALL document types except Quote (which already calls `setSavedConfig(formData)` after save).

---

## Fix 1: Stale Closure in Rate Factors Effect

**File:** `src/components/quote/QuoteForm.tsx`

Use a ref to track the latest `savedConfig` and `formData.leasingCompanyId`, and check the ref inside the async callback instead of the closure values:

- Add `savedConfigRef` that stays in sync with `savedConfig` prop
- Add `leasingCompanyIdRef` that stays in sync with `formData.leasingCompanyId`
- In the rate factors async callback, check ref values instead of closure values

This ensures the auto-select guard uses the current state, not the stale closure.

## Fix 2: Update savedConfig After Every Save

**File:** `src/pages/DocumentHub.tsx`

After every successful explicit save AND auto-save, update the corresponding `savedConfig` state so that tab remounts use the latest data:

### Explicit Save Handlers (add `setSavedConfig` call after DB write succeeds):
- `handleServiceAgreementSave` -- add `setServiceAgreementSavedConfig(serviceAgreementFormData)`
- `handleInstallationSave` -- already handled (or add if missing)
- `handleFMVLeaseSave` -- add `setFmvLeaseSavedConfig(fmvLeaseFormData)`
- `handleLoiSave` -- add `setLoiSavedConfig(loiFormData)`
- `handleLeaseReturnSave` -- add `setLeaseReturnSavedConfig(leaseReturnFormData)`
- `handleInterterritorialSave` -- add corresponding setter
- `handleNewCustomerSave` -- add corresponding setter
- `handleRelocationSave` -- add corresponding setter
- `handleRemovalSave` -- add corresponding setter
- `handleCommissionSave` -- add corresponding setter

### Auto-Save Handlers (add `setSavedConfig` call on success):
- `performServiceAgreementAutoSave` -- add `setServiceAgreementSavedConfig(dataToSave)`
- And similarly for all other document auto-save functions

This ensures that when tabs are switched and forms remount, the initialization effect receives the latest saved data.

---

## Technical Details

### QuoteForm.tsx Changes

```text
Add refs:
  const savedConfigRef = useRef(savedConfig);
  const leasingCompanyIdRef = useRef(formData.leasingCompanyId);

Add sync effects:
  useEffect(() => { savedConfigRef.current = savedConfig; }, [savedConfig]);
  useEffect(() => { leasingCompanyIdRef.current = formData.leasingCompanyId; }, [formData.leasingCompanyId]);

In rate factors effect, change guard from:
  if (!formData.leasingCompanyId && !savedConfig?.leasingCompanyId ...)
To:
  if (!leasingCompanyIdRef.current && !savedConfigRef.current?.leasingCompanyId ...)
```

### DocumentHub.tsx Changes

For each explicit save handler, add the savedConfig update after the successful DB write. Example for service agreement:

```text
// After line 1988 (setServiceAgreementHasUnsavedChanges(false)):
setServiceAgreementSavedConfig(serviceAgreementFormData);
```

For each auto-save handler, add the savedConfig update on success. Example:

```text
// In performServiceAgreementAutoSave, after setServiceAgreementLastSavedData:
setServiceAgreementSavedConfig(dataToSave);
```

This pattern is applied to all 11 document types (quote already has this for explicit save but not auto-save).

### Files Modified

| File | Changes |
|------|---------|
| `src/components/quote/QuoteForm.tsx` | Add refs for savedConfig and leasingCompanyId; use refs in rate factors guard |
| `src/pages/DocumentHub.tsx` | Add savedConfig state updates in all explicit save handlers and auto-save handlers |

### Scope

- ~20 lines changed in QuoteForm.tsx
- ~20 lines added across DocumentHub.tsx (1-2 lines per save handler, 11 document types x 2 save paths)
- No database changes, no edge function changes
- Fully backward compatible

