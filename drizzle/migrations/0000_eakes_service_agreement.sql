-- Service Agreement (Eakes) v1, revised after the 11 Sept call.
--
-- *** DO NOT APPLY BEFORE THE APP IS DEPLOYED ***
--
-- Depends on payload fields that do not exist yet. See
-- SERVICE_AGREEMENT_app_change.md for service.*, and the round-2 app notes
-- for contact.meter_* / contact.signer_* and rep.code.
--
-- Correct order:
--   1. payload.ts changes   2. deploy the app   3. this migration
--   4. Settings -> Document engine -> Service Agreement -> Template
--
-- Applying it early is not destructive, but the affected fields print blank
-- until the deploy lands.
--
-- ===================== CHANGES FROM THE 11 SEPT CALL =================
--
-- S4  Meter Method removed. Mike 09:57: "I don't think it needs to be on the
--     paperwork" — Andrea: "I agree." Never present in this template.
-- S5  Phone and email removed from Ship-To and Bill-To. Mike 14:35: "get rid
--     of the contacts associated with the ship to and the customer bill to".
-- S6  Meter Contact and Signer Contact as their own small tables, each with
--     full name, phone, email. Marko 15:00: "two mini tables, one for meter
--     contact with their full name, phone, and email, and then one for the
--     signer contract."
-- S7  Effective date and contract length. Andrea 24:20.
-- S9  Overage rates to five decimals. Andrea 26:01: it "did round up from
--     what I put in there, so I put .007". Mike 26:13: "We need 5 digits."
--     Done with the renderer's own decimals argument: {{x | number:5}}.
-- S13 "Plus tax" on the face rather than a computed tax line. Mike 31:09:
--     "Do we want to just put plus tax? And remove that complexity."
--     Note this applies to the face only — the Hometown worksheet still
--     needs real tax because they collect it (Mike 31:48).
-- S14 Annual and quarterly subtotals removed. Mike 31:33: "I don't see any
--     reason for the annual and the quarter subtotals below."
-- S15 Single signature. Andrea 33:18: "we don't have a dual signer
--     requirement, so we don't actually sign our service agreements".
-- S16 Footer: four-digit sales code and name only. Jason 34:48: "it's really
--     just 4-digit sales code, and name". Nate 36:16 confirms no email, and
--     Andrea 36:12 confirms no phone.
-- S17 Terms and conditions on page 2. Andrea 36:42.
--
-- ======================= NOT DONE HERE, AND WHY =====================
--
-- S11 Base vs non-base agreements. Mike 29:50: "If the base rate is not
--     checked, then we wouldn't show the first 3 columns... show overages."
--     That is conditional block visibility driven by a flag, which this
--     renderer does not express; hideEmpty only reacts to empty values. It
--     needs either a renderer feature or two templates selected by the flag.
-- S12 The base-rate checkbox may not even be mapped from QuoteIQ yet.
--     Jason 30:32: "that's probably a property we need to get mapped."
-- S2/S3 Equipment location, location note and location account. Jason is
--     identifying the QuoteIQ fields; the columns are ready for them.
--
-- Scoped to Eakes' portal only.

begin;

update public.render_templates rt
   set is_published = false, updated_at = now()
  from public.dealer_accounts da
 where da.id = rt.dealer_account_id
   and da.hubspot_portal_id = '43692327'
   and rt.document_code = 'service_agreement'
   and rt.is_published;

insert into public.render_templates
  (dealer_account_id, document_code, name, version, template, is_published, notes, created_by)
select da.id, 'service_agreement', 'Service Agreement (Eakes)', 1,
$svc${
  "id": "tmpl_eakes_service_v1",
  "name": "Service Agreement (Eakes)",
  "page": { "size": "letter", "orientation": "portrait",
            "margins": { "top": 1.15, "right": 0.6, "bottom": 0.6, "left": 0.6 } },
  "chrome": {
    "companyName": "{{dealer.company}}",
    "lines": ["{{dealer.address}}", "{{dealer.phone}} · {{dealer.website}}"],
    "right": ["SERVICE AGREEMENT", "Contract date {{today | date:medium}}"],
    "footerNote": "{{rep.code}} {{rep.name}}"
  },
  "styles": { "fontFamily": "Arial, Helvetica, sans-serif", "fontSize": 9 },
  "blocks": [
    { "type": "docTitle", "title": "Service Agreement",
      "meta": [ { "label": "Contract date", "value": "{{today | date}}" },
                { "label": "Account number", "value": "{{company.account_number}}" } ] },
    { "type": "richText", "hideEmpty": true,
      "html": "<p><strong>THIS IS NOT AN INVOICE.</strong></p>" },
    { "type": "fieldGrid", "title": "Billing Information", "columns": 2, "hideEmpty": true,
      "fields": [
        { "label": "Company", "value": "{{company.name}}", "full": true },
        { "label": "Billing address", "value": "{{company.street}}", "full": true },
        { "label": "City", "value": "{{company.city}}" },
        { "label": "State", "value": "{{company.state}}" },
        { "label": "ZIP", "value": "{{company.zip}}" },
        { "label": "Attention", "value": "{{contact.ship_to}}" } ] },
    { "type": "fieldGrid", "title": "Product Location", "columns": 2, "hideEmpty": true,
      "fields": [
        { "label": "Street", "value": "{{location.street}}", "full": true },
        { "label": "City", "value": "{{location.city}}" },
        { "label": "State", "value": "{{location.state}}" },
        { "label": "ZIP", "value": "{{location.zip}}" } ] },
    { "type": "fieldGrid", "title": "Meter Contact", "columns": 3, "hideEmpty": true,
      "fields": [
        { "label": "Name", "value": "{{contact.meter_name}}" },
        { "label": "Phone", "value": "{{contact.meter_phone}}" },
        { "label": "Email", "value": "{{contact.meter_email}}" } ] },
    { "type": "fieldGrid", "title": "Signer Contact", "columns": 3, "hideEmpty": true,
      "fields": [
        { "label": "Name", "value": "{{contact.signer_name}}" },
        { "label": "Phone", "value": "{{contact.signer_phone}}" },
        { "label": "Email", "value": "{{contact.signer_email}}" } ] },
    { "type": "fieldGrid", "title": "Term", "columns": 3, "hideEmpty": true,
      "fields": [
        { "label": "Effective date", "value": "{{today | date}}" },
        { "label": "Contract length", "value": "{{lease.term}}" },
        { "label": "Billing period", "value": "{{service.billing_period}}" } ] },
    { "type": "table", "title": "Equipment", "bind": "line_items",
      "columns": [
        { "key": "quantity", "label": "Qty", "width": "7%", "align": "right" },
        { "key": "name", "label": "Model Number / Description", "width": "45%" },
        { "key": "serial", "label": "Serial Number", "width": "22%" },
        { "key": "site", "label": "Location", "width": "26%" } ] },
    { "type": "fieldGrid", "title": "Included Volume and Overage Rates", "columns": 2, "hideEmpty": true,
      "fields": [
        { "label": "Included black and white", "value": "{{service.included_bw | number}}" },
        { "label": "Included colour", "value": "{{service.included_color | number}}" },
        { "label": "Overage rate, black and white", "value": "{{service.overage_bw | number:5}}" },
        { "label": "Overage rate, colour", "value": "{{service.overage_color | number:5}}" } ] },
    { "type": "summary", "hideEmpty": true,
      "rows": [
        { "label": "Base rate, plus tax", "expr": "service.base_rate", "bold": true, "rule": true } ] },
    { "type": "richText", "hideEmpty": true,
      "html": "<p>Amounts shown are plus applicable sales tax. You will be billed quarterly for copies produced on the covered equipment after the signed agreement is received by {{dealer.company}}. In no instance will charges be less than $25 per month.</p>" },
    { "type": "signature", "title": "Customer Signature",
      "signers": [
        { "label": "{{company.name}}",
          "sublabel": "Authorized signature · Title · Date" } ] },
    { "type": "pageBreak" },
    { "type": "richText", "title": "Terms and Conditions", "hideEmpty": true, "html": "{{terms.html}}" }
  ]
}$svc$::jsonb, true,
'Revised after the 11 Sept call: meter method removed, ship-to/bill-to contact details removed, meter and signer contact tables added, five-decimal overage rates, plus-tax wording, subtotals removed, single signature, sales code footer, terms on page 2.',
'system'
from public.dealer_accounts da where da.hubspot_portal_id = '43692327'
on conflict (dealer_account_id, document_code, version) do update
  set template = excluded.template, name = excluded.name, is_published = true,
      notes = excluded.notes, updated_at = now();

commit;