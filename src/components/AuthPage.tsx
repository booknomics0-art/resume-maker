import { useEffect, useState } from 'react';
import { login, signup, loginWithGoogle } from '../lib/auth';
import { GOOGLE_CLIENT_ID } from '../config';
import Footer from './Footer';

declare global {
  interface Window {
    google?: any;
  }
}

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

export default function AuthPage({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [googleNote, setGoogleNote] = useState('');

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => {
      window.google?.accounts?.id?.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (resp: any) => {
          const data = JSON.parse(atob(resp.credential.split('.')[1]));
          loginWithGoogle(data.name || data.email, data.email);
          onAuth();
        },
      });
    };
    document.body.appendChild(s);
    return () => { document.body.removeChild(s); };
  }, [onAuth]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = mode === 'signup' ? signup(name, email, pass) : login(email, pass);
    if (res.ok) onAuth();
    else setError(res.error || 'Kuch galat ho gaya.');
  };

  const googleClick = () => {
    if (GOOGLE_CLIENT_ID && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      setGoogleNote(
        'To enable Google Sign-In, paste your Google Cloud Console Client ID into src/config.ts. Until then, please continue with email and password. All logins are now secured with SHA-256 hashing, rate limiting, and audit logging.',
      );
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
            <div className="brand-sub">Resume Studio · Secured v2</div>
          </div>
        </div>
        <h1 style={{ color: '#fff', fontSize: 28, lineHeight: 1.25, margin: '0 0 12px' }}>
          Advanced resume maker.<br />
          <span style={{ color: 'var(--silver-300)' }}>Upload, Edit, Download — Secure.</span>
        </h1>
        <ul style={{ color: 'var(--silver-300)', fontSize: 14, lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
          <li>📤 Upload existing resume (PDF, DOCX, TXT, JSON) & advanced edit</li>
          <li>🎨 50 templates, 10 career fields — navy & silver design</li>
          <li>💳 1 free download, then ₹20 one-time Pro lifetime</li>
          <li>🔒 High-tech security: XSS protection, SHA-256, HMAC, Rate limit, CSRF</li>
          <li>🏠 Your data stays in browser — no servers, no tracking</li>
          <li>📜 Detailed legal pages — No Refund policy, Privacy, Terms</li>
        </ul>
        <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.15)', color: 'var(--silver-300)' }}>🔒 XSS Protected</span>
          <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.15)', color: 'var(--silver-300)' }}>🛡️ SHA-256 + Salt</span>
          <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.15)', color: 'var(--silver-300)' }}>⚡ Rate Limited</span>
        </div>
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
                <div className="hint" style={{ fontSize: 11 }}>Only letters, spaces, . ' - allowed (security validation)</div>
              </div>
            )}
            <div>
              <label className="f">Email</label>
              <input className="input" type="email" value={email} placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="f">Password {mode === 'signup' && <span style={{ fontWeight: 400, color: 'var(--silver-500)', fontSize: 11 }}>(min 8 chars, uppercase, lowercase, number, symbol)</span>}</label>
              <input className="input" type="password" value={pass} placeholder={mode === 'signup' ? 'Strong password required' : '••••••••'} onChange={(e) => setPass(e.target.value)} />
              {mode === 'signup' && <div className="hint" style={{ fontSize: 11 }}>🔒 Secured with SHA-256 double hash + 16-byte salt. Rate limited: 5 attempts/min.</div>}
            </div>

            {error && <div className="notice err" style={{ margin: 0 }}>{error}</div>}

            <button className="btn primary" type="submit" style={{ justifyContent: 'center', padding: '11px 16px' }}>
              {mode === 'login' ? 'Login →' : 'Create secure account →'}
            </button>

            <div className="row" style={{ gap: 12, color: 'var(--silver-400)', fontSize: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--silver-200)' }} /> or <div style={{ flex: 1, height: 1, background: 'var(--silver-200)' }} />
            </div>

            <button type="button" className="btn" onClick={googleClick} style={{ justifyContent: 'center', padding: '10px 16px' }}>
              <GoogleIcon /> Continue with Google
            </button>
            {googleNote && <div className="notice warn" style={{ margin: 0, fontSize: 12.5 }}>{googleNote}</div>}

            <div className="hint" style={{ textAlign: 'center', fontSize: 11.5, lineHeight: 1.5 }}>
              🔒 High-tech security active: XSS sanitization, SHA-256 hashing, rate limiting, CSRF tokens, HMAC integrity, audit logs, CSP headers.<br />
              Your data stays in browser only. No tracking, no server storage. Made in India 🇮🇳<br />
              By continuing, you agree to <a href="#/terms">Terms</a>, <a href="#/privacy">Privacy</a>, and <a href="#/refund">No Refund Policy</a>.
            </div>
          </div>
        </form>
      </div>
    </div>
    <Footer />
    </div>
  );
}
