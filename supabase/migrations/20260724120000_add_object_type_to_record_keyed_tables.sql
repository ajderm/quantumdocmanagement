-- Multi-object (anchor record) support.
--
-- The app can now be installed on records other than deals (initially HubSpot's
-- native Projects object). All persistence that was keyed (portal_id, deal_id)
-- becomes keyed (portal_id, object_type, deal_id): deal_id now holds the anchor
-- record's ID and object_type says which CRM object it belongs to. HubSpot
-- record IDs are NOT unique across object types, so without this column a
-- project and a deal with the same numeric ID would silently share rows.
--
-- Backward compatible: object_type defaults to 'deals', so every existing row
-- and every request from an app version that doesn't send objectType keeps
-- working unchanged.

DO $$
DECLARE
  t text;
  con record;
  idx record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'quote_configurations',
    'installation_configurations',
    'service_agreement_configurations',
    'fmv_lease_configurations',
    'lease_funding_configurations',
    'loi_configurations',
    'lease_return_configurations',
    'interterritorial_configurations',
    'new_customer_configurations',
    'relocation_configurations',
    'removal_configurations',
    'commission_configurations',
    'custom_document_configurations',
    'quote_versions'
  ] LOOP
    -- Skip tables that don't exist in this environment
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Table % does not exist, skipping', t;
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS object_type text NOT NULL DEFAULT ''deals''',
      t
    );

    -- Rebuild UNIQUE constraints that include deal_id so they also include object_type
    FOR con IN
      SELECT c.conname,
             (SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY u.ord)
                FROM unnest(c.conkey) WITH ORDINALITY AS u(attnum, ord)
                JOIN pg_attribute a
                  ON a.attrelid = c.conrelid AND a.attnum = u.attnum) AS collist
        FROM pg_constraint c
       WHERE c.conrelid = to_regclass('public.' || t)
         AND c.contype = 'u'
    LOOP
      IF con.collist LIKE '%deal_id%' AND con.collist NOT LIKE '%object_type%' THEN
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', t, con.conname);
        EXECUTE format(
          'ALTER TABLE public.%I ADD CONSTRAINT %I UNIQUE (%s, object_type)',
          t, con.conname, con.collist
        );
        RAISE NOTICE 'Rebuilt constraint % on % as (%, object_type)', con.conname, t, con.collist;
      END IF;
    END LOOP;

    -- Rebuild standalone UNIQUE indexes (not constraint-backed) that include deal_id
    FOR idx IN
      SELECT ci.relname AS idxname,
             (SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY k.ord)
                FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
                JOIN pg_attribute a
                  ON a.attrelid = i.indrelid AND a.attnum = k.attnum) AS collist
        FROM pg_index i
        JOIN pg_class ci ON ci.oid = i.indexrelid
       WHERE i.indrelid = to_regclass('public.' || t)
         AND i.indisunique
         AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = i.indexrelid)
    LOOP
      IF idx.collist LIKE '%deal_id%' AND idx.collist NOT LIKE '%object_type%' THEN
        EXECUTE format('DROP INDEX public.%I', idx.idxname);
        EXECUTE format(
          'CREATE UNIQUE INDEX %I ON public.%I (%s, object_type)',
          idx.idxname, t, idx.collist
        );
        RAISE NOTICE 'Rebuilt unique index % on % as (%, object_type)', idx.idxname, t, idx.collist;
      END IF;
    END LOOP;
  END LOOP;
END $$;
