-- Storage for the template-driven document engine.
--
-- The existing document_templates table holds per-dealer overrides for the
-- native generator (custom fields, custom terms) and is left alone. This is a
-- different thing: the full layout definition the renderer consumes, versioned
-- so a document generated last quarter can be reproduced byte-for-byte from
-- the template that actually produced it.

create table if not exists public.render_templates (
  id                uuid primary key default gen_random_uuid(),
  dealer_account_id uuid not null references public.dealer_accounts(id) on delete cascade,
  -- Matches document_engine_modes.document_code, so a dealer can run 'quote'
  -- on the template engine while everything else stays native.
  document_code     text not null,
  name              text not null,
  version           integer not null default 1,
  -- The template JSON the renderer consumes: page, chrome, styles, vars,
  -- computed, blocks. Deliberately opaque to the database.
  template          jsonb not null,
  is_published      boolean not null default false,
  notes             text,
  created_by        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (dealer_account_id, document_code, version)
);

alter table public.render_templates enable row level security;

-- Exactly one published version per document type per dealer, so a render can
-- never be ambiguous about which layout it should use.
create unique index if not exists render_templates_one_published
  on public.render_templates (dealer_account_id, document_code)
  where is_published;

create index if not exists render_templates_lookup_idx
  on public.render_templates (dealer_account_id, document_code, version desc);

comment on table public.render_templates is
  'Versioned layout definitions for the template-driven renderer. Service-role access only.';
comment on column public.render_templates.template is
  'Renderer template JSON. See renderer/README.md for the shape.';

-- ---------------------------------------------------------------------------
-- Rendered output
-- ---------------------------------------------------------------------------
-- Records what was produced, from which template version, against which
-- frozen data. Without the snapshot a reissued document can silently differ
-- from the one a customer signed.
create table if not exists public.rendered_documents (
  id                 uuid primary key default gen_random_uuid(),
  dealer_account_id  uuid not null references public.dealer_accounts(id) on delete cascade,
  document_code      text not null,
  object_type        text not null default 'deals',
  record_id          text not null,
  render_template_id uuid references public.render_templates(id) on delete set null,
  template_version   integer,
  -- The resolved payload the renderer was given, kept verbatim.
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
