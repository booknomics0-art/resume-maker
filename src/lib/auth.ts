// Lightweight client-side auth (demo mode). Data stays in this browser.
// For production, swap these functions for a real backend (Supabase/Firebase)
// — the call signatures are already backend-shaped.

export interface User {
  name: string;
  email: string;
  provider: 'email' | 'google';
  createdAt: number;
}

interface StoredUser extends User {
  pass?: string; // base64 for demo purposes only — never do this in production
}

const USERS_KEY = 'craftcv.users.v1';
const SESSION_KEY = 'craftcv.session.v1';

function loadUsers(): Record<string, StoredUser> {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveUsers(u: Record<string, StoredUser>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(u));
}

export function signup(name: string, email: string, pass: string): { ok: boolean; error?: string } {
  const key = email.trim().toLowerCase();
  if (!name.trim()) return { ok: false, error: 'Please enter your name.' };
  if (!/^\S+@\S+\.\S+$/.test(key)) return { ok: false, error: 'Please enter a valid email address.' };
  if (pass.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
  const users = loadUsers();
  if (users[key]) return { ok: false, error: 'This email is already registered — please log in instead.' };
  const user: StoredUser = { name: name.trim(), email: key, provider: 'email', createdAt: Date.now(), pass: btoa(pass) };
  users[key] = user;
  saveUsers(users);
  localStorage.setItem(SESSION_KEY, key);
  return { ok: true };
}

export function login(email: string, pass: string): { ok: boolean; error?: string } {
  const key = email.trim().toLowerCase();
  const users = loadUsers();
  const u = users[key];
  if (!u) return { ok: false, error: 'No account found with this email — please sign up first.' };
  if (u.provider === 'google') return { ok: false, error: 'This account was created with Google — please continue with Google.' };
  if (u.pass !== btoa(pass)) return { ok: false, error: 'Incorrect password. Please try again.' };
  localStorage.setItem(SESSION_KEY, key);
  return { ok: true };
}

export function loginWithGoogle(name: string, email: string): { ok: boolean } {
  const key = email.trim().toLowerCase();
  const users = loadUsers();
  users[key] = { name: name.trim() || key.split('@')[0], email: key, provider: 'google', createdAt: Date.now() };
  saveUsers(users);
  localStorage.setItem(SESSION_KEY, key);
  return { ok: true };
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function currentUser(): User | null {
  const key = localStorage.getItem(SESSION_KEY);
  if (!key) return null;
  const u = loadUsers()[key];
  if (!u) return null;
  const { pass: _pass, ...rest } = u;
  return rest;
}
