-- Move four more Eakes documents onto the template engine:
--   loi            Letter of Intent
--   fmv_lease      FMV Lease Agreement
--   lease_funding  Lease Funding Document
--   installation   Installation Report
--
-- Why: five of Eakes' six documents were still produced by the native
-- generator, which rasterises the on-screen React preview with html2canvas
-- and pastes a JPEG into a PDF. Proof, from documents generated 2026-09-11:
-- page 1 of the LOI contained eleven characters of real text ("Page 1 of 2")
-- and nothing else. Each native document is a separate React component
-- written at a different time, so they share no header, no logo, no
-- typography and no page furniture. They cannot be made consistent with the
-- lease; they have to be moved.
--
-- Every one of these four uses the SAME chrome, page geometry and styles as
-- the lease template, so once published all six Eakes documents match.
--
-- Field sources were taken from each document's existing preview component
-- (src/components/{loi,fmv-lease,lease-funding,installation}/*Preview.tsx),
-- not invented, and then checked against the render payload contract in
-- src/lib/render/payload.ts. Only tokens that contract actually emits are
-- used:
--
--   company.{name,address,phone,street,city,state,zip,county}
--   contact.ship_to  document.title  location.{street,city,state,zip,county}
--   deal.{name,quote_number,close_date}  rep.{name,phone,email}
--   lease.{partner,term,rate_factor,payment,type}
--   dealer.{company,address,phone,website,tax_rate}
--   terms.html  today  amounts.{taxable,non_taxable,total}
--   line_items[]{name,type,quantity,unit,extended,serial,meter,site}
--
-- Fields with no payload source render as ruled blanks for hand completion.
-- That is deliberate and correct for install-time data (IP address, MAC
-- address, meter counts, customer initials) which is captured on site, and
-- for first payment date, which no payload field supplies.
--
-- NOT included here: service_agreement. Its document needs included volumes,
-- overage rates, cost per copy and Connected Care, none of which the render
-- payload carries. Adding them is an app change plus a deploy, so it cannot
-- be done in a migration. It stays on native until then.
--
-- Terms come from document_terms per document_type via {{terms.html}}, with
-- hideEmpty so a document whose terms are unset simply omits the section
-- rather than printing a heading over nothing.
--
-- Scoped to Eakes' portal only.
--
-- ROLLBACK: unpublish all four; each document falls back to native.
--     update public.render_templates rt set is_published = false
--       from public.dealer_accounts da
--      where da.id = rt.dealer_account_id
--        and da.hubspot_portal_id = '43692327'
--        and rt.document_code in ('loi','fmv_lease','lease_funding','installation');
--   then set those four back to Native in Settings -> Document engine.

begin;

update public.render_templates rt
   set is_published = false, updated_at = now()
  from public.dealer_accounts da
 where da.id = rt.dealer_account_id
   and da.hubspot_portal_id = '43692327'
   and rt.document_code in ('loi','fmv_lease','lease_funding','installation')
   and rt.is_published;

-- ---------------------------------------------------------------- loi
insert into public.render_templates
  (dealer_account_id, document_code, name, version, template, is_published, notes, created_by)
select da.id, 'loi', 'Letter of Intent (Eakes)', 1,
$loi${
  "id": "tmpl_eakes_loi_v1",
  "name": "Letter of Intent (Eakes)",
  "page": { "size": "letter", "orientation": "portrait",
            "margins": { "top": 1.15, "right": 0.6, "bottom": 0.6, "left": 0.6 } },
  "chrome": {
    "companyName": "{{dealer.company}}",
    "lines": ["{{dealer.address}}", "{{dealer.phone}} · {{dealer.website}}"],
    "right": ["LETTER OF INTENT", "Date {{today | date:medium}}"],
    "footerNote": "{{dealer.company}} · {{company.name}} · Letter of Intent"
  },
  "styles": { "fontFamily": "Arial, Helvetica, sans-serif", "fontSize": 9 },
  "blocks": [
    { "type": "docTitle", "title": "Letter of Intent",
      "meta": [ { "label": "Date", "value": "{{today | date}}" },
                { "label": "Salesperson", "value": "{{rep.name}}" } ] },
    { "type": "richText", "hideEmpty": true,
      "html": "<p>It is the intention of {{company.name}} to purchase or lease the following equipment from {{dealer.company}}.</p>" },
    { "type": "fieldGrid", "title": "Customer", "columns": 2, "hideEmpty": true,
      "fields": [
        { "label": "Company", "value": "{{company.name}}", "full": true },
        { "label": "Address", "value": "{{company.street}}", "full": true },
        { "label": "City", "value": "{{company.city}}" },
        { "label": "State", "value": "{{company.state}}" },
        { "label": "ZIP", "value": "{{company.zip}}" },
        { "label": "Phone", "value": "{{company.phone}}" } ] },
    { "type": "table", "title": "Equipment", "bind": "line_items",
      "columns": [
        { "key": "quantity", "label": "Qty", "width": "10%", "align": "right" },
        { "key": "name", "label": "Model / Description", "width": "62%" },
        { "key": "serial", "label": "Serial Number", "width": "28%" } ] },
    { "type": "richText", "title": "Terms", "hideEmpty": true, "html": "{{terms.html}}" },
    { "type": "signature", "title": "Acknowledgement",
      "signatories": [
        { "role": "Customer", "nameLabel": "Print name", "name": "",
          "forLabel": "For", "for": "{{company.name}}",
          "titleLabel": "Title", "dateLabel": "Date" } ] }
  ]
}$loi$::jsonb, true,
'Moved off the native html2canvas generator. Fields from LoiPreview.tsx, tokens checked against payload.ts.', 'system'
from public.dealer_accounts da where da.hubspot_portal_id = '43692327'
on conflict (dealer_account_id, document_code, version) do update
  set template = excluded.template, name = excluded.name, is_published = true,
      notes = excluded.notes, updated_at = now();

-- ---------------------------------------------------------- fmv_lease
insert into public.render_templates
  (dealer_account_id, document_code, name, version, template, is_published, notes, created_by)
select da.id, 'fmv_lease', 'FMV Lease Agreement (Eakes)', 1,
$fmv${
  "id": "tmpl_eakes_fmv_v1",
  "name": "FMV Lease Agreement (Eakes)",
  "page": { "size": "letter", "orientation": "portrait",
            "margins": { "top": 1.15, "right": 0.6, "bottom": 0.6, "left": 0.6 } },
  "chrome": {
    "companyName": "{{dealer.company}}",
    "lines": ["{{dealer.address}}", "{{dealer.phone}} · {{dealer.website}}"],
    "right": ["FMV LEASE AGREEMENT", "Contract date {{today | date:medium}}"],
    "footerNote": "{{dealer.company}} · {{company.name}} · FMV Lease"
  },
  "styles": { "fontFamily": "Arial, Helvetica, sans-serif", "fontSize": 9 },
  "computed": {
    "monthly": "firstNonZero(lease.payment, round(amounts.taxable * lease.rate_factor, 2))",
    "payment_tax": "round(computed.monthly * dealer.tax_rate, 2)",
    "total_monthly": "firstNonZero(computed.monthly + computed.payment_tax, computed.monthly)"
  },
  "blocks": [
    { "type": "docTitle", "title": "FMV Lease Agreement",
      "meta": [ { "label": "Contract date", "value": "{{today | date}}" },
                { "label": "Reference", "value": "{{deal.quote_number}}" } ] },
    { "type": "fieldGrid", "title": "Lessee Information", "columns": 2, "hideEmpty": true,
      "fields": [
        { "label": "Company", "value": "{{company.name}}", "full": true },
        { "label": "Billing address", "value": "{{company.street}}", "full": true },
        { "label": "City", "value": "{{company.city}}" },
        { "label": "State", "value": "{{company.state}}" },
        { "label": "ZIP", "value": "{{company.zip}}" },
        { "label": "Phone", "value": "{{company.phone}}" } ] },
    { "type": "fieldGrid", "title": "Equipment Address", "columns": 2, "hideEmpty": true,
      "fields": [
        { "label": "Street", "value": "{{location.street}}", "full": true },
        { "label": "City", "value": "{{location.city}}" },
        { "label": "State", "value": "{{location.state}}" },
        { "label": "ZIP", "value": "{{location.zip}}" } ] },
    { "type": "table", "title": "Equipment", "bind": "line_items",
      "columns": [
        { "key": "quantity", "label": "Qty", "width": "8%", "align": "right" },
        { "key": "name", "label": "Make / Model / Description", "width": "56%" },
        { "key": "serial", "label": "Serial Number", "width": "36%" } ] },
    { "type": "fieldGrid", "title": "Term and Payment", "columns": 2, "hideEmpty": true,
      "fields": [
        { "label": "Term in months", "value": "{{lease.term}}" },
        { "label": "Payment frequency", "value": "Monthly" },
        { "label": "Leasing company", "value": "{{lease.partner}}" },
        { "label": "Lease type", "value": "{{lease.type}}" },
        { "label": "First payment date", "value": "" } ] },
    { "type": "summary", "hideEmpty": true,
      "rows": [
        { "label": "Monthly payment", "expr": "computed.monthly" },
        { "label": "Sales tax ({{dealer.tax_rate | percent}})", "expr": "computed.payment_tax" },
        { "label": "Total monthly payment", "expr": "computed.total_monthly", "bold": true, "rule": true } ] },
    { "type": "richText", "title": "Terms and Conditions", "hideEmpty": true, "html": "{{terms.html}}" },
    { "type": "signature", "title": "Acceptance",
      "signatories": [
        { "role": "Lessee", "nameLabel": "Printed name", "name": "",
          "forLabel": "For", "for": "{{company.name}}",
          "titleLabel": "Title", "dateLabel": "Date" },
        { "role": "Lessor", "nameLabel": "Printed name", "name": "",
          "forLabel": "For", "for": "{{dealer.company}}",
          "titleLabel": "Title", "dateLabel": "Date" } ] }
  ]
}$fmv$::jsonb, true,
'Moved off native. Fields from FMVLeasePreview.tsx. First payment date is a blank: no payload field supplies it.', 'system'
from public.dealer_accounts da where da.hubspot_portal_id = '43692327'
on conflict (dealer_account_id, document_code, version) do update
  set template = excluded.template, name = excluded.name, is_published = true,
      notes = excluded.notes, updated_at = now();

-- ------------------------------------------------------ lease_funding
insert into public.render_templates
  (dealer_account_id, document_code, name, version, template, is_published, notes, created_by)
select da.id, 'lease_funding', 'Lease Funding Document (Eakes)', 1,
$fund${
  "id": "tmpl_eakes_funding_v1",
  "name": "Lease Funding Document (Eakes)",
  "page": { "size": "letter", "orientation": "portrait",
            "margins": { "top": 1.15, "right": 0.6, "bottom": 0.6, "left": 0.6 } },
  "chrome": {
    "companyName": "{{dealer.company}}",
    "lines": ["{{dealer.address}}", "{{dealer.phone}} · {{dealer.website}}"],
    "right": ["LEASE FUNDING", "Date {{today | date:medium}}"],
    "footerNote": "{{dealer.company}} · {{company.name}} · Lease Funding"
  },
  "styles": { "fontFamily": "Arial, Helvetica, sans-serif", "fontSize": 9 },
  "blocks": [
    { "type": "docTitle", "title": "Lease Funding Document",
      "meta": [ { "label": "Date", "value": "{{today | date}}" },
                { "label": "Reference", "value": "{{deal.quote_number}}" } ] },
    { "type": "fieldGrid", "title": "Customer", "columns": 2, "hideEmpty": true,
      "fields": [
        { "label": "Customer name", "value": "{{company.name}}", "full": true },
        { "label": "Location / branch", "value": "{{location.city}}" },
        { "label": "State", "value": "{{location.state}}" },
        { "label": "Sales representative", "value": "{{rep.name}}" } ] },
    { "type": "fieldGrid", "title": "Lease", "columns": 2, "hideEmpty": true,
      "fields": [
        { "label": "Lease vendor", "value": "{{lease.partner}}" },
        { "label": "Lease type", "value": "{{lease.type}}" },
        { "label": "Term length", "value": "{{lease.term}}" },
        { "label": "Rate", "value": "{{lease.rate_factor}}" } ] },
    { "type": "table", "title": "Equipment", "bind": "line_items",
      "columns": [
        { "key": "quantity", "label": "Qty", "width": "8%", "align": "right" },
        { "key": "name", "label": "Make / Model", "width": "56%" },
        { "key": "serial", "label": "Serial Number", "width": "36%" } ] },
    { "type": "summary", "hideEmpty": true,
      "rows": [
        { "label": "Invoice / funding amount", "expr": "amounts.total" },
        { "label": "Monthly payment", "expr": "lease.payment", "bold": true, "rule": true } ] },
    { "type": "richText", "title": "Notes", "hideEmpty": true, "html": "{{terms.html}}" },
    { "type": "signature", "title": "Authorisation",
      "signatories": [
        { "role": "Prepared by", "nameLabel": "Printed name", "name": "{{rep.name}}",
          "forLabel": "For", "for": "{{dealer.company}}",
          "titleLabel": "Title", "dateLabel": "Date" } ] }
  ]
}$fund$::jsonb, true,
'Moved off native. Fields from LeaseFundingPreview.tsx. This is the internal funding sheet, not the Hometown bank worksheet - that one needs the rate differential formula and is not built.', 'system'
from public.dealer_accounts da where da.hubspot_portal_id = '43692327'
on conflict (dealer_account_id, document_code, version) do update
  set template = excluded.template, name = excluded.name, is_published = true,
      notes = excluded.notes, updated_at = now();

-- ------------------------------------------------------- installation
insert into public.render_templates
  (dealer_account_id, document_code, name, version, template, is_published, notes, created_by)
select da.id, 'installation', 'Installation Report (Eakes)', 1,
$inst${
  "id": "tmpl_eakes_installation_v1",
  "name": "Installation Report (Eakes)",
  "page": { "size": "letter", "orientation": "portrait",
            "margins": { "top": 1.15, "right": 0.6, "bottom": 0.6, "left": 0.6 } },
  "chrome": {
    "companyName": "{{dealer.company}}",
    "lines": ["{{dealer.address}}", "{{dealer.phone}} · {{dealer.website}}"],
    "right": ["INSTALLATION REPORT", "Date {{today | date:medium}}"],
    "footerNote": "{{dealer.company}} · {{company.name}} · Installation Report"
  },
  "styles": { "fontFamily": "Arial, Helvetica, sans-serif", "fontSize": 9 },
  "blocks": [
    { "type": "docTitle", "title": "Installation Report",
      "meta": [ { "label": "Date", "value": "{{today | date}}" },
                { "label": "Salesperson", "value": "{{rep.name}}" } ] },
    { "type": "fieldGrid", "title": "Customer - Bill To", "columns": 2, "hideEmpty": true,
      "fields": [
        { "label": "Company", "value": "{{company.name}}", "full": true },
        { "label": "Address", "value": "{{company.street}}", "full": true },
        { "label": "City", "value": "{{company.city}}" },
        { "label": "State", "value": "{{company.state}}" },
        { "label": "ZIP", "value": "{{company.zip}}" },
        { "label": "Phone", "value": "{{company.phone}}" } ] },
    { "type": "fieldGrid", "title": "Customer - Ship To", "columns": 2, "hideEmpty": true,
      "fields": [
        { "label": "Contact", "value": "{{contact.ship_to}}", "full": true },
        { "label": "Street", "value": "{{location.street}}", "full": true },
        { "label": "City", "value": "{{location.city}}" },
        { "label": "State", "value": "{{location.state}}" },
        { "label": "ZIP", "value": "{{location.zip}}" } ] },
    { "type": "table", "title": "Equipment Installed", "bind": "line_items",
      "columns": [
        { "key": "quantity", "label": "Qty", "width": "7%", "align": "right" },
        { "key": "name", "label": "Model / Description", "width": "40%" },
        { "key": "serial", "label": "Serial Number", "width": "20%" },
        { "key": "meter", "label": "Meter", "width": "13%", "align": "right" },
        { "key": "site", "label": "Location", "width": "20%" } ] },
    { "type": "fieldGrid", "title": "Networking - completed on site", "columns": 2, "hideEmpty": false,
      "fields": [
        { "label": "IP address", "value": "" },
        { "label": "MAC address", "value": "" },
        { "label": "IT contact", "value": "" },
        { "label": "IT contact phone", "value": "" } ] },
    { "type": "fieldGrid", "title": "Meter contact - completed on site", "columns": 2, "hideEmpty": false,
      "fields": [
        { "label": "Meter contact", "value": "" },
        { "label": "Meter contact email", "value": "" },
        { "label": "Meter (B/W)", "value": "" },
        { "label": "Meter (Colour)", "value": "" } ] },
    { "type": "richText", "title": "Delivery and Acceptance", "hideEmpty": true, "html": "{{terms.html}}" },
    { "type": "signature", "title": "Delivery and Acceptance",
      "signatories": [
        { "role": "Customer", "nameLabel": "Printed name", "name": "",
          "forLabel": "For", "for": "{{company.name}}",
          "titleLabel": "Title", "dateLabel": "Date" },
        { "role": "Installed by", "nameLabel": "Printed name", "name": "",
          "forLabel": "For", "for": "{{dealer.company}}",
          "titleLabel": "Title", "dateLabel": "Date" } ] }
  ]
}$inst$::jsonb, true,
'Moved off native. Fields from InstallationPreview.tsx. Networking and meter sections are intentionally blank: that data is captured on site, not in the app.', 'system'
from public.dealer_accounts da where da.hubspot_portal_id = '43692327'
on conflict (dealer_account_id, document_code, version) do update
  set template = excluded.template, name = excluded.name, is_published = true,
      notes = excluded.notes, updated_at = now();

-- Confirm all four published for Eakes and for nobody else.
select da.hubspot_portal_id, rt.document_code, rt.version, rt.name, rt.is_published
  from public.render_templates rt
  join public.dealer_accounts da on da.id = rt.dealer_account_id
 where rt.document_code in ('loi','fmv_lease','lease_funding','installation')
 order by da.hubspot_portal_id, rt.document_code;

commit;