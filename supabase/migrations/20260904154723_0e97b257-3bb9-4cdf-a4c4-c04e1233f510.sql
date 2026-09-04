-- Storage for the template-driven document engine.
create table if not exists public.render_templates (
  id                uuid primary key default gen_random_uuid(),
  dealer_account_id uuid not null references public.dealer_accounts(id) on delete cascade,
  document_code     text not null,
  name              text not null,
  version           integer not null default 1,
  template          jsonb not null,
  is_published      boolean not null default false,
  notes             text,
  created_by        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (dealer_account_id, document_code, version)
);

alter table public.render_templates enable row level security;

create unique index if not exists render_templates_one_published
  on public.render_templates (dealer_account_id, document_code)
  where is_published;

create index if not exists render_templates_lookup_idx
  on public.render_templates (dealer_account_id, document_code, version desc);

comment on table public.render_templates is
  'Versioned layout definitions for the template-driven renderer. Service-role access only.';
comment on column public.render_templates.template is
  'Renderer template JSON. See renderer/README.md for the shape.';

create table if not exists public.rendered_documents (
  id                 uuid primary key default gen_random_uuid(),
  dealer_account_id  uuid not null references public.dealer_accounts(id) on delete cascade,
  document_code      text not null,
  object_type        text not null default 'deals',
  record_id          text not null,
  render_template_id uuid references public.render_templates(id) on delete set null,
  template_version   integer,
  data_snapshot      jsonb,
  page_count         integer,
  byte_size          integer,
  render_ms          integer,
  warnings           text[],
  hubspot_file_id    text,
  storage_path       text,
  created_by         text,
  created_at         timestamptz not null default now()
);

alter table public.rendered_documents enable row level security;

create index if not exists rendered_documents_record_idx
  on public.rendered_documents (dealer_account_id, object_type, record_id, created_at desc);

comment on table public.rendered_documents is
  'One row per document produced by the template engine, with the template version and frozen input. Service-role access only.';

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
    "margins": { "top": 0.95, "right": 0.6, "bottom": 0.6, "left": 0.6 }
  },
  "chrome": {
    "companyName": "{{dealer.company}}",
    "lines": ["{{dealer.address}}", "{{dealer.phone}} · {{dealer.website}}"],
    "right": ["QUOTATION {{deal.quote_number}}", "{{today | date:medium}}", "{{company.name}}"],
    "footerNote": "{{dealer.company}} · Quote {{deal.quote_number}}"
  },
  "vars": { "taxRate": 0.087 },
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
        { "label": "Quote", "value": "{{deal.quote_number}}" },
        { "label": "Date", "value": "{{today | date}}" },
        { "label": "Valid through", "value": "{{deal.close_date | date}}" },
        { "label": "Rep", "value": "{{rep.name}}" }
      ]
    },
    {
      "type": "fieldGrid",
      "title": "Customer",
      "columns": 2,
      "hideEmpty": true,
      "fields": [
        { "label": "Customer", "value": "{{company.name}}" },
        { "label": "Project", "value": "{{deal.name}}" },
        { "label": "Address", "value": "{{company.address}}" },
        { "label": "Ship to", "value": "{{contact.ship_to}}" },
        { "label": "Lease partner", "value": "{{lease.partner}}" },
        { "label": "Term", "value": "{{lease.term}} months" },
        { "label": "Rate factor", "value": "{{lease.rate_factor | rate}}" },
        { "label": "Contact", "value": "{{rep.phone}}" }
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
        { "key": "name", "label": "Description", "width": "44%" },
        { "key": "type", "label": "Type", "width": "13%" },
        { "key": "quantity", "label": "Qty", "width": "8%", "align": "right" },
        { "key": "unit", "label": "Unit", "width": "16%", "align": "right", "format": "currency" },
        { "key": "extended", "label": "Extended", "width": "19%", "align": "right", "format": "currency" }
      ]
    },
    {
      "type": "summary",
      "rows": [
        { "label": "Equipment subtotal", "expr": "totals.subtotal" },
        { "label": "Estimated tax ({{vars.taxRate | percent}})", "expr": "computed.tax" },
        { "label": "Total financed", "expr": "computed.grand", "bold": true, "rule": true },
        { "label": "Monthly payment · {{lease.term}} mo × {{lease.rate_factor | rate}}", "expr": "computed.monthly" }
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
        { "label": "{{company.name}}", "sublabel": "authorized signature & date" },
        { "label": "{{dealer.company}}", "sublabel": "{{rep.name}}" }
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