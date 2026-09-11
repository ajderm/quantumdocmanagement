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