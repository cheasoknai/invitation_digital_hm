-- =========================================================
-- INVITATION DIGITAL H&M - GUEST MANAGEMENT
-- Safe migration: Guest Name Slugs & RSVP support
-- =========================================================

-- 1. Ensure the existing table has RLS enabled
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- 2. Ensure invitation_token exists and has unique constraint (backwards compatibility)
DO $$
DECLARE
  v_col_attnum int2;
  v_existing_contype "char";
  v_existing_conkey int2[];
BEGIN
  SELECT attnum INTO v_col_attnum
  FROM pg_catalog.pg_attribute
  WHERE attrelid = 'public.guests'::regclass
    AND attname = 'invitation_token';

  IF v_col_attnum IS NULL THEN
    RAISE EXCEPTION 'Column invitation_token does not exist on public.guests';
  END IF;

  SELECT contype, conkey INTO v_existing_contype, v_existing_conkey
  FROM pg_catalog.pg_constraint
  WHERE conrelid = 'public.guests'::regclass
    AND conname = 'guests_invitation_token_unique';

  IF FOUND THEN
    IF v_existing_contype <> 'u' OR v_existing_conkey <> ARRAY[v_col_attnum] THEN
      RAISE EXCEPTION 'Constraint % exists on public.guests with unexpected definition (contype=%, conkey=%)',
        'guests_invitation_token_unique', v_existing_contype, v_existing_conkey;
    END IF;
  ELSE
    ALTER TABLE public.guests
    ADD CONSTRAINT guests_invitation_token_unique
    UNIQUE (invitation_token);
  END IF;
END $$;

-- 3. Add invitation_slug column for readable guest-name URLs
ALTER TABLE public.guests
ADD COLUMN IF NOT EXISTS invitation_slug TEXT;

-- 4. Safe migration for existing records:
-- Automatically populate invitation_slug for existing rows if NULL or empty.
-- Generates clean lowercase alphanumeric slugs and resolves duplicates with -2, -3.
-- Enforces 60-character maximum length, dynamically reserving length for disambiguation suffixes.
-- DOES NOT delete or modify any existing guest data or RSVP responses.
DO $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  candidate_slug TEXT;
  suffix TEXT;
  counter INT;
BEGIN
  FOR rec IN
    SELECT id, guest_name, invitation_token
    FROM public.guests
    WHERE invitation_slug IS NULL OR pg_catalog.btrim(invitation_slug) = ''
    ORDER BY created_at ASC
  LOOP
    -- Extract lowercase latin alphanumeric characters
    base_slug := pg_catalog.regexp_replace(pg_catalog.lower(rec.guest_name), '[^a-z0-9]', '', 'g');

    -- Fallback to token if name has no latin characters
    IF base_slug IS NULL OR base_slug = '' THEN
      base_slug := pg_catalog.regexp_replace(pg_catalog.lower(rec.invitation_token), '[^a-z0-9-]', '', 'g');
    END IF;

    -- Fallback to guest ID if token is also empty
    IF base_slug IS NULL OR base_slug = '' THEN
      base_slug := 'guest-' || pg_catalog.substr(rec.id::text, 1, 8);
    END IF;

    -- Enforce 60 character maximum length for base slug
    base_slug := pg_catalog.substr(base_slug, 1, 60);

    candidate_slug := base_slug;
    counter := 2;

    -- Ensure uniqueness among all guests
    WHILE EXISTS (
      SELECT 1 FROM public.guests
      WHERE invitation_slug = candidate_slug AND id <> rec.id
    ) LOOP
      suffix := '-' || counter::text;
      -- Dynamically reserve length for disambiguation suffix so candidate never exceeds 60 characters
      candidate_slug := pg_catalog.rtrim(pg_catalog.substr(base_slug, 1, 60 - pg_catalog.length(suffix)), '-') || suffix;
      counter := counter + 1;
    END LOOP;

    UPDATE public.guests
    SET invitation_slug = candidate_slug
    WHERE id = rec.id;
  END LOOP;
END $$;

-- 5. Ensure invitation_slug has unique constraint
DO $$
DECLARE
  v_col_attnum int2;
  v_existing_contype "char";
  v_existing_conkey int2[];
BEGIN
  SELECT attnum INTO v_col_attnum
  FROM pg_catalog.pg_attribute
  WHERE attrelid = 'public.guests'::regclass
    AND attname = 'invitation_slug';

  IF v_col_attnum IS NULL THEN
    RAISE EXCEPTION 'Column invitation_slug does not exist on public.guests';
  END IF;

  SELECT contype, conkey INTO v_existing_contype, v_existing_conkey
  FROM pg_catalog.pg_constraint
  WHERE conrelid = 'public.guests'::regclass
    AND conname = 'guests_invitation_slug_unique';

  IF FOUND THEN
    IF v_existing_contype <> 'u' OR v_existing_conkey <> ARRAY[v_col_attnum] THEN
      RAISE EXCEPTION 'Constraint % exists on public.guests with unexpected definition (contype=%, conkey=%)',
        'guests_invitation_slug_unique', v_existing_contype, v_existing_conkey;
    END IF;
  ELSE
    ALTER TABLE public.guests
    ADD CONSTRAINT guests_invitation_slug_unique
    UNIQUE (invitation_slug);
  END IF;
END $$;

-- 6. Maintain admin access policy and table grants (STRICT AUTHENTICATED ONLY)
-- Explicitly revoke all direct privileges from anon and PUBLIC to ensure zero direct client access
REVOKE ALL ON TABLE public.guests FROM anon, PUBLIC;

GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON TABLE public.guests TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated admins can manage guests" ON public.guests;
DROP POLICY IF EXISTS "Allow authenticated admins full access" ON public.guests;
DROP POLICY IF EXISTS "Allow admin and dev access to guests" ON public.guests;

-- Hardened RLS Policy: verifies user is an authorized wedding admin by verified email or trusted app_metadata role
-- Prevents unauthorized users who register through open signups from reading/modifying guest data
-- CRITICAL SECURITY: user_metadata is omitted because it is client-writable
CREATE POLICY "Authenticated admins can manage guests"
ON public.guests
FOR ALL
TO authenticated
USING (
  (pg_catalog.lower(auth.jwt() ->> 'email') IN ('admin@invitation.com', 'admin@hmwedding.com'))
  OR ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
)
WITH CHECK (
  (pg_catalog.lower(auth.jwt() ->> 'email') IN ('admin@invitation.com', 'admin@hmwedding.com'))
  OR ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
);

-- 6b. Enable Supabase Realtime synchronization for public.guests
-- Adds guests table to supabase_realtime publication for instant cross-device updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'guests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;
  END IF;
END $$;

-- Set REPLICA IDENTITY FULL so UPDATE and DELETE events transmit all previous column values
ALTER TABLE public.guests REPLICA IDENTITY FULL;

-- 7. Public function: retrieve one guest by slug (or legacy token)
-- Safe SECURITY DEFINER function that exposes ONLY public invitation fields.
CREATE OR REPLACE FUNCTION public.get_guest_by_slug(
  slug TEXT DEFAULT NULL,
  identifier_input TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  clean_input TEXT;
  guest_row RECORD;
BEGIN
  clean_input := pg_catalog.lower(pg_catalog.btrim(COALESCE(slug, identifier_input)));

  IF clean_input IS NULL OR clean_input = '' THEN
    RETURN NULL;
  END IF;

  SELECT
    g.id,
    g.guest_name,
    g.invitation_slug,
    g.invitation_token,
    g.rsvp_status,
    g.rsvp_message,
    g.responded_at
  INTO guest_row
  FROM public.guests g
  WHERE pg_catalog.lower(g.invitation_slug) = clean_input
     OR pg_catalog.lower(g.invitation_token) = clean_input
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN pg_catalog.json_build_object(
    'id', guest_row.id,
    'guest_name', guest_row.guest_name,
    'invitation_slug', guest_row.invitation_slug,
    'invitation_token', guest_row.invitation_token,
    'rsvp_status', guest_row.rsvp_status,
    'rsvp_message', guest_row.rsvp_message,
    'responded_at', guest_row.responded_at
  );
END;
$$;

-- 8. Backwards compatibility: keep get_guest_by_token function pointing to get_guest_by_slug
CREATE OR REPLACE FUNCTION public.get_guest_by_token(
  token_input TEXT DEFAULT NULL,
  token TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  RETURN public.get_guest_by_slug(COALESCE(token_input, token));
END;
$$;

-- 9. Public function: submit guest RSVP by slug (or legacy token)
CREATE OR REPLACE FUNCTION public.submit_rsvp(
  slug TEXT DEFAULT NULL,
  token_input TEXT DEFAULT NULL,
  identifier_input TEXT DEFAULT NULL,
  status_input TEXT DEFAULT 'accepted',
  message_input TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  clean_id TEXT;
  updated_row RECORD;
BEGIN
  clean_id := pg_catalog.lower(pg_catalog.btrim(COALESCE(slug, identifier_input, token_input)));

  IF clean_id IS NULL OR clean_id = '' THEN
    RAISE EXCEPTION 'Invalid invitation identifier.';
  END IF;

  IF status_input NOT IN ('accepted', 'declined', 'pending') THEN
    RAISE EXCEPTION 'Invalid RSVP status.';
  END IF;

  IF message_input IS NOT NULL AND pg_catalog.length(message_input) > 500 THEN
    RAISE EXCEPTION 'RSVP message is too long.';
  END IF;

  UPDATE public.guests
  SET
    rsvp_status = status_input,
    rsvp_message = message_input,
    responded_at = pg_catalog.now(),
    updated_at = pg_catalog.now()
  WHERE pg_catalog.lower(invitation_slug) = clean_id
     OR pg_catalog.lower(invitation_token) = clean_id
  RETURNING
    id,
    guest_name,
    invitation_slug,
    invitation_token,
    rsvp_status,
    rsvp_message,
    responded_at
  INTO updated_row;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN pg_catalog.json_build_object(
    'id', updated_row.id,
    'guest_name', updated_row.guest_name,
    'invitation_slug', updated_row.invitation_slug,
    'invitation_token', updated_row.invitation_token,
    'rsvp_status', updated_row.rsvp_status,
    'rsvp_message', updated_row.rsvp_message,
    'responded_at', updated_row.responded_at
  );
END;
$$;

-- 10. Restrict and grant function execution permissions
REVOKE ALL ON FUNCTION public.get_guest_by_slug(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_guest_by_token(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_rsvp(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_guest_by_slug(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_guest_by_token(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_rsvp(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
