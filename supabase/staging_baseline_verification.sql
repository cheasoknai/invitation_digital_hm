-- ==============================================================================
-- INVITATION DIGITAL H&M - STAGING BASELINE VERIFICATION AUDIT (PHASE 5.10)
-- Target Project: Supabase Staging (mavneuowkoejzphistrh) | PostgreSQL 17.12
-- Target Schema: public | Target Table: public.guests
-- Safety: READ-ONLY CATALOG AUDIT. Zero side-effects. Zero data modifications.
-- Rollup Engine: Deterministic 57-check mandatory registry with exact count enforcement.
-- ==============================================================================

WITH 
-- ------------------------------------------------------------------------------
-- 0. MANDATORY REGISTRY (57 Explicit Checks)
-- ------------------------------------------------------------------------------
mandatory_registry AS (
  SELECT unnest(ARRAY[
    -- Table status (1)
    'table_core_attributes',
    -- Column attributes & count (10)
    'total_column_count_exact_9',
    'col_1_id',
    'col_2_guest_name',
    'col_3_invitation_token',
    'col_4_rsvp_status',
    'col_5_rsvp_message',
    'col_6_responded_at',
    'col_7_created_at',
    'col_8_updated_at',
    'col_9_invitation_slug',
    -- Constraint attributes & count (3)
    'total_constraint_count_exact_2',
    'constraint_guests_pkey',
    'constraint_guests_invitation_token_unique',
    -- Index attributes & count (5)
    'total_index_count_exact_3',
    'index_guests_pkey',
    'index_guests_invitation_token_unique',
    'index_guests_invitation_slug_unique',
    'migration_index_absent_before_migration',
    -- RLS policy attributes (1)
    'canonical_admin_policy_exact',
    -- Direct ACL entries (13)
    'direct_acl_owner_is_postgres',
    'direct_acl_auth_select',
    'direct_acl_auth_insert',
    'direct_acl_auth_update',
    'direct_acl_auth_delete',
    'direct_acl_auth_zero_non_crud',
    'direct_acl_anon_public_zero',
    'direct_acl_service_role_references',
    'direct_acl_service_role_trigger',
    'direct_acl_service_role_truncate',
    'direct_acl_service_role_zero_crud',
    'direct_acl_unknown_grantee_zero',
    'direct_acl_unexpected_grant_options_zero',
    -- Effective permissions: anon (8)
    'effective_anon_select_blocked',
    'effective_anon_insert_blocked',
    'effective_anon_update_blocked',
    'effective_anon_delete_blocked',
    'effective_anon_truncate_blocked',
    'effective_anon_references_blocked',
    'effective_anon_trigger_blocked',
    'effective_anon_maintain_blocked',
    -- Effective permissions: authenticated (8)
    'effective_auth_select_granted',
    'effective_auth_insert_granted',
    'effective_auth_update_granted',
    'effective_auth_delete_granted',
    'effective_auth_truncate_blocked',
    'effective_auth_references_blocked',
    'effective_auth_trigger_blocked',
    'effective_auth_maintain_blocked',
    -- Effective permissions: service_role (8)
    'effective_sr_references_granted',
    'effective_sr_trigger_granted',
    'effective_sr_truncate_granted',
    'effective_sr_maintain_evaluated',
    'effective_sr_select_evaluated',
    'effective_sr_insert_evaluated',
    'effective_sr_update_evaluated',
    'effective_sr_delete_evaluated'
  ]) AS req_id
),

-- ------------------------------------------------------------------------------
-- 1. TABLE CORE STATUS
-- ------------------------------------------------------------------------------
check_table AS (
  SELECT 
    '1. TABLE_STATUS'::text AS check_category,
    'table_core_attributes'::text AS check_name,
    CASE 
      WHEN to_regclass('public.guests') IS NULL 
      THEN 'FAIL'
      WHEN c.relname = 'guests' 
       AND r.rolname = 'postgres' 
       AND c.relrowsecurity = true 
       AND c.relreplident = 'f' 
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE 
      WHEN to_regclass('public.guests') IS NULL 
      THEN 'CRITICAL FAIL: Table public.guests does not exist in catalog'
      ELSE 'Owner: ' || COALESCE(r.rolname, 'NULL') || ' | RLS: ' || c.relrowsecurity::text || ' | Replica: ' || c.relreplident::text
    END AS details
  FROM (SELECT to_regclass('public.guests') AS t_oid) t
  LEFT JOIN pg_catalog.pg_class c ON c.oid = t.t_oid
  LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_catalog.pg_roles r ON r.oid = c.relowner
),

-- ------------------------------------------------------------------------------
-- 2. COLUMN DEFINITIONS & COUNT
-- ------------------------------------------------------------------------------
expected_columns AS (
  SELECT 1 AS exp_pos, 'id'::text AS exp_name, 'uuid'::text AS exp_type, true AS exp_notnull, $$gen_random_uuid()$$::text AS exp_def UNION ALL
  SELECT 2, 'guest_name', 'text', true, $$''::text$$ UNION ALL
  SELECT 3, 'invitation_token', 'text', false, $$''::text$$ UNION ALL
  SELECT 4, 'rsvp_status', 'text', false, $$'pending'::text$$ UNION ALL
  SELECT 5, 'rsvp_message', 'text', false, $$''::text$$ UNION ALL
  SELECT 6, 'responded_at', 'timestamp with time zone', false, NULL UNION ALL
  SELECT 7, 'created_at', 'timestamp with time zone', false, $$now()$$ UNION ALL
  SELECT 8, 'updated_at', 'timestamp with time zone', false, $$now()$$ UNION ALL
  SELECT 9, 'invitation_slug', 'text', false, NULL
),

actual_columns AS (
  SELECT 
    a.attnum AS col_pos,
    a.attname AS col_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS col_type,
    a.attnotnull AS is_notnull,
    pg_catalog.pg_get_expr(d.adbin, d.adrelid) AS col_default
  FROM pg_catalog.pg_attribute a
  LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE a.attrelid = to_regclass('public.guests')
    AND a.attnum > 0 
    AND NOT a.attisdropped
),

check_columns AS (
  SELECT 
    '2. COLUMNS'::text AS check_category,
    'col_' || COALESCE(exp.exp_pos, act.col_pos)::text || '_' || COALESCE(exp.exp_name, act.col_name) AS check_name,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'FAIL'
      WHEN act.col_name IS NULL THEN 'FAIL'
      WHEN exp.exp_name IS NULL THEN 'FAIL'
      WHEN act.col_pos <> exp.exp_pos THEN 'FAIL'
      WHEN act.col_type <> exp.exp_type THEN 'FAIL'
      WHEN act.is_notnull <> exp.exp_notnull THEN 'FAIL'
      -- Compare catalog defaults avoiding single-quote escaping issues:
      WHEN exp.exp_def IS NOT NULL AND (
        act.col_default IS NULL OR 
        pg_catalog.regexp_replace(act.col_default, '\s+', ' ', 'g') NOT IN (
          exp.exp_def,
          '(' || exp.exp_def || ')',
          'pg_catalog.' || exp.exp_def
        )
      ) THEN 'FAIL'
      WHEN exp.exp_def IS NULL AND act.col_default IS NOT NULL THEN 'FAIL'
      ELSE 'PASS'
    END AS status,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'Table public.guests missing'
      WHEN act.col_name IS NULL THEN 'Missing expected column: ' || exp.exp_name || ' at position ' || exp.exp_pos
      WHEN exp.exp_name IS NULL THEN 'Unexpected extra column detected: ' || act.col_name || ' at position ' || act.col_pos
      WHEN act.col_pos <> exp.exp_pos THEN 'Position mismatch: expected ' || exp.exp_pos || ', got ' || act.col_pos
      WHEN act.col_type <> exp.exp_type THEN 'Type mismatch: expected ' || exp.exp_type || ', got ' || act.col_type
      WHEN act.is_notnull <> exp.exp_notnull THEN 'Nullability mismatch: expected NOT NULL = ' || exp.exp_notnull::text || ', got ' || act.is_notnull::text
      WHEN exp.exp_def IS NOT NULL AND act.col_default IS NULL THEN 'Missing expected default expression: ' || exp.exp_def
      WHEN exp.exp_def IS NULL AND act.col_default IS NOT NULL THEN 'Unexpected default expression detected: ' || act.col_default
      WHEN exp.exp_def IS NOT NULL AND pg_catalog.regexp_replace(act.col_default, '\s+', ' ', 'g') NOT IN (
        exp.exp_def,
        '(' || exp.exp_def || ')',
        'pg_catalog.' || exp.exp_def
      ) THEN 'Default mismatch: expected ' || exp.exp_def || ', got ' || act.col_default
      ELSE 'Type: ' || act.col_type || ' | NotNull: ' || act.is_notnull::text || ' | Def: ' || COALESCE(act.col_default, 'NONE')
    END AS details
  FROM expected_columns exp
  FULL OUTER JOIN actual_columns act ON act.col_pos = exp.exp_pos
),

check_column_count AS (
  SELECT 
    '2. COLUMNS'::text AS check_category,
    'total_column_count_exact_9'::text AS check_name,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'FAIL'
      WHEN count(*) = 9 THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'Table public.guests missing'
      WHEN count(*) = 9 THEN 'Exact 9 columns present'
      ELSE 'FAIL: Column count mismatch (found ' || count(*) || ', expected 9)'
    END AS details
  FROM actual_columns
),

-- ------------------------------------------------------------------------------
-- 3. CONSTRAINTS (PK & TOKEN UNIQUE)
-- ------------------------------------------------------------------------------
expected_constraints AS (
  SELECT 
    'guests_pkey'::text AS exp_conname, 
    'p'::"char" AS exp_contype, 
    ARRAY[1]::int2[] AS exp_conkey, 
    true AS exp_validated, 
    false AS exp_deferrable, 
    false AS exp_deferred, 
    'guests_pkey'::text AS exp_indname UNION ALL
  SELECT 
    'guests_invitation_token_unique', 
    'u', 
    ARRAY[3]::int2[], 
    true, 
    false, 
    false, 
    'guests_invitation_token_unique'
),

actual_constraints AS (
  SELECT 
    con.conname,
    con.contype,
    con.conkey,
    con.convalidated,
    con.condeferrable,
    con.condeferred,
    c_idx.relname AS supporting_index_name,
    pg_catalog.pg_get_constraintdef(con.oid, true) AS condef
  FROM pg_catalog.pg_constraint con
  LEFT JOIN pg_catalog.pg_class c_idx ON c_idx.oid = con.conindid
  WHERE con.conrelid = to_regclass('public.guests')
),

check_constraints AS (
  SELECT 
    '3. CONSTRAINTS'::text AS check_category,
    'constraint_' || COALESCE(act.conname, exp.exp_conname) AS check_name,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'FAIL'
      WHEN act.conname IS NULL THEN 'FAIL'
      WHEN exp.exp_conname IS NULL THEN 'FAIL'
      WHEN act.contype <> exp.exp_contype THEN 'FAIL'
      WHEN act.conkey <> exp.exp_conkey THEN 'FAIL'
      WHEN act.convalidated <> exp.exp_validated THEN 'FAIL'
      WHEN act.condeferrable <> exp.exp_deferrable THEN 'FAIL'
      WHEN act.condeferred <> exp.exp_deferred THEN 'FAIL'
      WHEN act.supporting_index_name <> exp.exp_indname THEN 'FAIL'
      ELSE 'PASS'
    END AS status,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'Table public.guests missing'
      WHEN act.conname IS NULL THEN 'Missing expected constraint: ' || exp.exp_conname
      WHEN exp.exp_conname IS NULL THEN 'Unexpected extra constraint detected: ' || act.conname || ' (Type ' || act.contype::text || ')'
      WHEN act.contype <> exp.exp_contype THEN 'Type mismatch: expected ' || exp.exp_contype::text || ', got ' || act.contype::text
      WHEN act.conkey <> exp.exp_conkey THEN 'Key mismatch: expected ' || exp.exp_conkey::text || ', got ' || act.conkey::text
      WHEN act.convalidated <> exp.exp_validated THEN 'Constraint not validated: convalidated = false'
      WHEN act.condeferrable <> exp.exp_deferrable THEN 'Unexpected deferrable constraint: condeferrable = true'
      WHEN act.condeferred <> exp.exp_deferred THEN 'Unexpected initially deferred constraint: condeferred = true'
      WHEN act.supporting_index_name <> exp.exp_indname THEN 'Supporting index mismatch: expected ' || exp.exp_indname || ', got ' || COALESCE(act.supporting_index_name, 'NONE')
      ELSE 'Type: ' || act.contype::text || ' | Key: ' || act.conkey::text || ' | Valid: ' || act.convalidated::text || ' | Deferrable: ' || act.condeferrable::text || ' | Index: ' || COALESCE(act.supporting_index_name, 'NONE')
    END AS details
  FROM expected_constraints exp
  FULL OUTER JOIN actual_constraints act ON act.conname = exp.exp_conname
),

check_constraint_count AS (
  SELECT 
    '3. CONSTRAINTS'::text AS check_category,
    'total_constraint_count_exact_2'::text AS check_name,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'FAIL'
      WHEN count(*) = 2 THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'Table public.guests missing'
      WHEN count(*) = 2 THEN 'Exact 2 table constraints present'
      ELSE 'FAIL: Constraint count mismatch (found ' || count(*) || ', expected 2)'
    END AS details
  FROM actual_constraints
),

-- ------------------------------------------------------------------------------
-- 4. INDEXES (BTREE, ATTRIBUTES & ABSENCE OF MIGRATION INDEX)
-- ------------------------------------------------------------------------------
expected_indexes AS (
  SELECT 'guests_pkey'::text AS exp_idxname, 'btree'::text AS exp_am, true AS exp_unique, true AS exp_primary, ARRAY[1]::int2[] AS exp_key, 1 AS exp_key_count, 1 AS exp_total_count, NULL::text AS exp_pred UNION ALL
  SELECT 'guests_invitation_token_unique', 'btree', true, false, ARRAY[3]::int2[], 1, 1, NULL::text UNION ALL
  SELECT 'guests_invitation_slug_unique', 'btree', true, false, ARRAY[9]::int2[], 1, 1, '(invitation_slug IS NOT NULL)'::text
),

actual_indexes AS (
  SELECT 
    c_idx.relname AS index_name,
    am.amname AS access_method,
    i.indisunique AS is_unique,
    i.indisprimary AS is_primary,
    i.indisvalid AS is_valid,
    i.indisready AS is_ready,
    i.indnkeyatts AS key_attributes_count,
    i.indnatts AS total_attributes_count,
    (i.indexprs IS NOT NULL) AS has_index_expressions,
    (string_to_array(i.indkey::text, ' '))::int2[] AS index_key_array,
    pg_catalog.pg_get_expr(i.indpred, i.indrelid) AS partial_predicate,
    pg_catalog.pg_get_indexdef(i.indexrelid) AS full_index_definition
  FROM pg_catalog.pg_index i
  JOIN pg_catalog.pg_class c_idx ON c_idx.oid = i.indexrelid
  JOIN pg_catalog.pg_am am ON am.oid = c_idx.relam
  WHERE i.indrelid = to_regclass('public.guests')
),

check_indexes AS (
  SELECT 
    '4. INDEXES'::text AS check_category,
    'index_' || COALESCE(act.index_name, exp.exp_idxname) AS check_name,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'FAIL'
      WHEN act.index_name IS NULL THEN 'FAIL'
      WHEN exp.exp_idxname IS NULL THEN 'FAIL'
      WHEN act.access_method <> exp.exp_am THEN 'FAIL'
      WHEN act.is_unique <> exp.exp_unique THEN 'FAIL'
      WHEN act.is_primary <> exp.exp_primary THEN 'FAIL'
      WHEN act.is_valid = false OR act.is_ready = false THEN 'FAIL'
      WHEN act.index_key_array <> exp.exp_key THEN 'FAIL'
      WHEN act.key_attributes_count <> exp.exp_key_count THEN 'FAIL'
      WHEN act.total_attributes_count <> exp.exp_total_count THEN 'FAIL'
      WHEN act.has_index_expressions = true THEN 'FAIL'
      -- Explicit guard: null predicate when expected is a failure:
      WHEN exp.exp_pred IS NOT NULL AND act.partial_predicate IS NULL THEN 'FAIL'
      WHEN exp.exp_pred IS NOT NULL AND pg_catalog.regexp_replace(act.partial_predicate, '\s+', ' ', 'g') NOT IN (exp.exp_pred, '(invitation_slug IS NOT NULL)', 'invitation_slug IS NOT NULL') THEN 'FAIL'
      WHEN exp.exp_pred IS NULL AND act.partial_predicate IS NOT NULL THEN 'FAIL'
      ELSE 'PASS'
    END AS status,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'Table public.guests missing'
      WHEN act.index_name IS NULL THEN 'Missing expected index: ' || exp.exp_idxname
      WHEN exp.exp_idxname IS NULL AND act.index_name = 'guests_invitation_slug_lower_idx' THEN 'CRITICAL LEAK: lower-slug migration index detected pre-migration'
      WHEN exp.exp_idxname IS NULL THEN 'Unexpected index detected: ' || act.index_name
      WHEN act.access_method <> exp.exp_am THEN 'Access method mismatch: expected ' || exp.exp_am || ', got ' || act.access_method
      WHEN act.is_unique <> exp.exp_unique THEN 'Uniqueness mismatch'
      WHEN act.is_primary <> exp.exp_primary THEN 'Primary flag mismatch'
      WHEN act.is_valid = false OR act.is_ready = false THEN 'Index invalid or unready'
      WHEN act.index_key_array <> exp.exp_key THEN 'Key mismatch: expected ' || exp.exp_key::text || ', got ' || act.index_key_array::text
      WHEN act.total_attributes_count <> exp.exp_total_count THEN 'Unexpected INCLUDE attributes detected on index'
      WHEN act.has_index_expressions = true THEN 'Unexpected index expression detected on column index'
      WHEN exp.exp_pred IS NOT NULL AND act.partial_predicate IS NULL THEN 'Missing required partial predicate: expected ' || exp.exp_pred
      WHEN exp.exp_pred IS NOT NULL AND pg_catalog.regexp_replace(act.partial_predicate, '\s+', ' ', 'g') NOT IN (exp.exp_pred, '(invitation_slug IS NOT NULL)', 'invitation_slug IS NOT NULL') 
      THEN 'Predicate mismatch: expected ' || exp.exp_pred || ', got ' || act.partial_predicate
      WHEN exp.exp_pred IS NULL AND act.partial_predicate IS NOT NULL THEN 'Unexpected partial predicate: ' || act.partial_predicate
      ELSE 'AM: ' || act.access_method || ' | Unique: ' || act.is_unique::text || ' | Key: ' || act.index_key_array::text || ' | Valid: ' || act.is_valid::text || ' | Pred: ' || COALESCE(act.partial_predicate, 'NONE')
    END AS details
  FROM expected_indexes exp
  FULL OUTER JOIN actual_indexes act ON act.index_name = exp.exp_idxname
),

check_index_count AS (
  SELECT 
    '4. INDEXES'::text AS check_category,
    'total_index_count_exact_3'::text AS check_name,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'FAIL'
      WHEN count(*) = 3 THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'Table public.guests missing'
      WHEN count(*) = 3 THEN 'Exact 3 indexes present'
      ELSE 'FAIL: Index count mismatch (found ' || count(*) || ', expected 3)'
    END AS details
  FROM actual_indexes
),

check_migration_index_absent AS (
  SELECT 
    '4. INDEXES'::text AS check_category,
    'migration_index_absent_before_migration'::text AS check_name,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'FAIL'
      WHEN count(*) = 0 THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'Table public.guests missing'
      WHEN count(*) = 0 THEN 'PASS: guests_invitation_slug_lower_idx is absent before migration'
      ELSE 'FAIL: migration index guests_invitation_slug_lower_idx already exists pre-migration!'
    END AS details
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'guests_invitation_slug_lower_idx'
),

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICY VERIFICATION (STRUCTURAL & SEMANTIC)
-- ------------------------------------------------------------------------------
check_rls_policy AS (
  SELECT 
    '5. RLS_POLICY'::text AS check_category,
    'canonical_admin_policy_exact'::text AS check_name,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'FAIL'
      WHEN pc.total_policies <> 1 THEN 'FAIL'
      WHEN p.policyname <> 'Authenticated admins can manage guests' THEN 'FAIL'
      WHEN p.permissive <> 'PERMISSIVE' THEN 'FAIL'
      WHEN p.cmd <> 'ALL' THEN 'FAIL'
      WHEN p.roles <> '{authenticated}' THEN 'FAIL'
      WHEN p.qual IS NULL OR p.with_check IS NULL THEN 'FAIL'
      WHEN p.qual <> p.with_check THEN 'FAIL'
      -- Primary Verification: Exact deparsed canonical representation
      -- Fallback Verification: Strict Grammar Allowlist (exact '=' operators, exact 'OR' branch, exact literals)
      WHEN p.qual NOT IN (
        '((lower((auth.jwt() ->> ''email''::text)) = ''admin@invitation.com''::text) OR (((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text) = ''admin''::text))',
        '(((lower((auth.jwt() ->> ''email''::text)) = ''admin@invitation.com''::text) OR (((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text) = ''admin''::text)))',
        '((pg_catalog.lower((auth.jwt() ->> ''email''::text)) = ''admin@invitation.com''::text) OR (((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text) = ''admin''::text))',
        '(((pg_catalog.lower((auth.jwt() ->> ''email''::text)) = ''admin@invitation.com''::text) OR (((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text) = ''admin''::text)))'
      ) AND NOT (
        -- 1. Exact Literal Isolation (exactly 5 single-quoted literals -> 11 array elements)
        array_length(pg_catalog.string_to_array(p.qual, ''''), 1) = 11
        AND (pg_catalog.string_to_array(p.qual, ''''))[2] = 'email'
        AND (pg_catalog.string_to_array(p.qual, ''''))[4] = 'admin@invitation.com'
        AND (pg_catalog.string_to_array(p.qual, ''''))[6] = 'app_metadata'
        AND (pg_catalog.string_to_array(p.qual, ''''))[8] = 'role'
        AND (pg_catalog.string_to_array(p.qual, ''''))[10] = 'admin'
        -- 2. Strict Grammar Allowlist on Code Segments
        -- Code 1 (pre-email): lower/pg_catalog.lower and auth.jwt() ->>
        AND (pg_catalog.string_to_array(p.qual, ''''))[1] ~* '^[ (]*(pg_catalog\.)?lower\s*\(\s*\(?\s*auth\.jwt\(\)\s*->>\s*$'
        -- Code 3 (email comparison): closing parens and EXACT '=' operator
        AND (pg_catalog.string_to_array(p.qual, ''''))[3] ~ '^\s*(?:::text)?\s*\)\s*\)\s*=\s*$'
        -- Code 5 (branch connector): closing paren, EXACT 'OR', and opening auth.jwt() ->
        AND (pg_catalog.string_to_array(p.qual, ''''))[5] ~* '^\s*(?:::text)?\s*\)?\s+OR\s+[ (]*\(\(?auth\.jwt\(\)\s*->\s*$'
        -- Code 7 (role extraction): closing paren and ->> operator
        AND (pg_catalog.string_to_array(p.qual, ''''))[7] ~ '^\s*(?:::text)?\s*\)\s*->>\s*$'
        -- Code 9 (role comparison): closing paren and EXACT '=' operator
        AND (pg_catalog.string_to_array(p.qual, ''''))[9] ~ '^\s*(?:::text)?\s*\)\s*=\s*$'
        -- Code 11 (trailing expression): optional ::text and closing parens only (rejects trailing predicates)
        AND (pg_catalog.string_to_array(p.qual, ''''))[11] ~ '^\s*(?:::text)?\s*\)*$'
      ) THEN 'FAIL'
      ELSE 'PASS'
    END AS status,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'Table public.guests missing'
      WHEN pc.total_policies = 0 THEN 'FAIL: No policies found on table (unprotected)'
      WHEN pc.total_policies > 1 THEN 'FAIL: Multiple policies detected (' || pc.total_policies || ')'
      WHEN p.policyname <> 'Authenticated admins can manage guests' THEN 'FAIL: Policy name mismatch (' || COALESCE(p.policyname, 'NULL') || ')'
      WHEN p.permissive <> 'PERMISSIVE' THEN 'FAIL: Policy not permissive'
      WHEN p.cmd <> 'ALL' THEN 'FAIL: Policy command not ALL'
      WHEN p.roles <> '{authenticated}' THEN 'FAIL: Target roles mismatch (' || array_to_string(p.roles, ',') || ')'
      WHEN p.qual IS NULL OR p.with_check IS NULL THEN 'FAIL: Missing USING or WITH CHECK expression'
      WHEN p.qual <> p.with_check THEN 'FAIL: USING and WITH CHECK expressions differ'
      -- Detailed diagnostic classification for failures:
      WHEN array_length(pg_catalog.string_to_array(p.qual, ''''), 1) = 11 AND (pg_catalog.string_to_array(p.qual, ''''))[4] <> 'admin@invitation.com' 
      THEN 'CRITICAL SECURITY FAIL: Email literal mismatch or spoofing detected (' || COALESCE((pg_catalog.string_to_array(p.qual, ''''))[4], 'NULL') || ')'
      WHEN array_length(pg_catalog.string_to_array(p.qual, ''''), 1) = 11 AND (pg_catalog.string_to_array(p.qual, ''''))[10] <> 'admin' 
      THEN 'CRITICAL SECURITY FAIL: Role literal mismatch or spoofing detected (' || COALESCE((pg_catalog.string_to_array(p.qual, ''''))[10], 'NULL') || ')'
      WHEN array_length(pg_catalog.string_to_array(p.qual, ''''), 1) = 11 AND (pg_catalog.string_to_array(p.qual, ''''))[6] <> 'app_metadata' 
      THEN 'CRITICAL SECURITY FAIL: Metadata claim location mismatch (' || COALESCE((pg_catalog.string_to_array(p.qual, ''''))[6], 'NULL') || ')'
      WHEN array_length(pg_catalog.string_to_array(p.qual, ''''), 1) = 11 AND (pg_catalog.string_to_array(p.qual, ''''))[3] !~ '^\s*(?:::text)?\s*\)\s*\)\s*=\s*$'
      THEN 'CRITICAL SECURITY FAIL: Non-equality operator or grammar mutation in email branch (' || COALESCE((pg_catalog.string_to_array(p.qual, ''''))[3], 'NULL') || ')'
      WHEN array_length(pg_catalog.string_to_array(p.qual, ''''), 1) = 11 AND (pg_catalog.string_to_array(p.qual, ''''))[9] !~ '^\s*(?:::text)?\s*\)\s*=\s*$'
      THEN 'CRITICAL SECURITY FAIL: Non-equality operator or grammar mutation in role branch (' || COALESCE((pg_catalog.string_to_array(p.qual, ''''))[9], 'NULL') || ')'
      WHEN array_length(pg_catalog.string_to_array(p.qual, ''''), 1) = 11 AND (pg_catalog.string_to_array(p.qual, ''''))[11] !~ '^\s*(?:::text)?\s*\)*$'
      THEN 'CRITICAL SECURITY FAIL: Trailing predicate injection detected (' || COALESCE((pg_catalog.string_to_array(p.qual, ''''))[11], 'NULL') || ')'
      WHEN p.qual ~* '\y(IS\s+FALSE|IS\s+TRUE|IS\s+UNKNOWN|IS\s+DISTINCT|IS\s+NOT\s+DISTINCT)\y' THEN 'CRITICAL SECURITY FAIL: Predicate inversion operator (IS FALSE/TRUE/UNKNOWN) detected'
      WHEN p.qual ~* 'user_metadata' THEN 'CRITICAL SECURITY FAIL: Client-writable user_metadata detected in policy'
      WHEN p.qual ~* 'admin@hmwedding\.com' THEN 'FAIL: Deprecated admin@hmwedding.com email detected in policy'
      WHEN p.qual ~* '\y(true|1\s*=\s*1)\y' THEN 'CRITICAL SECURITY FAIL: Tautology / true bypass branch detected'
      WHEN p.qual ~* '\y(CASE|COALESCE|BETWEEN|IN)\y' THEN 'CRITICAL SECURITY FAIL: Non-canonical construct (CASE/COALESCE/BETWEEN/IN) detected'
      WHEN p.qual NOT IN (
        '((lower((auth.jwt() ->> ''email''::text)) = ''admin@invitation.com''::text) OR (((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text) = ''admin''::text))',
        '(((lower((auth.jwt() ->> ''email''::text)) = ''admin@invitation.com''::text) OR (((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text) = ''admin''::text)))',
        '((pg_catalog.lower((auth.jwt() ->> ''email''::text)) = ''admin@invitation.com''::text) OR (((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text) = ''admin''::text))',
        '(((pg_catalog.lower((auth.jwt() ->> ''email''::text)) = ''admin@invitation.com''::text) OR (((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text) = ''admin''::text)))'
      ) THEN 'FAIL: Policy expression does not match canonical admin authorization expression'
      ELSE 'Exact canonical admin policy verified (Roles: ' || array_to_string(p.roles, ',') || ' | Cmd: ' || p.cmd::text || ')'
    END AS details
  FROM (
    SELECT count(*) AS total_policies 
    FROM pg_catalog.pg_policies 
    WHERE schemaname = 'public' AND tablename = 'guests'
  ) pc
  LEFT JOIN pg_catalog.pg_policies p 
    ON p.schemaname = 'public' AND p.tablename = 'guests'
),

-- ------------------------------------------------------------------------------
-- 6. DIRECT TABLE ACL (EXPLICIT GRANTS & REVOKES MATRIX)
-- ------------------------------------------------------------------------------
exploded_acl AS (
  SELECT 
    c.relname AS tablename,
    r_owner.rolname AS owner_name,
    CASE 
      WHEN a.grantee = 0 THEN 'PUBLIC'
      WHEN r_grantee.rolname IS NULL THEN 'UNKNOWN OID: ' || a.grantee::text
      ELSE r_grantee.rolname 
    END AS grantee_name,
    a.privilege_type,
    a.is_grantable
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_catalog.pg_roles r_owner ON r_owner.oid = c.relowner
  CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))) a
  LEFT JOIN pg_catalog.pg_roles r_grantee ON r_grantee.oid = a.grantee
  WHERE n.nspname = 'public' AND c.relname = 'guests'
),

check_direct_acl_owner AS (
  SELECT 
    '6. DIRECT_ACL'::text AS check_category,
    'direct_acl_owner_is_postgres'::text AS check_name,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'FAIL'
      WHEN c.relowner IS NULL THEN 'FAIL'
      WHEN r_owner.rolname <> 'postgres' THEN 'FAIL'
      WHEN r_owner.rolname IN ('anon', 'authenticated') THEN 'FAIL'
      ELSE 'PASS'
    END AS status,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'Table public.guests missing'
      WHEN c.relowner IS NULL THEN 'Table owner OID is NULL'
      WHEN r_owner.rolname <> 'postgres' THEN 'Table owner mismatch: expected postgres, got ' || COALESCE(r_owner.rolname, 'NULL')
      ELSE 'Table owner verified: ' || r_owner.rolname || ' (postgres) | Client roles excluded'
    END AS details
  FROM (SELECT to_regclass('public.guests') AS t_oid) t
  LEFT JOIN pg_catalog.pg_class c ON c.oid = t.t_oid
  LEFT JOIN pg_catalog.pg_roles r_owner ON r_owner.oid = c.relowner
),

check_direct_acl_authenticated_crud AS (
  SELECT 
    '6. DIRECT_ACL'::text AS check_category,
    'direct_acl_auth_' || lower(p.priv) AS check_name,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'FAIL'
      WHEN count(a.privilege_type) = 1 THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'Table public.guests missing'
      WHEN count(a.privilege_type) = 1 THEN 'Direct ' || p.priv || ' granted to authenticated'
      ELSE 'FAIL: Expected direct ' || p.priv || ' for authenticated missing'
    END AS details
  FROM (
    SELECT unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']) AS priv
  ) p
  LEFT JOIN exploded_acl a ON a.grantee_name = 'authenticated' AND a.privilege_type = p.priv
  GROUP BY p.priv
),

check_direct_acl_authenticated_non_crud AS (
  SELECT 
    '6. DIRECT_ACL'::text AS check_category,
    'direct_acl_auth_zero_non_crud'::text AS check_name,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'FAIL'
      WHEN count(*) = 0 THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'Table public.guests missing'
      WHEN count(*) = 0 THEN 'Zero non-CRUD direct privileges on authenticated'
      ELSE 'FAIL: Unexpected non-CRUD privileges on authenticated: ' || count(*)
    END AS details
  FROM exploded_acl
  WHERE grantee_name = 'authenticated'
    AND privilege_type NOT IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
),

check_direct_acl_anon_public AS (
  SELECT 
    '6. DIRECT_ACL'::text AS check_category,
    'direct_acl_anon_public_zero'::text AS check_name,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'FAIL'
      WHEN count(*) = 0 THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'Table public.guests missing'
      WHEN count(*) = 0 THEN 'Zero direct table privileges on anon and PUBLIC'
      ELSE 'CRITICAL SECURITY FAIL: Direct privileges exist on anon or PUBLIC: ' || count(*)
    END AS details
  FROM exploded_acl
  WHERE grantee_name IN ('anon', 'PUBLIC')
),

check_direct_acl_service_role AS (
  SELECT 
    '6. DIRECT_ACL'::text AS check_category,
    'direct_acl_service_role_' || lower(p.priv) AS check_name,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'FAIL'
      WHEN count(a.privilege_type) = 1 THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'Table public.guests missing'
      WHEN count(a.privilege_type) = 1 THEN 'Direct ' || p.priv || ' granted to service_role'
      ELSE 'FAIL: Expected baseline ' || p.priv || ' for service_role missing'
    END AS details
  FROM (
    SELECT unnest(ARRAY['REFERENCES', 'TRIGGER', 'TRUNCATE']) AS priv
  ) p
  LEFT JOIN exploded_acl a ON a.grantee_name = 'service_role' AND a.privilege_type = p.priv
  GROUP BY p.priv
),

check_direct_acl_service_role_no_crud AS (
  SELECT 
    '6. DIRECT_ACL'::text AS check_category,
    'direct_acl_service_role_zero_crud'::text AS check_name,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'FAIL'
      WHEN count(*) = 0 THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'Table public.guests missing'
      WHEN count(*) = 0 THEN 'Zero direct CRUD privileges on service_role (matches Production baseline audit)'
      ELSE 'WARNING: Unexpected direct CRUD privileges on service_role: ' || count(*)
    END AS details
  FROM exploded_acl
  WHERE grantee_name = 'service_role'
    AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
),

check_direct_acl_unknown_grantee AS (
  SELECT 
    '6. DIRECT_ACL'::text AS check_category,
    'direct_acl_unknown_grantee_zero'::text AS check_name,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'FAIL'
      WHEN count(*) = 0 THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'Table public.guests missing'
      WHEN count(*) = 0 THEN 'Zero unknown grantee OIDs detected in ACL'
      ELSE 'FAIL: Unknown grantee OIDs detected in pg_class.relacl: ' || count(*)
    END AS details
  FROM exploded_acl
  WHERE grantee_name LIKE 'UNKNOWN OID:%'
),

check_direct_acl_grant_options AS (
  SELECT 
    '6. DIRECT_ACL'::text AS check_category,
    'direct_acl_unexpected_grant_options_zero'::text AS check_name,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'FAIL'
      WHEN count(*) = 0 THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'Table public.guests missing'
      WHEN count(*) = 0 THEN 'Zero grant options on non-owner roles'
      ELSE 'FAIL: Unexpected grant options (WITH GRANT OPTION) detected: ' || count(*)
    END AS details
  FROM exploded_acl
  WHERE is_grantable = true 
    AND grantee_name NOT IN ('postgres')
),

-- ------------------------------------------------------------------------------
-- 7. EFFECTIVE TABLE PRIVILEGES (has_table_privilege - FULLY GUARDED FOR MISSING TABLE)
-- ------------------------------------------------------------------------------
check_effective_anon AS (
  SELECT 
    '7. EFFECTIVE_PERMISSIONS'::text AS check_category,
    'effective_anon_' || lower(p.priv) || '_blocked' AS check_name,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'FAIL'
      WHEN has_table_privilege('anon', to_regclass('public.guests'), p.priv) = false THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'Table public.guests missing'
      ELSE 'anon has_table_privilege(' || p.priv || ') = ' || COALESCE(has_table_privilege('anon', to_regclass('public.guests'), p.priv)::text, 'NULL')
    END AS details
  FROM (
    SELECT unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN']) AS priv
  ) p
),

check_effective_auth AS (
  SELECT 
    '7. EFFECTIVE_PERMISSIONS'::text AS check_category,
    CASE 
      WHEN p.priv IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE') 
      THEN 'effective_auth_' || lower(p.priv) || '_granted'
      ELSE 'effective_auth_' || lower(p.priv) || '_blocked'
    END AS check_name,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'FAIL'
      WHEN p.priv IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE') AND has_table_privilege('authenticated', to_regclass('public.guests'), p.priv) = true THEN 'PASS'
      WHEN p.priv IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE') AND has_table_privilege('authenticated', to_regclass('public.guests'), p.priv) = false THEN 'FAIL'
      WHEN p.priv NOT IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE') AND has_table_privilege('authenticated', to_regclass('public.guests'), p.priv) = false THEN 'PASS'
      WHEN p.priv NOT IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE') AND has_table_privilege('authenticated', to_regclass('public.guests'), p.priv) = true THEN 'FAIL'
      ELSE 'FAIL'
    END AS status,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'Table public.guests missing'
      ELSE 'authenticated has_table_privilege(' || p.priv || ') = ' || COALESCE(has_table_privilege('authenticated', to_regclass('public.guests'), p.priv)::text, 'NULL')
    END AS details
  FROM (
    SELECT unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN']) AS priv
  ) p
),

check_effective_sr_baseline AS (
  SELECT 
    '7. EFFECTIVE_PERMISSIONS'::text AS check_category,
    'effective_sr_' || lower(p.priv) || '_granted' AS check_name,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'FAIL'
      WHEN has_table_privilege('service_role', to_regclass('public.guests'), p.priv) = true THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'Table public.guests missing'
      ELSE 'service_role has_table_privilege(' || p.priv || ') = ' || COALESCE(has_table_privilege('service_role', to_regclass('public.guests'), p.priv)::text, 'NULL')
    END AS details
  FROM (
    SELECT unnest(ARRAY['REFERENCES', 'TRIGGER', 'TRUNCATE']) AS priv
  ) p
),

check_effective_sr_maintain AS (
  SELECT 
    '7. EFFECTIVE_PERMISSIONS'::text AS check_category,
    'effective_sr_maintain_evaluated'::text AS check_name,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'FAIL'
      WHEN has_table_privilege('service_role', to_regclass('public.guests'), 'MAINTAIN') IS NOT NULL THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'Table public.guests missing'
      ELSE 'service_role effective MAINTAIN = ' || COALESCE(has_table_privilege('service_role', to_regclass('public.guests'), 'MAINTAIN')::text, 'NULL') || ' (evaluated)'
    END AS details
),

check_effective_sr_crud_evaluated AS (
  SELECT 
    '7. EFFECTIVE_PERMISSIONS'::text AS check_category,
    'effective_sr_' || lower(p.priv) || '_evaluated' AS check_name,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'FAIL'
      WHEN has_table_privilege('service_role', to_regclass('public.guests'), p.priv) IS NOT NULL THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE 
      WHEN to_regclass('public.guests') IS NULL THEN 'Table public.guests missing'
      ELSE 'service_role effective ' || p.priv || ' = ' || COALESCE(has_table_privilege('service_role', to_regclass('public.guests'), p.priv)::text, 'NULL') || ' (evaluated)'
    END AS details
  FROM (
    SELECT unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']) AS priv
  ) p
),

-- ------------------------------------------------------------------------------
-- 8. AGGREGATION & FULL MANDATORY REGISTRY ROLLUP
-- ------------------------------------------------------------------------------
all_executed_checks AS (
  SELECT * FROM check_table
  UNION ALL SELECT * FROM check_columns
  UNION ALL SELECT * FROM check_column_count
  UNION ALL SELECT * FROM check_constraints
  UNION ALL SELECT * FROM check_constraint_count
  UNION ALL SELECT * FROM check_indexes
  UNION ALL SELECT * FROM check_index_count
  UNION ALL SELECT * FROM check_migration_index_absent
  UNION ALL SELECT * FROM check_rls_policy
  UNION ALL SELECT * FROM check_direct_acl_owner
  UNION ALL SELECT * FROM check_direct_acl_authenticated_crud
  UNION ALL SELECT * FROM check_direct_acl_authenticated_non_crud
  UNION ALL SELECT * FROM check_direct_acl_anon_public
  UNION ALL SELECT * FROM check_direct_acl_service_role
  UNION ALL SELECT * FROM check_direct_acl_service_role_no_crud
  UNION ALL SELECT * FROM check_direct_acl_unknown_grantee
  UNION ALL SELECT * FROM check_direct_acl_grant_options
  UNION ALL SELECT * FROM check_effective_anon
  UNION ALL SELECT * FROM check_effective_auth
  UNION ALL SELECT * FROM check_effective_sr_baseline
  UNION ALL SELECT * FROM check_effective_sr_maintain
  UNION ALL SELECT * FROM check_effective_sr_crud_evaluated
),

matched_checks AS (
  SELECT 
    reg.req_id,
    COALESCE(exec.check_category, 'MANDATORY_CHECK_NOT_RUN') AS check_category,
    COALESCE(exec.check_name, reg.req_id) AS check_name,
    COALESCE(exec.status, 'FAIL') AS status,
    COALESCE(exec.details, 'CRITICAL: Mandatory baseline verification check did not execute') AS details
  FROM mandatory_registry reg
  LEFT JOIN all_executed_checks exec ON exec.check_name = reg.req_id
)

SELECT 
  check_category,
  check_name,
  status,
  details
FROM matched_checks
UNION ALL
SELECT 
  '0. UNEXPECTED_CHECKS' AS check_category,
  exec.check_name,
  'FAIL' AS status,
  'FAIL: Unexpected check executed outside mandatory registry: ' || exec.check_name AS details
FROM all_executed_checks exec
LEFT JOIN mandatory_registry reg ON reg.req_id = exec.check_name
WHERE reg.req_id IS NULL
UNION ALL
SELECT 
  '9. FINAL_SUMMARY' AS check_category,
  'OVERALL_STAGING_BASELINE_STATUS' AS check_name,
  CASE 
    WHEN count(*) FILTER (WHERE status = 'FAIL') = 0 
     AND count(*) FILTER (WHERE status = 'PASS') = 57 
     AND (SELECT count(*) FROM all_executed_checks exec LEFT JOIN mandatory_registry reg ON reg.req_id = exec.check_name WHERE reg.req_id IS NULL) = 0
    THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  'Total Mandatory: 57 | Passed: ' || count(*) FILTER (WHERE status = 'PASS') || 
  ' | Failed: ' || count(*) FILTER (WHERE status = 'FAIL') || 
  ' | Unexpected: ' || (SELECT count(*) FROM all_executed_checks exec LEFT JOIN mandatory_registry reg ON reg.req_id = exec.check_name WHERE reg.req_id IS NULL) AS details
FROM matched_checks
ORDER BY check_category, check_name;
