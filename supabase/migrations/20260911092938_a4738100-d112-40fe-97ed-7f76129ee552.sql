-- Lease Agreement (Eakes) v7: add the Letter of Instruction and Exhibit "A"
-- pages, completing the four-part packet Eakes actually hand a customer.
--
--   page 1  the agreement form          - already in v6
--   page 2  Lease Terms and Conditions  - already in v6, Version 260123
--   page 3  LETTER OF INSTRUCTION       - added here
--   page 4  EXHIBIT "A"                 - added here
--
-- docs/document-engine.md recorded these two as "extracted but not built".
-- The letter text below is VERBATIM from page 3 of
-- "Lease Agreement-Customer signs.pdf" (Cornerstone Bank, 4/24/2026). It is
-- not paraphrased and it is not authored here: an earlier template shipped
-- invented legal prose on a page a customer signs, and that must not recur.
--
-- Built by appending to v6's own template JSON rather than restating it, so
-- every block, style and computed value in v6 carries forward untouched and
-- this migration cannot silently alter the working page 1.
--
-- ROLLBACK: republish v6.
--     update public.render_templates rt set is_published = (rt.version = 6)
--       from public.dealer_accounts da
--      where da.id = rt.dealer_account_id
--        and da.hubspot_portal_id = '43692327'
--        and rt.document_code = 'quote';
--
-- KNOWN GAP, read before using v7 with a customer: clause 2 of the letter
-- names the first payment date ("May 24, 2026" on the source document). No
-- payload token supplies it, so {{lease.first_payment_date}} renders empty
-- until the app sends it. Either add that field to the quote payload or have
-- the rep complete it by hand. Everything else on both pages resolves from
-- tokens the current build already sends.

begin;

update public.render_templates rt
   set is_published = false, updated_at = now()
  from public.dealer_accounts da
 where da.id = rt.dealer_account_id
   and da.hubspot_portal_id = '43692327'
   and rt.document_code = 'quote'
   and rt.is_published;

insert into public.render_templates
  (dealer_account_id, document_code, name, version, template, is_published, notes, created_by)
select src.dealer_account_id,
       'quote',
       'Lease Agreement (Eakes)',
       7,
       jsonb_set(
         src.template,
         '{blocks}',
         (src.template -> 'blocks') || $add$[
  { "type": "pageBreak" },
  {
    "type": "docTitle",
    "title": "Letter of Instruction",
    "meta": [
      { "label": "For", "value": "{{company.name}}" },
      { "label": "Agreement dated", "value": "{{today | date:medium}}" }
    ]
  },
  {
    "type": "richText",
    "hideEmpty": true,
    "html": "<p>We are pleased to provide this letter of instruction for the lease agreement dated {{today | date:medium}}.</p><ol><li>Your administrative fees payment is due to Eakes Office Solutions upon signing this agreement.</li><li>Monthly payments on this agreement will be made to {{lease.partner}}. Your next regular monthly payment will be due {{lease.first_payment_date}} and will be due on the same day of each following month.</li><li>You will receive monthly invoices directly from {{lease.partner}}. If you are interested in other electronic payment options you may contact {{lease.partner}}.</li><li>At the end of the lease you may return the equipment to Eakes Office Solutions, relieving you of any further commitment.</li><li>Or, if you have fulfilled all of the obligations under this lease and are not in default thereunder, at the end of the term of the lease the equipment may be purchased at Fair Market Value. If lessee fails to remit to lessor the purchase price within thirty (30) days after the end of the term of the lease, or within thirty (30) days after lessor notifies lessee in writing of the availability of the option to purchase, whichever is later, this option to purchase shall expire.</li><li>As stated in the agreement, personal property taxes and insurance coverage on the rented equipment are the responsibility of the lessee.</li></ol><p>Your business is greatly appreciated, and we look forward to being of service.</p>"
  },
  { "type": "pageBreak" },
  {
    "type": "docTitle",
    "title": "Exhibit \"A\"",
    "meta": [
      { "label": "Dated", "value": "{{today | date}}" },
      { "label": "Salesperson", "value": "{{rep.name}}" }
    ]
  },
  {
    "type": "richText",
    "hideEmpty": true,
    "html": "<p>Exhibit forming part of the Agreement between Eakes Inc., Omaha, Nebraska (Lessor) and {{company.name}}, {{company.city}}, {{company.state}} (Lessee).</p>"
  },
  {
    "type": "table",
    "bind": "line_items",
    "columns": [
      { "key": "quantity", "label": "Qty", "width": "8%", "align": "right" },
      { "key": "name", "label": "Description / Make & Model", "width": "44%" },
      { "key": "serial", "label": "Serial Number", "width": "18%" },
      { "key": "meter", "label": "Initial Meter Reading", "width": "15%", "align": "right" },
      { "key": "site", "label": "Location", "width": "15%" }
    ]
  },
  {
    "type": "signature",
    "signatories": [
      {
        "role": "Lessee",
        "nameLabel": "Print name",
        "name": "",
        "forLabel": "For",
        "for": "{{company.name}}",
        "titleLabel": "Title",
        "dateLabel": "Date"
      },
      {
        "role": "Lessor",
        "nameLabel": "Print name",
        "name": "",
        "forLabel": "For",
        "for": "Eakes Inc.",
        "titleLabel": "Title",
        "dateLabel": "Date"
      }
    ]
  }
]$add$::jsonb
       ),
       true,
       'v6 plus the Letter of Instruction and Exhibit A pages, verbatim from the signed Cornerstone Bank packet. Appended to v6 JSON so page 1 and the terms are unchanged.',
       'system'
  from public.render_templates src
  join public.dealer_accounts da on da.id = src.dealer_account_id
 where da.hubspot_portal_id = '43692327'
   and src.document_code = 'quote'
   and src.version = 6
on conflict (dealer_account_id, document_code, version) do update
  set template = excluded.template,
      name = excluded.name,
      is_published = true,
      notes = excluded.notes,
      updated_at = now();

commit;