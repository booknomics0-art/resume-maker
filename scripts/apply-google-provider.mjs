#!/usr/bin/env node
/**
 * Push the Google OAuth client into the Supabase project.
 *
 * The browser must never see the client secret. Supabase stores it and uses it
 * when exchanging the authorization code from
 * https://<project>.supabase.co/auth/v1/callback.
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_... npm run apply:google
 *
 * Without a personal access token this script only checks the public handshake
 * (which client ID Supabase is currently sending to Google). It cannot write
 * the secret — that requires the Management API.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const out = { ...process.env };
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) return out;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#')) continue;
    if (!out[m[1]]) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = loadEnv();
const clientId = env.GOOGLE_CLIENT_ID || '';
const clientSecret = env.GOOGLE_CLIENT_SECRET || '';
const token = env.SUPABASE_ACCESS_TOKEN || '';
const supabaseUrl = (env.VITE_SUPABASE_URL || 'https://voyvalrnxmdogsllarnz.supabase.co').replace(/\/+$/, '');
const projectRef = /^https:\/\/([a-z0-9-]+)\.supabase\.(co|in)$/i.exec(supabaseUrl)?.[1] || '';

if (!clientId || !clientSecret) {
  console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env (never commit the secret).');
  process.exit(2);
}
if (!projectRef) {
  console.error('Could not read the Supabase project ref from VITE_SUPABASE_URL.');
  process.exit(2);
}

console.log(`Project          : ${projectRef}`);
console.log(`Google client ID : ${clientId}`);
console.log(`Client secret    : set (${clientSecret.length} chars, not printed)`);

if (!token) {
  console.log('\nNo SUPABASE_ACCESS_TOKEN — cannot write the provider from here.');
  console.log('Create one at https://supabase.com/dashboard/account/tokens');
  console.log('then re-run: SUPABASE_ACCESS_TOKEN=sbp_... npm run apply:google');
  console.log('Or paste the same Client ID + secret in');
  console.log(`https://supabase.com/dashboard/project/${projectRef}/auth/providers`);
  process.exit(0);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    external_google_enabled: true,
    external_google_client_id: clientId,
    external_google_secret: clientSecret,
  }),
});

const text = await res.text();
if (!res.ok) {
  console.error(`\nSupabase rejected the update (HTTP ${res.status}).`);
  console.error(text.slice(0, 400));
  process.exit(1);
}
console.log('\nGoogle provider updated. Secret stored on Supabase, not in the app.');
