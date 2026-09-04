-- Platform admins and per-document engine modes.
--
-- A platform admin is a QBS operator who can switch a document type between
-- the native (hardcoded) generator and the template-driven engine, in ANY
-- portal where the app is installed. That is a cross-tenant capability, so it
-- is keyed on a verified email address rather than on a HubSpot user id: user
-- ids are portal-scoped and arrive from a URL parameter, so they identify
-- nobody. Every table here is service-role only; RLS is enabled with no
-- policies deliberately, so a leaked anon key cannot read or write any of it.

-- ---------------------------------------------------------------------------
-- Who may switch engines, anywhere
-- ---------------------------------------------------------------------------
create table if not exists public.platform_admins (
  email       text primary key check (email = lower(email) and position('@' in email) > 1),
  note        text,
  created_at  timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

comment on table public.platform_admins is
  'Cross-portal operators permitted to change document engine modes. Service-role access only.';

insert into public.platform_admins (email, note) values
  ('marko@thequantumleap.business', 'Quantum Business Solutions'),
  ('shawn@thequantumleap.business', 'Quantum Business Solutions')
on conflict (email) do nothing;

-- ---------------------------------------------------------------------------
-- Which engine serves a given document type for a given dealer
-- ---------------------------------------------------------------------------
create table if not exists public.document_engine_modes (
  dealer_account_id uuid not null references public.dealer_accounts(id) on delete cascade,
  document_code     text not null,
  engine            text not null default 'native' check (engine in ('native', 'template')),
  updated_by        text,
  updated_at        timestamptz not null default now(),
  primary key (dealer_account_id, document_code)
);

alter table public.document_engine_modes enable row level security;

comment on table public.document_engine_modes is
  'Per dealer, per document type: which generator serves it. Absent row means native.';
comment on column public.document_engine_modes.engine is
  'native = the existing hardcoded form/preview pair; template = the template-driven renderer.';

-- ---------------------------------------------------------------------------
-- Audit trail
-- ---------------------------------------------------------------------------
-- A capability that crosses tenant boundaries needs a record of every use,
-- including the attempts that were refused.
create table if not exists public.platform_admin_audit (
  id                     uuid primary key default gen_random_uuid(),
  actor_email            text,
  actor_hubspot_user_id  text,
  action                 text not null,
  outcome                text not null check (outcome in ('allowed', 'denied')),
  portal_id              text,
  dealer_account_id      uuid,
  document_code          text,
  from_value             text,
  to_value               text,
  auth_method            text,
  reason                 text,
  user_agent             text,
  created_at             timestamptz not null default now()
);

alter table public.platform_admin_audit enable row level security;

create index if not exists platform_admin_audit_created_at_idx
  on public.platform_admin_audit (created_at desc);
create index if not exists platform_admin_audit_actor_idx
  on public.platform_admin_audit (actor_email, created_at desc);

comment on table public.platform_admin_audit is
  'Every engine-mode change and every refused attempt. Service-role access only.';
