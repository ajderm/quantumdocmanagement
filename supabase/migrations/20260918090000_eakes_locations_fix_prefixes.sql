-- Branch locations, correction 1: rep prefixes from Eakes' own rep roster.
--
-- ===================== WHY THIS EXISTS =============================
--
-- The seed in 20260915100000 took Grand Island's rep prefix from the
-- 11 Sept call. Nate, 21:07: "The only weird one is Grand Island actually
-- starts with a 17 instead of 6." Mike, 21:18: "Leading zero, baby."
--
-- On 2026-09-18 Eakes sent the actual rep roster with Sales ID numbers.
-- It does not agree. Grand Island's two copier reps are:
--
--     Charlie Brown  6862   Primary Team: Grand Island
--     Lori Klein     6850   Primary Team: Grand Island
--
-- Both start 68, not 17. Every other branch in the roster confirms the
-- seed exactly:
--
--     11 Kearney        21 Hastings      25 Scottsbluff   31 North Platte
--     35 Omaha          41 Columbus      45 Cheyenne      47 Norfolk
--     49 South Sioux    51 Lincoln
--
-- A roster is a document; the transcript is a recollection. The roster wins.
--
-- BUT 17 IS KEPT AS WELL. No other branch claims it, so retaining it costs
-- nothing and covers the case where Nate was describing a legacy or
-- service-side numbering we have not seen. Grand Island therefore matches
-- {17, 68}. If Nate confirms 17 is dead, drop it - it is one array element.
--
-- ===================== CHEYENNE WAS MISSING ========================
--
-- Brendon Bounds, 4560, Primary Team "Cheyenne", coverage "Cheyenne, WY".
-- Cheyenne was not in the original twelve: eakes.com/contact/locations
-- lists it, but it did not make the seed. Until now every Cheyenne deal
-- would have printed the Grand Island address on a Wyoming customer's
-- contract.
--
-- Address from eakes.com/contact/locations/cheyenne, 2026-09-18:
--     113 W 17th St, Cheyenne, WY 82001, 307-475-6880
--
-- CODE IS INFERRED. Every branch in the seed has code == rep prefix, with
-- Grand Island the single exception. Cheyenne is therefore seeded as '45'.
-- If Nate gives a different location code, this is one UPDATE.
--
-- ===================== YORK DELIBERATELY NOT ADDED =================
--
-- eakes.com also lists York (202 E 5th St, York, NE 68467, 402-362-5442).
-- No rep on the copier roster has a York primary team, so it appears not to
-- sell managed print. Left out rather than guessed at. Add it if Nate says
-- otherwise - address is above, ready to go.
--
-- ROLLBACK:
--   update public.dealer_locations dl set rep_prefixes = '{17}'::text[]
--     from public.dealer_accounts da
--    where da.id = dl.dealer_account_id
--      and da.hubspot_portal_id = '43692327' and dl.code = '6';
--   delete from public.dealer_locations dl
--    using public.dealer_accounts da
--    where da.id = dl.dealer_account_id
--      and da.hubspot_portal_id = '43692327' and dl.code = '45';

begin;

update public.dealer_locations dl
   set rep_prefixes = '{17,68}'::text[], updated_at = now()
  from public.dealer_accounts da
 where da.id = dl.dealer_account_id
   and da.hubspot_portal_id = '43692327'
   and dl.code = '6';

insert into public.dealer_locations
  (dealer_account_id, code, name, street, city, state, zip, phone, rep_prefixes, is_main)
select da.id, '45', 'Cheyenne', '113 W 17th St', 'Cheyenne', 'WY', '82001',
       '307-475-6880', '{45}'::text[], false
  from public.dealer_accounts da
 where da.hubspot_portal_id = '43692327'
on conflict (dealer_account_id, code) do update
  set name = excluded.name, street = excluded.street, city = excluded.city,
      state = excluded.state, zip = excluded.zip, phone = excluded.phone,
      rep_prefixes = excluded.rep_prefixes, updated_at = now();

-- Guards: still exactly one main, and still no prefix claimed twice.
do $$
declare v_dealer uuid; n int; dupe text;
begin
  select da.id into v_dealer from public.dealer_accounts da
   where da.hubspot_portal_id = '43692327';

  select count(*) into n from public.dealer_locations
   where dealer_account_id = v_dealer and is_main;
  if n <> 1 then
    raise exception 'expected exactly one main Eakes location, found %', n;
  end if;

  select string_agg(p, ', ') into dupe from (
    select unnest(rep_prefixes) as p
      from public.dealer_locations
     where dealer_account_id = v_dealer
     group by 1 having count(*) > 1
  ) d;
  if dupe is not null then
    raise exception 'rep prefix claimed by more than one branch: %', dupe;
  end if;

  -- Every prefix seen on the 2026-09-18 roster must resolve somewhere.
  foreach dupe in array array['11','21','25','31','35','41','45','47','49','51','68'] loop
    if not exists (select 1 from public.dealer_locations
                    where dealer_account_id = v_dealer
                      and dupe = any(rep_prefixes)) then
      raise exception 'roster prefix % resolves to no branch', dupe;
    end if;
  end loop;
end $$;

select dl.code, dl.name, dl.city, dl.state, dl.zip, dl.phone,
       dl.rep_prefixes, dl.is_main
  from public.dealer_locations dl
  join public.dealer_accounts da on da.id = dl.dealer_account_id
 where da.hubspot_portal_id = '43692327'
 order by (dl.code)::int;

commit;
