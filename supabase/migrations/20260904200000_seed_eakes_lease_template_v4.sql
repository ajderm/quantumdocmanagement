-- Publishes the Eakes lease template as version 4: nothing invented.
--
-- Two things on this document were written by the app rather than by Eakes,
-- on a page a customer signs:
--
--   * Four paragraphs of terms and conditions, authored to look plausible.
--     They now come from the dealer's own configured document terms and the
--     section is omitted entirely when they have entered none. Their real
--     terms are in the copier lease tool spreadsheet Mike described (7/31).
--
--   * A sales tax rate of 8.7%, which nobody had chosen, printed as
--     "Estimated tax (8.7%)" with a total built on it. The rate now comes
--     from a dealer setting, and with none set the tax line disappears and
--     the total falls back to the bare subtotal rather than vanishing with
--     the line it was derived from.
--
-- Requires a renderer that honours hideEmpty on richText blocks and provides
-- firstNonZero. Deploy the renderer before applying this. Applied against an
-- older renderer, the terms section would print an empty heading and the
-- total would disappear whenever no tax rate was set.
--
-- A partial unique index permits one published version per document type per
-- dealer, so earlier versions are unpublished in the same transaction.

begin;

update public.render_templates
   set is_published = false, updated_at = now()
 where document_code = 'quote' and is_published;

insert into public.render_templates
  (dealer_account_id, document_code, name, version, template, is_published, notes, created_by)
select da.id, 'quote', 'Equipment Lease Quotation (Eakes)', 4,
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
    "tax": "round(totals.subtotal * dealer.tax_rate, 2)",
    "grand": "firstNonZero(totals.subtotal + computed.tax, totals.subtotal)",
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
          "label": "Equipment subtotal",
          "expr": "totals.subtotal"
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
       'Terms and sales tax come from dealer settings; neither is authored by the template.',
       'system'
from public.dealer_accounts da
on conflict (dealer_account_id, document_code, version) do update
  set template = excluded.template,
      name = excluded.name,
      is_published = true,
      notes = excluded.notes,
      updated_at = now();

commit;
