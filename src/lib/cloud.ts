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

import { cloudEnabled, supabase } from './supabase';
import { completeness, type Resume } from './types';
import { auditLog } from './security';

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
  if (m.includes('password')) return msg;
  return msg || 'Something went wrong. Please try again.';
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

/** Google One-Tap / GSI credential (JWT) → Supabase session. Requires Google provider enabled in Supabase. */
export async function cloudSignInWithGoogle(idToken: string): Promise<{ ok: boolean; error?: string; user?: CloudUser }> {
  const sb = supabase();
  if (!sb) return { ok: false, error: 'Cloud not configured' };
  const { data, error } = await sb.auth.signInWithIdToken({ provider: 'google', token: idToken });
  if (error) { auditLog('CLOUD_GOOGLE_FAILED', { error: error.message }); return { ok: false, error: friendlyAuthError(error.message) }; }
  return { ok: true, user: toCloudUser(data.user) ?? undefined };
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
