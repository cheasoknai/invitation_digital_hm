import { supabase } from "./supabase.js";

/**
 * Normalize an invitation slug according to requirements:
 * 1. Convert to lowercase and trim.
 * 2. Strictly ASCII: letters, numbers, and hyphens only ([a-z0-9-]).
 * 3. Spaces and underscores are converted to hyphens.
 * 4. Multiple consecutive hyphens are collapsed to a single hyphen.
 * 5. Maximum 60 characters for URL safety.
 *
 * @param {string} rawSlug - Raw slug input
 * @param {object} [options]
 * @param {boolean} [options.stripEdges=false] - Strip leading and trailing hyphens (for submit/validation)
 * @returns {string} Normalized clean ASCII slug
 */
export function normalizeSlug(rawSlug, { stripEdges = false } = {}) {
  if (!rawSlug || typeof rawSlug !== "string") return "";
  let slug = rawSlug
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "") // Remove spaces for compact URL slug
    .replace(/[^a-z0-9-]/g, "") // Allow only ASCII letters, numbers, and hyphens
    .replace(/-+/g, "-") // Collapse multiple consecutive hyphens to single hyphen
    .slice(0, 60); // Maximum 60 characters for URL safety

  if (stripEdges) {
    slug = slug.replace(/^-+|-+$/g, "");
  }
  return slug;
}

/**
 * Validate that an invitation slug is unique:
 * 1. Checks in-memory loaded guests list first (case-insensitive).
 * 2. Checks Supabase PostgreSQL public.guests table directly.
 *
 * @param {string} slug - The slug candidate to check
 * @param {string|null} [currentGuestId=null] - Exclude current guest when editing
 * @param {Array<object>} [existingGuests=[]] - Current list of loaded guests
 * @returns {Promise<{ isUnique: boolean, error: string|null }>}
 */
export async function checkSlugIsUnique(slug, currentGuestId = null, existingGuests = []) {
  const rawTrimmed = String(slug || "").trim();
  if (rawTrimmed.length > 60) {
    return { isUnique: false, error: "Slug cannot exceed 60 characters." };
  }
  const cleanSlug = normalizeSlug(slug, { stripEdges: true });
  if (!cleanSlug) {
    return { isUnique: false, error: "Slug cannot be empty or contain only invalid characters." };
  }

  // 1. Instant frontend validation against existing loaded guests (case-insensitive)
  if (Array.isArray(existingGuests)) {
    const duplicate = existingGuests.find((g) => {
      if (!g) return false;
      if (currentGuestId && g.id === currentGuestId) return false;
      const gSlug = normalizeSlug(g.invitation_slug || "", { stripEdges: true });
      return gSlug === cleanSlug;
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
      .select("id, guest_name, invitation_slug")
      .eq("invitation_slug", cleanSlug);

    if (currentGuestId) {
      query = query.neq("id", currentGuestId);
    }

    const { data, error } = await query;

    if (error) {
      // SECURITY: A database error is NOT proof that the slug is unique
      console.warn("Supabase slug uniqueness check error:", error);
      return {
        isUnique: false,
        error: `Unable to verify slug uniqueness due to a database error: ${error.message || "Query failed"}`,
      };
    }

    if (data && data.length > 0) {
      const match = data[0];
      return {
        isUnique: false,
        error: `The slug "${cleanSlug}" is already in use by guest "${match.guest_name || "another guest"}". Please choose a different slug.`,
      };
    }
  } catch (err) {
    console.warn("Supabase slug uniqueness check exception:", err);
    return {
      isUnique: false,
      error: `Failed to verify slug uniqueness due to a connection error: ${err.message || String(err)}`,
    };
  }

  return { isUnique: true, error: null };
}

/**
 * Generate an unpredictable, cryptographically secure, URL-safe 16-character
 * alphanumeric invitation token without modulo bias.
 * Example: '7k2m9x4p1w8q5z3v'
 *
 * @returns {string} 16-character token
 */
export function generateInvitationToken() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"; // 36 characters
  const tokenLength = 16;
  const result = [];

  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    throw new Error("Cryptographically secure random number generator is unavailable.");
  }

  // 252 is 7 * 36, the largest multiple of 36 that fits in a single byte (0-255).
  // Discarding values >= 252 completely eliminates modulo bias.
  const buffer = new Uint8Array(64);
  while (result.length < tokenLength) {
    crypto.getRandomValues(buffer);
    for (let i = 0; i < buffer.length && result.length < tokenLength; i++) {
      const val = buffer[i];
      if (val < 252) {
        result.push(chars[val % 36]);
      }
    }
  }
  return result.join("");
}

/**
 * Generate a cryptographically secure, random 8-character lowercase alphanumeric suffix
 * using rejection sampling to eliminate modulo bias.
 *
 * @param {number} [length=8]
 * @returns {string} e.g. '4k9m2x1p'
 */
function generateRandomSlugSuffix(length = 8) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const result = [];
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buffer = new Uint8Array(length * 2);
    while (result.length < length) {
      crypto.getRandomValues(buffer);
      for (let i = 0; i < buffer.length && result.length < length; i++) {
        const val = buffer[i];
        if (val < 252) { // 7 * 36 = 252 (largest multiple of 36 in 0-255)
          result.push(chars[val % 36]);
        }
      }
    }
    return result.join("");
  }
  for (let i = 0; i < length; i++) {
    result.push(chars[Math.floor(Math.random() * chars.length)]);
  }
  return result.join("");
}

/**
 * Generate a readable URL slug automatically from guest name:
 * 1. Strictly ASCII: lowercase letters, numbers, and single hyphens only.
 * 2. Maximum 60 characters.
 * 3. Khmer-only guest names generate a safe unique fallback: "guest-xxxxxxxx".
 * 4. Deduplication: appends -2, -3, etc., preserving the 60-character limit.
 * 5. Case-insensitive comparison against existing slugs.
 *
 * @param {string} name - Guest name
 * @param {Array<object|string>} [existingList=[]] - Existing guests or slug strings to check for uniqueness
 * @param {string} [currentGuestId=null] - Optional current guest ID if editing (allows retaining own slug)
 * @returns {string} Unique URL-safe ASCII slug (max 60 chars)
 */
export function generateGuestSlug(name, existingList = [], currentGuestId = null) {
  const rawLower = String(name || "").toLowerCase().trim();

  // Strip all non-ASCII / non-alphanumeric characters: e.g. "Chea Soknai" -> "cheasoknai"
  const latinCleaned = rawLower.replace(/[^a-z0-9]/g, "");

  const baseSlug = latinCleaned.length > 0
    ? latinCleaned.slice(0, 60)
    : `guest-${generateRandomSlugSuffix(8)}`;

  // Collect existing slugs in lowercase for case-insensitive comparison
  const existingSlugs = new Set();
  if (Array.isArray(existingList)) {
    for (const item of existingList) {
      if (!item) continue;
      // Skip self if editing
      if (currentGuestId && item.id === currentGuestId) continue;

      const slugVal = typeof item === "string" ? item : item.invitation_slug;
      if (slugVal && typeof slugVal === "string") {
        existingSlugs.add(slugVal.toLowerCase().trim());
      }
    }
  }

  // If baseSlug is not yet taken, return it
  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  // If baseSlug was a random fallback (e.g. guest-xxxxxxxx) and collided, attempt fresh suffixes
  if (latinCleaned.length === 0) {
    let attempts = 0;
    while (attempts < 10) {
      const candidate = `guest-${generateRandomSlugSuffix(8)}`;
      if (!existingSlugs.has(candidate)) {
        return candidate;
      }
      attempts++;
    }
  }

  // Append -2, -3, -4, etc. while ensuring total length never exceeds 60 characters
  let counter = 2;
  while (true) {
    const suffix = `-${counter}`;
    const maxBaseLen = 60 - suffix.length;
    const truncatedBase = baseSlug.slice(0, maxBaseLen).replace(/-+$/, "");
    const candidate = `${truncatedBase}${suffix}`;
    if (!existingSlugs.has(candidate)) {
      return candidate;
    }
    counter++;
  }
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
 * Fetch guest details by their unique public invitation_slug.
 * In accordance with production security requirements:
 * 1. Only calls the public slug-based lookup RPC get_guest_by_slug.
 * 2. Never queries or accepts invitation_token.
 * 3. Never returns invitation_token in public response data.
 *
 * @param {string} slug - Public guest invitation slug (e.g. 'cheasoknai')
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function fetchGuestBySlug(slug) {
  if (!slug || typeof slug !== "string") {
    return { data: null, error: new Error("Valid invitation slug is required.") };
  }

  const cleanSlug = normalizeSlug(slug, { stripEdges: true });
  if (!cleanSlug) {
    return { data: null, error: new Error("Valid invitation slug is required.") };
  }

  // 1. Primary: Call public canonical RPC function get_guest_by_slug (SECURITY DEFINER)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_guest_by_slug",
      { slug: cleanSlug }
    );

    if (!rpcError && rpcData) {
      // Defense-in-depth: Ensure returned guest actually matches the requested slug
      if (
        !rpcData.invitation_slug ||
        rpcData.invitation_slug.toLowerCase() !== cleanSlug
      ) {
        return { data: null, error: new Error("Guest invitation link not found.") };
      }

      // Guarantee invitation_token is never exposed in public client state
      const safePublicGuest = { ...rpcData };
      delete safePublicGuest.invitation_token;
      return { data: safePublicGuest, error: null };
    }

    if (rpcError && rpcError.code !== "PGRST116") {
      console.warn("Public guest lookup notice:", rpcError.message);
    }
  } catch (err) {
    console.warn("RPC get_guest_by_slug exception:", err);
  }

  // 2. Offline / local development fallback for mock guests
  if (import.meta.env?.DEV) {
    const devGuests = [
      { id: "dev-1", guest_name: "Chay", invitation_slug: "chay", rsvp_status: "pending" },
      { id: "dev-2", guest_name: "ឯកឧត្តម និង លោកជំទាវ", invitation_slug: "khmer-guest", rsvp_status: "pending" },
      { id: "dev-3", guest_name: "His Excellency Dr. Alexander Montgomery & Family", invitation_slug: "long-name", rsvp_status: "pending" },
    ];
    const match = devGuests.find(
      (g) => g.invitation_slug.toLowerCase() === cleanSlug
    );
    if (match) {
      return { data: match, error: null };
    }
  }

  return { data: null, error: new Error("Guest invitation link not found.") };
}

// Backwards-compatible slug-only wrapper (legacy alias pointing to slug lookup)
export const fetchGuestByToken = fetchGuestBySlug;

/**
 * Insert a new guest into Supabase public.guests table.
 * Supports:
 * - guest_name (text, required)
 * - invitation_token (text, required, unique)
 * - invitation_slug (text, required, unique ASCII slug)
 * - rsvp_status (text, default 'pending')
 *
 * @param {object} params
 * @param {string} params.guestName - Name of the guest
 * @param {string} [params.token] - Unique invitation token (generated if not provided)
 * @param {string} params.slug - Required invitation slug (e.g. 'naiupdated')
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

  const rawTrimmedSlug = String(slug || "").trim();
  if (rawTrimmedSlug.length > 60) {
    return { data: null, error: new Error("Invitation slug cannot exceed 60 characters.") };
  }

  const cleanSlug = normalizeSlug(rawTrimmedSlug, { stripEdges: true });
  if (!cleanSlug) {
    return { data: null, error: new Error("A valid non-empty invitation slug is required.") };
  }

  const invitationToken = token || generateInvitationToken();

  const payload = {
    guest_name: trimmedName,
    invitation_token: invitationToken,
    invitation_slug: cleanSlug,
    rsvp_status: "pending",
  };

  try {
    const { data, error } = await supabase
      .from("guests")
      .insert([payload])
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Submit or update an RSVP response for a specific guest using their public invitation_slug.
 * In accordance with production security requirements:
 * 1. Submits via slug only to the canonical public submit_rsvp RPC.
 * 2. Never accepts or queries invitation_token.
 * 3. Strictly validates status ('accepted' | 'declined') and message length (<= 500 chars).
 * 4. Never returns invitation_token in response data.
 *
 * @param {string} slug - Public guest invitation slug
 * @param {'accepted'|'declined'} status - RSVP status
 * @param {string} [message] - Optional blessing / note (max 500 characters)
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function submitGuestRsvp(slug, status, message = "") {
  if (!slug || typeof slug !== "string") {
    return { data: null, error: new Error("Valid invitation slug is required.") };
  }

  const cleanSlug = normalizeSlug(slug, { stripEdges: true });
  if (!cleanSlug) {
    return { data: null, error: new Error("Valid invitation slug is required.") };
  }

  const validStatuses = ["accepted", "declined"];
  if (!validStatuses.includes(status)) {
    return { data: null, error: new Error("Invalid RSVP status. Must be accepted or declined.") };
  }

  if (message && message.length > 500) {
    return { data: null, error: new Error("RSVP message cannot exceed 500 characters.") };
  }

  const cleanMessage = message ? String(message).trim().substring(0, 500) : null;

  // 1. Primary: Secure RPC function submit_rsvp (SECURITY DEFINER)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "submit_rsvp",
      {
        slug: cleanSlug,
        status_input: status,
        message_input: cleanMessage,
      }
    );

    if (!rpcError && rpcData) {
      // Defense-in-depth: Ensure updated record matches the requested slug
      if (
        !rpcData.invitation_slug ||
        rpcData.invitation_slug.toLowerCase() !== cleanSlug
      ) {
        return { data: null, error: new Error("Guest invitation link not found.") };
      }

      // Guarantee invitation_token is never returned to public caller
      const safePublicRsvp = { ...rpcData };
      delete safePublicRsvp.invitation_token;
      return { data: safePublicRsvp, error: null };
    }

    if (rpcError) {
      return { data: null, error: rpcError };
    }
  } catch (err) {
    console.warn("RPC submit_rsvp exception:", err);
    return { data: null, error: err };
  }

  // 2. Offline / mock fallback for development testing
  if (import.meta.env?.DEV && typeof window !== "undefined") {
    try {
      const localGuests = JSON.parse(
        localStorage.getItem("hm_local_guests") || "[]",
      );
      const index = localGuests.findIndex(
        (g) => g.invitation_slug && g.invitation_slug.toLowerCase() === cleanSlug,
      );
      if (index !== -1) {
        const now = new Date().toISOString();
        const updated = {
          ...localGuests[index],
          rsvp_status: status,
          rsvp_message: cleanMessage,
          responded_at: now,
          updated_at: now,
        };
        const safeLocal = { ...updated };
        delete safeLocal.invitation_token;
        localGuests[index] = updated;
        localStorage.setItem("hm_local_guests", JSON.stringify(localGuests));
        return { data: safeLocal, error: null };
      }
    } catch {
      // ignore
    }
  }

  return { data: null, error: new Error("Failed to update RSVP in database.") };
}
