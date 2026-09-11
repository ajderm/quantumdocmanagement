-- Switch loi, lease_funding and installation to the template engine for
-- Eakes, without going through the Settings UI.
--
-- Why this is needed: the Document engine panel renders a fixed list of
-- document codes, and that list does not include loi, lease_funding or
-- installation. It shows quote, quote_fmv, quote_dollar_buyout,
-- quote_rental, service_agreement, fmv_lease, installation_removal_receipt,
-- installation_delivery_acceptance, interterritorial and new_customer.
-- So three of the four templates published on 2026-09-11 have no toggle to
-- turn them on, even though the documents themselves exist and generate.
--
-- document_engine_modes has no foreign key on document_code, and
-- useDocumentEngine reads every row for the portal and looks the code up
-- directly:
--
--     engineFor(code) => modes[code] ?? 'native'
--
-- so a row here takes effect regardless of whether the panel draws a control
-- for it. This is exactly what the UI would write if the control existed.
--
-- Safety: if the app turns out to call one of these documents under a
-- different code, the row below simply never matches and that document stays
-- on native. Nothing breaks either way. The only way a row like this can
-- break a document is if it names a code that IS called and has no published
-- template - the final query checks for precisely that before you leave.
--
-- Scoped to Eakes' portal only.
--
-- ROLLBACK: set them back to native.
--     update public.document_engine_modes dem set engine = 'native'
--       from public.dealer_accounts da
--      where da.id = dem.dealer_account_id
--        and da.hubspot_portal_id = '43692327'
--        and dem.document_code in ('loi','lease_funding','installation');

begin;

insert into public.document_engine_modes
  (dealer_account_id, document_code, engine, updated_by, updated_at)
select da.id, c.code, 'template', 'system', now()
  from public.dealer_accounts da
 cross join (values ('loi'), ('lease_funding'), ('installation')) as c(code)
 where da.hubspot_portal_id = '43692327'
on conflict (dealer_account_id, document_code) do update
  set engine = 'template',
      updated_by = 'system',
      updated_at = now();

-- Every engine mode Eakes now has, paired with whether a published template
-- actually exists for that code.
--
-- Read the last column. 'template + no published template' is the dangerous
-- combination: that document will return 409 and produce nothing. If any row
-- shows it, set that code back to native.
select dem.document_code,
       dem.engine,
       exists (
         select 1
           from public.render_templates rt
          where rt.dealer_account_id = dem.dealer_account_id
            and rt.document_code = dem.document_code
            and rt.is_published
       ) as has_published_template,
       case
         when dem.engine = 'template' and not exists (
           select 1 from public.render_templates rt
            where rt.dealer_account_id = dem.dealer_account_id
              and rt.document_code = dem.document_code
              and rt.is_published
         ) then 'BROKEN - will 409'
         when dem.engine = 'template' then 'ok - template'
         else 'ok - native'
       end as status
  from public.document_engine_modes dem
  join public.dealer_accounts da on da.id = dem.dealer_account_id
 where da.hubspot_portal_id = '43692327'
 order by dem.document_code;

-- Published templates with no engine row at all, i.e. work that is sitting
-- unused because nothing points at it.
select rt.document_code, rt.name, 'published but engine is native' as status
  from public.render_templates rt
  join public.dealer_accounts da on da.id = rt.dealer_account_id
 where da.hubspot_portal_id = '43692327'
   and rt.is_published
   and not exists (
     select 1 from public.document_engine_modes dem
      where dem.dealer_account_id = rt.dealer_account_id
        and dem.document_code = rt.document_code
        and dem.engine = 'template'
   )
 order by rt.document_code;

commit;
