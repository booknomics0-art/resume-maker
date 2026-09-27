/**
 * Google sign-in helpers — the pure half of the Google login fix.
 *
 * Why this exists
 * ---------------
 * Google login on a Supabase project only works when the **Google provider is
 * enabled in that project** (`Authentication → Providers → Google`). Until then
 * Supabase answers every attempt with
 *
 *   `Provider (issuer "https://accounts.google.com") is not enabled`
 *   `{"code":400,"error_code":"validation_failed","msg":"Unsupported provider…"}`
 *
 * That switch lives in the Supabase project (it holds the Google *client
 * secret*), so app code cannot flip it. What app code *can* do — and what this
 * module does — is:
 *   • detect the situation **before** sending the browser to Supabase, so the
 *     user never lands on a raw JSON error page,
 *   • translate every auth failure into one clear sentence plus the exact fix,
 *   • offer one-click deep links to the two dashboards that need changing, and
 *   • let the owner re-check the setting without a rebuild.
 *
 * Pure module (no React, no Supabase client, no DOM access at import time) so it
 * is unit-testable in Node — see `tests/test-google-auth.mjs`.
 */

import { parseRedirectParams, type RedirectAuthParams } from './authRedirect';

// ---------------------------------------------------------------------------
// Provider status
// ---------------------------------------------------------------------------

/**
 * `enabled`  – Google is on: the sign-in redirect will work.
 * `disabled` – Supabase confirmed Google is off: fix the project settings.
 * `unknown`  – the probe could not run (offline, self-hosted, blocked); the
 *              caller may still try — the sign-in call then reports the truth.
 */
export type GoogleProviderState = 'enabled' | 'disabled' | 'unknown';

export interface ProviderProbe {
  state: GoogleProviderState;
  /** HTTP status of the probe, when there was a response. */
  httpStatus?: number;
  /** Short technical note for the console / bug reports. */
  detail?: string;
}

/**
 * Reads `external.google` out of GoTrue's public `/auth/v1/settings` payload.
 * Returns `null` when the payload does not describe providers at all.
 */
export function parseProviderSettings(json: unknown): boolean | null {
  const external = (json as { external?: unknown } | null)?.external;
  if (!external || typeof external !== 'object') return null;
  const google = (external as { google?: unknown }).google;
  return typeof google === 'boolean' ? google : null;
}

export interface ProbeOptions {
  /** Supabase project URL, e.g. `https://xxxx.supabase.co`. */
  url: string;
  /** Public anon key (sent in the `apikey` header, exactly like supabase-js). */
  anonKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Asks Supabase whether the Google provider is enabled. Never throws: any
 * failure degrades to `unknown` so the caller can still attempt sign-in.
 */
export async function probeGoogleProvider(options: ProbeOptions): Promise<ProviderProbe> {
  const { url, anonKey } = options;
  const doFetch = options.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : null);
  if (!url || !doFetch) return { state: 'unknown', detail: 'no Supabase URL / fetch available' };

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeout = setTimeout(() => controller?.abort(), options.timeoutMs ?? 6000);
  try {
    const res = await doFetch(`${url.replace(/\/+$/, '')}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'x-client-info': 'craftcv-web/1.0',
      },
      signal: controller?.signal,
      cache: 'no-store',
    });
    if (!res.ok) return { state: 'unknown', httpStatus: res.status, detail: `settings responded ${res.status}` };
    const google = parseProviderSettings(await res.json());
    if (google === null) return { state: 'unknown', httpStatus: res.status, detail: 'settings payload has no external providers' };
    return { state: google ? 'enabled' : 'disabled', httpStatus: res.status };
  } catch (err) {
    return { state: 'unknown', detail: err instanceof Error ? err.message : 'probe failed' };
  } finally {
    clearTimeout(timeout);
  }
}

/** One-line status text for the login screen. */
export function providerStateNote(state: GoogleProviderState): string {
  if (state === 'disabled') {
    return 'Google login is switched off for this project — tap the button for the 2-minute setup.';
  }
  if (state === 'unknown') {
    return 'Could not read the Google setting from this browser — the button still works. Email + password works too.';
  }
  return '';
}

// ---------------------------------------------------------------------------
// Setup instructions
// ---------------------------------------------------------------------------

export interface GoogleSetupInfo {
  /** `https://your-site.example` — must be in Supabase's URL configuration. */
  appOrigin: string;
  /** Value for *Site URL*. */
  siteUrl: string;
  /** Value for *Redirect URLs* (live site). */
  redirectUrlPattern: string;
  /** Value for *Redirect URLs* (local dev). */
  localRedirectPattern: string;
  /** `abcxyz` for `https://abcxyz.supabase.co`; `null` when self-hosted. */
  projectRef: string | null;
  supabaseUrl: string;
  /** Must be the Authorized redirect URI in Google Cloud Console. */
  callbackUrl: string;
  /** Deep link to Authentication → Providers (project must be hosted). */
  providersUrl: string | null;
  /** Deep link to Authentication → URL Configuration. */
  urlConfigUrl: string | null;
  /** Google Cloud Console → APIs & Services → Credentials. */
  googleConsoleUrl: string;
  /** Google Cloud Console → OAuth consent screen. */
  consentUrl: string;
}

export function googleSetupInfo(appUrl: string, supabaseUrl: string): GoogleSetupInfo {
  let appOrigin = '';
  try {
    if (appUrl) appOrigin = new URL(appUrl).origin;
  } catch {
    appOrigin = '';
  }
  const cleanSupabase = (supabaseUrl || '').replace(/\/+$/, '');
  const match = /^https:\/\/([a-z0-9-]+)\.supabase\.(co|in)$/i.exec(cleanSupabase);
  const projectRef = match ? match[1] : null;
  return {
    appOrigin,
    siteUrl: appOrigin ? `${appOrigin}/` : '',
    redirectUrlPattern: appOrigin ? `${appOrigin}/**` : '',
    localRedirectPattern: 'http://localhost:5173/**',
    projectRef,
    supabaseUrl: cleanSupabase,
    callbackUrl: cleanSupabase ? `${cleanSupabase}/auth/v1/callback` : '',
    providersUrl: projectRef ? `https://supabase.com/dashboard/project/${projectRef}/auth/providers` : null,
    urlConfigUrl: projectRef ? `https://supabase.com/dashboard/project/${projectRef}/auth/url-configuration` : null,
    googleConsoleUrl: 'https://console.cloud.google.com/apis/credentials',
    consentUrl: 'https://console.cloud.google.com/apis/oauth-consent',
  };
}

// ---------------------------------------------------------------------------
// Error translation
// ---------------------------------------------------------------------------

export type GoogleAuthIssueCode =
  | 'provider_disabled'
  | 'provider_misconfigured'
  | 'consent_testing'
  | 'redirect_not_allowed'
  | 'verifier_missing'
  | 'insecure_context'
  | 'embedded_preview'
  | 'cancelled'
  | 'signups_disabled'
  | 'cloud_missing'
  | 'rate_limited'
  | 'network'
  | 'unknown';

export interface GoogleAuthIssue {
  code: GoogleAuthIssueCode;
  /** Short headline. */
  title: string;
  /** What happened, in one sentence. */
  message: string;
  /** What to do about it (plain language, no jargon). */
  hint?: string;
  /** Show the “enable Google in Supabase” walkthrough. */
  showSetup: boolean;
  /** Raw server text, shown in small print so it can be searched/copied. */
  raw: string;
}

/**
 * Maps any Supabase / Google / network error to a single actionable sentence.
 * Matches on the raw text so it keeps working across GoTrue versions and
 * GoTrue's two different phrasings for the same problem (`provider_disabled`
 * from the ID-token endpoint, `Unsupported provider` from `/authorize`).
 */
export function classifyAuthError(raw: string, extra: { code?: string; status?: number; cloudMissing?: boolean } = {}): GoogleAuthIssue {
  const text = `${extra.code ?? ''} ${raw ?? ''}`.trim();
  const m = text.toLowerCase();
  const out = (issue: Omit<GoogleAuthIssue, 'raw'>): GoogleAuthIssue => ({ ...issue, raw: text });

  if (extra.cloudMissing) {
    return out({
      code: 'cloud_missing',
      title: 'Google login needs the cloud account',
      message: 'Google sign-in runs through Supabase, and this build has no Supabase project configured.',
      hint: 'Use email + password (offline mode) or set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then reload.',
      showSetup: false,
    });
  }

  if (
    m.includes('provider_disabled') ||
    m.includes('is not enabled') ||
    m.includes('not enabled') ||
    m.includes('unsupported provider') ||
    m.includes('provider is not enabled') ||
    (m.includes('validation_failed') && m.includes('provider'))
  ) {
    return out({
      code: 'provider_disabled',
      title: 'Google login is switched off for this Supabase project',
      message: 'Supabase refused the sign-in because the Google provider is not enabled in your project settings.',
      hint: 'This is a one-time switch inside Supabase (it stores your Google client secret, so the app cannot turn it on): enable Google under Authentication → Providers, then paste the Client ID and secret. About 2 minutes — steps below.',
      showSetup: true,
    });
  }

  // The single most common *Google-side* blocker once Supabase is configured:
  // the OAuth consent screen is still in “Testing”, so Google lets only the
  // listed test users through and everybody else sees
  // “Access blocked: <app> has not completed the Google verification process”.
  // Nothing in Supabase or in this repo can fix it — it is one button in the
  // Google Cloud console — so name it exactly, with the deep link.
  if (
    m.includes('access blocked') ||
    m.includes('verification process') ||
    m.includes('has not completed the google') ||
    m.includes('app is in testing') ||
    m.includes('test users') ||
    m.includes('org_internal') ||
    m.includes('admin_policy_enforced') ||
    m.includes('unverified app') ||
    // Same-tab leave + Back with no callback (AuthPage pending-flow notice).
    m.includes('came back from google without finishing') ||
    m.includes('returned with no code')
  ) {
    return out({
      code: 'consent_testing',
      title: 'Google is blocking the app — the consent screen is still in “Testing”',
      message:
        'Google accepted the sign-in request but refused to show it, because this Google Cloud project’s OAuth consent screen has not been published. In “Testing” only the emails you listed as test users are allowed in. Email + password still works on the form above.',
      hint:
        'Open Google Cloud Console → APIs & Services → OAuth consent screen and press “Publish app” (or add this email under “Test users”). It takes effect immediately — no review needed for the basic email/profile scopes this app uses. Meanwhile, use email + password to sign in.',
      showSetup: true,
    });
  }

  // The app is running inside an iframe (preview panel, dashboard embed) and
  // the popup with the real tab was blocked. Google sends its sign-in pages with
  // `X-Frame-Options: DENY`, so there is no way to finish the handshake in a
  // frame — the user has to open the app in its own tab.
  if (m.includes('embedded_preview')) {
    return out({
      code: 'embedded_preview',
      title: 'Google sign-in cannot run inside this preview frame',
      message:
        'The app is being shown inside another page here, and Google refuses to display its sign-in screen in a frame — that is a security rule on Google’s side, not a problem with your account.',
      hint: 'Open the app in its own browser tab and press “Continue with Google” there; this page will pick up the session automatically. Email + password also works right here.',
      showSetup: false,
    });
  }

  // PKCE needs `crypto.subtle`, which only exists in a secure context
  // (https, or localhost). Without it supabase-js cannot build the code
  // challenge and Google sign-in is impossible — say so instead of failing
  // later with a cryptic “code verifier” error.
  if (m.includes('insecure_context') || m.includes('crypto.subtle') || m.includes('subtle is not')) {
    return out({
      code: 'insecure_context',
      title: 'This page is not on a secure (HTTPS) address',
      message:
        'Google sign-in uses the modern PKCE handshake, and browsers only expose the crypto it needs on https:// pages (or localhost).',
      hint: 'Open the app over https:// (or on http://localhost) and try again. Email + password works either way.',
      showSetup: false,
    });
  }

  // A callback that arrives with a stale/used/foreign flow state (user pressed
  // Back, reloaded an old callback URL, or the flow timed out) is NOT a
  // credentials problem — Supabase answers
  // `{"error_code":"bad_oauth_state","msg":"OAuth state not found or expired"}`.
  // Sending the owner to the provider settings here would be a wild goose chase.
  if (
    m.includes('oauth state') ||
    m.includes('bad_oauth_state') ||
    m.includes('state not found') ||
    m.includes('state has expired') ||
    m.includes('flow state')
  ) {
    return out({
      code: 'verifier_missing',
      title: 'That Google sign-in link expired',
      message: 'The sign-in attempt behind this link is gone — it was already used, started in another tab/browser, or left open too long.',
      hint: 'Press “Continue with Google” again and finish in one go. Email + password works too.',
      showSetup: false,
    });
  }

  if (
    m.includes('redirect_uri_mismatch') ||
    m.includes('unable to exchange external code') ||
    m.includes('invalid_client') ||
    m.includes('invalid_grant') ||
    m.includes('code challenge')
  ) {
    return out({
      code: 'provider_misconfigured',
      title: 'Google is enabled, but the OAuth credentials do not match',
      message: 'Google rejected the handshake — the Client ID/secret in Supabase and the redirect URI in Google Cloud Console must belong to the same OAuth client.',
      hint: 'Copy the Authorized redirect URI below into your Google Cloud OAuth client (Web application), and make sure the same Client ID + secret are pasted in Supabase → Authentication → Providers → Google.',
      showSetup: true,
    });
  }

  if (
    (m.includes('redirect') && (m.includes('not allowed') || m.includes('invalid') || m.includes('mismatch'))) ||
    m.includes('redirect_to') ||
    m.includes('unauthorized_client') ||
    m.includes('email link is invalid') ||
    m.includes('request_path')
  ) {
    return out({
      code: 'redirect_not_allowed',
      title: 'This site’s address is not whitelisted for sign-in',
      message:
        'Supabase only returns users to addresses listed in the project’s URL configuration. This address is not on that list, so the sign-in could not be handed back to the app.',
      hint: 'Add the Site URL and Redirect URL shown below in Supabase → Authentication → URL Configuration, then try again from that exact address.',
      showSetup: true,
    });
  }

  if (m.includes('code verifier') || m.includes('pkce')) {
    return out({
      code: 'verifier_missing',
      title: 'That Google sign-in link expired',
      message: 'The sign-in was started in another browser/tab, or the link was reused, so the secure check failed.',
      hint: 'Start the sign-in again and finish it in the same browser. Use email + password if you are on a different device.',
      showSetup: false,
    });
  }

  if (m.includes('access_denied') || m.includes('cancel') || m.includes('denied') || m.includes('consent')) {
    return out({
      code: 'cancelled',
      title: 'Google sign-in was cancelled',
      message: 'Nothing was changed — no account was created or linked.',
      hint: 'Try again, or use email + password.',
      showSetup: false,
    });
  }

  if (m.includes('signups not allowed') || (m.includes('signup') && m.includes('disabled')) || m.includes('disable_signup')) {
    return out({
      code: 'signups_disabled',
      title: 'New sign-ups are disabled for this project',
      message: 'Supabase refused to create an account for this Google user.',
      hint: 'Allow new users in Supabase → Authentication → Sign In / Providers (or invite this email first).',
      showSetup: false,
    });
  }

  if (m.includes('rate limit') || m.includes('too many')) {
    return out({
      code: 'rate_limited',
      title: 'Too many attempts',
      message: 'Supabase is throttling sign-in attempts for a moment.',
      hint: 'Wait about a minute, then try again.',
      showSetup: false,
    });
  }

  if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed') || m.includes('timeout') || m.includes('abort')) {
    return out({
      code: 'network',
      title: 'Could not reach the sign-in service',
      message: 'The request to Supabase did not complete — usually a connection problem or an offline device.',
      hint: 'Check your internet connection and try again. Email + password keeps working offline.',
      showSetup: false,
    });
  }

  return out({
    code: 'unknown',
    title: 'Google sign-in did not complete',
    message: 'Google or Supabase returned an error the app could not recognise.',
    hint: 'Try again, or use email + password. The exact server response is shown below.',
    showSetup: true,
  });
}

/** Builds the message for an error that came back on the callback URL. */
export function issueFromRedirect(params: RedirectAuthParams): GoogleAuthIssue {
  const raw = [params.error, params.errorCode, params.errorDescription].filter(Boolean).join(' ').trim();
  // Everything Google sent is classified together, description included: Google
  // reports several *different* problems as `error=access_denied` and the only
  // thing telling them apart is the description
  //   · “the user denied the request”            → really cancelled
  //   · “Access blocked: <app> has not completed the Google verification
  //      process” / “org_internal” / “admin_policy_enforced”
  //                                              → consent screen still in Testing
  // The blanket “access_denied means cancelled” shortcut that used to live here
  // threw that description away, so a blocked app looked like a user mistake.
  const issue = classifyAuthError(raw || 'unknown error');
  // A bare `access_denied` (no description at all) really is just “closed the
  // consent screen” — keep the friendly wording.
  if (!params.errorDescription && /access_denied/i.test(params.error)) {
    return classifyAuthError('access_denied');
  }
  return issue;
}

/** Re-export so callers only need this module for redirect parsing. */
export { parseRedirectParams };
