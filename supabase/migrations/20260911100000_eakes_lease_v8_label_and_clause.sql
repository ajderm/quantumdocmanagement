-- Lease Agreement (Eakes) v8: two corrections to v7, both visible on paper a
-- customer signs.
--
-- 1. "Lessor" was the wrong label. v6 labels the leasing company field
--    "Lessor" and fills it with the leasing partner. Eakes Inc. is the
--    Lessor; Hometown Leasing is the assignee that the lease is sold to.
--    Page 4 of the same document already states this correctly:
--    "between Eakes Inc., Omaha, Nebraska (Lessor) and <customer> (Lessee)".
--    So the document contradicted itself. Relabelled "Leasing company".
--
-- 2. Clause 2 of the Letter of Instruction read
--       "...will be due  and will be due on the same day of each following
--        month."
--    because {{lease.first_payment_date}} has no payload field behind it.
--    The empty slot read worse than no slot. Reworded so the sentence is
--    complete and true without it. The specific first payment date is still
--    something a rep can add by hand, and the wording no longer depends on it.
--
-- DELIBERATELY NOT CHANGED: {{lease.partner}} still prints whatever the rep
-- selected in the Leasing Company picker. It currently renders
-- "Hometown Leasing - Municipal" for municipal deals, because the customer
-- class is encoded in the leasing company name as a stop-gap until
-- lease_rate_factors carries a customer_class column. Replacing the token
-- with a literal "Hometown Leasing" would fix that but print the wrong payee
-- on any deal placed with US Bank, Wells Fargo, In-House or Other, which are
-- all live options in this portal. A cosmetic error is preferable to a
-- factual one, so this waits for the real column.
--
-- Built by text-substitution on v7's own JSON, so nothing else in the
-- template can shift.
--
-- ROLLBACK: republish v7.
--     update public.render_templates rt set is_published = (rt.version = 7)
--       from public.dealer_accounts da
--      where da.id = rt.dealer_account_id
--        and da.hubspot_portal_id = '43692327'
--        and rt.document_code = 'quote';

begin;

update public.render_templates rt
   set is_published = false, updated_at = now()
  from public.dealer_accounts da
 where da.id = rt.dealer_account_id
   and da.hubspot_portal_id = '43692327'
   and rt.document_code = 'quote'
   and rt.is_published;

insert into public.render_templates
  (dealer_account_id, document_code, name, version, template, is_published, notes, created_by)
select src.dealer_account_id,
       'quote',
       'Lease Agreement (Eakes)',
       8,
       replace(
         replace(
           src.template::text,
           '"label": "Lessor"',
           '"label": "Leasing company"'
         ),
         'Your next regular monthly payment will be due {{lease.first_payment_date}} and will be due on the same day of each following month.',
         'Payments are due on the same day of each month for the term of the agreement.'
       )::jsonb,
       true,
       'v7 with the leasing company field relabelled from Lessor, and letter clause 2 reworded so it reads correctly without a first-payment-date field.',
       'system'
  from public.render_templates src
  join public.dealer_accounts da on da.id = src.dealer_account_id
 where da.hubspot_portal_id = '43692327'
   and src.document_code = 'quote'
   and src.version = 7
on conflict (dealer_account_id, document_code, version) do update
  set template = excluded.template,
      name = excluded.name,
      is_published = true,
      notes = excluded.notes,
      updated_at = now();

-- Fail loudly rather than publishing a half-applied template: if either
-- substitution missed, the strings above have drifted from v7.
do $$
declare t text;
begin
  select rt.template::text into t
    from public.render_templates rt
    join public.dealer_accounts da on da.id = rt.dealer_account_id
   where da.hubspot_portal_id = '43692327'
     and rt.document_code = 'quote'
     and rt.version = 8;

  if t like '%"label": "Lessor"%' then
    raise exception 'v8: the Lessor label was not replaced - v7 JSON has drifted';
  end if;
  if t like '%first_payment_date%' then
    raise exception 'v8: clause 2 was not replaced - v7 JSON has drifted';
  end if;
  if t not like '%"label": "Leasing company"%' then
    raise exception 'v8: expected the Leasing company label to be present';
  end if;
end $$;

commit;
