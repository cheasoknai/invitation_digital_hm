-- ==============================================================================
-- INVITATION DIGITAL H&M - PRODUCTION PREFLIGHT DIAGNOSTIC SCRIPT (CORRECTED)
-- Supabase Project: khbmrpqojgzevajqjuxa
-- Target Table: public.guests
-- Safety: 100% READ-ONLY (SELECT statements only, no schema changes, no token exposure)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- CHECK 1: Total Guest Count & Invalid RSVP Statuses
-- ------------------------------------------------------------------------------
-- Identifies records where rsvp_status is NULL or not in ('pending', 'accepted', 'declined').
-- Expected invalid count: 0
SELECT 
  count(*) AS total_guests_count,
  count(*) FILTER (
    WHERE rsvp_status IS NULL 
       OR rsvp_status NOT IN ('pending', 'accepted', 'declined')
  ) AS invalid_rsvp_status_count
FROM public.guests;

-- ------------------------------------------------------------------------------
-- CHECK 2: Oversized RSVP Messages (> 500 Characters)
-- ------------------------------------------------------------------------------
-- Identifies records where rsvp_message exceeds the 500-character ceiling.
-- Expected count: 0
SELECT 
  count(*) FILTER (
    WHERE rsvp_message IS NOT NULL 
      AND pg_catalog.length(rsvp_message) > 500
  ) AS oversized_rsvp_message_count
FROM public.guests;

-- ------------------------------------------------------------------------------
-- CHECK 3: Invalid Invitation Tokens (Tokens are NEVER selected or printed)
-- ------------------------------------------------------------------------------
-- Identifies records where invitation_token is NULL or blank/whitespace-only.
-- Strict aggregate count only; actual token values are never queried.
-- Expected count: 0
SELECT 
  count(*) FILTER (
    WHERE invitation_token IS NULL 
       OR pg_catalog.length(pg_catalog.btrim(invitation_token)) = 0
  ) AS invalid_invitation_token_count
FROM public.guests;

-- ------------------------------------------------------------------------------
-- CHECK 4: Invalid Invitation Slugs (Aggregates Only)
-- ------------------------------------------------------------------------------
-- Identifies records where invitation_slug is NULL, > 60 chars, or non-ASCII/malformed.
-- Fully covers NULL slugs in total_invalid_slug_count without exposing individual values.
-- Expected count: 0
SELECT
  count(*) FILTER (
    WHERE invitation_slug IS NULL
  ) AS null_slug_count,

  count(*) FILTER (
    WHERE invitation_slug IS NOT NULL
      AND pg_catalog.length(invitation_slug) > 60
  ) AS oversized_slug_count,

  count(*) FILTER (
    WHERE invitation_slug IS NOT NULL
      AND invitation_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ) AS malformed_slug_count,

  count(*) FILTER (
    WHERE invitation_slug IS NULL
       OR (
         invitation_slug IS NOT NULL
         AND (
           pg_catalog.length(invitation_slug) > 60
           OR invitation_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
         )
       )
  ) AS total_invalid_slug_count
FROM public.guests;

-- ------------------------------------------------------------------------------
-- CHECK 5: Case-Insensitive Duplicate Slugs
-- ------------------------------------------------------------------------------
-- Identifies collision groups where lower(invitation_slug) is shared by > 1 guest.
-- Expected duplicate group count: 0
SELECT 
  count(*) AS duplicate_slug_groups_count
FROM (
  SELECT pg_catalog.lower(invitation_slug) AS clean_slug
  FROM public.guests
  WHERE invitation_slug IS NOT NULL
  GROUP BY pg_catalog.lower(invitation_slug)
  HAVING count(*) > 1
) sub;

-- ------------------------------------------------------------------------------
-- CHECK 6: Existing Index Inspection on public.guests
-- ------------------------------------------------------------------------------
-- Inspects existing indexes, access methods, uniqueness, and case sensitivity.
SELECT 
  c.relname AS index_name,
  am.amname AS access_method,
  i.indisunique AS is_unique,
  i.indisvalid AS is_valid,
  i.indisready AS is_ready,
  i.indnatts AS total_attributes,
  i.indnkeyatts AS key_attributes,
  pg_catalog.pg_get_indexdef(i.indexrelid) AS full_index_definition,
  CASE 
    WHEN pg_catalog.pg_get_indexdef(i.indexrelid) ~* 'lower\(' THEN 'Case-Insensitive (lower())'
    ELSE 'Case-Sensitive (Raw Column)'
  END AS case_sensitivity
FROM pg_catalog.pg_index i
JOIN pg_catalog.pg_class c ON c.oid = i.indexrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_am am ON am.oid = c.relam
WHERE n.nspname = 'public'
  AND i.indrelid = 'public.guests'::regclass
ORDER BY c.relname;

-- ------------------------------------------------------------------------------
-- CHECK 7: Existing CHECK Constraints on public.guests
-- ------------------------------------------------------------------------------
-- Inspects existing check constraints, deparsed expressions, and validation state.
SELECT 
  con.conname AS constraint_name,
  con.convalidated AS is_validated,
  pg_catalog.pg_get_constraintdef(con.oid) AS constraint_definition,
  pg_catalog.pg_get_expr(con.conbin, con.conrelid) AS deparsed_expression
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_namespace n ON n.oid = con.connamespace
WHERE n.nspname = 'public'
  AND con.conrelid = 'public.guests'::regclass
  AND con.contype = 'c'
ORDER BY con.conname;

-- ------------------------------------------------------------------------------
-- CHECK 8: Existing Active Policies on public.guests
-- ------------------------------------------------------------------------------
-- Inspects existing RLS policies using the correct policyname column from pg_policies.
SELECT
  policyname AS policy_name,
  permissive,
  roles,
  cmd AS command,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename = 'guests';
