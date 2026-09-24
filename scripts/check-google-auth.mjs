#!/usr/bin/env node
/**
 * Is Google sign-in ready on the Supabase project? One command, one answer.
 *
 *   npm run check:auth                       # uses .env / netlify.toml defaults
 *   npm run check:auth -- --app-url=https://craftcv.netlify.app
 *
 * Supabase keeps the Google client secret on the server, so this switch lives in
 * the project dashboard, not in this repo. This script only *reads* the public
 * `/auth/v1/settings` endpoint and prints the exact values you have to paste into
 * the two dashboards (Google Cloud Console + Supabase).
 *
 * Exit codes: 0 = Google enabled · 1 = Google disabled · 2 = could not check.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const argValue = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : '';
};

/** Vite env vars → .env → the public defaults baked into src/lib/supabase.ts. */
function resolveConfig() {
  let url = process.env.VITE_SUPABASE_URL || argValue('supabase-url');
  let key = process.env.VITE_SUPABASE_ANON_KEY || argValue('anon-key');

  const envPath = join(root, '.env');
  if ((!url || !key) && existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = /^\s*(VITE_SUPABASE_(?:URL|ANON_KEY))\s*=\s*(.+?)\s*$/.exec(line);
      if (!m) continue;
      const value = m[2].replace(/^["']|["']$/g, '');
      if (m[1] === 'VITE_SUPABASE_URL' && !url) url = value;
      if (m[1] === 'VITE_SUPABASE_ANON_KEY' && !key) key = value;
    }
  }

  if (!url || !key) {
    const src = readFileSync(join(root, 'src', 'lib', 'supabase.ts'), 'utf8');
    url ||= /const DEFAULT_URL = '([^']+)'/.exec(src)?.[1] || '';
    key ||= /const DEFAULT_ANON = '([^']+)'/.exec(src)?.[1] || '';
  }
  return { url: (url || '').replace(/\/+$/, ''), key: key || '' };
}

const { url, key } = resolveConfig();
const appUrl = (argValue('app-url') || process.env.CRAFT_CV_SITE_URL || '').replace(/\/+$/, '');
const projectRef = /^https:\/\/([a-z0-9-]+)\.supabase\.(co|in)$/.exec(url)?.[1] || null;
const callbackUrl = url ? `${url}/auth/v1/callback` : '(set VITE_SUPABASE_URL)';

const line = '─'.repeat(64);
console.log(`\nCraftCV · Google sign-in check\n${line}`);
console.log(`Supabase project : ${url || '(not configured)'}${projectRef ? `  (ref ${projectRef})` : ''}`);
if (appUrl) console.log(`App URL          : ${appUrl}`);

if (!url || !key) {
  console.log('\n❌ No Supabase project configured — Google sign-in cannot work in this build.');
  console.log('   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see docs/SUPABASE.md).\n');
  process.exit(2);
}

let settings;
try {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  const res = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: controller.signal,
  });
  clearTimeout(timer);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  settings = await res.json();
} catch (err) {
  console.log(`\n⚠️  Could not read the project settings (${err?.message || err}).`);
  console.log('   The project may be paused, or this machine has no network access.');
  console.log('   Google sign-in still works if the provider is enabled in the dashboard.\n');
  process.exit(2);
}

const google = settings?.external?.google;
console.log(`Google provider  : ${google === true ? 'ENABLED ✅' : google === false ? 'DISABLED ❌' : 'unknown (?!)'}`);
console.log(`Email provider   : ${settings?.external?.email === false ? 'disabled' : 'enabled'}`);
console.log(`New sign-ups     : ${settings?.disable_signup ? 'DISABLED (only existing users can log in)' : 'allowed'}`);

if (google === true) {
  console.log('\n✅ Nothing to do — “Continue with Google” will sign users in.');
  if (appUrl) {
    console.log(`   Reminder: ${appUrl} must be listed under Authentication → URL Configuration.`);
  }
  console.log('');
  process.exit(0);
}

console.log(`\n${line}\nFix it in 3 steps (about 3 minutes)\n${line}`);
console.log(`1. Google Cloud Console → APIs & Services → Credentials
   Create (or open) the OAuth client of type “Web application”.
   Authorized redirect URI (exact):
       ${callbackUrl}
   Copy the Client ID and the Client secret.`);

console.log(`\n2. Supabase → Authentication → Providers → Google
   ${projectRef ? `https://supabase.com/dashboard/project/${projectRef}/auth/providers` : `${url} → Authentication → Providers`}
   Enable Google, paste the Client ID + secret, Save.`);

console.log(`\n3. Supabase → Authentication → URL Configuration
   ${projectRef ? `https://supabase.com/dashboard/project/${projectRef}/auth/url-configuration` : `${url} → Authentication → URL Configuration`}
   Site URL      : ${appUrl ? `${appUrl}/` : 'https://your-site.example/'}
   Redirect URLs : ${appUrl ? `${appUrl}/**` : 'https://your-site.example/**'}, http://localhost:5173/**`);

console.log(`\nThen: npm run check:auth   (or press “Check again” in the app)
This is what the user sees today: “Provider (issuer "https://accounts.google.com") is not enabled”.\n`);
process.exit(1);
