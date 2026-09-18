# Branch override and equipment locations

## Outcome
- Put the branch selector inside the active document so Marko can see and change it while preparing paperwork.
- Default it to the salesperson-resolved branch, list only that portal's branches by name, and render nothing when the portal has no branches.
- Save the chosen branch with the deal's document configuration so it survives reopening.
- Add an editable Location value to each Service Agreement and Lease Agreement equipment row.
- Seed each new row from the deal's equipment-location address while preserving saved manual values.
- Carry each row's Location into previews and template-rendered documents alongside its serial number.

## Technical details
- Reuse the existing portal-scoped location response and branch resolver; do not introduce global location data.
- Move the selector from the compact deal-summary strip to the document workspace, where it remains visible on narrow HubSpot iframe widths.
- Extend the existing serial override maps/equipment row objects rather than creating a second persistence path.
- Keep portals without location rows on the dealer-account address path, unchanged.
- Add focused tests for resolved/default/manual branch selection and Location payload mapping, then run the relevant test suite and preview checks.