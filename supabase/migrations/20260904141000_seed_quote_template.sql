-- Seeds the reference quote template for the template-driven renderer.
--
-- This is the exact template the renderer's corpus is tested against: 20 cases
-- covering an empty table, a row taller than a page, the page-1 boundary,
-- 250 rows, grouping, null tokens and a hostile terms entry. So the first
-- document a dealer renders through the new engine has known-good pagination
-- rather than something typed in by hand.
--
-- Seeded published, for every dealer account that does not already have a
-- published quote template. Publishing it changes nothing on its own: a
-- document type only renders through this engine once its row in
-- document_engine_modes says 'template' AND the app branches on that.

insert into public.render_templates
  (dealer_account_id, document_code, name, version, template, is_published, notes, created_by)
select da.id,
       'quote',
       'Equipment Quotation (reference)',
       1,
       $${
  "id": "tmpl_quote_v1",
  "name": "Equipment Quotation",
  "page": {
    "size": "letter",
    "orientation": "portrait",
    "margins": {
      "top": 0.95,
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
      "{{today | date:medium}}",
      "{{company.name}}"
    ],
    "footerNote": "{{dealer.company}} · Quote {{deal.quote_number}}"
  },
  "vars": {
    "taxRate": 0.087
  },
  "computed": {
    "tax": "round(totals.subtotal * vars.taxRate, 2)",
    "grand": "totals.subtotal + computed.tax",
    "monthly": "round(computed.grand * lease.rate_factor, 2)"
  },
  "blocks": [
    {
      "type": "docTitle",
      "title": "Equipment Quotation",
      "meta": [
        {
          "label": "Quote",
          "value": "{{deal.quote_number}}"
        },
        {
          "label": "Date",
          "value": "{{today | date}}"
        },
        {
          "label": "Valid through",
          "value": "{{deal.close_date | date}}"
        },
        {
          "label": "Rep",
          "value": "{{rep.name}}"
        }
      ]
    },
    {
      "type": "fieldGrid",
      "title": "Customer",
      "columns": 2,
      "hideEmpty": true,
      "fields": [
        {
          "label": "Customer",
          "value": "{{company.name}}"
        },
        {
          "label": "Project",
          "value": "{{deal.name}}"
        },
        {
          "label": "Address",
          "value": "{{company.address}}"
        },
        {
          "label": "Ship to",
          "value": "{{contact.ship_to}}"
        },
        {
          "label": "Lease partner",
          "value": "{{lease.partner}}"
        },
        {
          "label": "Term",
          "value": "{{lease.term}} months"
        },
        {
          "label": "Rate factor",
          "value": "{{lease.rate_factor | rate}}"
        },
        {
          "label": "Contact",
          "value": "{{rep.phone}}"
        }
      ]
    },
    {
      "type": "table",
      "title": "Equipment & Accessories",
      "bind": "line_items",
      "amountKey": "extended",
      "qtyKey": "quantity",
      "emptyText": "No equipment has been added to this quote.",
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
          "label": "Monthly payment · {{lease.term}} mo × {{lease.rate_factor | rate}}",
          "expr": "computed.monthly"
        }
      ]
    },
    {
      "type": "richText",
      "title": "Terms & Conditions",
      "html": "<p>Pricing is valid through the date shown above and is contingent on credit\napproval by <strong>GreatAmerica</strong>. Equipment remains the property of the lessor for the\nduration of the lease term. Installation includes network configuration, driver deployment to\nworkstations identified at survey, and end-user orientation at each location listed.</p>\n<p>Meter-based overage is billed quarterly in arrears. Removal of existing equipment is quoted\nseparately and is not included in the totals above. Sales tax is estimated and will be assessed\nat the rate in effect on the invoice date.</p>"
    },
    {
      "type": "signature",
      "title": "Acceptance",
      "signers": [
        {
          "label": "{{company.name}}",
          "sublabel": "authorized signature & date"
        },
        {
          "label": "{{dealer.company}}",
          "sublabel": "{{rep.name}}"
        }
      ]
    }
  ]
}$$::jsonb,
       true,
       'Seeded reference template. Verified by the renderer corpus at 20/20.',
       'system'
from public.dealer_accounts da
where not exists (
  select 1 from public.render_templates rt
  where rt.dealer_account_id = da.id
    and rt.document_code = 'quote'
    and rt.is_published
);
