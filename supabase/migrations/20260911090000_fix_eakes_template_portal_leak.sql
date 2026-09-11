-- Contain a multi-tenant leak in 20260909140000_eakes_real_lease_document.sql.
--
-- That migration scoped its document_terms and dealer_settings inserts to
-- Eakes (where da.hubspot_portal_id = '43692327') but NOT its render_templates
-- insert, which reads:
--
--     from public.dealer_accounts da
--     on conflict (dealer_account_id, document_code, version) do update
--
-- with no where clause. So Eakes' lease template v6 was inserted and published
-- for EVERY dealer account. The unpublish immediately above it is unscoped too:
--
--     update public.render_templates set is_published = false
--      where document_code = 'quote' and is_published;
--
-- so every other dealer's published quote template was unpublished at the same
-- time.
--
-- Visible impact is limited to dealers whose document_engine_modes has
-- quote = 'template'; dealers on native never call the renderer. But the rows
-- exist and would surface the moment anyone flips that toggle, printing Eakes'
-- agreement, Eakes' terms and Eakes' letterhead to another dealer's customer.
--
-- This migration removes the leaked rows. It deliberately does NOT try to
-- restore other dealers' is_published flags: the previous state was not
-- recorded, and guessing which of their versions was live is worse than
-- telling a human to look. The final select reports who needs review.

begin;

-- 1. Report, before changing anything, which dealers received the leak.
--    Visible in the migration output.
select da.hubspot_portal_id,
       rt.document_code,
       rt.version,
       rt.name,
       rt.is_published
  from public.render_templates rt
  join public.dealer_accounts da on da.id = rt.dealer_account_id
 where rt.document_code = 'quote'
   and rt.name = 'Lease Agreement (Eakes)'
   and da.hubspot_portal_id <> '43692327'
 order by da.hubspot_portal_id;

-- 2. Delete the leaked rows. Matched on name as well as version so a dealer's
--    own v6, if they ever author one, is not caught by this.
delete from public.render_templates rt
 using public.dealer_accounts da
 where da.id = rt.dealer_account_id
   and rt.document_code = 'quote'
   and rt.version = 6
   and rt.name = 'Lease Agreement (Eakes)'
   and da.hubspot_portal_id <> '43692327';

-- 3. Report dealers who now have NO published quote template but do have
--    quote templates on file - i.e. candidates that the unscoped unpublish
--    switched off. A human decides which version to republish.
select da.hubspot_portal_id,
       count(*) filter (where rt.is_published) as published_count,
       count(*)                                as template_count
  from public.render_templates rt
  join public.dealer_accounts da on da.id = rt.dealer_account_id
 where rt.document_code = 'quote'
   and da.hubspot_portal_id <> '43692327'
 group by da.hubspot_portal_id
having count(*) filter (where rt.is_published) = 0
 order by da.hubspot_portal_id;

commit;
