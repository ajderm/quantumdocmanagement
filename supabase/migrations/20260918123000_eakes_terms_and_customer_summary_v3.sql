begin;
insert into public.dealer_settings (dealer_account_id, setting_key, setting_value)
select da.id, 'lighten_terms', 'true'::jsonb from public.dealer_accounts da where da.hubspot_portal_id = '43692327'
on conflict (dealer_account_id, setting_key) do update set setting_value = excluded.setting_value, updated_at = now();
update public.render_templates rt set is_published = false, updated_at = now() from public.dealer_accounts da
 where da.id = rt.dealer_account_id and da.hubspot_portal_id = '43692327' and rt.document_code = 'new_customer' and rt.is_published;
insert into public.render_templates
  (dealer_account_id, document_code, name, version, template, is_published, notes, created_by)
select da.id, 'new_customer', 'Customer Summary (Eakes)', 3,
       jsonb_set(prior.template, '{blocks}', prior.template->'blocks' || jsonb_build_array(jsonb_build_object(
         'type', 'richText', 'title', 'Please Return To:',
         'html', '<p>P.O. Box 2098, Grand Island, NE 68802-2098<br />Fax: (308) 398-6848 · E-mail: credit@eakes.com</p>',
         'keepTogether', true))), true,
       'Restores the fixed Eakes credit-department return block. Dealer chrome follows the resolved selling branch.', 'system'
  from public.dealer_accounts da
  join lateral (select rt.template from public.render_templates rt where rt.dealer_account_id = da.id and rt.document_code = 'new_customer' order by rt.version desc limit 1) prior on true
 where da.hubspot_portal_id = '43692327'
on conflict (dealer_account_id, document_code, version) do update set template = excluded.template, name = excluded.name,
 is_published = true, notes = excluded.notes, updated_at = now();
do $$ declare n int; begin
 select count(*) into n from public.render_templates rt join public.dealer_accounts da on da.id = rt.dealer_account_id
 where da.hubspot_portal_id = '43692327' and rt.document_code = 'new_customer' and rt.is_published;
 if n <> 1 then raise exception 'expected exactly one published Eakes Customer Summary, found %', n; end if;
end $$;
commit;
