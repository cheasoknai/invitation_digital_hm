-- ==============================================================================
-- INVITATION DIGITAL H&M - STAGING DATA PREFLIGHT DIAGNOSTICS (PHASE 5.14.3)
-- Target Project: Supabase Staging (mavneuowkoejzphistrh) | PostgreSQL 17.12
-- Target Schema: public | Target Table: public.guests
-- Target Migration: supabase/slug_only_security_migration.sql
-- Reference Schemas:
--   - supabase/staging_initial_schema.sql
--   - supabase/staging_baseline_verification.sql
--   - supabase/production_preflight_diagnostics.sqls
--
-- PURPOSE:
-- Perform a comprehensive, 100% read-only preflight diagnostic inspection
-- of actual table data on public.guests before executing the slug-only
-- security migration.
--
-- SAFETY & PRIVACY GUARANTEES (HARDENED):
-- 1. STRICTLY READ-ONLY: SELECT statements only. Zero DDL, zero DML, zero transaction
--    blocks, zero function creations, and zero role/permission modifications.
-- 2. ZERO TOKEN LEAKAGE: Secret invitation tokens are NEVER selected or projected.
--    No plaintext tokens, no masked tokens, no prefixes, and no suffixes.
--    For duplicate token checks, only guest IDs, duplicate counts, and token lengths are reported.
-- 3. RSVP MESSAGE PRIVACY: Zero RSVP message content or previews are displayed.
--    Only guest IDs and character counts are projected for oversized message audits.
-- 4. PII MINIMIZATION: Guest names are omitted from violation diagnostic results;
--    guest UUIDs provide precise identifiers for administrative remediation.
-- 5. FAIL-CLOSED AUDIT: Directly tests every condition required by the 4 new CHECK
--    constraints and the case-insensitive unique expression index.
-- ==============================================================================


-- ==============================================================================
-- 1. EXECUTIVE PREFLIGHT SUMMARY & MIGRATION READINESS VERDICT
-- ==============================================================================
-- Aggregates all data integrity requirements enforced by slug_only_security_migration.sql:
--   - Total guest rows
--   - Invalid tokens (NULL, empty, or whitespace-only)
--   - Invalid slugs (NULL, oversized >60 chars, or malformed regex)
--   - Duplicate slugs (case-insensitive collisions on lower(invitation_slug))
--   - Duplicate tokens (uniqueness collisions on non-null tokens)
--   - Invalid RSVP statuses (outside 'pending', 'accepted', 'declined')
--   - Oversized RSVP messages (> 500 characters)
--
-- EXPECTED READY VERDICT:
--   overall_migration_readiness = 'READY: All preflight data checks passed (0 violations)'
-- ==============================================================================
WITH preflight_metrics AS (
  SELECT
    count(*) AS total_rows,

    -- Constraint: guests_invitation_token_not_empty_check
    count(*) FILTER (
      WHERE invitation_token IS NULL 
         OR pg_catalog.length(pg_catalog.btrim(invitation_token)) = 0
    ) AS invalid_token_count,

    -- Constraint: guests_invitation_slug_format_check (Category: NULL slug)
    count(*) FILTER (
      WHERE invitation_slug IS NULL
    ) AS null_slug_count,

    -- Constraint: guests_invitation_slug_format_check (Category: length > 60)
    count(*) FILTER (
      WHERE invitation_slug IS NOT NULL 
        AND pg_catalog.length(invitation_slug) > 60
    ) AS oversized_slug_count,

    -- Constraint: guests_invitation_slug_format_check (Category: regex non-match)
    count(*) FILTER (
      WHERE invitation_slug IS NOT NULL 
        AND pg_catalog.length(invitation_slug) <= 60
        AND invitation_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ) AS malformed_slug_count,

    -- Constraint: guests_invitation_slug_format_check (Total invalid slugs)
    count(*) FILTER (
      WHERE invitation_slug IS NULL 
         OR pg_catalog.length(invitation_slug) > 60
         OR invitation_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ) AS total_invalid_slug_count,

    -- Index: guests_invitation_slug_lower_idx duplicate groups
    (
      SELECT count(*) FROM (
        SELECT pg_catalog.lower(invitation_slug)
        FROM public.guests
        WHERE invitation_slug IS NOT NULL
        GROUP BY pg_catalog.lower(invitation_slug)
        HAVING count(*) > 1
      ) d_slug
    ) AS duplicate_slug_groups_count,

    -- Constraint: guests_invitation_token_unique duplicate groups
    (
      SELECT count(*) FROM (
        SELECT invitation_token
        FROM public.guests
        WHERE invitation_token IS NOT NULL
        GROUP BY invitation_token
        HAVING count(*) > 1
      ) d_tok
    ) AS duplicate_token_groups_count,

    -- Constraint: guests_rsvp_status_check ('pending', 'accepted', 'declined')
    count(*) FILTER (
      WHERE rsvp_status IS NULL 
         OR rsvp_status NOT IN ('pending', 'accepted', 'declined')
    ) AS invalid_rsvp_status_count,

    -- Constraint: guests_rsvp_message_len_check (length <= 500)
    count(*) FILTER (
      WHERE rsvp_message IS NOT NULL 
        AND pg_catalog.length(rsvp_message) > 500
    ) AS oversized_rsvp_message_count
  FROM public.guests
)
SELECT 
  total_rows AS total_guest_records,
  invalid_token_count,
  null_slug_count,
  oversized_slug_count,
  malformed_slug_count,
  total_invalid_slug_count,
  duplicate_slug_groups_count,
  duplicate_token_groups_count,
  invalid_rsvp_status_count,
  oversized_rsvp_message_count,
  CASE 
    WHEN invalid_token_count = 0
     AND total_invalid_slug_count = 0
     AND duplicate_slug_groups_count = 0
     AND duplicate_token_groups_count = 0
     AND invalid_rsvp_status_count = 0
     AND oversized_rsvp_message_count = 0
    THEN 'READY: All preflight data checks passed (0 violations)'
    ELSE 'BLOCKED: Data violations detected. Remediation required before migration execution.'
  END AS overall_migration_readiness
FROM preflight_metrics;


-- ==============================================================================
-- 2. INVITATION TOKEN AUDIT (NULL, EMPTY, OR WHITESPACE-ONLY)
-- ==============================================================================
-- Migration Requirement:
--   CHECK (invitation_token IS NOT NULL AND length(btrim(invitation_token)) > 0)
--
-- Strict Privacy Guarantee:
--   Tokens are NEVER selected or displayed. No plaintext, no masked strings,
--   no prefixes, and no suffixes. Only guest IDs, anomaly categories, and lengths.
--
-- Expected Output: 0 rows.
-- ==============================================================================
SELECT 
  id AS guest_id,
  CASE 
    WHEN invitation_token IS NULL THEN 'NULL_TOKEN'
    WHEN pg_catalog.length(invitation_token) = 0 THEN 'EMPTY_STRING'
    WHEN pg_catalog.length(pg_catalog.btrim(invitation_token)) = 0 
      THEN 'WHITESPACE_ONLY'
    ELSE 'UNKNOWN_ANOMALY'
  END AS token_anomaly_type,
  COALESCE(pg_catalog.length(invitation_token), 0) AS raw_token_length,
  COALESCE(pg_catalog.length(pg_catalog.btrim(invitation_token)), 0) AS trimmed_token_length,
  'VIOLATION: Will fail guests_invitation_token_not_empty_check' AS failure_reason
FROM public.guests
WHERE invitation_token IS NULL 
   OR pg_catalog.length(pg_catalog.btrim(invitation_token)) = 0
ORDER BY created_at ASC;


-- ==============================================================================
-- 3. INVITATION SLUG COMPREHENSIVE VALIDATION (NULL, OVERSIZED, MALFORMED)
-- ==============================================================================
-- Migration Requirement:
--   CHECK (
--     invitation_slug IS NOT NULL 
--     AND length(invitation_slug) <= 60 
--     AND invitation_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
--   )
--
-- Failure Classifications:
--   - 'NULL_SLUG': Slug is completely missing.
--   - 'EMPTY_OR_WHITESPACE_SLUG': Slug is empty string or whitespace only.
--   - 'OVERSIZED (>60 CHARS)': Slug exceeds 60 characters.
--   - 'MALFORMED: Contains uppercase characters': Fails regex due to uppercase letters.
--   - 'MALFORMED: Contains consecutive hyphens (--)': Fails regex due to '--'.
--   - 'MALFORMED: Leading or trailing hyphen': Fails regex due to starting/ending with '-'.
--   - 'MALFORMED: Contains non-alphanumeric/non-hyphen characters': Fails regex due to illegal chars.
--   - 'MALFORMED: Fails canonical pattern': General regex failure.
--
-- Expected Output: 0 rows.
-- ==============================================================================
SELECT 
  id AS guest_id,
  COALESCE(invitation_slug, '<NULL>') AS raw_slug,
  COALESCE(pg_catalog.length(invitation_slug), 0) AS slug_length,
  CASE 
    WHEN invitation_slug IS NULL THEN 'NULL_SLUG'
    WHEN pg_catalog.length(pg_catalog.btrim(invitation_slug)) = 0 THEN 'EMPTY_OR_WHITESPACE_SLUG'
    WHEN pg_catalog.length(invitation_slug) > 60 THEN 'OVERSIZED (>60 CHARS)'
    WHEN invitation_slug ~ '[A-Z]' THEN 'MALFORMED: Contains uppercase characters'
    WHEN invitation_slug ~ '--' THEN 'MALFORMED: Contains consecutive hyphens (--)'
    WHEN invitation_slug ~ '^-|-$' THEN 'MALFORMED: Leading or trailing hyphen'
    WHEN invitation_slug !~ '^[a-z0-9-]+$' THEN 'MALFORMED: Contains non-alphanumeric/non-hyphen characters'
    WHEN invitation_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN 'MALFORMED: Fails canonical pattern ^[a-z0-9]+(-[a-z0-9]+)*$'
    ELSE 'UNKNOWN_ANOMALY'
  END AS slug_violation_category,
  'VIOLATION: Will fail guests_invitation_slug_format_check' AS migration_impact
FROM public.guests
WHERE invitation_slug IS NULL 
   OR pg_catalog.length(invitation_slug) > 60 
   OR invitation_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
ORDER BY created_at ASC;


-- ==============================================================================
-- 4. CASE-INSENSITIVE DUPLICATE SLUG COLLISIONS
-- ==============================================================================
-- Migration Requirement:
--   CREATE UNIQUE INDEX guests_invitation_slug_lower_idx 
--   ON public.guests (pg_catalog.lower(invitation_slug)) 
--   WHERE invitation_slug IS NOT NULL;
--
-- Description:
--   Audits case-insensitive duplicate slug groups on lower(invitation_slug).
--   If two rows differ only in case, this query identifies colliding guest IDs.
--
-- Expected Output: 0 rows.
-- ==============================================================================
SELECT 
  pg_catalog.lower(invitation_slug) AS normalized_collision_slug,
  count(*) AS collision_count,
  pg_catalog.array_agg(id) AS colliding_guest_ids,
  pg_catalog.array_agg(invitation_slug) AS raw_casing_variants,
  'VIOLATION: Will cause duplicate key error on guests_invitation_slug_lower_idx' AS migration_impact
FROM public.guests
WHERE invitation_slug IS NOT NULL
GROUP BY pg_catalog.lower(invitation_slug)
HAVING count(*) > 1
ORDER BY collision_count DESC;


-- ==============================================================================
-- 5. DUPLICATE INVITATION TOKENS
-- ==============================================================================
-- Migration & Baseline Requirement:
--   CONSTRAINT guests_invitation_token_unique UNIQUE (invitation_token)
--
-- Strict Privacy Guarantee:
--   Tokens are NEVER displayed. Only duplicate counts, token lengths,
--   colliding guest IDs, and collision classifications are projected.
--
-- Expected Output: 0 rows.
-- ==============================================================================
SELECT 
  count(*) AS duplicate_token_count,
  pg_catalog.length(invitation_token) AS token_length,
  pg_catalog.array_agg(id) AS colliding_guest_ids,
  CASE 
    WHEN pg_catalog.length(pg_catalog.btrim(invitation_token)) = 0 
      THEN 'EMPTY_OR_WHITESPACE_DUPLICATE'
    ELSE 'POPULATED_TOKEN_DUPLICATE'
  END AS collision_classification,
  'VIOLATION: Violates table UNIQUE constraint on invitation_token' AS migration_impact
FROM public.guests
WHERE invitation_token IS NOT NULL 
GROUP BY invitation_token, pg_catalog.length(invitation_token)
HAVING count(*) > 1
ORDER BY duplicate_token_count DESC;


-- ==============================================================================
-- 6. RSVP STATUS VALUE AUDIT & DISTRIBUTION
-- ==============================================================================
-- Migration Requirement:
--   CHECK (rsvp_status IS NOT NULL AND rsvp_status IN ('pending', 'accepted', 'declined'))
--
-- 6A: RSVP Status Frequency Distribution Summary
-- ==============================================================================
SELECT 
  COALESCE(rsvp_status, '<NULL>') AS rsvp_status_value,
  count(*) AS row_count,
  ROUND(count(*) * 100.0 / NULLIF((SELECT count(*) FROM public.guests), 0), 2) AS percentage_of_total,
  CASE 
    WHEN rsvp_status IN ('pending', 'accepted', 'declined') THEN 'COMPLIANT (Allowed Set)'
    WHEN rsvp_status IS NULL THEN 'NON-COMPLIANT: NULL status forbidden by guests_rsvp_status_check'
    ELSE 'NON-COMPLIANT: Value forbidden by guests_rsvp_status_check (only pending, accepted, declined allowed)'
  END AS compliance_status
FROM public.guests
GROUP BY rsvp_status
ORDER BY row_count DESC;

-- ------------------------------------------------------------------------------
-- 6B: Non-Compliant RSVP Status Detailed Row Audit
-- Expected Output: 0 rows.
-- ------------------------------------------------------------------------------
SELECT 
  id AS guest_id,
  COALESCE(rsvp_status, '<NULL>') AS invalid_rsvp_status_value,
  'VIOLATION: Will fail guests_rsvp_status_check' AS migration_impact
FROM public.guests
WHERE rsvp_status IS NULL 
   OR rsvp_status NOT IN ('pending', 'accepted', 'declined')
ORDER BY created_at ASC;


-- ==============================================================================
-- 7. OVERSIZED RSVP MESSAGE AUDIT (> 500 CHARACTERS)
-- ==============================================================================
-- Migration Requirement:
--   CHECK (rsvp_message IS NULL OR length(rsvp_message) <= 500)
--
-- Strict Privacy Guarantee:
--   RSVP message text and previews are strictly excluded.
--   Only guest IDs and message character lengths are projected.
--
-- Expected Output: 0 rows.
-- ==============================================================================
SELECT 
  id AS guest_id,
  pg_catalog.length(rsvp_message) AS message_length,
  'VIOLATION: Will fail guests_rsvp_message_len_check (exceeds 500 chars)' AS migration_impact
FROM public.guests
WHERE rsvp_message IS NOT NULL 
  AND pg_catalog.length(rsvp_message) > 500
ORDER BY message_length DESC;


-- ==============================================================================
-- 8. CATALOG DEFAULT HAZARD ANALYSIS: invitation_token DEFAULT ''::text
-- ==============================================================================
-- Architectural Hazard Assessment:
--   In staging_initial_schema.sql (Line 40), invitation_token is defined as:
--     invitation_token text DEFAULT ''::text
--   (Note: in baseline schema, invitation_token is nullable, attnotnull = false).
--   However, slug_only_security_migration.sql adds:
--     CHECK (invitation_token IS NOT NULL AND length(btrim(invitation_token)) > 0)
--
--   Hazard 1 (Immediate Constraint Failure on Insert):
--     Any SQL INSERT omitting invitation_token evaluates to ''::text, which
--     has length 0 and immediately fails guests_invitation_token_not_empty_check.
--   Hazard 2 (Unique Constraint Collision):
--     Two inserts relying on DEFAULT ''::text violate guests_invitation_token_unique
--     because empty strings are non-null and not distinct.
--
-- Classification Rules (Phase 5.14.3):
--   - Applies exclusively to the 'invitation_token' column.
--   - Unrelated columns are NOT evaluated under invitation_token rules and
--     are never classified as SAFE or POTENTIALLY UNSAFE.
--   - For invitation_token:
--     * d.adbin IS NULL -> 'NO DEFAULT — EXPLICIT TOKEN REQUIRED'
--     * Empty or whitespace-only default -> 'POTENTIALLY UNSAFE'
--       (Fully anchored with ^ and $ to ensure complete-expression matching)
--     * Non-empty, unrecognized, or trailing expressions -> 'MANUAL REVIEW REQUIRED'
--     * Never classifies an unrecognized expression as SAFE.
--   - STRICTLY READ-ONLY: Pure catalog inspection; zero database alterations.
-- ==============================================================================
SELECT 
  a.attname AS column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
  a.attnotnull AS is_not_null,
  COALESCE(pg_catalog.pg_get_expr(d.adbin, d.adrelid), '<NO_DEFAULT>') AS actual_catalog_default_expression,
  CASE 
    -- Apply assessment exclusively to the invitation_token column
    WHEN a.attname = 'invitation_token' THEN
      CASE 
        -- 1. No default defined in catalog (d.adbin IS NULL)
        WHEN d.adbin IS NULL THEN 
          'NO DEFAULT — EXPLICIT TOKEN REQUIRED: No default expression defined in catalog (d.adbin IS NULL). Explicit token must be supplied on insert.'

        -- 2. Empty or whitespace-only string default (POTENTIALLY UNSAFE)
        -- Fully anchored with ^ and $; matches complete empty/whitespace string expressions
        -- including deparsed type casts and parentheses, while rejecting trailing operators/tokens.
        WHEN pg_catalog.pg_get_expr(d.adbin, d.adrelid) ~ $re$^[()[:space:]]*'[[:space:]]*'([()[:space:]]|::[a-zA-Z0-9_." ]+)*$$re$ THEN 
          'POTENTIALLY UNSAFE: Empty or whitespace default detected (' || pg_catalog.pg_get_expr(d.adbin, d.adrelid) || '). Omitted token on insert evaluates to empty string, which immediately fails guests_invitation_token_not_empty_check (length(btrim(token)) > 0) and causes UNIQUE constraint collisions.'

        -- 3. Non-empty, trailing-operator, or unrecognized default expression (MANUAL REVIEW REQUIRED)
        -- Trailing expressions like ''::text || 'abc' fall through here.
        -- Never classifies an unrecognized expression as SAFE.
        ELSE 
          'MANUAL REVIEW REQUIRED: Non-empty or unrecognized default detected (' || pg_catalog.pg_get_expr(d.adbin, d.adrelid) || '). Verify whether default complies with length(btrim(token)) > 0 and uniqueness requirements.'
      END

    -- Unrelated columns: never report as SAFE or POTENTIALLY UNSAFE under token rules
    ELSE 'NOT APPLICABLE: Assessment applies exclusively to invitation_token.'
  END AS catalog_hazard_assessment
FROM pg_catalog.pg_attribute a
LEFT JOIN pg_catalog.pg_attrdef d 
  ON d.adrelid = a.attrelid AND d.adnum = a.attnum
WHERE a.attrelid = 'public.guests'::regclass
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY a.attnum;


-- ==============================================================================
-- 9. PRE-MIGRATION ACTIVE CONSTRAINTS & INDEXES CATALOG STATUS
-- ==============================================================================
-- Confirms existing table constraints and indexes on public.guests.
-- Expected Pre-Migration State:
--   Constraints: guests_pkey (p), guests_invitation_token_unique (u)
--   Indexes: guests_pkey, guests_invitation_token_unique, guests_invitation_slug_unique
--   Migration Index absent: guests_invitation_slug_lower_idx must be ABSENT
-- ==============================================================================
SELECT 
  'CONSTRAINT' AS object_type,
  con.conname AS object_name,
  con.contype::text AS object_subtype,
  con.convalidated AS is_validated,
  pg_catalog.pg_get_constraintdef(con.oid, true) AS definition
FROM pg_catalog.pg_constraint con
WHERE con.conrelid = 'public.guests'::regclass

UNION ALL

SELECT 
  'INDEX' AS object_type,
  c.relname AS object_name,
  am.amname AS object_subtype,
  i.indisvalid AS is_validated,
  pg_catalog.pg_get_indexdef(i.indexrelid) AS definition
FROM pg_catalog.pg_index i
JOIN pg_catalog.pg_class c ON c.oid = i.indexrelid
JOIN pg_catalog.pg_am am ON am.oid = c.relam
WHERE i.indrelid = 'public.guests'::regclass

ORDER BY object_type, object_name;


-- ==============================================================================
-- 10. PRE-MIGRATION ACTIVE RLS POLICIES CATALOG STATUS
-- ==============================================================================
-- Inspects existing RLS policies on public.guests.
-- Expected Baseline State:
--   Policy: Allow admin full access
-- ==============================================================================
SELECT
  policyname AS policy_name,
  permissive,
  roles,
  cmd AS command,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename = 'guests'
ORDER BY policyname;


-- ==============================================================================
-- 11. POSTGRESQL LOCK & RPC CATALOG DIAGNOSTICS
-- ==============================================================================
-- Modular, read-only diagnostic suite for pre-migration lock inspection,
-- RPC catalog integrity verification, function object locks, and blocker chains.
-- Target Engine: Supabase PostgreSQL 15.x
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 11.A. Target Table and Index Lock Diagnostics (Query A)
-- ------------------------------------------------------------------------------
-- Scopes to public.guests and dependent indexes in the current database.
-- Captures relation, extend, page, and tuple lock types.
-- NOTE: Row-level locks in PostgreSQL are maintained in disk tuple headers (xmax)
-- rather than pg_locks. Prolonged row contention surfaces as transactionid waits
-- in Query C; zero tuple lock rows here does NOT indicate absence of row contention.
-- Lock wait timing uses pg_locks.waitstart (briefly NULL on newly queued waits).
-- ------------------------------------------------------------------------------
WITH current_db AS (
  SELECT oid AS db_oid FROM pg_database WHERE datname = current_database()
),
target_relations AS (
  SELECT 'public.guests'::regclass::oid AS rel_oid, 'table: public.guests'::text AS object_name, 'table'::text AS object_type
  UNION ALL
  SELECT i.indexrelid AS rel_oid, 'index: ' || i.indexrelid::regclass::text AS object_name, 'index'::text AS object_type
  FROM pg_index i
  WHERE i.indrelid = 'public.guests'::regclass
)
SELECT
  l.locktype,
  tr.object_type,
  tr.object_name,
  CASE
    WHEN l.locktype = 'relation' THEN 'TABLE/INDEX DDL & ACCESS LOCK (Primary DDL lock scope)'
    WHEN l.locktype = 'tuple' THEN 'TRANSIENT TUPLE WAIT LOCK (Row contention appears under transactionid in Query C)'
    WHEN l.locktype = 'extend' THEN 'STORAGE ALLOCATION EXTENSION LOCK (Transient page allocation; not DDL blocker)'
    WHEN l.locktype = 'page' THEN 'BUFFER PAGE LOCK (Transient buffer contention; not DDL blocker)'
    ELSE l.locktype
  END AS lock_scope_description,
  l.mode AS lock_mode,
  l.granted,
  l.pid,
  COALESCE(a.usename, px.owner, 'unknown') AS lock_owner,
  COALESCE(a.state, CASE WHEN px.gid IS NOT NULL THEN 'prepared transaction' ELSE 'idle' END) AS session_state,
  -- Distinct Wait vs Query Timing
  CASE 
    WHEN l.waitstart IS NOT NULL THEN (clock_timestamp() - l.waitstart)::text
    WHEN NOT l.granted THEN 'WAITING (waitstart timestamp not yet recorded)'
    ELSE 'LOCK GRANTED'
  END AS lock_wait_duration,
  CASE 
    WHEN a.query_start IS NOT NULL THEN (clock_timestamp() - a.query_start)::text 
    ELSE NULL 
  END AS query_runtime,
  COALESCE(a.query, 'PREPARED TX: ' || px.gid) AS active_query,
  px.gid AS prepared_tx_gid,
  CASE WHEN l.pid IS NOT NULL THEN pg_blocking_pids(l.pid) ELSE NULL END AS direct_blocking_pids
FROM target_relations tr
JOIN pg_locks l
  ON l.relation = tr.rel_oid
CROSS JOIN current_db cdb
LEFT JOIN pg_stat_activity a
  ON l.pid = a.pid
LEFT JOIN pg_prepared_xacts px
  ON l.virtualtransaction = ('-1/' || px.transaction::text)
WHERE l.database = cdb.db_oid
  AND l.locktype IN ('relation', 'extend', 'page', 'tuple')
ORDER BY l.granted ASC, tr.object_type DESC, l.waitstart ASC NULLS LAST;


-- ------------------------------------------------------------------------------
-- 11.B1. RPC Catalog Verification (Query B1)
-- ------------------------------------------------------------------------------
-- Verifies catalog definitions of migration-managed public functions in pg_proc.
-- Evaluates input arguments, parameter names, argument modes (proargmodes IS NULL),
-- scalar return type ('json'), decompiled result, and default argument definitions.
-- Uses FULL OUTER JOIN to surface missing canonical routines. Structurally-invalid
-- classification applies strictly to routines matching canonical input signatures.
-- ------------------------------------------------------------------------------
WITH canonical_expected AS (
  SELECT 
    'get_guest_by_slug'::name AS exp_name, 
    1::int2 AS exp_nargs, 
    'text'::text AS exp_argtypes, 
    'json'::text AS exp_result
  UNION ALL
  SELECT 
    'submit_rsvp'::name AS exp_name, 
    3::int2 AS exp_nargs, 
    'text, text, text'::text AS exp_argtypes, 
    'json'::text AS exp_result
),
existing_routines AS (
  SELECT 
    p.oid AS func_oid,
    p.proname,
    n.nspname AS schema_name,
    p.prokind,
    p.pronargs,
    oidvectortypes(p.proargtypes) AS arg_types,
    p.proargnames AS arg_names,
    p.proargmodes AS arg_modes,
    p.proallargtypes AS all_arg_types,
    p.prorettype::regtype::text AS return_type,
    p.proretset,
    p.pronargdefaults,
    (p.proargdefaults IS NOT NULL) AS has_arg_defaults,
    pg_get_function_arguments(p.oid) AS full_arguments,
    pg_get_function_result(p.oid) AS result_clause,
    pg_get_function_identity_arguments(p.oid) AS identity_arguments
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN ('get_guest_by_slug', 'submit_rsvp', 'get_guest_by_token')
)
SELECT
  COALESCE(e.proname, c.exp_name) AS routine_name,
  e.func_oid,
  e.prokind,
  e.pronargs AS input_argument_count,
  e.arg_types AS input_argument_types,
  e.arg_names AS argument_names,
  e.return_type,
  e.result_clause AS reconstructed_result,
  e.full_arguments AS reconstructed_arguments,
  CASE
    -- 1. Canonical get_guest_by_slug Confirmed
    WHEN e.proname = 'get_guest_by_slug'
         AND c.exp_name IS NOT NULL
         AND e.prokind = 'f'
         AND e.pronargs = 1
         AND e.arg_types = 'text'
         AND e.arg_names = ARRAY['slug']
         AND e.arg_modes IS NULL
         AND e.all_arg_types IS NULL
         AND e.return_type = c.exp_result
         AND e.result_clause = c.exp_result
         AND NOT e.proretset
         AND e.pronargdefaults = 0
         AND NOT e.has_arg_defaults
      THEN 'CANONICAL RPC CONFIRMED IN CATALOG: get_guest_by_slug(slug text) -> json'

    -- 2. Canonical submit_rsvp Confirmed
    WHEN e.proname = 'submit_rsvp'
         AND c.exp_name IS NOT NULL
         AND e.prokind = 'f'
         AND e.pronargs = 3
         AND e.arg_types = 'text, text, text'
         AND e.arg_names = ARRAY['slug', 'status_input', 'message_input']
         AND e.arg_modes IS NULL
         AND e.all_arg_types IS NULL
         AND e.return_type = c.exp_result
         AND e.result_clause = c.exp_result
         AND NOT e.proretset
         AND e.pronargdefaults = 1
         AND e.has_arg_defaults
         AND e.full_arguments ~* '^slug\s+text,\s*status_input\s+text,\s*message_input\s+text\s+DEFAULT\s+NULL(::text)?$'
      THEN 'CANONICAL RPC CONFIRMED IN CATALOG: submit_rsvp(slug text, status_input text, message_input text DEFAULT NULL) -> json'

    -- 3. Canonical Signature Exists but Structural Properties are Invalid
    WHEN e.func_oid IS NOT NULL AND c.exp_name IS NOT NULL
      THEN 'CANONICAL SIGNATURE PRESENT BUT STRUCTURALLY INVALID — MANUAL REVIEW REQUIRED (fails kind, args, modes, defaults, or return)'

    -- 4. Missing Canonical Routines
    WHEN e.func_oid IS NULL AND c.exp_name IS NOT NULL
      THEN 'MISSING CANONICAL RPC — NOT YET CREATED IN CATALOG'

    -- 5. Legacy Overloads Still Present in Catalog (Slated for Step 1 removal)
    WHEN e.proname = 'get_guest_by_token' AND e.pronargs = 1 AND e.arg_types = 'text'
      THEN 'LEGACY OVERLOAD STILL PRESENT — MANUAL REVIEW REQUIRED (Targeted for drop in Step 1)'

    WHEN e.proname = 'get_guest_by_slug' AND e.pronargs = 2 AND e.arg_types = 'text, text'
      THEN 'LEGACY OVERLOAD STILL PRESENT — MANUAL REVIEW REQUIRED (Targeted for drop in Step 1)'

    WHEN e.proname = 'submit_rsvp' AND e.pronargs = 5 AND e.arg_types = 'text, text, text, text, text'
      THEN 'LEGACY OVERLOAD STILL PRESENT — MANUAL REVIEW REQUIRED (Targeted for drop in Step 1)'

    WHEN e.proname = 'submit_rsvp' AND e.pronargs = 4 AND e.arg_types = 'text, text, text, text'
      THEN 'LEGACY OVERLOAD STILL PRESENT — MANUAL REVIEW REQUIRED (Targeted for drop in Step 1)'

    ELSE 'UNEXPECTED OVERLOAD — MANUAL REVIEW REQUIRED'
  END AS catalog_verification_status
FROM existing_routines e
FULL OUTER JOIN canonical_expected c
  ON e.proname = c.exp_name
 AND e.pronargs = c.exp_nargs
 AND e.arg_types = c.exp_argtypes
ORDER BY routine_name ASC, e.pronargs ASC;


-- ------------------------------------------------------------------------------
-- 11.B2. Function Object Lock Diagnostics (Query B2)
-- ------------------------------------------------------------------------------
-- Inspects active object locks on public function OIDs in pg_proc.
-- NOTE: Absence of lock rows indicates NO active lock contention on the function;
-- it does NOT indicate routine absence (routine existence is audited via Query B1).
-- Includes prepared transaction lock ownership where present.
-- ------------------------------------------------------------------------------
WITH current_db AS (
  SELECT oid AS db_oid FROM pg_database WHERE datname = current_database()
),
target_functions AS (
  SELECT 
    p.oid AS func_oid,
    n.nspname || '.' || p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS identity_arguments,
    pg_get_function_result(p.oid) AS return_type
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN ('get_guest_by_slug', 'submit_rsvp', 'get_guest_by_token')
)
SELECT
  l.locktype,
  tf.function_name,
  tf.identity_arguments,
  tf.return_type,
  l.mode AS lock_mode,
  l.granted,
  l.pid,
  COALESCE(a.usename, px.owner, 'unknown') AS lock_owner,
  COALESCE(a.state, CASE WHEN px.gid IS NOT NULL THEN 'prepared transaction' ELSE 'idle' END) AS session_state,
  -- Distinct Wait vs Query Timing
  CASE 
    WHEN l.waitstart IS NOT NULL THEN (clock_timestamp() - l.waitstart)::text
    WHEN NOT l.granted THEN 'WAITING (waitstart timestamp not yet recorded)'
    ELSE 'LOCK GRANTED'
  END AS lock_wait_duration,
  CASE 
    WHEN a.query_start IS NOT NULL THEN (clock_timestamp() - a.query_start)::text 
    ELSE NULL 
  END AS query_runtime,
  COALESCE(a.query, 'PREPARED TX: ' || px.gid) AS active_query,
  px.gid AS prepared_tx_gid,
  CASE WHEN l.pid IS NOT NULL THEN pg_blocking_pids(l.pid) ELSE NULL END AS direct_blocking_pids
FROM target_functions tf
JOIN pg_locks l
  ON l.classid = 'pg_proc'::regclass::oid
 AND l.objid = tf.func_oid
CROSS JOIN current_db cdb
LEFT JOIN pg_stat_activity a
  ON l.pid = a.pid
LEFT JOIN pg_prepared_xacts px
  ON l.virtualtransaction = ('-1/' || px.transaction::text)
WHERE l.database = cdb.db_oid
  AND l.locktype = 'object'
ORDER BY l.granted ASC, tf.function_name ASC;


-- ------------------------------------------------------------------------------
-- 11.C. Blocker and Transaction Diagnostics (Query C)
-- ------------------------------------------------------------------------------
-- Identifies lock wait chains using pg_blocking_pids() as primary authority.
-- Separates relation lock matching (Table 13.2 conflict matrix with database equality)
-- from transactionid locks (pg_locks.database IS NULL; held ExclusiveLock).
-- Resolves prepared transaction blockers (PID 0) and reports GID ambiguity if found.
-- Distinguishes lock wait duration (waitstart) from query runtime (query_start).
-- ------------------------------------------------------------------------------
WITH current_db AS (
  SELECT oid AS db_oid FROM pg_database WHERE datname = current_database()
),
waiting_locks AS (
  SELECT
    a.pid AS blocked_pid,
    a.usename AS blocked_user,
    a.state AS blocked_session_state,
    a.query AS blocked_query,
    a.query_start AS blocked_query_start,
    l.waitstart AS blocked_lock_waitstart,
    l.locktype,
    l.database AS lock_database,
    l.relation AS lock_relation,
    l.transactionid AS lock_xid,
    COALESCE(
      l.relation::regclass::text,
      'classid:' || l.classid::text || ' objid:' || l.objid::text,
      'xid:' || l.transactionid::text,
      l.locktype
    ) AS lock_target_description,
    l.mode AS requested_mode,
    pg_blocking_pids(a.pid) AS blocker_pids
  FROM pg_stat_activity a
  JOIN pg_locks l
    ON a.pid = l.pid
   AND NOT l.granted
  WHERE a.pid <> pg_backend_pid()
)
SELECT
  w.blocked_pid,
  w.blocked_user,
  -- Distinct Wait vs Query Timing
  CASE 
    WHEN w.blocked_lock_waitstart IS NOT NULL THEN (clock_timestamp() - w.blocked_lock_waitstart)::text
    ELSE 'WAITING (waitstart timestamp not yet recorded)'
  END AS lock_wait_duration,
  (clock_timestamp() - w.blocked_query_start)::text AS query_runtime,
  w.locktype AS waiting_locktype,
  w.lock_target_description,
  w.requested_mode,
  b.blocker_pid,
  CASE
    WHEN b.blocker_pid > 0 THEN 'ACTIVE BACKEND'
    WHEN b.blocker_pid = 0 THEN 'PREPARED TRANSACTION'
    WHEN b.blocker_pid IS NULL THEN 'NO IDENTIFIED BLOCKER'
    ELSE 'UNKNOWN'
  END AS blocker_type,
  -- Restrained Blocker Classification
  CASE
    WHEN b.blocker_pid > 0 THEN 'BLOCKER (pg_blocking_pids; subtype not independently verified)'
    WHEN b.blocker_pid = 0 THEN 'PREPARED TRANSACTION BLOCKER'
    WHEN b.blocker_pid IS NULL THEN 'NO IDENTIFIED BLOCKER'
    ELSE 'UNKNOWN'
  END AS blocker_classification,
  -- Blocker Identity Resolution
  CASE
    WHEN b.blocker_pid > 0 THEN COALESCE(ba.usename, 'unknown backend')
    WHEN b.blocker_pid = 0 THEN (
      -- Conflict-aware prepared transaction resolution
      WITH matched_prepared AS (
        SELECT px.gid, px.transaction, pl.mode AS held_mode
        FROM pg_locks pl
        JOIN pg_prepared_xacts px
          ON pl.virtualtransaction = ('-1/' || px.transaction::text)
        WHERE pl.granted
          AND pl.locktype = w.locktype
          AND (
            -- Branch 1: Database-specific relation locks (strict database equality; Table 13.2 verified)
            (w.locktype = 'relation'
             AND pl.database = w.lock_database
             AND pl.relation = w.lock_relation
             AND (
               w.requested_mode = 'AccessExclusiveLock'
               OR (w.requested_mode = 'ExclusiveLock' AND pl.mode IN ('RowShareLock', 'RowExclusiveLock', 'ShareUpdateExclusiveLock', 'ShareLock', 'ShareRowExclusiveLock', 'ExclusiveLock', 'AccessExclusiveLock'))
               -- Table 13.2: ShareRowExclusiveLock is compatible with RowShareLock!
               OR (w.requested_mode = 'ShareRowExclusiveLock' AND pl.mode IN ('RowExclusiveLock', 'ShareUpdateExclusiveLock', 'ShareLock', 'ShareRowExclusiveLock', 'ExclusiveLock', 'AccessExclusiveLock'))
               OR (w.requested_mode = 'ShareLock' AND pl.mode IN ('RowExclusiveLock', 'ShareUpdateExclusiveLock', 'ShareRowExclusiveLock', 'ExclusiveLock', 'AccessExclusiveLock'))
               OR (w.requested_mode = 'ShareUpdateExclusiveLock' AND pl.mode IN ('ShareUpdateExclusiveLock', 'ShareLock', 'ShareRowExclusiveLock', 'ExclusiveLock', 'AccessExclusiveLock'))
               OR (w.requested_mode = 'RowExclusiveLock' AND pl.mode IN ('ShareLock', 'ShareRowExclusiveLock', 'ExclusiveLock', 'AccessExclusiveLock'))
               OR (w.requested_mode = 'RowShareLock' AND pl.mode IN ('ExclusiveLock', 'AccessExclusiveLock'))
               OR (w.requested_mode = 'AccessShareLock' AND pl.mode = 'AccessExclusiveLock')
             ))
            OR
            -- Branch 2: Transaction ID locks (pg_locks.database is NULL; held ExclusiveLock; requested ShareLock/ExclusiveLock)
            (w.locktype = 'transactionid'
             AND pl.transactionid = w.lock_xid
             AND pl.mode = 'ExclusiveLock'
             AND w.requested_mode IN ('ShareLock', 'ExclusiveLock'))
          )
      )
      SELECT
        CASE
          WHEN count(*) = 1 THEN max(gid) || ' (xid ' || min(transaction::text) || ')'
          WHEN count(*) > 1 THEN 'PREPARED TRANSACTION BLOCKER — AMBIGUOUS (multiple matching GIDs: ' || string_agg(gid, ', ') || ')'
          ELSE 'PREPARED TRANSACTION BLOCKER — GID UNRESOLVED (locktype: ' || w.locktype || ')'
        END
      FROM matched_prepared
    )
    WHEN b.blocker_pid IS NULL THEN 'no blocker identified'
    ELSE 'unresolved'
  END AS blocker_identity,
  CASE
    WHEN b.blocker_pid > 0 THEN ba.query
    WHEN b.blocker_pid = 0 THEN 'PREPARED TRANSACTION (session detached; inspect via pg_prepared_xacts)'
    ELSE NULL
  END AS blocker_query,
  w.blocked_query
FROM waiting_locks w
LEFT JOIN LATERAL unnest(w.blocker_pids) AS b(blocker_pid)
  ON TRUE
LEFT JOIN pg_stat_activity ba
  ON b.blocker_pid = ba.pid
ORDER BY w.blocked_lock_waitstart ASC NULLS LAST;
