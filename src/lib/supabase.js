import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://khbmrpqojgzevajqjuxa.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_04B98Po_sMBhv_mkrI12eg_t386_XIr";

const supabaseUrl =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof globalThis !== "undefined" && globalThis.process?.env?.VITE_SUPABASE_URL) ||
  DEFAULT_SUPABASE_URL;

const supabasePublishableKey =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof globalThis !== "undefined" && globalThis.process?.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  DEFAULT_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});
