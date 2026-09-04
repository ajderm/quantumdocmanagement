-- Publishes the Eakes lease template as version 3: QuoteIQ's payment, not ours.
--
-- Version 2 derived the monthly payment from a rate factor
-- (`round(grand * rate_factor, 2)`). QuoteIQ writes the real payment and term
-- back to the deal, and Jason asked three times (7/31 twice, 8/31) for the
-- paperwork to use them. The funder's figure is what the customer was quoted;
-- a payment reconstructed here can silently disagree with it, and the customer
-- signs this page.
--
-- The monthly row now reads
-- `firstNonZero(lease.payment, round(computed.grand * lease.rate_factor, 2))`,
-- so a deal QuoteIQ has not written still produces a document from the rate
-- factor, and one with neither prints no payment at all rather than \$0.00.
-- Term & Payment also gains the lease type and the payment itself, both of
-- which drop out when absent.
--
-- Requires a renderer that provides firstNonZero. Deploy the renderer before
-- applying this, or the monthly payment resolves to zero and is suppressed --
-- wrong, but never a wrong number.
--
-- A partial unique index permits one published version per document type per
-- dealer, so version 2 is unpublished in the same transaction.

begin;

update public.render_templates
   set is_published = false, updated_at = now()
 where document_code = 'quote' and is_published;

insert into public.render_templates
  (dealer_account_id, document_code, name, version, template, is_published, notes, created_by)
select da.id, 'quote', 'Equipment Lease Quotation (Eakes)', 3,
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
  "vars": {
    "taxRate": 0.087
  },
  "computed": {
    "tax": "round(totals.subtotal * vars.taxRate, 2)",
    "grand": "totals.subtotal + computed.tax",
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
      "rows": [
        {
          "label": "Equipment subtotal",
          "expr": "totals.subtotal"
        },
        {
          "label": "Estimated tax ({{vars.taxRate | percent}})",
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
      "html": "<p><strong>Term.</strong> This quotation is valid through the date shown above and is\ncontingent on credit approval by the lessor named in Term &amp; Payment Information. Equipment\nremains the property of the lessor for the duration of the lease term.</p>\n<p><strong>Buyback.</strong> These are FMV leases with a $1.00 BuyBack of the lease rights by\nEakes at the end of the Term.</p>\n<p><strong>Installation.</strong> Installation includes network configuration, driver deployment to\nworkstations identified at survey, and end-user orientation at the equipment location listed above.\nEquipment shall not be removed from that location without written consent of the Lessor.</p>\n<p><strong>Billing.</strong> Meter-based overage is billed in arrears. Removal of existing equipment\nis quoted separately and is not included in the totals above. Sales tax is estimated and will be\nassessed at the rate in effect on the invoice date.</p>"
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
       'QuoteIQ lease_payment and lease_term_months take precedence over the rate-factor derivation.',
       'system'
from public.dealer_accounts da
on conflict (dealer_account_id, document_code, version) do update
  set template = excluded.template,
      name = excluded.name,
      is_published = true,
      notes = excluded.notes,
      updated_at = now();

commit;
