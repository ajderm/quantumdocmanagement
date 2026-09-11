-- Tidy up the remaining fallout from five unscoped template migrations.
--
-- These five all insert render_templates for every dealer, with no
-- hubspot_portal_id filter:
--
--   20260904141000_seed_quote_template
--   20260904170000_seed_eakes_lease_template
--   20260904190000_seed_eakes_lease_template_v3
--   20260904200000_seed_eakes_lease_template_v4
--   20260909120000_seed_eakes_lease_template_v5
--
-- so portals 20682069, 244111826 and 244534015 each carry v2-v5 named
-- "Equipment Lease Quotation (Eakes)". Today's earlier fix removed only the
-- v6 rows.
--
-- This is hygiene, not an incident. Verified before writing it:
--   * every leaked row is is_published = false
--   * no non-Eakes portal has document_engine_modes.engine = 'template' for
--     quote, so none of them ever calls the renderer
--   * document_terms did NOT leak - each portal holds its own distinct terms
--
-- So nothing was ever visible to any customer. The reason to clean it up is
-- that the rows would surface the moment anyone flips a portal to the
-- template engine, and would print Eakes' agreement to another dealer's
-- customer.
--
-- v1 "Equipment Quotation (reference)" is a generic default, not a leak. It
-- is kept and republished so each portal has a sane template if that toggle
-- is ever switched on.

begin;

-- 1. Remove the Eakes-named leaks from every portal that is not Eakes.
--    Matched on name, so a dealer's own future v2-v5 is never caught.
delete from public.render_templates rt
 using public.dealer_accounts da
 where da.id = rt.dealer_account_id
   and rt.document_code = 'quote'
   and rt.name = 'Equipment Lease Quotation (Eakes)'
   and da.hubspot_portal_id <> '43692327';

-- 2. Republish each non-Eakes portal's generic v1, but only where nothing
--    else is published, so a dealer who has since published their own
--    template is left alone.
update public.render_templates rt
   set is_published = true, updated_at = now()
  from public.dealer_accounts da
 where da.id = rt.dealer_account_id
   and da.hubspot_portal_id <> '43692327'
   and rt.document_code = 'quote'
   and rt.name = 'Equipment Quotation (reference)'
   and not exists (
     select 1
       from public.render_templates other
      where other.dealer_account_id = rt.dealer_account_id
        and other.document_code = 'quote'
        and other.is_published
   );

-- 3. Report the resulting state for every non-Eakes portal.
select da.hubspot_portal_id,
       rt.version,
       rt.name,
       rt.is_published
  from public.render_templates rt
  join public.dealer_accounts da on da.id = rt.dealer_account_id
 where rt.document_code = 'quote'
   and da.hubspot_portal_id <> '43692327'
 order by da.hubspot_portal_id, rt.version;

commit;
