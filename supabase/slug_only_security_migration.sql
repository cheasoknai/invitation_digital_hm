-- ==============================================================================
-- INVITATION DIGITAL H&M - HARDENED PRODUCTION SECURITY MIGRATION
-- Migration Name: Slug-Only Public Invitation & RSVP Architecture (Final Hardened Revision)
-- Supabase Project: khbmrpqojgzevajqjuxa
-- Target Table: public.guests
--
-- EXECUTION & IDEMPOTENCY MODEL:
-- - This migration is designed for a ONE-TIME TRANSACTIONAL EXECUTION against production.
-- - Idempotency / Re-execution: If re-executed after a previous successful run, Step 5
--   detects the canonical index and CHECK constraints already created by this script,
--   verifies exact semantic equivalence, validates any unvalidated constraints, and succeeds.
-- - Strict Fail-Closed Policy: If any object exists with the expected name but has an
--   uncertain, weaker, or non-matching definition, the transaction ABORTS with a clear
--   exception requiring manual DBA review. It never silently accepts or drops uncertain objects.
--
-- DESCRIPTION:
-- 1. Safely drops all confirmed legacy RPCs in strict dependency order:
--    - public.get_guest_by_token(text) dropped first (removes legacy wrapper).
--    - Overloaded public.get_guest_by_slug(text, text) and (text) dropped next.
--    - Overloaded public.submit_rsvp variants (5-arg, 4-arg, 3-arg) dropped.
-- 2. Creates canonical, secure public functions:
--    - public.get_guest_by_slug(slug text): Matches invitation_slug ONLY.
--    - public.submit_rsvp(slug text, status_input text, message_input text):
--      Uses explicit safe-column RETURNING into scalar variables.
--      Never loads, references, or returns invitation_token.
--      Strictly rejects NULL, empty, and invalid statuses.
--      Enforces 500-character message limit.
--    - Uses pg_catalog.btrim and fully schema-qualified PostgreSQL built-ins.
--    - Both functions declare SECURITY DEFINER with search_path = pg_catalog, pg_temp.
-- 3. Explicitly revokes EXECUTE from PUBLIC on canonical RPCs before granting
--    exclusively to frontend roles: anon and authenticated.
-- 4. Corrects table privileges:
--    - Revokes ALL direct table permissions on public.guests from anon and PUBLIC.
--    - Revokes TRUNCATE on public.guests from anon and authenticated.
--    - Preserves SELECT, INSERT, UPDATE, DELETE for authenticated admin CRUD.
--    - Leaves existing service_role table/schema privileges completely unmodified.
--    - Preserves existing Admin RLS policy untouched.
-- 5. Case-insensitive unique slug index on lower(invitation_slug) with catalog-verified definition.
-- 6. Safe validated CHECK constraints with strict semantic catalog verification:
--    - rsvp_status IS NOT NULL AND rsvp_status IN ('pending', 'accepted', 'declined')
--    - rsvp_message IS NULL OR length <= 500
--    - invitation_token IS NOT NULL AND length(btrim(invitation_token)) > 0
--    - invitation_slug IS NOT NULL, length <= 60, and matches '^[a-z0-9]+(-[a-z0-9]+)*$'
--
-- SAFE FORWARD-RECOVERY ARCHITECTURE:
-- - Rolling back to legacy token-based functions is strongly discouraged because it
--   re-exposes secret tokens to public enumeration and reintroduces PostgREST PGRST203
--   overload ambiguity.
-- - A forward-recovery approach is documented to address preflight or runtime discrepancies.
--
-- NON-DESTRUCTIVE:
-- - Does NOT drop tables, delete records, or modify existing tokens.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- STEP 1: DROP CONFIRMED LEGACY RPCs IN STRICT DEPENDENCY ORDER
-- ------------------------------------------------------------------------------
-- 1. Drop confirmed legacy token lookup wrapper first to prevent dependent object references
DROP FUNCTION IF EXISTS public.get_guest_by_token(text);

-- 2. Drop confirmed legacy overloaded public.get_guest_by_slug variants
DROP FUNCTION IF EXISTS public.get_guest_by_slug(text, text);
DROP FUNCTION IF EXISTS public.get_guest_by_slug(text);

-- 3. Drop confirmed legacy overloaded public.submit_rsvp variants (5-arg, 4-arg, 3-arg)
DROP FUNCTION IF EXISTS public.submit_rsvp(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.submit_rsvp(text, text, text, text);
DROP FUNCTION IF EXISTS public.submit_rsvp(text, text, text);

-- ------------------------------------------------------------------------------
-- STEP 2: CREATE CANONICAL PUBLIC LOOKUP FUNCTION
-- ------------------------------------------------------------------------------
-- public.get_guest_by_slug(slug text)
-- - SECURITY DEFINER with safe search_path = pg_catalog, pg_temp.
-- - Schema-qualifies public.guests and built-in functions.
-- - Matches lower(invitation_slug) ONLY.
-- - Never queries, matches, or returns invitation_token.
-- - Returns only safe public fields.

CREATE OR REPLACE FUNCTION public.get_guest_by_slug(slug text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  clean_slug text;
  result json;
BEGIN
  -- Strict input sanitization using pg_catalog.btrim and pg_catalog.lower
  clean_slug := pg_catalog.lower(pg_catalog.btrim(slug));
  
  IF clean_slug IS NULL OR clean_slug = '' THEN
    RETURN NULL;
  END IF;

  -- Match strictly against invitation_slug (case-insensitive)
  -- Never match against invitation_token
  -- Return only non-sensitive public fields; NEVER return invitation_token
  SELECT pg_catalog.json_build_object(
    'id', g.id,
    'guest_name', g.guest_name,
    'invitation_slug', g.invitation_slug,
    'rsvp_status', g.rsvp_status,
    'rsvp_message', g.rsvp_message,
    'responded_at', g.responded_at
  )
  INTO result
  FROM public.guests g
  WHERE pg_catalog.lower(g.invitation_slug) = clean_slug
  LIMIT 1;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_guest_by_slug(text) IS 
'Public guest lookup matching exclusively on invitation_slug. Never returns invitation_token.';

-- ------------------------------------------------------------------------------
-- STEP 3: CREATE CANONICAL PUBLIC RSVP FUNCTION
-- ------------------------------------------------------------------------------
-- public.submit_rsvp(slug text, status_input text, message_input text)
-- - SECURITY DEFINER with safe search_path = pg_catalog, pg_temp.
-- - Schema-qualifies public.guests and built-ins.
-- - Matches lower(invitation_slug) ONLY.
-- - Strictly rejects NULL, empty string, or invalid status (accepts only 'accepted' or 'declined').
-- - Enforces 500-character message limit.
-- - Uses explicit safe-column RETURNING into scalar variables.
-- - Never loads, references, or returns invitation_token.

CREATE OR REPLACE FUNCTION public.submit_rsvp(
  slug text,
  status_input text,
  message_input text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  clean_slug text;
  clean_status text;
  clean_message text;
  v_id uuid;
  v_guest_name text;
  v_invitation_slug text;
  v_rsvp_status text;
  v_rsvp_message text;
  v_responded_at timestamptz;
BEGIN
  -- 1. Validate slug
  clean_slug := pg_catalog.lower(pg_catalog.btrim(slug));
  IF clean_slug IS NULL OR clean_slug = '' THEN
    RAISE EXCEPTION 'A valid invitation slug is required' USING ERRCODE = '22023';
  END IF;

  -- 2. Validate status strictly: reject NULL, empty string, or non-matching values
  IF status_input IS NULL THEN
    RAISE EXCEPTION 'Invalid RSVP status. Must be accepted or declined' USING ERRCODE = '22023';
  END IF;

  clean_status := pg_catalog.lower(pg_catalog.btrim(status_input));
  IF clean_status IS NULL OR clean_status = '' OR clean_status NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'Invalid RSVP status. Must be accepted or declined' USING ERRCODE = '22023';
  END IF;

  -- 3. Enforce maximum message length of 500 characters
  IF message_input IS NOT NULL THEN
    clean_message := pg_catalog.btrim(message_input);
    IF pg_catalog.length(clean_message) > 500 THEN
      RAISE EXCEPTION 'RSVP message cannot exceed 500 characters' USING ERRCODE = '22023';
    END IF;
    IF clean_message = '' THEN
      clean_message := NULL;
    END IF;
  ELSE
    clean_message := NULL;
  END IF;

  -- 4. Update guest strictly matching lower(invitation_slug)
  -- Uses EXPLICIT safe-column RETURNING into scalar variables
  -- Never loads invitation_token into plpgsql memory
  UPDATE public.guests
  SET
    rsvp_status = clean_status,
    rsvp_message = clean_message,
    responded_at = pg_catalog.now(),
    updated_at = pg_catalog.now()
  WHERE pg_catalog.lower(invitation_slug) = clean_slug
  RETURNING
    id,
    guest_name,
    invitation_slug,
    rsvp_status,
    rsvp_message,
    responded_at
  INTO
    v_id,
    v_guest_name,
    v_invitation_slug,
    v_rsvp_status,
    v_rsvp_message,
    v_responded_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Guest invitation not found' USING ERRCODE = 'P0002';
  END IF;

  -- 5. Return safe public JSON; NEVER return invitation_token
  RETURN pg_catalog.json_build_object(
    'id', v_id,
    'guest_name', v_guest_name,
    'invitation_slug', v_invitation_slug,
    'rsvp_status', v_rsvp_status,
    'rsvp_message', v_rsvp_message,
    'responded_at', v_responded_at
  );
END;
$$;

COMMENT ON FUNCTION public.submit_rsvp(text, text, text) IS 
'Public RSVP submission matching exclusively on invitation_slug. Never matches or returns invitation_token.';

-- ------------------------------------------------------------------------------
-- STEP 4: PERMISSIONS & ROLE PRIVILEGES HARDENING
-- ------------------------------------------------------------------------------

-- Explicitly revoke EXECUTE from PUBLIC on both canonical RPCs
REVOKE ALL ON FUNCTION public.get_guest_by_slug(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_rsvp(text, text, text) FROM PUBLIC;

-- Grant EXECUTE exclusively to roles required by frontend architecture: anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_guest_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_rsvp(text, text, text) TO anon, authenticated;

-- Revoke ALL direct table permissions on public.guests from anon and PUBLIC
-- Public anonymous users must interact exclusively via canonical RPCs
REVOKE ALL ON TABLE public.guests FROM anon, PUBLIC;

-- Revoke TRUNCATE privilege from authenticated role (remediates critical excessive grant)
REVOKE REFERENCES, TRIGGER, TRUNCATE ON TABLE public.guests FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.guests TO authenticated;

-- (Existing service_role table/schema privileges are preserved without modification)

-- Verify RLS remains active
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- STEP 5: CASE-INSENSITIVE UNIQUE INDEX & HARDENED CONSTRAINTS
-- ------------------------------------------------------------------------------

-- LOCKING NOTICE FOR UNIQUE INDEX:
-- Standard CREATE UNIQUE INDEX acquires a SHARE lock on public.guests during build.
-- Concurrent reads (SELECT) are permitted, but concurrent writes (INSERT, UPDATE, DELETE)
-- are blocked until this transaction commits. Actual duration depends on database record count
-- and server load. Scheduling execution during an off-peak maintenance window reduces impact
-- on active guests, but does not eliminate write blocking.
-- The transactional migration approach is maintained here for atomic deployment.
-- If operational policy mandates zero-write-blocking, this statement must be extracted and executed
-- separately as CREATE UNIQUE INDEX CONCURRENTLY outside a transaction block.

DO $$
DECLARE
  v_indrelid oid;
  v_indnatts int2;
  v_indnkeyatts int2;
  v_indisunique boolean;
  v_indisvalid boolean;
  v_indisready boolean;
  v_amname text;
  v_index_expr text;
  v_indpred_expr text;
BEGIN
  -- Strict catalog-based verification of existing index
  SELECT 
    i.indrelid,
    i.indnatts,
    i.indnkeyatts,
    i.indisunique,
    i.indisvalid,
    i.indisready,
    am.amname,
    pg_catalog.pg_get_indexdef(i.indexrelid, 1, false),
    pg_catalog.pg_get_expr(i.indpred, i.indrelid)
  INTO 
    v_indrelid,
    v_indnatts,
    v_indnkeyatts,
    v_indisunique,
    v_indisvalid,
    v_indisready,
    v_amname,
    v_index_expr,
    v_indpred_expr
  FROM pg_catalog.pg_index i
  JOIN pg_catalog.pg_class c ON c.oid = i.indexrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_catalog.pg_am am ON am.oid = c.relam
  WHERE n.nspname = 'public'
    AND c.relname = 'guests_invitation_slug_lower_idx';

  IF v_indrelid IS NOT NULL THEN
    -- 1. Must belong strictly to public.guests
    IF v_indrelid <> 'public.guests'::regclass THEN
      RAISE EXCEPTION 'Index guests_invitation_slug_lower_idx exists on unexpected table % instead of public.guests',
        v_indrelid::regclass;
    END IF;

    -- 2. Must be B-tree access method
    IF v_amname IS NULL OR v_amname <> 'btree' THEN
      RAISE EXCEPTION 'Index guests_invitation_slug_lower_idx exists on public.guests with unexpected access method % (expected btree)',
        COALESCE(v_amname, '(null)');
    END IF;

    -- 3. Must have exactly 1 total attribute and exactly 1 key attribute
    IF v_indnatts <> 1 OR v_indnkeyatts <> 1 THEN
      RAISE EXCEPTION 'Index guests_invitation_slug_lower_idx exists on public.guests with unexpected attribute count (indnatts=%, indnkeyatts=%, expected 1/1)',
        v_indnatts, v_indnkeyatts;
    END IF;

    -- 4. Must be UNIQUE
    IF NOT v_indisunique THEN
      RAISE EXCEPTION 'Index guests_invitation_slug_lower_idx exists on public.guests but is NOT UNIQUE';
    END IF;

    -- 5. Must be valid and ready (not failed or corrupted)
    IF NOT v_indisvalid OR NOT v_indisready THEN
      RAISE EXCEPTION 'Index guests_invitation_slug_lower_idx exists on public.guests but is in an invalid state (indisvalid=%, indisready=%)',
        v_indisvalid, v_indisready;
    END IF;

    -- 6. Indexed expression must be lower(invitation_slug)
    IF v_index_expr IS NULL OR pg_catalog.regexp_replace(v_index_expr, '\s+', '', 'g') NOT IN ('lower(invitation_slug)', 'lower((invitation_slug))') THEN
      RAISE EXCEPTION 'Index guests_invitation_slug_lower_idx exists on public.guests with unexpected expression: %. Fail closed for manual review.',
        COALESCE(v_index_expr, '(null)');
    END IF;

    -- 7. Partial predicate must be invitation_slug IS NOT NULL
    IF v_indpred_expr IS NULL OR pg_catalog.regexp_replace(v_indpred_expr, '\s+', ' ', 'g') NOT IN ('(invitation_slug IS NOT NULL)', 'invitation_slug IS NOT NULL') THEN
      RAISE EXCEPTION 'Index guests_invitation_slug_lower_idx exists on public.guests with unexpected predicate: %. Fail closed for manual review.',
        COALESCE(v_indpred_expr, '(null)');
    END IF;
  ELSE
    CREATE UNIQUE INDEX guests_invitation_slug_lower_idx 
    ON public.guests (pg_catalog.lower(invitation_slug)) 
    WHERE invitation_slug IS NOT NULL;
  END IF;
END $$;

-- LOCKING NOTICE FOR CHECK CONSTRAINTS:
-- Adding a constraint with ADD CONSTRAINT ... NOT VALID acquires an ACCESS EXCLUSIVE lock
-- on public.guests, though only for a brief moment to update system catalogs (it does not scan the table).
-- The subsequent VALIDATE CONSTRAINT acquires a SHARE UPDATE EXCLUSIVE lock, which scans the table
-- without holding ACCESS EXCLUSIVE and permits normal concurrent reads and writes, subject to standard
-- PostgreSQL lock queue interactions (e.g. waiting for any prior long-running transactions to finish).

-- RE-EXECUTION & FAIL-CLOSED SEMANTIC VERIFICATION:
-- For each constraint:
-- 1. If it does not exist: add NOT VALID, then VALIDATE.
-- 2. If it already exists: extract the deparsed expression tree via pg_catalog.pg_get_expr(conbin, conrelid)
--    and verify that it strictly and semantically matches the complete intended expression.
--    If any unexpected or weaker expression is found (e.g. extra allowed statuses, missing IS NOT NULL,
--    permissive OR terms, incorrect length bounds, or non-matching regex), FAIL CLOSED immediately with
--    RAISE EXCEPTION. Never silently accept uncertain definitions or automatically drop constraints.
-- 3. If exact semantic equivalence is established and the constraint is NOT VALID, validate it.

-- ------------------------------------------------------------------------------
-- ELIMINATE DEFAULT HAZARD ON INVITATION TOKEN:
-- Drop baseline empty-string default (invitation_token DEFAULT ''::text) so that
-- omitted tokens cannot evaluate to empty strings, violate the upcoming CHECK
-- constraint, or cause duplicate empty-string collisions. Future inserts must
-- explicitly supply a valid token.
-- ------------------------------------------------------------------------------
ALTER TABLE public.guests
  ALTER COLUMN invitation_token DROP DEFAULT;

DO $$
DECLARE
  v_con_oid oid;
  v_conbin pg_node_tree;
  v_convalidated boolean;
  v_conkey int2[];
  v_expr text;
  v_attnum_status int2;
  v_attnum_message int2;
  v_attnum_token int2;
  v_attnum_slug int2;
BEGIN
  -- Retrieve exact column attribute numbers for public.guests
  SELECT attnum INTO v_attnum_status FROM pg_catalog.pg_attribute WHERE attrelid = 'public.guests'::regclass AND attname = 'rsvp_status';
  SELECT attnum INTO v_attnum_message FROM pg_catalog.pg_attribute WHERE attrelid = 'public.guests'::regclass AND attname = 'rsvp_message';
  SELECT attnum INTO v_attnum_token FROM pg_catalog.pg_attribute WHERE attrelid = 'public.guests'::regclass AND attname = 'invitation_token';
  SELECT attnum INTO v_attnum_slug FROM pg_catalog.pg_attribute WHERE attrelid = 'public.guests'::regclass AND attname = 'invitation_slug';

  IF v_attnum_status IS NULL OR v_attnum_message IS NULL OR v_attnum_token IS NULL OR v_attnum_slug IS NULL THEN
    RAISE EXCEPTION 'Required columns missing on public.guests (status=%, message=%, token=%, slug=%)',
      v_attnum_status, v_attnum_message, v_attnum_token, v_attnum_slug;
  END IF;

  -- ----------------------------------------------------------------------------
  -- 1. RSVP status constraint:
  -- Must be semantically equivalent to:
  --   rsvp_status IS NOT NULL AND rsvp_status IN ('pending', 'accepted', 'declined')
  -- Must reject NULL and reject every additional status value.
  -- ----------------------------------------------------------------------------
  SELECT oid, conbin, convalidated, conkey
  INTO v_con_oid, v_conbin, v_convalidated, v_conkey
  FROM pg_catalog.pg_constraint 
  WHERE conname = 'guests_rsvp_status_check' AND conrelid = 'public.guests'::regclass AND contype = 'c';

  IF v_con_oid IS NOT NULL THEN
    v_expr := pg_catalog.btrim(pg_catalog.regexp_replace(pg_catalog.pg_get_expr(v_conbin, 'public.guests'::regclass), '\s+', ' ', 'g'));
    
    -- Verify exact column dependency and complete canonical expression (no extra statuses permitted)
    IF v_conkey <> ARRAY[v_attnum_status]
       OR v_expr NOT IN (
         '((rsvp_status IS NOT NULL) AND (rsvp_status = ANY (ARRAY[''pending''::text, ''accepted''::text, ''declined''::text])))',
         '((rsvp_status = ANY (ARRAY[''pending''::text, ''accepted''::text, ''declined''::text])) AND (rsvp_status IS NOT NULL))'
       ) THEN
      RAISE EXCEPTION 'Constraint guests_rsvp_status_check exists on public.guests with unexpected definition (%). Expected exactly: rsvp_status IS NOT NULL AND rsvp_status IN (''pending'', ''accepted'', ''declined''). Fail closed for manual review.',
        v_expr;
    END IF;
    IF NOT v_convalidated THEN
      ALTER TABLE public.guests VALIDATE CONSTRAINT guests_rsvp_status_check;
    END IF;
  ELSE
    ALTER TABLE public.guests
      ADD CONSTRAINT guests_rsvp_status_check
      CHECK (rsvp_status IS NOT NULL AND rsvp_status IN ('pending', 'accepted', 'declined'))
      NOT VALID;
    ALTER TABLE public.guests VALIDATE CONSTRAINT guests_rsvp_status_check;
  END IF;

  -- ----------------------------------------------------------------------------
  -- 2. RSVP message length constraint:
  -- Must be semantically equivalent to:
  --   rsvp_message IS NULL OR length(rsvp_message) <= 500
  -- Must verify the complete logical expression (rejects OR true, AND, or altered thresholds).
  -- ----------------------------------------------------------------------------
  SELECT oid, conbin, convalidated, conkey
  INTO v_con_oid, v_conbin, v_convalidated, v_conkey
  FROM pg_catalog.pg_constraint 
  WHERE conname = 'guests_rsvp_message_len_check' AND conrelid = 'public.guests'::regclass AND contype = 'c';

  IF v_con_oid IS NOT NULL THEN
    v_expr := pg_catalog.btrim(pg_catalog.regexp_replace(pg_catalog.pg_get_expr(v_conbin, 'public.guests'::regclass), '\s+', ' ', 'g'));
    
    -- Verify exact column dependency and complete canonical expression
    IF v_conkey <> ARRAY[v_attnum_message]
       OR v_expr NOT IN (
         '((rsvp_message IS NULL) OR (length(rsvp_message) <= 500))',
         '(((length(rsvp_message) <= 500)) OR (rsvp_message IS NULL))',
         '((rsvp_message IS NULL) OR (char_length(rsvp_message) <= 500))',
         '(((char_length(rsvp_message) <= 500)) OR (rsvp_message IS NULL))'
       ) THEN
      RAISE EXCEPTION 'Constraint guests_rsvp_message_len_check exists on public.guests with unexpected definition (%). Expected exactly: rsvp_message IS NULL OR length(rsvp_message) <= 500. Fail closed for manual review.',
        v_expr;
    END IF;
    IF NOT v_convalidated THEN
      ALTER TABLE public.guests VALIDATE CONSTRAINT guests_rsvp_message_len_check;
    END IF;
  ELSE
    ALTER TABLE public.guests
      ADD CONSTRAINT guests_rsvp_message_len_check
      CHECK (rsvp_message IS NULL OR pg_catalog.length(rsvp_message) <= 500)
      NOT VALID;
    ALTER TABLE public.guests VALIDATE CONSTRAINT guests_rsvp_message_len_check;
  END IF;

  -- ----------------------------------------------------------------------------
  -- 3. Invitation token non-empty constraint:
  -- Must be semantically equivalent to:
  --   invitation_token IS NOT NULL AND length(btrim(invitation_token)) > 0
  -- Rejects NULL, whitespace-only strings, OR conditions, or missing btrim.
  -- ----------------------------------------------------------------------------
  SELECT oid, conbin, convalidated, conkey
  INTO v_con_oid, v_conbin, v_convalidated, v_conkey
  FROM pg_catalog.pg_constraint 
  WHERE conname = 'guests_invitation_token_not_empty_check' AND conrelid = 'public.guests'::regclass AND contype = 'c';

  IF v_con_oid IS NOT NULL THEN
    v_expr := pg_catalog.btrim(pg_catalog.regexp_replace(pg_catalog.pg_get_expr(v_conbin, 'public.guests'::regclass), '\s+', ' ', 'g'));
    
    -- Verify exact column dependency and complete canonical expression
    IF v_conkey <> ARRAY[v_attnum_token]
       OR v_expr NOT IN (
         '((invitation_token IS NOT NULL) AND (length(btrim(invitation_token)) > 0))',
         '(((length(btrim(invitation_token)) > 0)) AND (invitation_token IS NOT NULL))',
         '((invitation_token IS NOT NULL) AND (char_length(btrim(invitation_token)) > 0))',
         '(((char_length(btrim(invitation_token)) > 0)) AND (invitation_token IS NOT NULL))'
       ) THEN
      RAISE EXCEPTION 'Constraint guests_invitation_token_not_empty_check exists on public.guests with unexpected definition (%). Expected exactly: invitation_token IS NOT NULL AND length(btrim(invitation_token)) > 0. Fail closed for manual review.',
        v_expr;
    END IF;
    IF NOT v_convalidated THEN
      ALTER TABLE public.guests VALIDATE CONSTRAINT guests_invitation_token_not_empty_check;
    END IF;
  ELSE
    ALTER TABLE public.guests
      ADD CONSTRAINT guests_invitation_token_not_empty_check
      CHECK (invitation_token IS NOT NULL AND pg_catalog.length(pg_catalog.btrim(invitation_token)) > 0)
      NOT VALID;
    ALTER TABLE public.guests VALIDATE CONSTRAINT guests_invitation_token_not_empty_check;
  END IF;

  -- ----------------------------------------------------------------------------
  -- 4. Invitation slug format constraint:
  -- Must be semantically equivalent to:
  --   invitation_slug IS NOT NULL
  --   AND length(invitation_slug) <= 60
  --   AND invitation_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  -- Rejects NULL, strings > 60 chars, consecutive hyphens (-+), leading/trailing
  -- hyphens, uppercase, and non-ASCII characters.
  -- ----------------------------------------------------------------------------
  SELECT oid, conbin, convalidated, conkey
  INTO v_con_oid, v_conbin, v_convalidated, v_conkey
  FROM pg_catalog.pg_constraint 
  WHERE conname = 'guests_invitation_slug_format_check' AND conrelid = 'public.guests'::regclass AND contype = 'c';

  IF v_con_oid IS NOT NULL THEN
    v_expr := pg_catalog.btrim(pg_catalog.regexp_replace(pg_catalog.pg_get_expr(v_conbin, 'public.guests'::regclass), '\s+', ' ', 'g'));
    
    -- Verify exact column dependency and complete canonical expression
    IF v_conkey <> ARRAY[v_attnum_slug]
       OR v_expr NOT IN (
         '(((invitation_slug IS NOT NULL) AND (length(invitation_slug) <= 60)) AND (invitation_slug ~ ''^[a-z0-9]+(-[a-z0-9]+)*$''::text))',
         '(((invitation_slug IS NOT NULL) AND (char_length(invitation_slug) <= 60)) AND (invitation_slug ~ ''^[a-z0-9]+(-[a-z0-9]+)*$''::text))',
         '(((length(invitation_slug) <= 60) AND (invitation_slug IS NOT NULL)) AND (invitation_slug ~ ''^[a-z0-9]+(-[a-z0-9]+)*$''::text))',
         '(((char_length(invitation_slug) <= 60) AND (invitation_slug IS NOT NULL)) AND (invitation_slug ~ ''^[a-z0-9]+(-[a-z0-9]+)*$''::text))',
         '((invitation_slug IS NOT NULL) AND (length(invitation_slug) <= 60) AND (invitation_slug ~ ''^[a-z0-9]+(-[a-z0-9]+)*$''::text))',
         '((invitation_slug IS NOT NULL) AND (char_length(invitation_slug) <= 60) AND (invitation_slug ~ ''^[a-z0-9]+(-[a-z0-9]+)*$''::text))',
         '(((invitation_slug IS NOT NULL) AND (length(invitation_slug) <= 60)) AND (invitation_slug ~ ''^[a-z0-9]+(-[a-z0-9]+)*$''))',
         '(((invitation_slug IS NOT NULL) AND (char_length(invitation_slug) <= 60)) AND (invitation_slug ~ ''^[a-z0-9]+(-[a-z0-9]+)*$''))',
         '(((length(invitation_slug) <= 60) AND (invitation_slug IS NOT NULL)) AND (invitation_slug ~ ''^[a-z0-9]+(-[a-z0-9]+)*$''))',
         '(((char_length(invitation_slug) <= 60) AND (invitation_slug IS NOT NULL)) AND (invitation_slug ~ ''^[a-z0-9]+(-[a-z0-9]+)*$''))',
         '((invitation_slug IS NOT NULL) AND (length(invitation_slug) <= 60) AND (invitation_slug ~ ''^[a-z0-9]+(-[a-z0-9]+)*$''))',
         '((invitation_slug IS NOT NULL) AND (char_length(invitation_slug) <= 60) AND (invitation_slug ~ ''^[a-z0-9]+(-[a-z0-9]+)*$''))'
       ) THEN
      RAISE EXCEPTION 'Constraint guests_invitation_slug_format_check exists on public.guests with unexpected definition (%). Expected exact condition: invitation_slug IS NOT NULL AND length(invitation_slug) <= 60 AND invitation_slug ~ ''^[a-z0-9]+(-[a-z0-9]+)*$''. Fail closed for manual review.',
        v_expr;
    END IF;
    IF NOT v_convalidated THEN
      ALTER TABLE public.guests VALIDATE CONSTRAINT guests_invitation_slug_format_check;
    END IF;
  ELSE
    ALTER TABLE public.guests
      ADD CONSTRAINT guests_invitation_slug_format_check
      CHECK (
        invitation_slug IS NOT NULL 
        AND pg_catalog.length(invitation_slug) <= 60 
        AND invitation_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      )
      NOT VALID;
    ALTER TABLE public.guests VALIDATE CONSTRAINT guests_invitation_slug_format_check;
  END IF;
END $$;

-- Notify PostgREST to reload its schema cache after this transaction commits.
NOTIFY pgrst, 'reload schema';

COMMIT;
