/**
 * CraftCV cloud layer (Supabase).
 *
 * Responsibilities
 *  - Auth: email/password + Google (ID token) through Supabase Auth
 *  - Data: every resume is stored in `public.resumes` (one row per resume, full JSON
 *    in `data`, plus indexed columns for name/field/template/completeness)
 *  - Events: downloads and product events for analytics
 *  - Sync: two-way merge between localStorage (offline copy) and the database
 *
 * All functions are safe to call when cloud is not configured — they resolve to
 * a neutral value and the app keeps working from localStorage.
 */

import { cloudEnabled, supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase';
import { completeness, type Resume } from './types';
import { auditLog } from './security';
import { authRedirectUrl, capturedRedirect, clearRedirectParams } from './authRedirect';
import {
  classifyAuthError, googleSetupInfo, issueFromRedirect, probeGoogleProvider,
  type GoogleAuthIssue, type GoogleSetupInfo, type ProviderProbe,
} from './googleAuth';

export const RESUMES_CHANGED_EVENT = 'craftcv:resumes-changed';
export const CLOUD_STATUS_EVENT = 'craftcv:cloud-status';

export type CloudStatus = 'off' | 'signed-out' | 'syncing' | 'synced' | 'error';
let status: CloudStatus = cloudEnabled() ? 'signed-out' : 'off';
let lastError = '';

function setStatus(s: CloudStatus, err = '') {
  status = s;
  lastError = err;
  window.dispatchEvent(new CustomEvent(CLOUD_STATUS_EVENT, { detail: { status: s, error: err } }));
}
export const cloudStatus = () => ({ status, error: lastError });

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface CloudUser {
  id: string;
  email: string;
  name: string;
  provider: 'email' | 'google';
}

function toCloudUser(u: { id: string; email?: string; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> } | null): CloudUser | null {
  if (!u || !u.email) return null;
  const meta = u.user_metadata ?? {};
  const provider = (u.app_metadata?.provider as string) === 'google' ? 'google' : 'email';
  return {
    id: u.id,
    email: u.email.toLowerCase(),
    name: String(meta.full_name ?? meta.name ?? u.email.split('@')[0]),
    provider,
  };
}

export async function cloudCurrentUser(): Promise<CloudUser | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return toCloudUser(data.session?.user ?? null);
}

function friendlyAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Wrong email or password.';
  if (m.includes('already registered') || m.includes('already exists')) return 'This email is already registered — please log in instead.';
  if (m.includes('email not confirmed')) return 'Please confirm your email first — check your inbox (and spam).';
  if (m.includes('rate limit')) return 'Too many attempts. Please wait a minute and try again.';
  // Provider problems (Google off, redirect URI wrong, …) get the full
  // explanation + setup steps instead of a raw server string.
  if (isProviderIssue(msg)) return providerIssueFrom(msg).message;
  if (m.includes('password')) return msg;
  return msg || 'Something went wrong. Please try again.';
}

function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try { return JSON.stringify(err); } catch { return String(err); }
}

function providerIssueFrom(msg: string, code = '', status?: number): GoogleAuthIssue {
  return classifyAuthError(msg, { code, status });
}

function isProviderIssue(msg: string): boolean {
  const issue = classifyAuthError(msg);
  return issue.code === 'provider_disabled' || issue.code === 'provider_misconfigured' || issue.code === 'redirect_not_allowed';
}

export async function cloudSignUp(name: string, email: string, password: string): Promise<{ ok: boolean; error?: string; needsConfirm?: boolean; user?: CloudUser }> {
  const sb = supabase();
  if (!sb) return { ok: false, error: 'Cloud not configured' };
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });
  if (error) { auditLog('CLOUD_SIGNUP_FAILED', { email, error: error.message }); return { ok: false, error: friendlyAuthError(error.message) }; }
  const user = toCloudUser(data.user);
  auditLog('CLOUD_SIGNUP_OK', { email });
  // When "Confirm email" is ON in Supabase Auth settings, session is null until confirmed.
  return { ok: true, needsConfirm: !data.session, user: user ?? undefined };
}

export async function cloudSignIn(email: string, password: string): Promise<{ ok: boolean; error?: string; user?: CloudUser }> {
  const sb = supabase();
  if (!sb) return { ok: false, error: 'Cloud not configured' };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { auditLog('CLOUD_LOGIN_FAILED', { email, error: error.message }); return { ok: false, error: friendlyAuthError(error.message) }; }
  auditLog('CLOUD_LOGIN_OK', { email });
  return { ok: true, user: toCloudUser(data.user) ?? undefined };
}

// ---------------------------------------------------------------------------
// Google sign-in (OAuth redirect through Supabase → Google)
// ---------------------------------------------------------------------------
//
// The old implementation used Google Identity Services (`accounts.google.com/gsi/client`)
// and handed the resulting ID token to `supabase.auth.signInWithIdToken()`. That
// route needs a *second* Google client (the GSI one) next to Supabase's, trips
// over the strict CSP/COOP headers this app ships, and — when the Supabase
// project has no Google provider enabled — fails with the infamous
//
//   Provider (issuer "https://accounts.google.com") is not enabled
//
// We now use the documented redirect flow: the browser goes to
// `https://<project>.supabase.co/auth/v1/authorize?provider=google`, Google
// authenticates the user, Supabase creates/loads the account and returns them to
// this app with a one-time `?code=…` (PKCE, see lib/supabase.ts), which we
// exchange for a session. Email + password is untouched and always available.

/** Where the owner has to click to switch Google on (deep links + exact values). */
export function googleSetup(): GoogleSetupInfo {
  const where = typeof window !== 'undefined' && window.location ? window.location.href : '';
  return googleSetupInfo(where, SUPABASE_URL);
}

/** Is Google enabled on the Supabase project? Used to label the login screen. */
export async function cloudGoogleProviderState(): Promise<ProviderProbe> {
  if (!cloudEnabled()) return { state: 'unknown', detail: 'cloud not configured' };
  return probeGoogleProvider({ url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY });
}

/**
 * Belt and braces before a real navigation: ask Supabase what it thinks of the
 * authorize URL. A 3xx towards Google is the happy path (it reaches us as an
 * opaque redirect); a readable error body means the browser would have rendered
 * raw JSON on supabase.co, so we surface it in-app instead.
 */
async function guardAuthorizeUrl(authorizeUrl: string): Promise<{ ok: boolean; issue?: GoogleAuthIssue }> {
  if (typeof fetch !== 'function') return { ok: true };
  try {
    const res = await fetch(authorizeUrl, {
      method: 'GET',
      redirect: 'manual',
      credentials: 'omit',
      cache: 'no-store',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (res.type === 'opaqueredirect' || res.status === 0 || res.ok) return { ok: true };
    let serverText = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as Record<string, unknown>;
      serverText = String(body.msg ?? body.error_description ?? body.error ?? body.message ?? serverText);
    } catch { /* not JSON — keep the status text */ }
    auditLog('CLOUD_GOOGLE_BLOCKED', { status: res.status, serverText: serverText.slice(0, 160) });
    return { ok: false, issue: providerIssueFrom(serverText, '', res.status) };
  } catch {
    // Offline / CORS hiccup — let the real navigation decide.
    return { ok: true };
  }
}

/**
 * Starts the Google sign-in redirect. Resolves only when something went wrong
 * *before* leaving the page (on success the browser navigates away), so the
 * caller can always show a specific, fixable message.
 */
export async function cloudStartGoogleSignIn(): Promise<{ ok: boolean; issue?: GoogleAuthIssue }> {
  const sb = supabase();
  if (!sb) return { ok: false, issue: classifyAuthError('cloud not configured', { cloudMissing: true }) };

  // 1. Cheapest, friendliest check: is the provider enabled at all?
  const probe = await cloudGoogleProviderState();
  if (probe.state === 'disabled') {
    auditLog('CLOUD_GOOGLE_BLOCKED', { reason: 'google provider disabled in Supabase' });
    return { ok: false, issue: classifyAuthError('provider is not enabled') };
  }

  // 2. Build the authorize URL through supabase-js so the PKCE verifier is stored.
  let authorizeUrl = '';
  try {
    const { data, error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: authRedirectUrl(),
        // We navigate ourselves, after the guard below.
        skipBrowserRedirect: true,
        // Let people pick the account instead of silently reusing the last one.
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) return { ok: false, issue: providerIssueFrom(error.message, error.code ?? '', error.status) };
    authorizeUrl = data?.url ?? '';
  } catch (err) {
    return { ok: false, issue: classifyAuthError(errorText(err)) };
  }
  if (!authorizeUrl) return { ok: false, issue: classifyAuthError('Supabase did not return a sign-in URL') };

  // 3. Validate, then hand the browser over to Supabase/Google.
  const guard = await guardAuthorizeUrl(authorizeUrl);
  if (!guard.ok) return { ok: false, issue: guard.issue };
  auditLog('CLOUD_GOOGLE_START', { redirectTo: authRedirectUrl() });
  window.location.assign(authorizeUrl);
  return { ok: true };
}

export interface RedirectSignInResult {
  /** True when the page really was an auth callback (so callers can skip fallbacks). */
  attempted: boolean;
  ok: boolean;
  user?: CloudUser;
  issue?: GoogleAuthIssue;
}

/**
 * Finishes the round-trip: reads the callback parameters, cleans the address bar
 * and exchanges the one-time code for a real session.
 */
export async function cloudCompleteRedirectSignIn(): Promise<RedirectSignInResult> {
  const params = capturedRedirect();
  if (!params.hasParams) return { attempted: false, ok: false };

  // One-time codes and tokens must not stay in the URL / history.
  clearRedirectParams();

  if (params.isError) {
    const issue = issueFromRedirect(params);
    auditLog('CLOUD_GOOGLE_CALLBACK_ERROR', {
      error: params.error, description: params.errorDescription.slice(0, 200),
    });
    return { attempted: true, ok: false, issue };
  }

  const sb = supabase();
  if (!sb) return { attempted: true, ok: false, issue: classifyAuthError('cloud not configured', { cloudMissing: true }) };

  try {
    if (params.code) {
      const { data, error } = await sb.auth.exchangeCodeForSession(
        params.code,
        params.flowId ? { flowId: params.flowId } : undefined,
      );
      if (error) {
        auditLog('CLOUD_GOOGLE_EXCHANGE_FAILED', { code: error.code, error: error.message });
        return { attempted: true, ok: false, issue: providerIssueFrom(error.message, error.code ?? '', error.status) };
      }
      const user = toCloudUser(data.session?.user ?? data.user ?? null);
      if (!user) {
        return {
          attempted: true, ok: false,
          issue: classifyAuthError('Supabase returned no user for this sign-in'),
        };
      }
      auditLog('CLOUD_GOOGLE_OK', { email: user.email });
      return { attempted: true, ok: true, user };
    }

    // Legacy implicit-flow callbacks (`#access_token=…`) — kept so older links work.
    if (params.accessToken && params.refreshToken) {
      const { data, error } = await sb.auth.setSession({
        access_token: params.accessToken,
        refresh_token: params.refreshToken,
      });
      if (error) return { attempted: true, ok: false, issue: providerIssueFrom(error.message, error.code ?? '', error.status) };
      const user = toCloudUser(data.session?.user ?? null);
      if (!user) return { attempted: true, ok: false, issue: classifyAuthError('Supabase returned no user for this sign-in') };
      auditLog('CLOUD_GOOGLE_OK', { email: user.email });
      return { attempted: true, ok: true, user };
    }

    return { attempted: true, ok: false, issue: classifyAuthError('The sign-in link carried no code or token') };
  } catch (err) {
    return { attempted: true, ok: false, issue: classifyAuthError(errorText(err)) };
  }
}

let bootPromise: Promise<RedirectSignInResult> | null = null;

/**
 * Runs the callback handshake **once per page load**. React 18 StrictMode mounts
 * effects twice (and a failed code is single-use), so both callers share one
 * promise instead of racing to exchange the same code.
 */
export function cloudBootAuth(): Promise<RedirectSignInResult> {
  bootPromise ??= cloudCompleteRedirectSignIn();
  return bootPromise;
}

export async function cloudSignOut(): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  await sb.auth.signOut();
  setStatus('signed-out');
}

export async function cloudDeleteAccount(): Promise<{ ok: boolean; error?: string }> {
  const sb = supabase();
  if (!sb) return { ok: false, error: 'Cloud not configured' };
  // Calls a SECURITY DEFINER function defined in the migration; deletes profile,
  // resumes and the auth user itself.
  const { error } = await sb.rpc('delete_my_account');
  if (error) return { ok: false, error: error.message };
  await sb.auth.signOut();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Resumes
// ---------------------------------------------------------------------------

interface ResumeRow {
  client_id: string;
  user_id: string;
  name: string;
  field_id: string;
  template_id: string;
  completeness: number;
  data: Resume;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

function toRow(r: Resume, userId: string): Omit<ResumeRow, 'created_at'> & { created_at: string } {
  return {
    client_id: r.id,
    user_id: userId,
    name: r.name?.slice(0, 200) || 'Untitled resume',
    field_id: r.fieldId,
    template_id: r.templateId,
    completeness: completeness(r),
    data: r,
    created_at: new Date(r.createdAt || Date.now()).toISOString(),
    updated_at: new Date(r.updatedAt || Date.now()).toISOString(),
    is_deleted: false,
  };
}

/** Upsert one resume (called after every local save; debounced by the store). */
export async function pushResume(r: Resume): Promise<boolean> {
  const sb = supabase();
  if (!sb) return false;
  const user = await cloudCurrentUser();
  if (!user) return false;
  setStatus('syncing');
  const { error } = await sb.from('resumes').upsert(toRow(r, user.id), { onConflict: 'user_id,client_id' });
  if (error) { setStatus('error', error.message); auditLog('CLOUD_PUSH_FAILED', { id: r.id, error: error.message }); return false; }
  setStatus('synced');
  return true;
}

/** Soft-delete (row kept 30 days for undo / support, purged by the cleanup job). */
export async function removeResume(clientId: string): Promise<boolean> {
  const sb = supabase();
  if (!sb) return false;
  const user = await cloudCurrentUser();
  if (!user) return false;
  const { error } = await sb
    .from('resumes')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('client_id', clientId);
  if (error) { setStatus('error', error.message); return false; }
  return true;
}

/** All live resumes for the signed-in user. */
export async function pullResumes(): Promise<Resume[] | null> {
  const sb = supabase();
  if (!sb) return null;
  const user = await cloudCurrentUser();
  if (!user) return null;
  setStatus('syncing');
  const { data, error } = await sb
    .from('resumes')
    .select('data, updated_at')
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false });
  if (error) { setStatus('error', error.message); auditLog('CLOUD_PULL_FAILED', { error: error.message }); return null; }
  setStatus('synced');
  return (data ?? []).map((row) => {
    const r = row.data as Resume;
    // trust the DB clock for ordering
    r.updatedAt = Math.max(r.updatedAt || 0, Date.parse(row.updated_at) || 0);
    return r;
  });
}

/**
 * Two-way merge: newest `updatedAt` wins per resume id. Local-only resumes are
 * pushed; cloud-only resumes are added locally. Returns the merged list.
 */
export async function syncAll(local: Resume[], saveLocal: (list: Resume[]) => void): Promise<Resume[]> {
  const remote = await pullResumes();
  if (remote === null) return local;

  const byId = new Map<string, Resume>();
  for (const r of remote) byId.set(r.id, r);
  const toPush: Resume[] = [];
  for (const l of local) {
    const c = byId.get(l.id);
    if (!c) { byId.set(l.id, l); toPush.push(l); continue; }
    if ((l.updatedAt || 0) > (c.updatedAt || 0)) { byId.set(l.id, l); toPush.push(l); }
  }
  const merged = [...byId.values()].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  saveLocal(merged);
  window.dispatchEvent(new Event(RESUMES_CHANGED_EVENT));
  // push in the background, sequentially to be gentle on rate limits
  (async () => { for (const r of toPush) await pushResume(r); })();
  return merged;
}

// ---------------------------------------------------------------------------
// Events / analytics
// ---------------------------------------------------------------------------

export async function logEvent(type: string, payload: Record<string, unknown> = {}): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  const user = await cloudCurrentUser();
  await sb.from('events').insert({ user_id: user?.id ?? null, type: type.slice(0, 60), payload });
}

/** Called right before window.print(). Counts downloads per resume/template. */
export function recordDownload(r: Resume): void {
  auditLog('DOWNLOAD', { id: r.id, template: r.templateId });
  const sb = supabase();
  if (!sb) return;
  (async () => {
    const user = await cloudCurrentUser();
    if (!user) return;
    await sb.from('resume_downloads').insert({
      user_id: user.id,
      client_id: r.id,
      template_id: r.templateId,
      field_id: r.fieldId,
    });
  })().catch(() => { /* analytics must never block a download */ });
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function touchProfile(): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  const user = await cloudCurrentUser();
  if (!user) return;
  await sb.from('profiles').upsert(
    { id: user.id, email: user.email, full_name: user.name, provider: user.provider, last_seen_at: new Date().toISOString() },
    { onConflict: 'id' },
  );
}
