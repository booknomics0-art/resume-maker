/**
 * Google OAuth client used by “Continue with Google”.
 *
 * The client ID is public (it ships in every browser). The client *secret*
 * must never be imported here — it lives only in server env (`.env`,
 * Supabase → Authentication → Providers → Google). ID-token sign-in does not
 * need the secret: Supabase verifies the token with Google's public keys, and
 * the token's `aud` must be this client ID.
 *
 * JavaScript origins registered on this client (checked 2026-09-27):
 *   https://resume-maker-ivory-ten.vercel.app
 * The authorized redirect URI is the Supabase callback, so every other origin
 * (preview, localhost, Netlify) uses the redirect flow instead of this button.
 */

export const GOOGLE_CLIENT_ID =
  ((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim())
  || '854985942115-ns0npfc14kimq2nno8n10qkgagr85cfg.apps.googleusercontent.com';

/** Origins allowed to run the Google Identity Services button for this client. */
export const GOOGLE_JS_ORIGINS = [
  'https://resume-maker-ivory-ten.vercel.app',
];

export function googleJsOriginAllowed(origin: string): boolean {
  return GOOGLE_JS_ORIGINS.includes(origin);
}

export function randomNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Hex SHA-256. Google receives this; Supabase receives the raw nonce and hashes it the same way. */
export async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdApi {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    nonce?: string;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    itp_support?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdApi } };
  }
}

let gsiPromise: Promise<void> | null = null;

export function loadGoogleIdentity(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Google sign-in needs a browser'));
  }
  if (window.google?.accounts?.id) return Promise.resolve();
  gsiPromise ??= new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-craftcv-gsi="1"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Could not load Google sign-in')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.craftcvGsi = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Google sign-in'));
    document.head.appendChild(script);
  });
  return gsiPromise;
}

/**
 * Renders Google's own “Continue with Google” button. The click stays inside
 * Google's iframe (a script cannot forward the user gesture into it), and the
 * callback receives an ID token for `cloudSignInWithGoogleIdToken`.
 */
export async function mountGoogleButton(
  host: HTMLElement,
  onCredential: (idToken: string, nonce: string) => void,
): Promise<void> {
  await loadGoogleIdentity();
  const id = window.google?.accounts?.id;
  if (!id) throw new Error('Google sign-in library did not start');
  const nonce = randomNonce();
  const hashed = await sha256Hex(nonce);
  id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response) => {
      if (response.credential) onCredential(response.credential, nonce);
    },
    nonce: hashed,
    auto_select: false,
    cancel_on_tap_outside: true,
    itp_support: true,
  });
  const width = Math.max(240, Math.min(360, Math.floor(host.clientWidth || 320)));
  host.replaceChildren();
  id.renderButton(host, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'rectangular',
    width,
    logo_alignment: 'left',
  });
}
