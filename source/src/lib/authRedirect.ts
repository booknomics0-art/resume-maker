/**
 * OAuth / magic-link redirect capture.
 *
 * Supabase sends the user back to this app with the auth payload in the URL
 * (`?code=…` for the PKCE flow we use, `#access_token=…` for the legacy implicit
 * flow, or `?error=…&error_description=…` when the provider refused).
 *
 * Two problems make this module necessary:
 *
 *  1. supabase-js strips those parameters from the address bar as soon as it
 *     finishes initialising. If we read the URL after that, the error/reason is
 *     gone and the user is simply dropped back on the login screen with no
 *     explanation. So we snapshot the parameters **synchronously, at import
 *     time** — before any async work can clean the URL (`main.tsx` imports this
 *     module first).
 *  2. The app uses hash routing (`#/editor/abc`). Auth parameters must never be
 *     mistaken for a route, and the route must survive the cleanup.
 *
 * Pure module: no imports, no side effects beyond the one-time snapshot, so it
 * can be unit-tested in Node (see `tests/test-google-auth.mjs`).
 */

/** Query/hash keys that belong to the auth round-trip, never to a route. */
const AUTH_PARAM_KEYS = [
  'code',
  'error',
  'error_code',
  'error_description',
  'access_token',
  'refresh_token',
  'provider_token',
  'expires_in',
  'expires_at',
  'token_type',
  'type',
  'state',
  'sb_flow_id',
] as const;

export interface RedirectAuthParams {
  /** PKCE authorization code (`?code=`). */
  code: string;
  /** Provider/GoTrue error code, e.g. `access_denied`. */
  error: string;
  /** Human readable error from the provider, e.g. `redirect_uri_mismatch`. */
  errorDescription: string;
  /** GoTrue error code, e.g. `provider_disabled` / `validation_failed`. */
  errorCode: string;
  /** Legacy implicit-flow tokens (`#access_token=`). */
  accessToken: string;
  refreshToken: string;
  /** `sb_flow_id` — present only when the project opts into PKCE flow ids. */
  flowId: string;
  /** True when the URL actually carries an auth payload. */
  hasParams: boolean;
  /** True when the payload is an error coming back from the provider. */
  isError: boolean;
}

const EMPTY: RedirectAuthParams = {
  code: '', error: '', errorDescription: '', errorCode: '',
  accessToken: '', refreshToken: '', flowId: '', hasParams: false, isError: false,
};

function pick(params: URLSearchParams, key: string): string {
  return (params.get(key) || '').trim();
}

/**
 * Reads the auth payload out of a full URL (query string and hash).
 *
 * A route hash like `#/editor/abc` yields nothing: it contains no `=`, so it is
 * not parsed as parameters.
 */
export function parseRedirectParams(href: string): RedirectAuthParams {
  let url: URL;
  try {
    url = new URL(href, 'https://localhost');
  } catch {
    return { ...EMPTY };
  }

  const merged = new URLSearchParams();
  const rawHash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  if (rawHash && rawHash.includes('=') && !rawHash.startsWith('/')) {
    new URLSearchParams(rawHash).forEach((value, key) => merged.set(key, value));
  }
  url.searchParams.forEach((value, key) => merged.set(key, value));

  const out: RedirectAuthParams = {
    code: pick(merged, 'code'),
    error: pick(merged, 'error'),
    errorDescription: pick(merged, 'error_description'),
    errorCode: pick(merged, 'error_code'),
    accessToken: pick(merged, 'access_token'),
    refreshToken: pick(merged, 'refresh_token'),
    flowId: pick(merged, 'sb_flow_id'),
    hasParams: false,
    isError: false,
  };
  // A bare `?code=` from an unrelated service must not trigger sign-in handling.
  const looksLikeAuthCode = out.code.length > 8;
  out.hasParams = Boolean(out.error || out.accessToken || looksLikeAuthCode);
  out.isError = Boolean(out.error);
  if (out.isError) out.code = '';
  return out;
}

/**
 * Snapshot taken while the page is still loading — see the module comment.
 * `main.tsx` imports this file before `App`, so nothing has cleaned the URL yet.
 */
const captured: RedirectAuthParams =
  typeof window !== 'undefined' && window.location
    ? parseRedirectParams(window.location.href)
    : { ...EMPTY };

/**
 * The snapshot, as a copy: `clearRedirectParams()` empties the stored one, and a
 * caller that already read the parameters must keep seeing them while it
 * finishes the exchange.
 */
export function capturedRedirect(): RedirectAuthParams {
  return { ...captured };
}

/** True when the page was opened as an OAuth / email-link callback. */
export function hasAuthCallback(): boolean {
  return captured.hasParams;
}

/**
 * Removes the auth parameters from the address bar (tokens and one-time codes
 * should not stay in the URL / browser history) while keeping the current route.
 */
export function clearRedirectParams(): void {
  captured.hasParams = false;
  captured.isError = false;
  captured.code = '';
  captured.accessToken = '';
  captured.refreshToken = '';
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  try {
    const url = new URL(window.location.href);
    for (const key of AUTH_PARAM_KEYS) url.searchParams.delete(key);
    const rawHash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
    if (rawHash.includes('=') && !rawHash.startsWith('/')) {
      const hp = new URLSearchParams(rawHash);
      for (const key of AUTH_PARAM_KEYS) hp.delete(key);
      const rest = hp.toString();
      url.hash = rest ? `#${rest}` : '';
    }
    if (!url.hash) url.hash = '#/';
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    /* cosmetic only — never let URL cleanup break sign-in */
  }
}

/**
 * Where the provider should send the user back to. The address bar is reduced to
 * origin + path (no `?` / no `#`) so Supabase's redirect allow-list can match it
 * exactly and Google never has to deal with our hash routes.
 */
export function authRedirectUrl(): string {
  if (typeof window === 'undefined' || !window.location) return '';
  const { origin, pathname } = window.location;
  return `${origin}${pathname.replace(/index\.html$/, '')}`;
}

/** Keep the intended hash route through the provider's round trip. */
const RETURN_ROUTE_KEY = 'craftcv.auth.return-route';
export function rememberAuthRoute(): void {
  try {
    const route = window.location.hash.slice(1);
    const safe = /^\/(editor\/[a-zA-Z0-9_-]+|import|cover-letter|settings)$/.test(route);
    window.sessionStorage.setItem(RETURN_ROUTE_KEY, safe ? route : '/');
  } catch { /* Storage may be disabled. */ }
}
export function consumeAuthRoute(): string {
  try {
    const route = window.sessionStorage.getItem(RETURN_ROUTE_KEY) || '/';
    window.sessionStorage.removeItem(RETURN_ROUTE_KEY);
    return /^\/(editor\/[a-zA-Z0-9_-]+|import|cover-letter|settings)$/.test(route) ? route : '/';
  } catch { return '/'; }
}
