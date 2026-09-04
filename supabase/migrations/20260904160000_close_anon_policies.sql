-- Closes the last policies reachable with the publishable (anon) key.
--
-- Four tables still carried permissive policies. Two of them were the serious
-- ones: get-user-access reads app_user_roles to decide what a user may do, so
-- anyone holding the publishable key -- which ships in the browser bundle by
-- design -- could insert or update their own row with role 'admin' and the app
-- would honour it. That is privilege escalation, not only disclosure.
--
--   app_user_roles             anon SELECT / INSERT / UPDATE
--   access_rules               anon SELECT / INSERT / UPDATE
--   removal_configurations     FOR ALL, no TO clause, so every role
--   relocation_configurations  FOR ALL, no TO clause, so every role
--
-- The last two were written as "service role" policies but given no TO clause,
-- which makes them apply to every role including anon. They were never needed
-- for their stated purpose: the service role bypasses RLS entirely, so an edge
-- function reaches these tables with no policy present at all. Dropping them
-- removes access rather than adding restrictions.
--
-- app_user_roles and access_rules were the only tables the browser touched
-- directly. That access now goes through the user-roles edge function, which
-- resolves the dealer account from portalId instead of accepting one from the
-- caller -- otherwise the cross-tenant write survives one layer further back.
--
-- Deploy user-roles BEFORE applying this, or the User Roles admin screen will
-- read and write nothing in between.

-- ---------------------------------------------------------------------------
-- Privilege escalation
-- ---------------------------------------------------------------------------
drop policy if exists "Anon read app_user_roles"   on public.app_user_roles;
drop policy if exists "Anon write app_user_roles"  on public.app_user_roles;
drop policy if exists "Anon update app_user_roles" on public.app_user_roles;

drop policy if exists "Anon read access_rules"   on public.access_rules;
drop policy if exists "Anon write access_rules"  on public.access_rules;
drop policy if exists "Anon update access_rules" on public.access_rules;

-- ---------------------------------------------------------------------------
-- Customer document data
-- ---------------------------------------------------------------------------
drop policy if exists "Service role can manage removal configurations"
  on public.removal_configurations;
drop policy if exists "Service role has full access to relocation_configurations"
  on public.relocation_configurations;

-- RLS stays enabled on all four. With no policies, the anon and authenticated
-- roles get nothing and the service role is unaffected, which is exactly the
-- posture the rest of this schema already uses.
do $$
begin
  execute 'alter table public.app_user_roles            enable row level security';
  execute 'alter table public.access_rules              enable row level security';
  execute 'alter table public.removal_configurations    enable row level security';
  execute 'alter table public.relocation_configurations enable row level security';
end $$;
