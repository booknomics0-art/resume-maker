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
const DEFAULT_URL = 'https://voyvalrnxmdogsllarnz.supabase.co';
const DEFAULT_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZveXZhbHJueG1kb2dzbGxhcm56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMjgxOTAsImV4cCI6MjEwNTgwNDE5MH0.Ma0sJbzkoXLhEyDFKEYJdLym8kD9Jlfhfxg6Ev2O0no';

const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
// A partial override must never mix credentials from two projects.
const overridden = Boolean(envUrl || envKey);
const url = overridden ? (envUrl || '') : DEFAULT_URL;
const anon = overridden ? (envKey || '') : DEFAULT_ANON;

export const SUPABASE_URL = url ?? '';
/** Public anon key — needed by the Google provider probe (same header supabase-js sends). */
export const SUPABASE_ANON_KEY = anon ?? '';

let client: SupabaseClient | null = null;

if (url && anon && /^https:\/\/.+\.supabase\.(co|in)$/.test(url)) {
  client = createClient(url, anon, {
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

/** True when a Supabase project is configured. */
export const cloudEnabled = (): boolean => client !== null;

/** The client, or null when cloud sync is not configured. */
export const supabase = (): SupabaseClient | null => client;
