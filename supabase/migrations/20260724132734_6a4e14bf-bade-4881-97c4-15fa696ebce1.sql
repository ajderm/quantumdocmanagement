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
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Table % does not exist, skipping', t;
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS object_type text NOT NULL DEFAULT ''deals''',
      t
    );

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