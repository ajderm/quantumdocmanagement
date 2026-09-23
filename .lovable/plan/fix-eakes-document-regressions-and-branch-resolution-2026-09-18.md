# Fix Eakes document regressions and branch resolution

## Scope

1. **Urgently scope light Terms styling to Eakes**
   - Add a dealer-level render setting that defaults off when no row exists.
   - Enable it only for Eakes (`43692327`).
   - Pass that setting through both quote and non-quote render payloads.
   - Make the renderer add the lighter Terms class only when that payload flag is enabled.
   - Remove italics from the Terms rule and retain the current reduced opacity.
   - Add coverage proving an unset setting leaves the other three portals’ Terms unchanged.

2. **Eliminate the Eakes lease spill page**
   - Reproduce the current Eakes v10 lease with the current 7,088-character Terms content.
   - Verify the italic version produces the reported extra page, then verify the scoped, non-italic version renders four pages.
   - Run the required renderer corpus. If the known oversized-row case remains the only failure and is unchanged from baseline, report it exactly; do not alter assertions.

3. **Apply the attached branch correction verbatim**
   - Add `20260918090000_eakes_locations_fix_prefixes.sql` unchanged to the migrations folder.
   - Apply it as supplied and stop on any guard exception.
   - Return its final branch listing, confirming Grand Island `{17,68}` and Cheyenne `{45}`.

4. **Correct salesperson resolution**
   - Fetch `sales_rep_number` on deals.
   - Resolve from `sales_rep_number` first; use `salesperson__` only when it is exactly four digits; do not use the Syncari property as a branch fallback.
   - Preserve the explicit main-office fallback when no usable number exists and the no-location fallback for other portals.
   - Use the same validated value for the printed rep code.
   - Add tests for missing values, junk `salesperson__`, valid four-digit fallback, `{68}` matching, longest-prefix matching, and main-office fallback.
   - Redeploy `hubspot-get-deal` after validation.

5. **Repair Customer Summary output**
   - Stop suppressing the resolved selling branch in its dealer chrome so address and phone match the lease.
   - Publish a new Eakes-only Customer Summary template version containing the fixed credit-department return block exactly as supplied; keep that block literal so it never follows the selling branch.
   - Add payload tests proving branch chrome changes while the credit return text remains fixed in the Eakes-only template.

6. **Finish the shared-path audit**
   - Complete the remaining review of `DocumentHub`, `hubspot-get-deal`, dealer-location functions, `useHubSpot`, and related September 11–18 commits.
   - Report every Eakes-driven shared/global change, separating correctly scoped behavior from cross-portal regressions. Do not silently fix any additional findings.

## Validation and release

- Run TypeScript checks, library tests, renderer tests, and the required renderer corpus.
- Check the latest preview build diagnostics and fix any errors before finishing.
- Deploy the renderer so the live Terms fix takes effect, deploy `hubspot-get-deal`, publish the app, and verify the live renderer and document paths.
- Report the lease page count, corpus result, migration output, deployment results, and completed audit.

## Technical details

- Dealer setting: a boolean such as `lighten_terms`; absent means `false`, preserving all non-Eakes output.
- Payload flag: carried under document render metadata and read by the renderer before assigning the Terms CSS class.
- Customer Summary template change: a new Eakes-only version rather than editing another portal’s template or hardcoding Eakes text into shared payload code.
