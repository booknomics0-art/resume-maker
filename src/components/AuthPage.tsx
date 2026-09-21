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

  // Load Google Identity Services only if a client id is configured
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
        'To enable Google Sign-In, paste your Google Cloud Console Client ID into src/config.ts. Until then, please continue with email and password.',
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
            <div className="brand-sub">Resume Studio</div>
          </div>
        </div>
        <h1 style={{ color: '#fff', fontSize: 30, lineHeight: 1.25, margin: '0 0 12px' }}>
          10 minute me ek professional resume.<br />
          <span style={{ color: 'var(--silver-300)' }}>Clean. Concrete. Human.</span>
        </h1>
        <ul style={{ color: 'var(--silver-300)', fontSize: 14.5, lineHeight: 2, paddingLeft: 18, margin: 0 }}>
          <li>10 career fields — ready-made templates in every step</li>
          <li>5 navy &amp; silver designs, tuned field-by-field</li>
          <li>Mandatory fields guided, PDF download free</li>
          <li>Your data stays in your browser — no servers involved</li>
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
                <input className="input" value={name} placeholder="e.g. Priya Verma"
                  onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <div>
              <label className="f">Email</label>
              <input className="input" type="email" value={email} placeholder="you@example.com"
                onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="f">Password</label>
              <input className="input" type="password" value={pass} placeholder={mode === 'signup' ? 'Minimum 6 characters' : '••••••'}
                onChange={(e) => setPass(e.target.value)} />
            </div>

            {error && <div className="notice err" style={{ margin: 0 }}>{error}</div>}

            <button className="btn primary" type="submit" style={{ justifyContent: 'center', padding: '11px 16px' }}>
              {mode === 'login' ? 'Login →' : 'Create account →'}
            </button>

            <div className="row" style={{ gap: 12, color: 'var(--silver-400)', fontSize: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--silver-200)' }} /> or <div style={{ flex: 1, height: 1, background: 'var(--silver-200)' }} />
            </div>

            <button type="button" className="btn" onClick={googleClick}
              style={{ justifyContent: 'center', padding: '10px 16px' }}>
              <GoogleIcon /> Continue with Google
            </button>
            {googleNote && <div className="notice warn" style={{ margin: 0, fontSize: 12.5 }}>{googleNote}</div>}

            <div className="hint" style={{ textAlign: 'center' }}>
              Demo mode: your account is stored in this browser only. In production this connects to Google OAuth / Supabase.
            </div>
          </div>
        </form>
      </div>
    </div>
    <Footer />
    </div>
  );
}
