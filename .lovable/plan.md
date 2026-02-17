
# Commission Form Updates

## Overview

Eight changes to the Commission form covering term/rate automation, cost defaults, user commission settings, lead fee/split separation, buyout cross-referencing, and removing toner/MA.

---

## 1. Term Dropdown (Lease Information)

**Current**: Free-text number input for term.

**Change**: When a leasing company is selected, show a dropdown of available terms for that company (from the rate factors data already fetched). The `get-rate-factors` edge function already returns `rateFactors` with `leasing_company`, `term_months`, and `rate_factor` -- we just need to store the full `rateFactors` array in state (not just company names) and filter by selected company.

When a term is selected, auto-populate the "Rate Used" field with the matching rate factor. The rep can still manually override the rate.

**Files**: `CommissionForm.tsx` only -- data is already available from `get-rate-factors`.

---

## 2. Setup Cost -- Separate Line, Default $100

**Current**: "Setup / Delivery Costs" is a single combined field.

**Change**: Split into two separate fields:
- "Setup Cost" (default $100)
- "Delivery Cost" (default $100)

Update the `CommissionFormData` interface: remove `setupDeliveryCosts`, add `setupCost: number` and `deliveryCost: number`. Update defaults, calculations, and preview.

**Files**: `CommissionForm.tsx`, `CommissionPreview.tsx`

---

## 3. Delivery Cost Default $100

Handled together with item 2 above.

---

## 4. Shipping Cost Default $170

**Current**: Defaults to `0`.

**Change**: Default to `170` in `getDefaultCommissionFormData()`.

**Files**: `CommissionForm.tsx`

---

## 5. HubSpot User Commission Percentages (Backend + Admin + Form)

**What**: Add a new setting in the backend where admins can define commission percentages per HubSpot user (sales rep). The Commission form then pulls the percentage from there based on the selected sales rep.

### Database

New table: `commission_user_settings`
- `id` (uuid, PK)
- `dealer_account_id` (uuid, FK to dealer_accounts)
- `hubspot_user_name` (text) -- display name
- `hubspot_user_id` (text, nullable) -- HubSpot owner ID if available
- `commission_percentage` (numeric, default 40)
- `created_at`, `updated_at`
- RLS: service_role only (same pattern as other settings tables)

### Backend

- `dealer-account-get`: Also fetch `commission_user_settings` and return them alongside other dealer data.
- `dealer-account-save`: Accept and save `commissionUsers` array.

### Admin UI

Add a "Commission Users" section in Admin Settings (Company tab or a new tab) where admins can add/remove users and set their commission percentage.

### Commission Form

- Fetch commission user settings via the existing dealer-account-get data (passed through props or fetched separately).
- When `salesRepresentative` matches a configured user name, auto-set `commissionPercentage` from the setting. Still allow manual override.

**Files**: Migration (new table), `dealer-account-get/index.ts`, `dealer-account-save/index.ts`, `AdminSettings.tsx`, `CommissionForm.tsx`, `DocumentHub.tsx`

---

## 6. Lead Fee and Split -- Two Separate Fields

**Current**: Single "Lead Fee or Split" field ($).

**Change**: Split into two fields:
- `leadFee: number` -- dollar amount
- `splitPercentage: number` -- percentage (e.g., 40 means the rep gets 40% of commission)

### Commission Calculation Update

```
Current:  totalCommission = equipmentAGP * (commissionPercentage / 100) + connectedCommission
New:      baseCommission = equipmentAGP * (commissionPercentage / 100)
          totalCommission = (baseCommission * (splitPercentage / 100 || 1)) + connectedCommission
```

If `splitPercentage` is 0 or not set, no split is applied (full commission). If it's 40%, the rep receives 40% of their calculated commission.

The `leadFee` is still included in Additional Costs (affects AGP). The split only affects the final commission payout.

**Files**: `CommissionForm.tsx`, `CommissionPreview.tsx`

---

## 7. Buyout/TradeUp -- Pull from Quote Config

**Current**: Manual entry only.

**Change**: When the Commission form initializes, check if a Quote configuration exists for this deal. If it has buyout data (`buyoutFinancingAmount`, or calculated total buyout from `paymentAmount * paymentsRemaining + earlyTerminationFee + returnShipping`), pre-populate the `buyoutTradeUp` field.

The quote config is already loaded in `DocumentHub.tsx` as `savedConfig` (quote). We just need to pass it to `CommissionForm` as a new prop `quoteConfig`.

**Files**: `CommissionForm.tsx` (add prop, use in initialization), `DocumentHub.tsx` (pass prop)

---

## 8. Remove Toner Cost and MA Checkbox

**Current**: Toner Cost field with MA checkbox.

**Change**: Remove `tonerCost` and `tonerCostMA` from the form, interface, defaults, calculations, and preview. Clean up related text state (`tonerText`).

**Files**: `CommissionForm.tsx`, `CommissionPreview.tsx`

---

## Technical Details

### CommissionFormData Interface Changes

```typescript
export interface CommissionFormData {
  // ... existing fields ...

  // REMOVED:
  // setupDeliveryCosts: number;
  // tonerCost: number;
  // tonerCostMA: boolean;
  // leadFeeOrSplit: number;

  // ADDED:
  setupCost: number;        // default 100
  deliveryCost: number;     // default 100
  leadFee: number;          // dollar amount
  splitPercentage: number;  // 0-100, 0 = no split

  // CHANGED defaults:
  // shippingCosts: 170 (was 0)
}
```

### Updated Calculation Logic

```typescript
// Additional costs that affect AGP
const totalRepCostWithCosts = totalRepCost +
  formData.shippingCosts + formData.setupCost + formData.deliveryCost +
  formData.connectivity + formData.itProfessionalServices +
  formData.leadFee + formData.otherSalesFees;

// Commission with split
const baseCommission = equipmentAGP * (formData.commissionPercentage / 100);
const splitMultiplier = formData.splitPercentage > 0 ? formData.splitPercentage / 100 : 1;
const totalCommission = (baseCommission * splitMultiplier) + formData.connectedCommission;
```

### New Database Table

```sql
CREATE TABLE commission_user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_account_id uuid NOT NULL REFERENCES dealer_accounts(id),
  hubspot_user_name text NOT NULL,
  hubspot_user_id text,
  commission_percentage numeric NOT NULL DEFAULT 40,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE commission_user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON commission_user_settings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

### Files Modified Summary

| File | Changes |
|------|---------|
| Migration (new table) | `commission_user_settings` table |
| `supabase/functions/dealer-account-get/index.ts` | Fetch commission user settings |
| `supabase/functions/dealer-account-save/index.ts` | Save commission user settings |
| `src/pages/admin/AdminSettings.tsx` | Commission Users management UI |
| `src/components/commission/CommissionForm.tsx` | All 8 changes: term dropdown, rate auto-fill, split fields, defaults, remove toner, buyout cross-ref, commission % from settings |
| `src/components/commission/CommissionPreview.tsx` | Updated cost rows, split display, remove toner |
| `src/pages/DocumentHub.tsx` | Pass quote config to CommissionForm |

### Backward Compatibility

Existing saved commission configs may have old fields (`setupDeliveryCosts`, `tonerCost`, `tonerCostMA`, `leadFeeOrSplit`). The initialization logic will handle migration gracefully:
- If `setupDeliveryCosts` exists, split 50/50 into `setupCost` and `deliveryCost`
- If `leadFeeOrSplit` exists, map to `leadFee` (dollar amount), leave `splitPercentage` at 0
- Ignore `tonerCost`/`tonerCostMA` from old configs
