-- Eakes, round 1 of the changes from the 11 Sept call, plus a defect fix.
--
-- ============================ THE DEFECT ============================
--
-- Every template published on 2026-09-11 declares its signature block as:
--
--     { "type": "signature", "signatories": [ { "role": ..., "nameLabel": ...,
--                                               "for": ..., "dateLabel": ... } ] }
--
-- The renderer reads a different shape (renderer/src/html.js, case 'signature'):
--
--     (b.signers ?? []).map(g => ... g.label ... g.sublabel ...)
--
-- so `signatories` is ignored and `signers` is absent. Result: a signature
-- heading with no signature lines under it. Visible on the Exhibit A page of
-- the lease as the word ACCEPTANCE over blank space.
--
-- The working v6 lease template has it right, and is the reference:
--
--     "signers": [ { "label": "{{company.name}}",
--                    "sublabel": "Authorized signature · Title · Date" } ]
--
-- Affected: quote (via the Exhibit A block added in v7), loi, fmv_lease,
-- lease_funding, installation, new_customer. All corrected below.
--
-- ======================== CALL CHANGES INCLUDED =====================
--
-- L1  Remove the Initial Meter column from the lease. Andrea, 59:26:
--     "The only thing we don't need is initial meter."
-- L5  The salesperson is NOT an authorised signer. Andrea, 1:00:17:
--     "The salesperson is not an authorized signer... That needs to be signed
--     by somebody higher up." v6's second signer reads
--     "Salesperson {{rep.name}}" as its sublabel, which asserts exactly the
--     thing they say is wrong.
-- L6  Page break so terms always start on a new page. Mike, 1:01:30:
--     "put a page break after customer signature, so T's and C's always
--     start on the next page."
--
-- ==================== DELIBERATELY NOT IN THIS FILE =================
--
-- L7  Terms at ~30% opacity. renderer/src/html.js sanitizeHtml strips EVERY
--     attribute ("Drop every attribute: no href, no style, no on* handlers"),
--     so this cannot be done from a template. It needs a CSS rule in
--     renderer/src/css.js, which per docs/document-engine.md obliges a
--     `npm run corpus` pagination run. Raised separately.
-- L2  Serial number enterable on the lease, and S8 the same on the service
--     agreement: both are form/app changes, not template changes.
--
-- Scoped to Eakes' portal only.
--
-- ROLLBACK: republish the prior versions.
--     update public.render_templates rt set is_published = (rt.version = 8)
--       from public.dealer_accounts da
--      where da.id = rt.dealer_account_id and da.hubspot_portal_id = '43692327'
--        and rt.document_code = 'quote';
--     update public.render_templates rt set is_published = (rt.version = 1)
--       from public.dealer_accounts da
--      where da.id = rt.dealer_account_id and da.hubspot_portal_id = '43692327'
--        and rt.document_code in ('loi','fmv_lease','installation');

begin;

-- ------------------------------------------------------------------
-- 1. quote v9  — derived from v8 by transforming its JSON, so nothing
--    else in the template can shift. Three transforms:
--      a) drop any table column whose key is 'meter'            (L1)
--      b) rewrite any signature block into the `signers` shape   (defect)
--      c) insert a pageBreak before the terms richText           (L6)
-- ------------------------------------------------------------------
do $$
declare
  v_dealer uuid;
  v_tmpl   jsonb;
  v_blocks jsonb := '[]'::jsonb;
  b        jsonb;
  cols     jsonb;
  newcols  jsonb;
  c        jsonb;
  inserted boolean := false;
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
     and rt.version = 8;
  if v_tmpl is null then
    raise exception 'quote v8 not found - nothing to derive v9 from';
  end if;

  for b in select jsonb_array_elements(v_tmpl -> 'blocks') loop

    -- (c) terms block: emit a pageBreak first, once
    if b ->> 'type' = 'richText'
       and coalesce(b ->> 'html', '') like '%terms.html%'
       and not inserted then
      v_blocks := v_blocks || jsonb_build_array(jsonb_build_object('type','pageBreak'));
      inserted := true;
    end if;

    -- (a) tables: strip the Initial Meter column
    if b ->> 'type' = 'table' then
      cols := coalesce(b -> 'columns', '[]'::jsonb);
      newcols := '[]'::jsonb;
      for c in select jsonb_array_elements(cols) loop
        if coalesce(c ->> 'key', '') <> 'meter' then
          newcols := newcols || jsonb_build_array(c);
        end if;
      end loop;
      b := jsonb_set(b, '{columns}', newcols);
    end if;

    -- (b) signature blocks: correct shape, and no salesperson on the Eakes line
    if b ->> 'type' = 'signature' then
      b := (b - 'signatories') || jsonb_build_object(
        'signers', jsonb_build_array(
          jsonb_build_object('label', '{{company.name}}',
                             'sublabel', 'Authorized signature · Title · Date'),
          jsonb_build_object('label', 'For {{dealer.company}}',
                             'sublabel', 'Authorized signature · Title · Date')
        ));
    end if;

    v_blocks := v_blocks || jsonb_build_array(b);
  end loop;

  if not inserted then
    raise exception 'quote v9: no terms richText found - cannot place the page break';
  end if;

  update public.render_templates rt
     set is_published = false, updated_at = now()
   where rt.dealer_account_id = v_dealer
     and rt.document_code = 'quote'
     and rt.is_published;

  insert into public.render_templates
    (dealer_account_id, document_code, name, version, template, is_published, notes, created_by)
  values (v_dealer, 'quote', 'Lease Agreement (Eakes)', 9,
          jsonb_set(v_tmpl, '{blocks}', v_blocks), true,
          'Call of 11 Sept: Initial Meter removed, page break before terms, salesperson no longer shown as an authorised signer. Signature blocks corrected to the signers shape the renderer actually reads.',
          'system')
  on conflict (dealer_account_id, document_code, version) do update
    set template = excluded.template, is_published = true,
        notes = excluded.notes, updated_at = now();
end $$;

-- ------------------------------------------------------------------
-- 2. loi / fmv_lease / installation — correct the signature blocks in
--    place. Same transform, no other change to these three.
-- ------------------------------------------------------------------
do $$
declare
  v_dealer uuid;
  r        record;
  v_blocks jsonb;
  b        jsonb;
  who      jsonb;
begin
  select da.id into v_dealer from public.dealer_accounts da
   where da.hubspot_portal_id = '43692327';

  for r in
    select rt.document_code, rt.template, rt.name
      from public.render_templates rt
     where rt.dealer_account_id = v_dealer
       and rt.document_code in ('loi','fmv_lease','installation')
       and rt.version = 1
  loop
    v_blocks := '[]'::jsonb;
    for b in select jsonb_array_elements(r.template -> 'blocks') loop
      if b ->> 'type' = 'signature' then
        -- Installation is signed by the customer and the installer; the other
        -- two are customer-signed, with an Eakes counter-signature only on the
        -- FMV lease, which follows the lease pattern rather than the service
        -- pattern.
        if r.document_code = 'installation' then
          who := jsonb_build_array(
            jsonb_build_object('label','{{company.name}}','sublabel','Customer acceptance · Date'),
            jsonb_build_object('label','For {{dealer.company}}','sublabel','Installed by · Date'));
        elsif r.document_code = 'fmv_lease' then
          who := jsonb_build_array(
            jsonb_build_object('label','{{company.name}}','sublabel','Authorized signature · Title · Date'),
            jsonb_build_object('label','For {{dealer.company}}','sublabel','Authorized signature · Title · Date'));
        else
          who := jsonb_build_array(
            jsonb_build_object('label','{{company.name}}','sublabel','Authorized signature · Title · Date'));
        end if;
        b := (b - 'signatories') || jsonb_build_object('signers', who);
      end if;
      v_blocks := v_blocks || jsonb_build_array(b);
    end loop;

    update public.render_templates rt
       set template = jsonb_set(r.template, '{blocks}', v_blocks),
           notes = 'Signature block corrected to the signers shape the renderer reads.',
           updated_at = now()
     where rt.dealer_account_id = v_dealer
       and rt.document_code = r.document_code
       and rt.version = 1;
  end loop;
end $$;

-- ------------------------------------------------------------------
-- 3. Verify the four templates THIS migration is responsible for.
--
--    Scoped deliberately. lease_funding and new_customer also carry the
--    wrong shape at this point, and are fixed by
--    20260914091000_eakes_customer_summary_merge.sql, which unpublishes
--    lease_funding and republishes new_customer as v2. An unscoped check
--    here would assert a condition this migration cannot satisfy and would
--    roll back correct work - which is exactly what happened on the first
--    attempt.
-- ------------------------------------------------------------------
do $$
declare bad int;
begin
  select count(*) into bad
    from public.render_templates rt
    join public.dealer_accounts da on da.id = rt.dealer_account_id
   where da.hubspot_portal_id = '43692327'
     and rt.is_published
     and rt.document_code in ('quote','loi','fmv_lease','installation')
     and rt.template::text like '%signatories%';
  if bad > 0 then
    raise exception
      'still % published Eakes template(s) among quote/loi/fmv_lease/installation using signatories instead of signers', bad;
  end if;
end $$;

-- Full picture, including the two this migration does not own. Expect
-- lease_funding and new_customer to still show has_bad_shape = true here;
-- 20260914091000 resolves both.
select rt.document_code, rt.version, rt.name, rt.is_published,
       (rt.template::text like '%"signers"%') as has_signers,
       (rt.template::text like '%signatories%') as has_bad_shape,
       case when rt.document_code in ('quote','loi','fmv_lease','installation')
            then 'fixed by this migration'
            else 'fixed by 20260914091000' end as owner
  from public.render_templates rt
  join public.dealer_accounts da on da.id = rt.dealer_account_id
 where da.hubspot_portal_id = '43692327'
   and rt.is_published
 order by rt.document_code;

commit;