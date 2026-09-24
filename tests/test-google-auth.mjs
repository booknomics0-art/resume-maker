/**
 * Google sign-in tests (no browser needed).
 *
 * Regression cover for the reported failure:
 *
 *   Provider (issuer "https://accounts.google.com") is not enabled
 *
 * That message comes from Supabase/GoTrue when the Google provider is switched
 * off in the project (`Authentication → Providers`). App code cannot flip that
 * switch, so the app must (a) recognise the situation *before* it throws the
 * browser at Supabase, (b) explain it in one sentence with the exact fix, and
 * (c) still complete a real Google round-trip when the provider IS enabled.
 *
 *   node tests/test-google-auth.mjs
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checks, root, tmpDir } from './_harness.mjs';

// The two modules under test are deliberately dependency-free (no React, no
// Supabase client), so they can be bundled and imported straight into Node.
mkdirSync(tmpDir, { recursive: true });
const esbuild = await import('esbuild');
await esbuild.build({
  entryPoints: [
    join(root, 'src', 'lib', 'authRedirect.ts'),
    join(root, 'src', 'lib', 'googleAuth.ts'),
  ],
  outdir: tmpDir,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'node20',
  logLevel: 'error',
});

const redirect = await import(pathToFileURL(join(tmpDir, 'authRedirect.js')).href);
const google = await import(pathToFileURL(join(tmpDir, 'googleAuth.js')).href);

const APP = 'https://craftcv.netlify.app';
const SB = 'https://voyvalrnxmdogsllarnz.supabase.co';

// ── 1. callback URL parsing (must never fight the hash router) ───────────────
const pkce = redirect.parseRedirectParams(`${APP}/?code=9f8e7d6c5b4a3210&sb_flow_id=flow-1#/`);
const oauthError = redirect.parseRedirectParams(`${APP}/?error=access_denied&error_description=User+denied+access#/`);
const disabled = redirect.parseRedirectParams(`${APP}/?error=server_error&error_code=provider_disabled&error_description=Provider+(issuer+%22https%3A%2F%2Faccounts.google.com%22)+is+not+enabled`);
const route = redirect.parseRedirectParams(`${APP}/#/editor/abc-123`);
const implicit = redirect.parseRedirectParams(`${APP}/#access_token=tok_123&refresh_token=ref_456&type=signup`);
const junk = redirect.parseRedirectParams(`${APP}/?code=abc`);

const aChecks = [
  ['PKCE callback recognised (?code=)', pkce.hasParams && pkce.code === '9f8e7d6c5b4a3210'],
  ['PKCE flow id captured (sb_flow_id)', pkce.flowId === 'flow-1'],
  ['middleware hash route survives parsing', pkce.hasParams && !pkce.isError],
  ['“denied” callback flagged as error', oauthError.isError && oauthError.error === 'access_denied'],
  ['error callback never looks like a code', oauthError.code === ''],
  ['provider_disabled error code captured', disabled.isError && disabled.errorCode === 'provider_disabled'],
  ['description of the reported bug captured', /is\+not\+enabled|is not enabled|is\+enabled/i.test(disabled.errorDescription)],
  ['plain route (#/editor/abc) is NOT an auth callback', !route.hasParams],
  ['legacy implicit tokens still handled', implicit.hasParams && implicit.accessToken === 'tok_123'],
  ['junk short code ignored', !junk.hasParams],
];

// ── 2. error translation — every message must name a fixable cause ───────────
const C = google.classifyAuthError;
const reported = C('Provider (issuer "https://accounts.google.com") is not enabled');
const authorizeStyle = C('{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}');
const mismatched = C('Unable to exchange external code: redirect_uri_mismatch');
const badRedirect = C('Invalid redirect URL: https://craftcv.example.com/');
const denied = C('access_denied');
const verifier = C('PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device.');
const offline = C('TypeError: Failed to fetch');
const missingCloud = C('anything', { cloudMissing: true });
const mystery = C('something brand new happened');

const bChecks = [
  ['reported message → provider_disabled', reported.code === 'provider_disabled'],
  ['reported message → offers the fix panel', reported.showSetup === true],
  ['message is plain English (no GoTrue jargon)', !/issuer|gotrue|oidc/i.test(reported.title + reported.message)],
  ['/authorize “Unsupported provider” → provider_disabled', authorizeStyle.code === 'provider_disabled'],
  ['redirect_uri_mismatch → provider_misconfigured', mismatched.code === 'provider_misconfigured'],
  ['bad redirect URL → redirect_not_allowed', badRedirect.code === 'redirect_not_allowed'],
  ['access_denied → cancelled (not a scary error)', denied.code === 'cancelled' && denied.showSetup === false],
  ['lost PKCE verifier → actionable message', verifier.code === 'verifier_missing'],
  ['offline → network', offline.code === 'network'],
  ['no Supabase configured → cloud_missing', missingCloud.code === 'cloud_missing'],
  ['unknown text still has a fallback', mystery.code === 'unknown' && Boolean(mystery.message)],
  ['every issue keeps the raw server text for support', reported.raw.includes('accounts.google.com')],
];

// ── 3. provider probe (/auth/v1/settings → external.google) ──────────────────
const settingsOk = (googleFlag) => async () => ({
  ok: true,
  status: 200,
  json: async () => ({ external: { email: true, google: googleFlag }, disable_signup: false }),
});

let probedUrl = '';
let probedHeaders = null;
const probeEnabled = await google.probeGoogleProvider({
  url: `${SB}/`,
  anonKey: 'anon-key',
  fetchImpl: async (url, init) => { probedUrl = url; probedHeaders = init?.headers; return settingsOk(true)(); },
});
const probeDisabled = await google.probeGoogleProvider({ url: SB, anonKey: 'anon-key', fetchImpl: settingsOk(false) });
const probe500 = await google.probeGoogleProvider({
  url: SB, anonKey: 'anon-key',
  fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }),
});
const probeBoom = await google.probeGoogleProvider({
  url: SB, anonKey: 'anon-key',
  fetchImpl: async () => { throw new Error('offline'); },
});
const probeTimeout = await google.probeGoogleProvider({
  url: SB, anonKey: 'anon-key', timeoutMs: 15,
  fetchImpl: (url, init) => new Promise((_res, rej) => { init.signal.addEventListener('abort', () => rej(new Error('aborted'))); }),
});
const probeNoCloud = await google.probeGoogleProvider({ url: '', anonKey: '' });

const cChecks = [
  ['settings URL built correctly', probedUrl === `${SB}/auth/v1/settings`],
  ['probe sends the anon key (same header supabase-js uses)', probedHeaders?.apikey === 'anon-key' && /^Bearer /.test(probedHeaders?.Authorization || '')],
  ['external.google=true → enabled', probeEnabled.state === 'enabled'],
  ['external.google=false → disabled (the reported case)', probeDisabled.state === 'disabled'],
  ['HTTP 500 → unknown, never a hard failure', probe500.state === 'unknown' && probe500.httpStatus === 500],
  ['network error → unknown', probeBoom.state === 'unknown'],
  ['hung request times out → unknown', probeTimeout.state === 'unknown'],
  ['no Supabase project → unknown', probeNoCloud.state === 'unknown'],
  ['settings payload without providers → null', google.parseProviderSettings({ external: { github: true } }) === null],
];

// ── 4. setup instructions the owner sees ─────────────────────────────────────
const info = google.googleSetupInfo(`${APP}/#/`, SB);
const selfHosted = google.googleSetupInfo(APP, 'https://auth.my-company.internal');

const dChecks = [
  ['callback URI matches Supabase’s documented value', info.callbackUrl === `${SB}/auth/v1/callback`],
  ['project dashboard deep link carries the project ref', info.providersUrl === 'https://supabase.com/dashboard/project/voyvalrnxmdogsllarnz/auth/providers'],
  ['URL configuration deep link present', Boolean(info.urlConfigUrl?.includes('/auth/url-configuration'))],
  ['site URL derived from the current origin', info.siteUrl === `${APP}/`],
  ['redirect pattern for the allow-list', info.redirectUrlPattern === `${APP}/**`],
  ['localhost redirect included for dev', info.localRedirectPattern === 'http://localhost:5173/**'],
  ['Google Cloud links present', info.googleConsoleUrl.startsWith('https://console.cloud.google.com')],
  ['self-hosted project → no bogus dashboard links', selfHosted.projectRef === null && selfHosted.providersUrl === null],
  ['self-hosted still gets a callback URI', selfHosted.callbackUrl === 'https://auth.my-company.internal/auth/v1/callback'],
];

// ── 5. the real flow, against a stubbed Supabase ─────────────────────────────
// Bundles the production cloud + supabase-client modules for Node, with a tiny
// browser shim, and drives `cloudStartGoogleSignIn()` / `cloudCompleteRedirectSignIn()`
// exactly like the login page does. This is the test that proves the reported
// dead-end is gone: a disabled provider must produce a fixable message and must
// NEVER navigate the browser to Supabase's raw JSON error page.

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
  };
}

/** Fresh module instance per scenario (the redirect snapshot is import-time state). */
let bundleSeq = 0;
async function loadCloud(href, fetchImpl) {
  const file = join(tmpDir, `googleflow-${++bundleSeq}.js`);
  await esbuild.build({
    stdin: {
      contents: `export * from ${JSON.stringify(join(root, 'src', 'lib', 'cloud.ts'))};\nexport * from ${JSON.stringify(join(root, 'src', 'lib', 'supabase.ts'))};`,
      resolveDir: root,
      loader: 'ts',
    },
    outfile: file,
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'node20',
    external: ['@supabase/supabase-js'],
    // Vite injects these at build time; stand them in so the client is created.
    define: {
      'import.meta.env': JSON.stringify({
        VITE_SUPABASE_URL: 'https://fake.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'anon-test-key',
      }),
    },
    logLevel: 'error',
  });

  const navigations = [];
  const storage = memoryStorage();
  const win = {
    location: {
      href,
      origin: 'https://app.example',
      pathname: '/',
      assign: (url) => navigations.push(url),
      replace: (url) => navigations.push(url),
    },
    history: {
      state: null,
      replaceState(_state, _title, url) { this.lastUrl = url; win.location.href = url; },
    },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    localStorage: storage,
    sessionStorage: memoryStorage(),
  };
  win.window = win;
  globalThis.window = win;
  globalThis.localStorage = storage;
  globalThis.document = {
    visibilityState: 'visible', cookie: '', addEventListener() {}, removeEventListener() {},
    createElement: () => ({ style: {}, setAttribute() {}, select() {}, remove() {} }),
    body: { appendChild() {}, removeChild() {} },
    execCommand: () => false,
  };
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: 'node', clipboard: { writeText: async () => {} } },
    configurable: true, writable: true,
  });
  globalThis.fetch = fetchImpl;

  const mod = await import(pathToFileURL(file).href);
  return { mod, navigations, win };
}

/** Fake Supabase gateway: settings probe + /authorize. */
function fakeGateway({ googleEnabled, authorizeStatus = 0 }) {
  return async (url) => {
    if (String(url).includes('/auth/v1/settings')) {
      return { ok: true, status: 200, json: async () => ({ external: { google: googleEnabled } }) };
    }
    if (String(url).includes('/auth/v1/authorize')) {
      if (authorizeStatus === 0) return { ok: false, status: 0, type: 'opaqueredirect', json: async () => ({}) };
      return {
        ok: false, status: authorizeStatus, type: 'basic',
        json: async () => ({ code: 400, error_code: 'validation_failed', msg: 'Unsupported provider: provider is not enabled' }),
      };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
}

const session = {
  access_token: 'access', refresh_token: 'refresh',
  user: { id: 'u-1', email: 'Priya@Example.com', app_metadata: { provider: 'google' }, user_metadata: { full_name: 'Priya Verma' } },
};

// 5a — provider disabled: blocked before navigation, with the setup panel.
const disabledRun = await loadCloud('https://app.example/', fakeGateway({ googleEnabled: false }));
const startDisabled = await disabledRun.mod.cloudStartGoogleSignIn();

// 5b — provider enabled: the browser is handed to Supabase (empty body, opaque 3xx).
const enabledRun = await loadCloud('https://app.example/', fakeGateway({ googleEnabled: true }));
let oauthOptions = null;
enabledRun.mod.supabase().auth.signInWithOAuth = async (creds) => {
  oauthOptions = creds.options;
  return {
    data: { provider: 'google', url: 'https://sb.example/auth/v1/authorize?provider=google&code_challenge=xyz', flowId: 'f-1' },
    error: null,
  };
};
const startEnabled = await enabledRun.mod.cloudStartGoogleSignIn();

// 5c — stale probe (enabled) but Supabase rejects the authorize call: the raw JSON
//      page must never be shown; the error is surfaced in-app instead.
const staleRun = await loadCloud('https://app.example/', fakeGateway({ googleEnabled: true, authorizeStatus: 400 }));
staleRun.mod.supabase().auth.signInWithOAuth = async () => ({
  data: { provider: 'google', url: 'https://sb.example/auth/v1/authorize?provider=google', flowId: 'f-2' },
  error: null,
});
const startStale = await staleRun.mod.cloudStartGoogleSignIn();

// 5d — Google refused (user closed the consent screen) on the callback URL.
const deniedRun = await loadCloud(
  'https://app.example/?error=access_denied&error_description=User+denied+access#/editor/xyz',
  fakeGateway({ googleEnabled: true }),
);
const deniedResult = await deniedRun.mod.cloudCompleteRedirectSignIn();

// 5e — happy path: `?code=…` is exchanged for a session, the address bar is cleaned.
const okRun = await loadCloud('https://app.example/?code=9f8e7d6c5b4a3210&sb_flow_id=f-9#/dashboard', fakeGateway({ googleEnabled: true }));
let exchanged = '';
okRun.mod.supabase().auth.exchangeCodeForSession = async (code, options) => {
  exchanged = `${code}|${options?.flowId ?? ''}`;
  return { data: { user: session.user, session }, error: null };
};
const okResult = await okRun.mod.cloudCompleteRedirectSignIn();
const cleanedUrl = okRun.win.history.lastUrl || '';

// 5f — exchange failure still explains itself (and keeps the route).
const failedRun = await loadCloud('https://app.example/?code=deadbeefcafe1234#/', fakeGateway({ googleEnabled: true }));
failedRun.mod.supabase().auth.exchangeCodeForSession = async () => ({
  data: { user: null, session: null }, error: { name: 'AuthApiError', message: 'Provider (issuer "https://accounts.google.com") is not enabled', code: 'provider_disabled', status: 400 },
});
const failedResult = await failedRun.mod.cloudCompleteRedirectSignIn();

// 5g — no callback params: nothing is attempted (normal page load).
const plainRun = await loadCloud('https://app.example/#/dashboard', fakeGateway({ googleEnabled: true }));
const plainResult = await plainRun.mod.cloudCompleteRedirectSignIn();

const eChecks = [
  ['disabled provider: sign-in blocked before leaving the page', startDisabled.ok === false && startDisabled.issue?.code === 'provider_disabled'],
  ['disabled provider: nothing was navigated', disabledRun.navigations.length === 0],
  ['disabled provider: message points at the setup steps', startDisabled.issue?.showSetup === true],
  ['enabled provider: browser is navigated to Supabase', startEnabled.ok === true && /\/auth\/v1\/authorize\?provider=google/.test(enabledRun.navigations[0] || '')],
  ['enabled provider: returns to this app, not a random page', oauthOptions?.redirectTo === 'https://app.example/'],
  ['enabled provider: PKCE flow used (no implicit tokens in the URL)', oauthOptions?.skipBrowserRedirect === true],
  ['stale probe: raw Supabase JSON page is prevented', startStale.ok === false && staleRun.navigations.length === 0],
  ['stale probe: error explained in-app', startStale.issue?.code === 'provider_disabled'],
  ['cancelled consent: friendly “cancelled”, not a failure', deniedResult.attempted === true && deniedResult.issue?.code === 'cancelled'],
  ['cancelled consent: address bar cleaned of the error', !/error=/.test(deniedRun.win.history.lastUrl || '')],
  ['happy path: one-time code exchanged (with its flow id)', exchanged === '9f8e7d6c5b4a3210|f-9'],
  ['happy path: real user returned to the app', okResult.ok === true && okResult.user?.email === 'priya@example.com' && okResult.user?.provider === 'google'],
  ['happy path: code removed from the URL', !/code=/.test(cleanedUrl)],
  ['happy path: hash route preserved after cleanup', /#\/dashboard/.test(cleanedUrl)],
  ['failed exchange: the reported message reaches the user', failedResult.attempted === true && failedResult.issue?.code === 'provider_disabled'],
  ['normal page load: no callback handling', plainResult.attempted === false && plainResult.ok === false],
];

const ok = checks([...aChecks, ...bChecks, ...cChecks, ...dChecks, ...eChecks]);
process.exit(ok ? 0 : 1);
