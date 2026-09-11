-- New Customer Application (Eakes), document_code `new_customer`, v1.
--
-- Sourced from "Customer Summary-customer signs.pdf", page 4 of the 29-page
-- CLT packet, shared by the team on 2026-09-04. It is a one-page credit
-- application the customer signs.
--
-- Every token used here already exists in the payload that the current app
-- build sends - company.*, rep.name, today - so this template does not depend
-- on an app release. Fields the app cannot supply (EIN, organisation type,
-- primary business activity) render as ruled blanks for the customer to
-- complete by hand, which is how Eakes use the form today.
--
-- Scoped to Eakes' portal only. The earlier v6 lease migration omitted this
-- filter on its render_templates insert and published to every dealer; see
-- 20260911090000_fix_eakes_template_portal_leak.sql.

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
select da.id, 'new_customer', 'New Customer Application (Eakes)', 1,
       $tmpl${
  "id": "tmpl_eakes_new_customer_v1",
  "name": "New Customer Application (Eakes)",
  "page": {
    "size": "letter",
    "orientation": "portrait",
    "margins": { "top": 1.15, "right": 0.6, "bottom": 0.6, "left": 0.6 }
  },
  "chrome": {
    "companyName": "{{dealer.company}}",
    "lines": [
      "{{dealer.address}}",
      "{{dealer.phone}} · {{dealer.website}}"
    ],
    "right": [
      "NEW CUSTOMER APPLICATION",
      "Date {{today | date:medium}}"
    ],
    "footerNote": "{{dealer.company}} · {{company.name}} · New Customer Application"
  },
  "styles": {
    "fontFamily": "Arial, Helvetica, sans-serif",
    "fontSize": 9
  },
  "blocks": [
    {
      "type": "docTitle",
      "title": "Customer Summary",
      "meta": [
        { "label": "Date", "value": "{{today | date}}" },
        { "label": "Salesperson", "value": "{{rep.name}}" }
      ]
    },
    {
      "type": "fieldGrid",
      "title": "Company Information",
      "columns": 2,
      "hideEmpty": false,
      "fields": [
        { "label": "Company name", "value": "{{company.name}}", "full": true },
        { "label": "DBA / trade name", "value": "" , "full": true },
        { "label": "Federal EIN", "value": "" },
        { "label": "Company phone", "value": "{{company.phone}}" },
        { "label": "Mailing address", "value": "{{company.street}}", "full": true },
        { "label": "City", "value": "{{company.city}}" },
        { "label": "County", "value": "{{company.county}}" },
        { "label": "State", "value": "{{company.state}}" },
        { "label": "ZIP", "value": "{{company.zip}}" }
      ]
    },
    {
      "type": "fieldGrid",
      "title": "Ownership and Contact",
      "columns": 2,
      "hideEmpty": false,
      "fields": [
        { "label": "Name of partner, officer or contact", "value": "", "full": true },
        { "label": "Title", "value": "" },
        { "label": "Contact phone", "value": "" },
        { "label": "Organization type (Individual / Proprietorship / Corporation / LLC / Governmental)", "value": "", "full": true },
        { "label": "Primary business activity", "value": "", "full": true }
      ]
    },
    {
      "type": "richText",
      "title": "Authorization",
      "hideEmpty": true,
      "html": "<p>The undersigned certifies that the information provided above is true and correct, and authorizes Eakes Office Solutions and its assignees to make any credit inquiries they deem necessary in connection with this application, including obtaining credit reports and contacting the references and financial institutions named above.</p>"
    },
    {
      "type": "signature",
      "title": "Customer Signature",
      "signatories": [
        {
          "role": "Customer",
          "nameLabel": "Print name",
          "name": "",
          "forLabel": "For",
          "for": "{{company.name}}",
          "titleLabel": "Title",
          "dateLabel": "Date"
        }
      ]
    }
  ]
}$tmpl$::jsonb, true,
       'Built from Customer Summary-customer signs.pdf (CLT packet page 4). Fields the app cannot supply render as blanks for hand completion.',
       'system'
from public.dealer_accounts da
where da.hubspot_portal_id = '43692327'
on conflict (dealer_account_id, document_code, version) do update
  set template = excluded.template,
      name = excluded.name,
      is_published = true,
      notes = excluded.notes,
      updated_at = now();

commit;