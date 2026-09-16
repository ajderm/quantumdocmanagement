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
  rep_prefixes      text[] not null default '{}',
  is_main           boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (dealer_account_id, code)
);

alter table public.dealer_locations enable row level security;

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

select dl.code, dl.name, dl.street, dl.city, dl.state, dl.zip, dl.phone,
       dl.rep_prefixes, dl.is_main
  from public.dealer_locations dl
  join public.dealer_accounts da on da.id = dl.dealer_account_id
 where da.hubspot_portal_id = '43692327'
 order by (dl.code)::int;

commit;