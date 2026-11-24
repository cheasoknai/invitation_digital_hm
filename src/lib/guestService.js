import { supabase } from "./supabase.js";

/**
 * Normalize an invitation slug according to requirements:
 * 1. Convert to lowercase.
 * 2. Remove all spaces.
 * 3. Allow only letters, numbers, and hyphens ([a-z0-9-]).
 *
 * Example: "Nai Updated" -> "naiupdated", "Nai-Updated" -> "nai-updated"
 *
 * @param {string} rawSlug - Raw slug input
 * @returns {string} Normalized clean slug
 */
export function normalizeSlug(rawSlug) {
  if (!rawSlug || typeof rawSlug !== "string") return "";
  return rawSlug
    .toLowerCase()
    .replace(/\s+/g, "") // Remove spaces
    .replace(/[^a-z0-9-]/g, "") // Allow only letters, numbers, and hyphens
    .replace(/-+/g, "-") // Collapse multiple consecutive hyphens
    .substring(0, 60); // Maximum 60 characters for URL safety
}

/**
 * Validate that an invitation slug is unique:
 * 1. Checks in-memory loaded guests list first.
 * 2. Checks Supabase PostgreSQL public.guests table directly.
 *
 * @param {string} slug - The slug candidate to check
 * @param {string|null} [currentGuestId=null] - Exclude current guest when editing
 * @param {Array<object>} [existingGuests=[]] - Current list of loaded guests
 * @returns {Promise<{ isUnique: boolean, error: string|null }>}
 */
export async function checkSlugIsUnique(slug, currentGuestId = null, existingGuests = []) {
  const cleanSlug = normalizeSlug(slug);
  if (!cleanSlug) {
    return { isUnique: false, error: "Slug cannot be empty." };
  }

  // 1. Instant frontend validation against existing loaded guests
  if (Array.isArray(existingGuests)) {
    const duplicate = existingGuests.find((g) => {
      if (!g) return false;
      if (currentGuestId && g.id === currentGuestId) return false;
      const gSlug = normalizeSlug(g.invitation_slug || "");
      const gToken = normalizeSlug(g.invitation_token || "");
      return gSlug === cleanSlug || gToken === cleanSlug;
    });

    if (duplicate) {
      return {
        isUnique: false,
        error: `The slug "${cleanSlug}" is already in use by guest "${duplicate.guest_name}". Please choose a different slug.`,
      };
    }
  }

  // 2. Database validation against public.guests table
  try {
    let query = supabase
      .from("guests")
      .select("id, guest_name, invitation_slug, invitation_token")
      .or(`invitation_slug.eq.${cleanSlug},invitation_token.eq.${cleanSlug}`);

    if (currentGuestId) {
      query = query.neq("id", currentGuestId);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      const match = data[0];
      return {
        isUnique: false,
        error: `The slug "${cleanSlug}" is already in use by guest "${match.guest_name || "another guest"}". Please choose a different slug.`,
      };
    }
  } catch (err) {
    console.warn("Supabase slug uniqueness check exception:", err);
  }

  return { isUnique: true, error: null };
}

/**
 * Generate an unpredictable, URL-safe 16-character alphanumeric invitation token.
 * Example: '7k2m9x4p1w8q5z3v'
 */
export function generateInvitationToken() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => chars[b % chars.length]).join("");
  }
  return (
    Math.random().toString(36).substring(2, 10) +
    Math.random().toString(36).substring(2, 10)
  );
}

/**
 * Generate a readable URL slug automatically from guest name:
 * 1. Convert name to lowercase
 * 2. Remove spaces and special characters (e.g. "Chea Soknai" -> "cheasoknai")
 * 3. Handle duplicate names safely by appending -2, -3, etc.
 *
 * @param {string} name - Guest name
 * @param {Array<object|string>} [existingList=[]] - Existing guests or slug strings to check for uniqueness
 * @param {string} [currentGuestId=null] - Optional current guest ID if editing (allows retaining own slug)
 * @returns {string} Unique URL-safe slug
 */
export function generateGuestSlug(name, existingList = [], currentGuestId = null) {
  if (!name || typeof name !== "string") {
    return "guest-" + Date.now().toString(36);
  }

  const rawLower = name.toLowerCase().trim();

  // Strip spaces, punctuation, and non-alphanumeric characters: e.g. "Chea Soknai" -> "cheasoknai"
  const latinCleaned = rawLower.replace(/[^a-z0-9]/g, "");

  let baseSlug = "guest";
  if (latinCleaned.length > 0) {
    baseSlug = latinCleaned;
  } else {
    // Non-latin fallback (e.g. pure Khmer): strip spaces and punctuation
    const unicodeCleaned = rawLower.replace(/[\s\p{P}\p{S}]+/gu, "");
    if (unicodeCleaned.length > 0) {
      baseSlug = unicodeCleaned;
    }
  }

  // Collect existing slugs
  const existingSlugs = new Set();
  if (Array.isArray(existingList)) {
    for (const item of existingList) {
      if (!item) continue;
      // Skip self if editing
      if (currentGuestId && item.id === currentGuestId) continue;

      const slugVal = typeof item === "string" ? item : item.invitation_slug;
      if (slugVal) {
        existingSlugs.add(String(slugVal).toLowerCase().trim());
      }
    }
  }

  // If baseSlug is not yet taken, use it
  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  // Handle collision: append -2, -3, -4, etc.
  let counter = 2;
  while (existingSlugs.has(`${baseSlug}-${counter}`)) {
    counter++;
  }
  return `${baseSlug}-${counter}`;
}

/**
 * Safely migrate a list of guests to ensure every record has an invitation_slug.
 * Preserves all existing tokens, IDs, and properties.
 *
 * @param {Array<object>} guests
 * @returns {Array<object>} Migrated guest list
 */
export function migrateGuestsList(guests) {
  if (!Array.isArray(guests)) return [];

  const existingSlugs = new Set();
  for (const g of guests) {
    if (g?.invitation_slug) {
      existingSlugs.add(String(g.invitation_slug).toLowerCase().trim());
    }
  }

  return guests.map((g) => {
    if (!g) return g;
    if (
      g.invitation_slug &&
      typeof g.invitation_slug === "string" &&
      g.invitation_slug.trim()
    ) {
      return g;
    }

    const slug = generateGuestSlug(
      g.guest_name || g.invitation_token || "guest",
      Array.from(existingSlugs)
    );
    existingSlugs.add(slug);
    return {
      ...g,
      invitation_slug: slug,
    };
  });
}

/**
 * Fetch guest details by their unique invitation slug (or legacy token).
 * Prioritizes:
 * 1. Secure RPC function get_guest_by_slug (SECURITY DEFINER, public role accessible)
 * 2. Legacy RPC function get_guest_by_token
 * 3. Direct query for authenticated Admin sessions only (avoids public 401s for visitors)
 * 4. Local storage fallback for local dev / offline testing
 *
 * @param {string} identifier - Guest slug (e.g. 'dara') or legacy token
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function fetchGuestBySlug(identifier) {
  if (!identifier) {
    return { data: null, error: new Error("Identifier is required") };
  }

  const cleanIdentifier = String(identifier).trim();
  const lowerIdentifier = cleanIdentifier.toLowerCase();

  // 1. Primary: Call secure RPC function get_guest_by_slug (SECURITY DEFINER)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_guest_by_slug",
      { slug: lowerIdentifier }
    );

    if (!rpcError && rpcData) {
      return { data: rpcData, error: null };
    }

    // If param mismatch (e.g. function expects identifier_input), retry with identifier_input
    if (rpcError && rpcError.code === "PGRST202") {
      const { data: retryData, error: retryError } = await supabase.rpc(
        "get_guest_by_slug",
        { identifier_input: lowerIdentifier }
      );
      if (!retryError && retryData) {
        return { data: retryData, error: null };
      }
    }
  } catch (err) {
    console.warn("RPC get_guest_by_slug exception:", err);
  }

  // 2. Legacy RPC fallback: get_guest_by_token
  try {
    const { data: tokenData, error: tokenError } = await supabase.rpc(
      "get_guest_by_token",
      { token_input: cleanIdentifier }
    );

    if (!tokenError && tokenData) {
      return { data: tokenData, error: null };
    }
  } catch (err) {
    console.warn("RPC get_guest_by_token exception:", err);
  }

  // 3. Fallback for authenticated Admin sessions only (prevents 401 console errors for public visitors)
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.access_token) {
      const { data, error } = await supabase
        .from("guests")
        .select("id, guest_name, invitation_slug, invitation_token, rsvp_status, rsvp_message, responded_at")
        .or(`invitation_slug.eq.${lowerIdentifier},invitation_token.eq.${cleanIdentifier}`)
        .maybeSingle();

      if (!error && data) {
        return { data, error: null };
      }
    }
  } catch {
    // ignore
  }

  // 4. Local storage fallback for local dev / offline testing
  if (typeof window !== "undefined") {
    try {
      const localGuests = JSON.parse(
        localStorage.getItem("hm_local_guests") || "[]",
      );
      const found = localGuests.find(
        (g) =>
          (g.invitation_slug && g.invitation_slug.toLowerCase() === lowerIdentifier) ||
          (g.invitation_token && g.invitation_token.toLowerCase() === lowerIdentifier),
      );
      if (found) {
        return { data: found, error: null };
      }
    } catch {
      // ignore
    }
  }

  return { data: null, error: new Error("Guest invitation link not found.") };
}

// Backwards compatibility alias
export const fetchGuestByToken = fetchGuestBySlug;

/**
 * Insert a new guest into Supabase public.guests table.
 * Supports:
 * - guest_name (text, required)
 * - invitation_token (text, required, unique)
 * - invitation_slug (text, optional / auto-generated custom slug)
 * - rsvp_status (text, default 'pending')
 *
 * @param {object} params
 * @param {string} params.guestName - Name of the guest
 * @param {string} [params.token] - Unique invitation token (generated if not provided)
 * @param {string} [params.slug] - Custom invitation slug (e.g. 'naiupdated')
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function insertGuest({ guestName, token, slug }) {
  const trimmedName = String(guestName || "").trim();
  if (!trimmedName) {
    return { data: null, error: new Error("Guest name is required.") };
  }
  if (trimmedName.length > 150) {
    return { data: null, error: new Error("Guest name cannot exceed 150 characters.") };
  }

  const invitationToken = token || generateInvitationToken();
  const cleanSlug = slug ? normalizeSlug(slug) : null;

  const payload = {
    guest_name: trimmedName,
    invitation_token: invitationToken,
    rsvp_status: "pending",
  };

  if (cleanSlug) {
    payload.invitation_slug = cleanSlug;
  }

  try {
    const { data, error } = await supabase
      .from("guests")
      .insert([payload])
      .select()
      .single();

    if (error) {
      // If invitation_slug column doesn't exist in Supabase schema cache, gracefully retry without it
      if (error.code === "PGRST204" && payload.invitation_slug) {
        delete payload.invitation_slug;
        const retry = await supabase
          .from("guests")
          .insert([payload])
          .select()
          .single();
        return retry;
      }
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Submit or update an RSVP response for a specific guest slug or token.
 * Prioritizes:
 * 1. Secure RPC function (SECURITY DEFINER)
 * 2. Direct update strictly filtered by invitation_slug or invitation_token
 * 3. Local fallback for locally created guests
 *
 * @param {string} identifier - Guest slug or token
 * @param {'accepted'|'declined'|'pending'} status
 * @param {string} [message]
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function submitGuestRsvp(identifier, status, message = "") {
  if (!identifier) {
    return { data: null, error: new Error("Identifier is required") };
  }

  const validStatuses = ["accepted", "declined", "pending"];
  if (!validStatuses.includes(status)) {
    return { data: null, error: new Error("Invalid RSVP status.") };
  }

  const cleanIdentifier = String(identifier).trim().substring(0, 100);
  const cleanMessage = message ? String(message).trim().substring(0, 500) : null;

  // 1. Primary: Secure RPC function submit_rsvp (SECURITY DEFINER)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "submit_rsvp",
      {
        slug: cleanIdentifier,
        status_input: status,
        message_input: cleanMessage,
      }
    );

    if (!rpcError && rpcData) {
      return { data: rpcData, error: null };
    }

    // Try with identifier_input parameter name
    if (rpcError && rpcError.code === "PGRST202") {
      const retryId = await supabase.rpc("submit_rsvp", {
        identifier_input: cleanIdentifier,
        status_input: status,
        message_input: cleanMessage,
      });

      if (!retryId.error && retryId.data) {
        return { data: retryId.data, error: null };
      }

      // Try with legacy token_input parameter name
      const retryToken = await supabase.rpc("submit_rsvp", {
        token_input: cleanIdentifier,
        status_input: status,
        message_input: cleanMessage,
      });

      if (!retryToken.error && retryToken.data) {
        return { data: retryToken.data, error: null };
      }
    }
  } catch (err) {
    console.warn("RPC submit_rsvp exception:", err);
  }

  // 2. Direct update for authenticated sessions only
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.access_token) {
      const now = new Date().toISOString();
      let { data, error } = await supabase
        .from("guests")
        .update({
          rsvp_status: status,
          rsvp_message: message ? message.trim() : null,
          responded_at: now,
          updated_at: now,
        })
        .or(`invitation_slug.eq.${cleanIdentifier},invitation_token.eq.${cleanIdentifier}`)
        .select("id, guest_name, invitation_slug, invitation_token, rsvp_status, rsvp_message, responded_at")
        .maybeSingle();

      if (!error && data) {
        return { data, error: null };
      }
    }
  } catch {
    // Failed
  }

  // 3. Fallback for locally created guests
  if (typeof window !== "undefined") {
    try {
      const localGuests = JSON.parse(
        localStorage.getItem("hm_local_guests") || "[]",
      );
      const index = localGuests.findIndex(
        (g) =>
          g.invitation_slug === cleanIdentifier ||
          g.invitation_token === cleanIdentifier,
      );
      if (index !== -1) {
        const now = new Date().toISOString();
        const updated = {
          ...localGuests[index],
          rsvp_status: status,
          rsvp_message: message ? message.trim() : null,
          responded_at: now,
          updated_at: now,
        };
        localGuests[index] = updated;
        localStorage.setItem("hm_local_guests", JSON.stringify(localGuests));
        return { data: updated, error: null };
      }
    } catch {
      // ignore
    }
  }

  return { data: null, error: new Error("Failed to update RSVP in database.") };
}
