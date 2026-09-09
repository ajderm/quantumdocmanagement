-- Publishes the Eakes lease template as version 5: taxable vs non-taxable.
--
-- Mike Nierman, 2026-08-31: "the paperwork we show the bank should have a
-- taxable total and non-taxable total. Because the bank double-checks that
-- property when they are processing." Andrea, same call: "a rollover slash
-- buyout, knockout, things of that sort... are considered non-taxable items,
-- because they've already been taxed previously."
--
-- So the summary now states both, and tax is computed on the taxable portion
-- alone rather than on the whole subtotal -- taxing an already-taxed rollover
-- again would overstate what is owed on the document the bank reconciles.
--
-- The equipment table no longer sums to the total either, because buyout and
-- rollover lines are counted without being listed ("we wouldn't see the
-- buyout, but it would be included") and Chart 0/Zone 3 lines are neither
-- listed nor counted ("we never want to see anything that contains chart").
-- The totals therefore come from amounts.* on the payload rather than from
-- totals.subtotal, which only ever knew about the rows it could see.
--
-- Requires the app build that supplies amounts.* -- an older client sends no
-- such field, and every total on the document would resolve to nothing.
-- Publish the app before applying this.

begin;

update public.render_templates
   set is_published = false, updated_at = now()
 where document_code = 'quote' and is_published;

insert into public.render_templates
  (dealer_account_id, document_code, name, version, template, is_published, notes, created_by)
select da.id, 'quote', 'Equipment Lease Quotation (Eakes)', 5,
       $tmpl${
  "id": "tmpl_eakes_lease_v1",
  "name": "Equipment Lease Quotation (Eakes)",
  "page": {
    "size": "letter",
    "orientation": "portrait",
    "margins": {
      "top": 1.15,
      "right": 0.6,
      "bottom": 0.6,
      "left": 0.6
    }
  },
  "chrome": {
    "companyName": "{{dealer.company}}",
    "lines": [
      "{{dealer.address}}",
      "{{dealer.phone}} · {{dealer.website}}"
    ],
    "right": [
      "QUOTATION {{deal.quote_number}}",
      "Contract date {{today | date:medium}}"
    ],
    "footerNote": "{{dealer.company}} · {{company.name}} · Quote {{deal.quote_number}}"
  },
  "styles": {
    "fontFamily": "Arial, Helvetica, sans-serif",
    "fontSize": 9
  },
  "computed": {
    "tax": "round(amounts.taxable * dealer.tax_rate, 2)",
    "grand": "firstNonZero(amounts.total + computed.tax, amounts.total)",
    "monthly": "firstNonZero(lease.payment, round(computed.grand * lease.rate_factor, 2))"
  },
  "blocks": [
    {
      "type": "docTitle",
      "title": "Equipment Lease Quotation",
      "meta": [
        {
          "label": "Contract date",
          "value": "{{today | date}}"
        },
        {
          "label": "Quote",
          "value": "{{deal.quote_number}}"
        },
        {
          "label": "Valid through",
          "value": "{{deal.close_date | date}}"
        }
      ]
    },
    {
      "type": "fieldGrid",
      "title": "Lessee Information",
      "columns": 2,
      "hideEmpty": true,
      "fields": [
        {
          "label": "Full legal name",
          "value": "{{company.name}}",
          "full": true
        },
        {
          "label": "Billing address",
          "value": "{{company.street}}",
          "full": true
        },
        {
          "label": "City",
          "value": "{{company.city}}"
        },
        {
          "label": "County",
          "value": "{{company.county}}"
        },
        {
          "label": "State",
          "value": "{{company.state}}"
        },
        {
          "label": "Zip",
          "value": "{{company.zip}}"
        },
        {
          "label": "Phone",
          "value": "{{company.phone}}"
        },
        {
          "label": "Project",
          "value": "{{deal.name}}"
        }
      ]
    },
    {
      "type": "fieldGrid",
      "title": "Equipment Location",
      "columns": 2,
      "hideEmpty": true,
      "fields": [
        {
          "label": "Street address",
          "value": "{{location.street}}",
          "full": true
        },
        {
          "label": "City",
          "value": "{{location.city}}"
        },
        {
          "label": "County",
          "value": "{{location.county}}"
        },
        {
          "label": "State",
          "value": "{{location.state}}"
        },
        {
          "label": "Zip",
          "value": "{{location.zip}}"
        },
        {
          "label": "Site contact",
          "value": "{{contact.ship_to}}"
        }
      ]
    },
    {
      "type": "richText",
      "keepTogether": true,
      "html": "<p><em>Equipment shall not be removed from this location without written consent of Lessor.</em></p>"
    },
    {
      "type": "table",
      "title": "Equipment Information",
      "bind": "line_items",
      "amountKey": "extended",
      "qtyKey": "quantity",
      "maxRows": 100,
      "emptyText": "No equipment has been added to this quotation.",
      "columns": [
        {
          "key": "name",
          "label": "Description",
          "width": "44%"
        },
        {
          "key": "type",
          "label": "Type",
          "width": "13%"
        },
        {
          "key": "quantity",
          "label": "Qty",
          "width": "8%",
          "align": "right"
        },
        {
          "key": "unit",
          "label": "Unit",
          "width": "16%",
          "align": "right",
          "format": "currency"
        },
        {
          "key": "extended",
          "label": "Extended",
          "width": "19%",
          "align": "right",
          "format": "currency"
        }
      ]
    },
    {
      "type": "fieldGrid",
      "title": "Term & Payment Information",
      "columns": 2,
      "hideEmpty": true,
      "fields": [
        {
          "label": "Lessor",
          "value": "{{lease.partner}}"
        },
        {
          "label": "Lease type",
          "value": "{{lease.type}}"
        },
        {
          "label": "Term",
          "value": "{{lease.term}} months"
        },
        {
          "label": "Monthly payment",
          "value": "{{lease.payment | currency}}"
        },
        {
          "label": "Rate factor",
          "value": "{{lease.rate_factor | rate}}"
        },
        {
          "label": "Salesperson",
          "value": "{{rep.name}}"
        }
      ]
    },
    {
      "type": "summary",
      "hideEmpty": true,
      "rows": [
        {
          "label": "Equipment subtotal (taxable)",
          "expr": "amounts.taxable"
        },
        {
          "label": "Rollover / buyout (non-taxable)",
          "expr": "amounts.non_taxable"
        },
        {
          "label": "Estimated tax ({{dealer.tax_rate | percent}})",
          "expr": "computed.tax"
        },
        {
          "label": "Total financed",
          "expr": "computed.grand",
          "bold": true,
          "rule": true
        },
        {
          "label": "Monthly payment · {{lease.term}} mo",
          "expr": "computed.monthly"
        }
      ]
    },
    {
      "type": "richText",
      "title": "Terms & Conditions",
      "html": "{{terms.html}}",
      "hideEmpty": true
    },
    {
      "type": "signature",
      "title": "Customer Signature",
      "signers": [
        {
          "label": "{{company.name}}",
          "sublabel": "Authorized signature · Title · Date"
        },
        {
          "label": "For {{dealer.company}}",
          "sublabel": "Salesperson {{rep.name}}"
        }
      ]
    }
  ]
}$tmpl$::jsonb, true,
       'Taxable and non-taxable totals stated separately; tax computed on the taxable portion only.',
       'system'
from public.dealer_accounts da
on conflict (dealer_account_id, document_code, version) do update
  set template = excluded.template,
      name = excluded.name,
      is_published = true,
      notes = excluded.notes,
      updated_at = now();

commit;
