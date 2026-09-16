-- Branch locations, so documents carry the selling branch rather than the
-- dealer's single head-office address.
--
-- Mike, 11 Sept call, 16:24: "We're trying to appear more local to our
-- customers, Marko, and so instead of having our corporate headquarters, we
-- want our location branch address there."
--
-- ================== WHY A TABLE AND NOT ARITHMETIC ==================
--
-- The branch is resolved from the salesperson number on the deal. Nate,
-- 17:33: "A Lincoln salesman, Marko, is 51... 5107, right? 51 means Lincoln."
--
-- But it is NOT simply the leading digits of the location number. Nate,
-- 21:07: "The only weird one is Grand Island actually starts with a 17
-- instead of 6." Grand Island is location 6; its reps start 17. Mike's
-- explanation, 21:18: "Leading zero, baby" - 06 could not lead with a zero.
--
-- So the rep prefix is stored per location as data, not derived. Any further
-- exceptions are a row edit rather than a code change.
--
-- ========================= CONFIRMED ================================
--
-- Stated on the call:
--     51 -> Lincoln      (Nate, 17:33)
--     17 -> Grand Island (Nate, 21:07)
--
-- Nate Schaf confirmed on 2026-09-15 that Grand Island is the ONLY exception:
-- every other branch's rep numbers start with its location code. The seed
-- below reflects that. If a further exception ever appears it is a single
-- UPDATE to that row's rep_prefixes, not a code change.
--
-- Addresses and phone numbers were taken from eakes.com/contact/locations/*
-- on 2026-09-15. Omaha reads 11108 Q St, which matches the address printed
-- on their own signed Cornerstone packet - so the source cross-checks.
--
-- Location 1, Central Warehouse-Grand Island, is their Distribution Center on
-- Stolley Park Road - confirmed by Nate Schaf, 2026-09-15. It carries no rep
-- prefix, so it can only ever be chosen manually.
--
-- Grand Island is the main office and the fallback when a deal's salesperson
-- number is missing or unmatched. On the test deal that number was blank
-- (Marko, 18:54: "look at the salesperson number, it is blank"), so the
-- fallback is not an edge case - it is the current normal.
--
-- This migration is data and schema only. Resolution, the payload change and
-- the override dropdown are app work; see LOCATIONS_app_changes.md.
--
-- Multi-tenant: the table is per dealer. Only Eakes rows are seeded. Any
-- other dealer with no rows keeps exactly today's behaviour, because the app
-- falls back to dealer_accounts when a portal has no locations.

begin;

create table if not exists public.dealer_locations (
  dealer_account_id uuid not null references public.dealer_accounts(id) on delete cascade,
  code              text not null,
  name              text not null,
  street            text,
  city              text,
  state             text,
  zip               text,
  phone             text,
  -- Salesperson-number prefixes that resolve to this branch. Stored, not
  -- derived: Grand Island is location 6 but its reps start 17.
  rep_prefixes      text[] not null default '{}',
  is_main           boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (dealer_account_id, code)
);

alter table public.dealer_locations enable row level security;

-- At most one main office per dealer, so the fallback is never ambiguous.
create unique index if not exists dealer_locations_one_main
  on public.dealer_locations (dealer_account_id)
  where is_main;

create index if not exists dealer_locations_prefix_idx
  on public.dealer_locations using gin (rep_prefixes);

comment on table public.dealer_locations is
  'Per dealer branch offices. Documents print the branch that sold the deal, resolved from the salesperson number via rep_prefixes. A dealer with no rows keeps the single dealer_accounts address. Service-role access only.';
comment on column public.dealer_locations.rep_prefixes is
  'Salesperson-number prefixes mapping to this branch. Stored rather than derived from code: Eakes Grand Island is location 6 but its reps start 17.';
comment on column public.dealer_locations.is_main is
  'The fallback branch when a deal has no salesperson number or no prefix matches.';

-- ------------------------------------------------------------------
-- Eakes' twelve branches.
-- ------------------------------------------------------------------
insert into public.dealer_locations
  (dealer_account_id, code, name, street, city, state, zip, phone, rep_prefixes, is_main)
select da.id, v.code, v.name, v.street, v.city, v.state, v.zip, v.phone, v.prefixes, v.is_main
from public.dealer_accounts da
cross join (values
  ('1',  'Central Warehouse - Grand Island', '3636 W Stolley Park Rd', 'Grand Island',    'NE', '68803', '308-382-9580', '{}'::text[],       false),
  ('6',  'Grand Island',                     '617 W 3rd St',           'Grand Island',    'NE', '68801', '308-382-8026', '{17}'::text[],     true),
  ('11', 'Kearney',                          '2401 Ave. A',            'Kearney',         'NE', '68847', '308-234-2538', '{11}'::text[],     false),
  ('15', 'McCook',                           '120 Norris Ave',         'McCook',          'NE', '69001', '308-345-5447', '{15}'::text[],     false),
  ('21', 'Hastings',                         '839 W 2nd St',           'Hastings',        'NE', '68901', '402-463-2537', '{21}'::text[],     false),
  ('25', 'Scottsbluff',                      '14 E 14th St',           'Scottsbluff',     'NE', '69361', '308-631-5544', '{25}'::text[],     false),
  ('31', 'North Platte',                     '520 North Vine',         'North Platte',    'NE', '69101', '308-534-7800', '{31}'::text[],     false),
  ('35', 'Omaha',                            '11108 Q St',             'Omaha',           'NE', '68137', '402-898-3017', '{35}'::text[],     false),
  ('41', 'Columbus',                         '2911 13th St',           'Columbus',        'NE', '68601', '402-564-2679', '{41}'::text[],     false),
  ('47', 'Norfolk',                          '201 S 1st St',           'Norfolk',         'NE', '68701', '402-371-4181', '{47}'::text[],     false),
  ('49', 'Sioux City',                       '510 W 13th St',          'South Sioux City','NE', '68776', '402-412-2334', '{49}'::text[],     false),
  ('51', 'Lincoln',                          '110 N 35th St',          'Lincoln',         'NE', '68503', '402-438-6700', '{51}'::text[],     false)
) as v(code, name, street, city, state, zip, phone, prefixes, is_main)
where da.hubspot_portal_id = '43692327'
on conflict (dealer_account_id, code) do update
  set name = excluded.name, street = excluded.street, city = excluded.city,
      state = excluded.state, zip = excluded.zip, phone = excluded.phone,
      rep_prefixes = excluded.rep_prefixes, is_main = excluded.is_main,
      updated_at = now();

-- Guard: exactly one main, and no prefix claimed by two branches.
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
end $$;

select code, name, city, state, zip, phone, rep_prefixes, is_main
  from public.dealer_locations dl
  join public.dealer_accounts da on da.id = dl.dealer_account_id
 where da.hubspot_portal_id = '43692327'
 order by (code)::int;

commit;
