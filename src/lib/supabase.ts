// Supabase client — the single place that knows about the project URL & anon key.
//
// Configure via environment variables (see .env.example):
//   VITE_SUPABASE_URL       = https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY  = eyJ... (public "anon" key — safe for the browser;
//                             row-level security protects the data)
//
// When the variables are missing the app still works fully offline (localStorage);
// every cloud call becomes a no-op. This keeps `npm run dev` working without a project.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Public defaults for the CraftCV production project. These are the *anon* (public)
// credentials — they ship to every browser anyway; row-level security protects data.
// Env vars override them (e.g. for a staging project). Never put a service-role key here.
const DEFAULT_URL = 'https://icomxfiqurrgqksbcnin.supabase.co';
const DEFAULT_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imljb214ZmlxdXJyZ3Frc2JjbmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2OTgxMDUsImV4cCI6MjEwNjI3NDEwNX0.uillzexiJ5tDtJtU28-wGA7D7XpoJ9EEc0ud8_6gDO0';

const url = ((import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || DEFAULT_URL);
const anon = ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || DEFAULT_ANON);

// Sanity-check the fallback credentials — a stale, rotated, or truncated anon key
// is what makes Supabase return "Invalid API key" on every request. Catching it
// here (before createClient) keeps the failure mode obvious: we fall back to
// offline-only mode, and the login screen shows the right message.
function looksLikeAnonKey(value: string | undefined | null): boolean {
  if (!value) return false;
  // Legacy JWT: three dot-separated base64url sections, header section starts with `eyJ`.
  if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) return true;
  // New publishable key (`sb_publishable_...`) supported by supabase-js ≥ 2.45.
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(value)) return true;
  return false;
}

const safeUrl = url && /^https:\/\/.+\.supabase\.(co|in)$/.test(url) ? url : '';
const safeAnon = looksLikeAnonKey(anon) ? anon : '';

export const SUPABASE_URL = safeUrl;
/** Public anon key — needed by the Google provider probe (same header supabase-js sends). */
export const SUPABASE_ANON_KEY = safeAnon;
/** Set when the configured anon key looks malformed; the client is NOT built in that case. */
export const SUPABASE_KEY_MALFORMED: boolean = Boolean(url) && !safeAnon;

let client: SupabaseClient | null = null;

if (safeUrl && safeAnon) {
  client = createClient(safeUrl, safeAnon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // OAuth: Google sign-in is a full-page redirect back to this app. We use the
      // PKCE flow so the payload arrives as `?code=…` in the query string — never in
      // the fragment, which this app uses for hash routing (`#/dashboard`).
      flowType: 'pkce',
      // `detectSessionInUrl` is OFF on purpose: supabase-js would swallow a failed
      // code exchange (Google provider disabled, wrong redirect URI, expired code)
      // into a debug log and silently drop the user back on the login screen.
      // `cloudCompleteRedirectSignIn()` in lib/cloud.ts handles the callback instead
      // and turns every failure into a message with the exact fix.
      detectSessionInUrl: false,
      storageKey: 'craftcv.sb.auth',
    },
    global: { headers: { 'x-client-info': 'craftcv-web/1.0' } },
  });
}

/** True when a Supabase project is configured AND the key looks well-formed. */
export const cloudEnabled = (): boolean => client !== null;

/** The client, or null when cloud sync is not configured. */
export const supabase = (): SupabaseClient | null => client;
