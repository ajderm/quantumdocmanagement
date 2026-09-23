create temporary table _svc_v1 on commit drop as
select rt.dealer_account_id, rt.template
  from public.render_templates rt
  join public.dealer_accounts da on da.id = rt.dealer_account_id
 where da.hubspot_portal_id = '43692327'
   and rt.document_code = 'service_agreement'
   and rt.version = 1;

update public.render_templates rt
   set is_published = false, updated_at = now()
  from public.dealer_accounts da
 where da.id = rt.dealer_account_id
   and da.hubspot_portal_id = '43692327'
   and rt.document_code = 'service_agreement'
   and rt.is_published;

insert into public.render_templates
  (dealer_account_id, document_code, name, version, template, is_published, notes, created_by)
select
  v.dealer_account_id, 'service_agreement', 'Service Agreement (Eakes)', 2,
  jsonb_set(
    jsonb_set(v.template, '{id}', '"tmpl_eakes_service_v2"'),
    '{blocks}',
    (
      select jsonb_agg(
        case when b->>'type' = 'summary' then
          jsonb_build_object(
            'type', 'summary',
            'hideEmpty', true,
            'rows', jsonb_build_array(
              jsonb_build_object('label', '{{service.billing_period}} total, plus tax',
                                 'expr', 'service.base_rate', 'bold', true),
              jsonb_build_object('label', 'Annual total, plus tax',
                                 'expr', 'service.annual_total', 'bold', true, 'rule', true)
            )
          )
        else b end
        order by ord
      )
      from jsonb_array_elements(v.template->'blocks') with ordinality as t(b, ord)
    )
  ),
  true,
  'v2: rates table totals - period total and annual total replace the single base-rate row.',
  'system'
from _svc_v1 v
on conflict (dealer_account_id, document_code, version) do update
  set template = excluded.template, name = excluded.name, is_published = true,
      notes = excluded.notes, updated_at = now();

do $$
declare n int;
begin
  select count(*) into n
    from public.render_templates rt
    join public.dealer_accounts da on da.id = rt.dealer_account_id
   where da.hubspot_portal_id = '43692327'
     and rt.document_code = 'service_agreement'
     and rt.is_published
     and rt.version = 2
     and rt.template::text like '%service.annual_total%';
  if n <> 1 then
    raise exception 'expected exactly one published service_agreement v2 with annual total, found %', n;
  end if;
end $$;