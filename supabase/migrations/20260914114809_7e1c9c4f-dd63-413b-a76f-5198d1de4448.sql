-- Merge the Lease Funding document into the Customer Summary, per the
-- 11 Sept call.
--
--   Nate, 47:44: "Take the lease funding document and move it onto the
--   customer summary document."
--   Mike, 47:55: "any information that's not already there, we need on this
--   document." — Nate: "Right. Make one document."
--   Nate, 48:01: "just rename that Customer summary instead of new customer
--   application up at the top right."
--
-- So `new_customer` becomes the CUSTOMER SUMMARY and absorbs Lease Funding.
-- `lease_funding` is unpublished, not deleted, so it is recoverable.
--
-- IMPORTANT, and the opposite of what was first noted: the New Customer
-- Application is a DIFFERENT document and stays out of this app entirely.
--
--   Mike, 47:23: "Let's not talk about new customer applications, because
--   that's a separate process entirely, right?" — Andrea: "Correct."
--   Jason, 52:13: those run from "links on the website that are doc
--   management", not through HubSpot.
--
-- That is also why this template does NOT collect a social security number.
-- Andrea, 45:28: the new customer application "does include, like, social
-- security number, home address" — and that document is handled elsewhere.
-- The v1 template published on 11 Sept wrongly modelled this document as the
-- credit application, with blank EIN / organisation type / business activity
-- fields. Those are removed here.
--
-- Carried over from Lease Funding, per Andrea 46:41 and 48:30:
--   lease type (which carries political vs commercial), equipment,
--   term length, monthly payment.
--
-- Federal EIN, per 40:41: pulled from the COMPANY record. Jason has created
-- the property and made it private; access to be restricted to super admins.
-- {{company.federal_ein}} has no payload field behind it yet, so it renders
-- blank until src/lib/render/payload.ts carries it. hideEmpty keeps the row
-- out of the document rather than printing an empty label.
--
-- Scoped to Eakes' portal only.
--
-- ROLLBACK:
--   update public.render_templates rt set is_published = (rt.version = 1)
--     from public.dealer_accounts da
--    where da.id = rt.dealer_account_id and da.hubspot_portal_id = '43692327'
--      and rt.document_code = 'new_customer';
--   update public.render_templates rt set is_published = true
--     from public.dealer_accounts da
--    where da.id = rt.dealer_account_id and da.hubspot_portal_id = '43692327'
--      and rt.document_code = 'lease_funding' and rt.version = 1;
--   -- and set lease_funding back to template in document_engine_modes.

begin;

update public.render_templates rt
   set is_published = false, updated_at = now()
  from public.dealer_accounts da
 where da.id = rt.dealer_account_id
   and da.hubspot_portal_id = '43692327'
   and rt.document_code = 'new_customer'
   and rt.is_published;

insert into public.render_templates
  (dealer_account_id, document_code, name, version, template, is_published, notes, created_by)
select da.id, 'new_customer', 'Customer Summary (Eakes)', 2,
$cs${
  "id": "tmpl_eakes_customer_summary_v2",
  "name": "Customer Summary (Eakes)",
  "page": { "size": "letter", "orientation": "portrait",
            "margins": { "top": 1.15, "right": 0.6, "bottom": 0.6, "left": 0.6 } },
  "chrome": {
    "companyName": "{{dealer.company}}",
    "lines": ["{{dealer.address}}", "{{dealer.phone}} · {{dealer.website}}"],
    "right": ["CUSTOMER SUMMARY", "Date {{today | date:medium}}"],
    "footerNote": "{{rep.code}} {{rep.name}}"
  },
  "styles": { "fontFamily": "Arial, Helvetica, sans-serif", "fontSize": 9 },
  "blocks": [
    { "type": "docTitle", "title": "Customer Summary",
      "meta": [ { "label": "Date", "value": "{{today | date}}" },
                { "label": "Salesperson", "value": "{{rep.name}}" } ] },
    { "type": "fieldGrid", "title": "Company Information", "columns": 2, "hideEmpty": true,
      "fields": [
        { "label": "Company name", "value": "{{company.name}}", "full": true },
        { "label": "Account number", "value": "{{company.account_number}}" },
        { "label": "Federal EIN", "value": "{{company.federal_ein}}" },
        { "label": "Street address", "value": "{{company.street}}", "full": true },
        { "label": "City", "value": "{{company.city}}" },
        { "label": "State", "value": "{{company.state}}" },
        { "label": "ZIP", "value": "{{company.zip}}" },
        { "label": "Phone", "value": "{{company.phone}}" } ] },
    { "type": "fieldGrid", "title": "Billing Address", "columns": 2, "hideEmpty": true,
      "fields": [
        { "label": "Street", "value": "{{location.street}}", "full": true },
        { "label": "City", "value": "{{location.city}}" },
        { "label": "State", "value": "{{location.state}}" },
        { "label": "ZIP", "value": "{{location.zip}}" } ] },
    { "type": "fieldGrid", "title": "Lease", "columns": 2, "hideEmpty": true,
      "fields": [
        { "label": "Lease type", "value": "{{lease.type}}" },
        { "label": "Leasing company", "value": "{{lease.partner}}" },
        { "label": "Term length", "value": "{{lease.term}}" },
        { "label": "Monthly payment", "value": "{{lease.payment | currency}}" } ] },
    { "type": "table", "title": "Equipment", "bind": "line_items",
      "columns": [
        { "key": "quantity", "label": "Qty", "width": "8%", "align": "right" },
        { "key": "name", "label": "Make / Model / Description", "width": "56%" },
        { "key": "serial", "label": "Serial Number", "width": "20%" },
        { "key": "site", "label": "Location", "width": "16%" } ] },
    { "type": "richText", "title": "Notes", "hideEmpty": true, "html": "{{terms.html}}" },
    { "type": "signature", "title": "Customer Signature",
      "signers": [
        { "label": "{{company.name}}",
          "sublabel": "Authorized signature · Title · Date" } ] }
  ]
}$cs$::jsonb, true,
'Customer Summary: Lease Funding merged in per the 11 Sept call. Credit-application fields removed - that document is a separate process outside this app. company.account_number and company.federal_ein await payload fields and render hidden until then.',
'system'
from public.dealer_accounts da where da.hubspot_portal_id = '43692327'
on conflict (dealer_account_id, document_code, version) do update
  set template = excluded.template, name = excluded.name, is_published = true,
      notes = excluded.notes, updated_at = now();

-- Lease Funding is now part of the Customer Summary. Unpublish it and send
-- the document back to the native generator so nothing 409s, rather than
-- deleting anything.
update public.render_templates rt
   set is_published = false, updated_at = now()
  from public.dealer_accounts da
 where da.id = rt.dealer_account_id
   and da.hubspot_portal_id = '43692327'
   and rt.document_code = 'lease_funding';

update public.document_engine_modes dem
   set engine = 'native', updated_by = 'system', updated_at = now()
  from public.dealer_accounts da
 where da.id = dem.dealer_account_id
   and da.hubspot_portal_id = '43692327'
   and dem.document_code = 'lease_funding';

select rt.document_code, rt.version, rt.name, rt.is_published
  from public.render_templates rt
  join public.dealer_accounts da on da.id = rt.dealer_account_id
 where da.hubspot_portal_id = '43692327'
   and rt.document_code in ('new_customer','lease_funding')
 order by rt.document_code, rt.version;

commit;