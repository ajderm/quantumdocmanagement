begin;

do $$
declare
  v_dealer   uuid;
  v_tmpl     jsonb;
  v_in       jsonb;
  v_out      jsonb := '[]'::jsonb;
  n          int;
  i          int := 0;
  moved      boolean := false;
  sig_count  int := 0;
  last_sig   int;
begin
  select da.id into v_dealer
    from public.dealer_accounts da
   where da.hubspot_portal_id = '43692327';
  if v_dealer is null then
    raise exception 'Eakes dealer account not found';
  end if;

  select rt.template into v_tmpl
    from public.render_templates rt
   where rt.dealer_account_id = v_dealer
     and rt.document_code = 'quote'
     and rt.version = 9;
  if v_tmpl is null then
    raise exception 'quote v9 not found - nothing to derive v10 from';
  end if;

  v_in := v_tmpl -> 'blocks';
  n := jsonb_array_length(v_in);

  last_sig := null;
  for i in 0 .. n - 1 loop
    if v_in -> i ->> 'type' = 'signature' then
      sig_count := sig_count + 1;
      last_sig := i;
    end if;
  end loop;
  if sig_count < 2 then
    raise exception 'expected 2 signature blocks in quote v9, found %', sig_count;
  end if;

  i := 0;
  while i < n loop
    if not moved
       and i + 2 < n
       and v_in -> i ->> 'type' = 'pageBreak'
       and v_in -> (i+1) ->> 'type' = 'richText'
       and coalesce(v_in -> (i+1) ->> 'html', '') like '%terms.html%'
       and v_in -> (i+2) ->> 'type' = 'signature'
    then
      v_out := v_out
        || jsonb_build_array(v_in -> (i+2))
        || jsonb_build_array(v_in -> i)
        || jsonb_build_array(v_in -> (i+1));
      moved := true;
      i := i + 3;
      continue;
    end if;

    if i = last_sig then
      i := i + 1;
      continue;
    end if;

    v_out := v_out || jsonb_build_array(v_in -> i);
    i := i + 1;
  end loop;

  if not moved then
    raise exception
      'quote v10: did not find the (pageBreak, terms, signature) run - v9 block order is not what was expected';
  end if;

  update public.render_templates rt
     set is_published = false, updated_at = now()
   where rt.dealer_account_id = v_dealer
     and rt.document_code = 'quote'
     and rt.is_published;

  insert into public.render_templates
    (dealer_account_id, document_code, name, version, template, is_published, notes, created_by)
  values (v_dealer, 'quote', 'Lease Agreement (Eakes)', 10,
          jsonb_set(v_tmpl, '{blocks}', v_out), true,
          'Customer signature moved above the terms so the terms start on their own page, per the 11 Sept call. Exhibit A signature block removed - their own Exhibit A has none.',
          'system')
  on conflict (dealer_account_id, document_code, version) do update
    set template = excluded.template, is_published = true,
        notes = excluded.notes, updated_at = now();
end $$;

select ord, blk ->> 'type' as block_type,
       coalesce(blk ->> 'title', left(coalesce(blk ->> 'html', ''), 40)) as detail
  from public.render_templates rt
  join public.dealer_accounts da on da.id = rt.dealer_account_id
  cross join lateral jsonb_array_elements(rt.template -> 'blocks')
       with ordinality as t(blk, ord)
 where da.hubspot_portal_id = '43692327'
   and rt.document_code = 'quote'
   and rt.is_published
 order by ord;

commit;