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

const url = ((import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || DEFAULT_URL);
const anon = ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || DEFAULT_ANON);

export const SUPABASE_URL = url ?? '';

let client: SupabaseClient | null = null;

if (url && anon && /^https:\/\/.+\.supabase\.co$/.test(url)) {
  client = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'craftcv.sb.auth',
    },
    global: { headers: { 'x-client-info': 'craftcv-web/1.0' } },
  });
}

/** True when a Supabase project is configured. */
export const cloudEnabled = (): boolean => client !== null;

/** The client, or null when cloud sync is not configured. */
export const supabase = (): SupabaseClient | null => client;
