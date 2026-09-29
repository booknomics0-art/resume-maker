import { useCallback, useEffect, useState } from 'react';
import { login, signup, setLocalSession, markOfflineSession } from '../lib/auth';
import { cloudEnabled, SUPABASE_KEY_MALFORMED } from '../lib/supabase';
import {
  cloudSignIn, cloudSignUp, cloudStartGoogleSignIn,
  cloudGoogleProviderState, cloudOnAuthChange, pendingFlowInterrupted, clearPendingFlow,
  touchProfile, isEmbedded,
} from '../lib/cloud';
import { hasAuthCallback, withGoogleStart } from '../lib/authRedirect';
import { providerStateNote, type GoogleAuthIssue, type GoogleProviderState } from '../lib/googleAuth';
import { syncWithCloud } from '../lib/store';
import { trackEvent } from '../lib/track';
import GoogleSetupPanel from './GoogleSetupPanel';
import Footer from './Footer';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 5.9 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 5.9 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

import { LAYOUT_META, TEMPLATE_COUNT } from '../lib/templates';

export default function AuthPage({ onAuth, notice }: { onAuth: () => void; notice?: GoogleAuthIssue | null }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');

  // Google sign-in state
  const [googleState, setGoogleState] = useState<GoogleProviderState>('unknown');
  const [googleChecking, setGoogleChecking] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleIssue, setGoogleIssue] = useState<GoogleAuthIssue | null>(notice ?? null);
  const [showSetup, setShowSetup] = useState(false);
  // True when the handshake continues in another tab (embedded preview).
  const [awaitingTab, setAwaitingTab] = useState(false);
  const embedded = typeof window !== 'undefined' && isEmbedded();

  // A failed Google round-trip arrives as a prop from App.
  useEffect(() => {
    if (!notice) return;
    setGoogleIssue(notice);
    if (notice.showSetup) setShowSetup(true);
  }, [notice]);

  const refreshGoogleState = useCallback(async () => {
    if (!cloudEnabled()) { setGoogleState('unknown'); return; }
    setGoogleChecking(true);
    try {
      const probe = await cloudGoogleProviderState();
      setGoogleState(probe.state);
      return probe.state;
    } finally {
      setGoogleChecking(false);
    }
  }, []);

  // Label the button correctly on load instead of failing on click.
  useEffect(() => { void refreshGoogleState(); }, [refreshGoogleState]);

  // The Google flow may be running in a separate tab: inside embedded previews
  // (where Google refuses to render in a frame) `cloudStartGoogleSignIn()` opens
  // a real top-level tab. Once that tab finishes, the session is shared with
  // this one — follow along so the user does not have to reload by hand.
  useEffect(() => {
    if (!awaitingTab) return;
    return cloudOnAuthChange(() => onAuth());
  }, [awaitingTab, onAuth]);

  // Did this browser leave for Google (same-tab redirect) and come back with
  // nothing? Google's own “Access blocked” page (consent screen still in
  // Testing) never redirects back to us, so without this the user would just
  // see the login form again and no reason. A real callback is handled by App
  // instead — see cloudBootAuth(). New-tab popup flows are ignored by
  // pendingFlowInterrupted() so they do not false-alarm here.
  useEffect(() => {
    if (!cloudEnabled() || hasAuthCallback()) return;
    const pending = pendingFlowInterrupted();
    if (!pending.interrupted) return;
    setGoogleIssue({
      code: 'consent_testing',
      title: 'You came back from Google without finishing',
      message:
        'The tab returned through no callback of ours, which is what happens when Google refuses to show the sign-in screen — most often because the OAuth consent screen is still in “Testing”.',
      hint:
        'Email + password works right now (form above). To fix Google: press “Publish app” in Google Cloud → APIs & Services → OAuth consent screen (or add your email as a test user). Step 2 below walks you through it.',
      showSetup: true,
      raw: `left for Google (${pending.redirectTo || 'unknown address'}) and returned with no code`,
    });
    // Do NOT force the full setup panel open — keep the email form usable.
    // The user can open it with “Show me the fix”.
    setShowSetup(false);
  }, []);

  /**
   * Local (browser-only) account — used when Supabase is unreachable, or when
   * cloud is not configured at all. `offlineFallback` marks the session so a
   * later page load does not wipe it just because there is no cloud token.
   */
  const finishLocal = (res: { ok: boolean; error?: string }, asSignup: boolean, offlineFallback = false) => {
    if (res.ok) {
      clearPendingFlow();
      setGoogleIssue(null);
      setShowSetup(false);
      if (offlineFallback) markOfflineSession();
      if (asSignup) trackEvent('signup');
      onAuth();
      return true;
    }
    setError(res.error || 'Something went wrong.');
    return false;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (cloudEnabled()) {
      // Cloud account (Supabase Auth) — resumes sync across devices.
      // If Supabase cannot be reached (network / paused project / offline), fall
      // back to a local account so the user is never locked out of the app.
      setBusy(true);
      try {
        if (mode === 'signup') {
          if (!cleanName) { setError('Please enter your name.'); return; }
          const res = await cloudSignUp(cleanName, cleanEmail, pass);
          if (!res.ok) {
            if (res.unreachable) {
              const local = signup(cleanName, cleanEmail, pass);
              if (local.ok) {
                setInfo('Signed up offline — cloud is unreachable right now. Your account is saved in this browser; it will sync when the connection returns.');
                finishLocal(local, true, true);
                return;
              }
              setError(local.error || res.error || 'Sign up failed.');
              return;
            }
            setError(res.error || 'Sign up failed.');
            return;
          }
          if (res.needsConfirm) {
            setInfo('Account created! Check your email for a confirmation link, then log in.');
            setMode('login');
            return;
          }
          clearPendingFlow();
          setLocalSession(cleanName, cleanEmail, 'email');
        } else {
          const res = await cloudSignIn(cleanEmail, pass);
          if (!res.ok) {
            if (res.unreachable) {
              const local = login(cleanEmail, pass);
              if (local.ok) {
                setInfo('Signed in offline — cloud is unreachable right now. Your local account works in this browser.');
                finishLocal(local, false, true);
                return;
              }
              // No local account either — offer a clear path instead of a raw network error.
              setError(
                local.error
                  || 'Could not reach the cloud sign-in service. Check your internet, or create an account (Sign up) to use CraftCV offline in this browser.',
              );
              return;
            }
            setError(res.error || 'Login failed.');
            return;
          }
          clearPendingFlow();
          setLocalSession(res.user?.name || cleanEmail, cleanEmail, 'email');
        }
        setGoogleIssue(null);
        setShowSetup(false);
        void touchProfile();
        void syncWithCloud();
        onAuth();
      } finally {
        setBusy(false);
      }
      return;
    }
    // Offline / demo mode — local account in this browser only.
    const res = mode === 'signup' ? signup(cleanName, cleanEmail, pass) : login(cleanEmail, pass);
    finishLocal(res, mode === 'signup');
  };

  /**
   * Use one consistent OAuth redirect/PKCE flow on every origin. Google’s
   * client secret stays in Supabase; it is never sent to or bundled in the app.
   * The preflight in `cloudStartGoogleSignIn` catches a disabled provider before
   * the browser can land on Supabase’s raw JSON error page.
   */
  const googleClick = async () => {
    setError('');
    if (!cloudEnabled()) {
      setGoogleIssue({
        code: 'cloud_missing', title: 'Google login needs the cloud account',
        message: 'Google sign-in runs through Supabase, and this build has no Supabase project configured.',
        hint: 'Please use email + password, or set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.',
        showSetup: false, raw: '',
      });
      return;
    }
    if (googleState === 'disabled') {
      // Known-bad: skip the network round-trip and show the fix.
      setGoogleIssue((prev) => prev ?? {
        code: 'provider_disabled',
        title: 'Google login is switched off for this Supabase project',
        message: 'Supabase refused the sign-in because the Google provider is not enabled in your project settings.',
        hint: 'One-time switch inside Supabase (it stores your Google client secret): enable Google under Authentication → Providers. Steps below.',
        showSetup: true, raw: 'Provider (issuer "https://accounts.google.com") is not enabled',
      });
      setShowSetup(true);
      void refreshGoogleState();
      return;
    }

    setGoogleBusy(true);
    setGoogleIssue(null);
    setAwaitingTab(false);
    try {
      const res = await cloudStartGoogleSignIn();
      if (!res.ok) {
        setGoogleIssue(res.issue ?? null);
        if (res.issue?.showSetup) setShowSetup(true);
        // The setting may have changed (or our probe was stale) — re-read it.
        void refreshGoogleState();
      } else if (res.openedInNewTab) {
        // Embedded preview: Google's pages cannot be framed, so the handshake
        // continues in a real tab. Stay on this screen and pick the session up.
        setAwaitingTab(true);
        setInfo('Google sign-in opened in a new tab — finish it there and you will be signed in here automatically.');
      }
      // Otherwise the browser is already navigating to Google in this tab.
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
    <div className="auth-wrap" style={{ flex: 1 }}>
      <div className="auth-side">
        <div className="brand" style={{ padding: '0 0 26px' }}>
          <div className="brand-badge">CV</div>
          <div>
            <div className="brand-name">CraftCV</div>
            <div className="brand-sub">Resume Studio</div>
          </div>
        </div>
        <h1 style={{ color: '#fff', fontSize: 28, lineHeight: 1.25, margin: '0 0 12px' }}>
          Advanced resume maker.<br />
          <span style={{ color: 'var(--silver-300)' }}>Upload, Edit, Download — Simply.</span>
        </h1>
        <ul style={{ color: 'var(--silver-300)', fontSize: 14, lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
          <li>📤 Upload existing resume (PDF, DOCX, TXT, JSON) & advanced edit</li>
          <li>🎨 {TEMPLATE_COUNT} templates in {Object.keys(LAYOUT_META).length} families (photo, monogram, timeline, editorial…), 10 career fields</li>
          <li>🎁 100% free — unlimited downloads, no watermark, no payment</li>
          <li>☁️ Cloud-saved resumes — continue on any device</li>
        </ul>
      </div>

      <div className="auth-card-wrap">
        <form className="card auth-card" onSubmit={submit}>
          <div className="row" style={{ marginBottom: 16, background: 'var(--silver-100)', borderRadius: 9, padding: 4 }}>
            {(['login', 'signup'] as const).map((m) => (
              <button type="button" key={m}
                className={`btn small ${mode === m ? 'primary' : 'ghost'}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => { setMode(m); setError(''); }}>
                {m === 'login' ? 'Login' : 'Sign up'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mode === 'signup' && (
              <div>
                <label className="f">Full name</label>
                <input className="input" value={name} placeholder="e.g. Priya Verma" onChange={(e) => setName(e.target.value)} />
                <div className="hint" style={{ fontSize: 11 }}>Use letters, spaces, . ' and - only</div>
              </div>
            )}
            <div>
              <label className="f">Email</label>
              <input className="input" type="email" value={email} placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="f">Password {mode === 'signup' && <span style={{ fontWeight: 400, color: 'var(--silver-500)', fontSize: 11 }}>(min 8 chars, uppercase, lowercase, number, symbol)</span>}</label>
              <input className="input" type="password" value={pass} placeholder={mode === 'signup' ? 'Strong password required' : '••••••••'} onChange={(e) => setPass(e.target.value)} />
            </div>

            {error && <div className="notice err" style={{ margin: 0 }}>{error}</div>}
            {info && <div className="notice" style={{ margin: 0 }}>{info}</div>}

            <button className="btn primary" type="submit" disabled={busy} style={{ justifyContent: 'center', padding: '11px 16px' }}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Login →' : 'Create account →'}
            </button>
            {SUPABASE_KEY_MALFORMED && (
              <div className="notice warn" style={{ margin: 0, fontSize: 12.5 }}>
                <b>Cloud sign-in is unavailable in this build.</b>
                <div style={{ marginTop: 4 }}>
                  The Supabase anon key in this deployment does not look valid (it is missing, truncated, or rotated).
                  Cloud features are paused — email + password still works offline in this browser. To restore cloud sign-in,
                  set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your hosting platform
                  (Vercel → Settings → Environment Variables) using a fresh anon key from the Supabase dashboard, then redeploy.
                </div>
              </div>
            )}
            {!cloudEnabled() && !SUPABASE_KEY_MALFORMED && (
              <div className="hint" style={{ fontSize: 11.5, textAlign: 'center' }}>
                Offline mode — account & resumes stay in this browser. Cloud sync turns on once Supabase is configured.
              </div>
            )}

            <div className="row" style={{ gap: 12, color: 'var(--silver-400)', fontSize: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--silver-200)' }} /> or <div style={{ flex: 1, height: 1, background: 'var(--silver-200)' }} />
            </div>

            {embedded ? (
              <>
                <a
                  className="btn"
                  href={withGoogleStart(window.location.href)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ justifyContent: 'center', padding: '10px 16px' }}
                  onClick={() => {
                    setGoogleIssue(null);
                    setAwaitingTab(true);
                    setInfo('Google opened in a new tab. Finish sign-in there — that tab is where you will be signed in (this preview cannot show Google’s page).');
                  }}
                >
                  <GoogleIcon /> Continue with Google
                </a>
                <div className="hint" style={{ textAlign: 'center', fontSize: 11.5 }}>
                  Opens in a new tab — Google blocks its sign-in page inside this preview.
                </div>
              </>
            ) : (
              <button
                type="button"
                className="btn"
                onClick={googleClick}
                disabled={googleBusy}
                style={{ justifyContent: 'center', padding: '10px 16px' }}
              >
                <GoogleIcon /> {googleBusy ? 'Opening Google…' : 'Continue with Google'}
              </button>
            )}

            {googleState === 'disabled' && !showSetup && (
              <div
                className="notice warn"
                style={{ margin: 0, fontSize: 12.5, cursor: 'pointer' }}
                onClick={() => setShowSetup(true)}
              >
                ⚠️ {providerStateNote('disabled')}
              </div>
            )}

            {awaitingTab && (
              <div className="notice" style={{ margin: 0, fontSize: 12.5 }}>
                ⏳ Waiting for the Google tab… finish the sign-in there and you will be brought in here automatically.
              </div>
            )}

            {googleIssue && !showSetup && (
              <div className="notice err" style={{ margin: 0, fontSize: 12.5 }}>
                <b>{googleIssue.title}</b>
                <div style={{ marginTop: 2 }}>{googleIssue.message}</div>
                {googleIssue.hint && <div style={{ marginTop: 4, opacity: 0.85 }}>{googleIssue.hint}</div>}
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
                  💡 <b>Email + password still works</b> — use the form above while Google is fixed.
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {googleIssue.code === 'embedded_preview' && (
                    // Plain anchor with target="_blank": works even when scripts
                    // are not allowed to open windows from inside the frame.
                    <a className="btn small primary" href={window.location.href} target="_blank" rel="noreferrer noopener">
                      Open the app in a new tab ↗
                    </a>
                  )}
                  {googleIssue.code !== 'embedded_preview' && (
                    <button type="button" className="btn small" onClick={() => setShowSetup(true)}>
                      Show me the fix
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn small ghost"
                    onClick={() => { setGoogleIssue(null); setShowSetup(false); }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {showSetup && (
              <GoogleSetupPanel
                issue={googleIssue}
                state={googleState}
                rechecking={googleChecking}
                onRecheck={async () => {
                  const state = await refreshGoogleState();
                  if (state === 'enabled') {
                    setGoogleIssue(null);
                    setShowSetup(false);
                    setInfo('Google sign-in is enabled — press “Continue with Google”.');
                  }
                }}
                onClose={() => setShowSetup(false)}
              />
            )}

            <div className="hint" style={{ textAlign: 'center', fontSize: 11.5, lineHeight: 1.5 }}>
              By continuing, you agree to our <a href="#/terms">Terms</a> and <a href="#/privacy">Privacy Policy</a>.
            </div>
          </div>
        </form>
      </div>
    </div>
    <Footer />
    </div>
  );
}
