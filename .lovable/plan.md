

# Fix Commission Form: Visibility, Data Mapping, and Lease Company Dropdown

## Issues Found

### 1. Commission Tab Not Showing in HubSpot
The tab visibility is controlled by `dealerSettings.enabled_forms`. If an admin previously configured their enabled forms list before the Commission type existed, "commission" won't be in that array, hiding the tab. The filter logic is:
```
filter(doc => !enabled_forms || enabled_forms.length === 0 || enabled_forms.includes(doc.code))
```
Since the admin's `enabled_forms` array doesn't include `"commission"`, it gets filtered out.

**Fix:** Add "commission" to the Admin Settings form manager so admins can enable it, AND update the existing dealer settings to auto-include new form types. We should also ensure the admin settings UI lists "commission" as an available form.

### 2. Address Fields Using Wrong Company Properties
Currently the form maps:
- `address: company?.address` (generic/main address)
- `cityStateZip: company?.city, company?.state, company?.zip`

Should use Bill To (AP) address:
- `address: company?.apAddress`
- `cityStateZip: company?.apCity, company?.apState, company?.apZip`
- `county: company?.county` (if available)

### 3. Lease Company Is a Plain Text Input
Currently a text `<Input>`, should be a `<Select>` dropdown populated from the leasing companies defined in the rate sheet (same pattern used in QuoteForm and LeaseFundingForm, fetching from `get-rate-factors` edge function).

### 4. Line Items (Confirmed Working)
Already pulling from deal's associated line items with quantity, description, billed, repCost, and condition. No changes needed.

### 5. Sales Representative (Confirmed Working)
Already pulling from `dealOwner.firstName + lastName`. No changes needed.

---

## Changes

### File 1: `src/components/commission/CommissionForm.tsx`

**A. Add `portalId` prop** (needed to fetch leasing companies):
```typescript
interface CommissionFormProps {
  deal: any;
  company: any;
  contacts: any[];
  lineItems: any[];
  dealOwner: any;
  portalId: string | null;  // NEW
  onFormChange: (data: CommissionFormData) => void;
  savedConfig: CommissionFormData | null;
}
```

**B. Fix address mapping** in the initialization useEffect:
```typescript
// Before
address: company?.address || "",
cityStateZip: [company?.city, company?.state, company?.zip].filter(Boolean).join(", "),

// After (Bill To / AP address)
address: company?.apAddress || company?.address || "",
cityStateZip: [
  company?.apCity || company?.city,
  company?.apState || company?.state,
  company?.apZip || company?.zip
].filter(Boolean).join(", "),
county: company?.county || "",
```

**C. Add leasing companies fetch** (same pattern as LeaseFundingForm):
```typescript
const [leasingCompanies, setLeasingCompanies] = useState<string[]>([]);
const [loadingCompanies, setLoadingCompanies] = useState(false);

useEffect(() => {
  const fetchLeasingCompanies = async () => {
    if (!portalId) return;
    setLoadingCompanies(true);
    try {
      const { data } = await supabase.functions.invoke('get-rate-factors', {
        body: { portalId }
      });
      if (data?.leasingCompanies) {
        setLeasingCompanies(data.leasingCompanies);
      }
    } catch (err) {
      console.error('Failed to fetch leasing companies:', err);
    } finally {
      setLoadingCompanies(false);
    }
  };
  fetchLeasingCompanies();
}, [portalId]);
```

**D. Replace Lease Company text input with Select dropdown:**
```typescript
// Before
<Input value={formData.leaseCompany} onChange={...} />

// After
<Select value={formData.leaseCompany} onValueChange={v => updateField("leaseCompany", v)}>
  <SelectTrigger>
    <SelectValue placeholder={loadingCompanies ? "Loading..." : "Select"} />
  </SelectTrigger>
  <SelectContent>
    {leasingCompanies.map(c => (
      <SelectItem key={c} value={c}>{c}</SelectItem>
    ))}
  </SelectContent>
</Select>
```
The user can still type a custom value if needed via a fallback text input shown when no companies are loaded.

### File 2: `src/pages/DocumentHub.tsx`

**A. Pass `portalId` to CommissionForm:**
```typescript
<CommissionForm
  deal={deal}
  company={company}
  contacts={contacts}
  lineItems={lineItems}
  dealOwner={dealOwner}
  portalId={portalId}   // NEW
  onFormChange={handleCommissionFormChange}
  savedConfig={commissionSavedConfig}
/>
```

### File 3: `src/pages/admin/AdminSettings.tsx`

**A. Add "commission" to the list of available form types** so admins can enable/disable it from the settings panel. This ensures it appears in the enabled forms checklist.

---

## Summary

| Issue | Fix |
|-------|-----|
| Tab not visible | Ensure "commission" is in the admin form list so it can be enabled |
| Wrong address fields | Switch from generic address to Bill To (AP) address properties |
| Lease Company plain input | Replace with Select dropdown fetching from rate sheet leasing companies |
| Line items | Already working correctly |
| Sales Rep | Already working correctly |
| Manual override | All fields remain editable -- no change needed |
