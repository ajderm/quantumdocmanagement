-- Lease Agreement v10: put the customer signature BEFORE the terms, and drop
-- the extra signature block from Exhibit A.
--
-- ======================== WHY: v9 GOT THE ORDER WRONG ================
--
-- v9 inserted a page break before the terms block, which is what I specified,
-- but the terms already sat before the signature in v6's block order. The
-- result reads:
--
--     page 1  the agreement details
--     page 2  terms and conditions
--     page 3  customer signature
--
-- The call asked for the opposite. Nate, 1:01:27: "Can we put that signature
-- up? Move the [T's and] C's to the next page." Mike, 1:01:30: "I would
-- recommend doing that, and then put a page break after customer signature,
-- so T's and C's ... start on the next page."
--
-- So the signature belongs with the details, and the terms follow the break:
--
--     page 1  the agreement details, then the customer signature
--     page 2  terms and conditions
--     page 3  letter of instruction
--     page 4  Exhibit A
--
-- The transform finds the sequence (pageBreak, terms richText, signature) and
-- emits (signature, pageBreak, terms). It asserts the sequence exists, so if
-- v9's shape ever differs the migration aborts rather than reordering
-- something unintended.
--
-- ==================== ALSO: EXHIBIT A SIGNATURE REMOVED ==============
--
-- v7 added a signature block to Exhibit A. Eakes' own Exhibit A, page 4 of
-- the signed Cornerstone packet, has no signature block on it - it is an
-- equipment schedule under a one-line header. The customer already signs on
-- page 1 and the packet is executed through DocuSign. The extra block is a
-- deviation from their paperwork that nobody asked for, so it goes.
--
-- If it turns out they do want it, the rollback below restores v9 and the
-- block comes back with it.
--
-- ROLLBACK:
--   update public.render_templates rt set is_published = (rt.version = 9)
--     from public.dealer_accounts da
--    where da.id = rt.dealer_account_id and da.hubspot_portal_id = '43692327'
--      and rt.document_code = 'quote';

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

  -- Index of the LAST signature block: that is Exhibit A's, added in v7.
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
    -- The (pageBreak, terms, signature) run becomes (signature, pageBreak, terms)
    if not moved
       and i + 2 < n
       and v_in -> i ->> 'type' = 'pageBreak'
       and v_in -> (i+1) ->> 'type' = 'richText'
       and coalesce(v_in -> (i+1) ->> 'html', '') like '%terms.html%'
       and v_in -> (i+2) ->> 'type' = 'signature'
    then
      v_out := v_out
        || jsonb_build_array(v_in -> (i+2))   -- signature, ending page 1
        || jsonb_build_array(v_in -> i)       -- page break
        || jsonb_build_array(v_in -> (i+1));  -- terms
      moved := true;
      i := i + 3;
      continue;
    end if;

    -- Drop Exhibit A's signature block
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

-- Block order of the published lease, for eyeballing before you render.
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
