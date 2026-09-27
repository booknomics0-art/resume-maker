#!/usr/bin/env node
/**
 * Is Google's Supabase provider enabled and its public OAuth redirect configured?
 *
 *   npm run check:auth                       # uses .env / netlify.toml defaults
 *   npm run check:auth -- --app-url=https://craftcv.netlify.app
 *
 * Supabase keeps the Google client secret on the server, so this switch lives in
 * the project dashboard, not in this repo. This script reads public settings and
 * tests the authorize redirect; it cannot verify the Client Secret or consent
 * screen without completing a real account sign-in.
 *
 * Exit codes: 0 = provider enabled + redirect accepted · 1 = provider/redirect
 * problem · 2 = could not check.
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

const GOOGLE_HOST = 'accounts.google.com';

/**
 * Second half of the preflight: ask Supabase to START the Google flow.
 * A 302 whose Location is on accounts.google.com proves that
 *   • the provider is enabled and Supabase has a Google OAuth client ID,
 *   • Google accepted that client ID and the redirect URI, and
 *   • the requested app redirect was accepted by Supabase.
 * It does NOT validate the client secret: Google uses that only when Supabase
 * exchanges the authorization code after a real user completes sign-in.
 */
async function handshake(appUrl) {
  const authorize = new URL(`${url}/auth/v1/authorize`);
  authorize.searchParams.set('provider', 'google');
  if (appUrl) authorize.searchParams.set('redirect_to', `${appUrl}/`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let res;
  try {
    res = await fetch(authorize.toString(), { redirect: 'manual', signal: controller.signal });
  } catch (err) {
    return { ok: false, note: `request failed (${err?.message || err})` };
  } finally {
    clearTimeout(timer);
  }

  const location = res.headers.get('location') || '';
  if (res.status >= 300 && res.status < 400 && location.includes(GOOGLE_HOST)) {
    let clientId = '';
    let redirectUri = '';
    let scope = '';
    try {
      const target = new URL(location);
      clientId = target.searchParams.get('client_id') || '';
      redirectUri = target.searchParams.get('redirect_uri') || '';
      scope = target.searchParams.get('scope') || '';
    } catch { /* keep the blanks */ }
    return { ok: true, status: res.status, clientId, redirectUri, scope };
  }
  if (res.status >= 300 && res.status < 400) {
    return { ok: false, status: res.status, note: `redirected to ${location || 'nowhere'}` };
  }
  let body = '';
  try { body = JSON.stringify(await res.json()); } catch { /* not JSON */ }
  return { ok: false, status: res.status, note: body || `HTTP ${res.status}` };
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
  const hs = await handshake(appUrl);
  if (hs.ok) {
    console.log('Handshake        : OK ✅  (Supabase → Google accepts the redirect)');
    if (hs.clientId) console.log(`Google client ID : ${hs.clientId}`);
    if (hs.redirectUri) console.log(`Google redirect  : ${hs.redirectUri}`);
    if (hs.scope) console.log(`Scopes           : ${hs.scope}`);
  } else {
    console.log(`Handshake        : FAILED ❌  ${hs.note || ''}`);
    console.log('   → the provider is enabled but Supabase could not start the Google redirect.');
    console.log('   → check the Client ID and Google callback URI in Google Cloud + Supabase.');
  }

  console.log('\n✅ Google provider and public OAuth redirect are configured.');
  console.log('   The client secret and consent-screen status still need a real sign-in to verify:');
  console.log(`   1. Open ${appUrl || 'your deployed site'} and press “Continue with Google”.`);
  console.log('   2. Complete sign-in. Success means the secret exchange and app callback both worked.');
  if (appUrl) {
    console.log(`   3. If it bounces to the wrong page, ${appUrl}/** is missing from`);
    console.log('      Supabase → Authentication → URL Configuration → Redirect URLs.');
  }
  console.log('   4. OAuth consent screen must be “Published” (not “Testing”) or only test users can sign in.');
  console.log('');
  process.exit(hs.ok ? 0 : 1);
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
