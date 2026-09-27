import { lazy, Suspense, useEffect, useState } from 'react';
import TemplateLibrary from './components/TemplateLibrary';
import Dashboard from './components/Dashboard';
import Editor from './components/Editor';
const Settings = lazy(() => import('./components/Settings'));
import AuthPage from './components/AuthPage';
import Landing from './components/Landing';
import Footer from './components/Footer';
const ResumeImporter = lazy(() => import('./components/ResumeImporter'));
const CoverLetter = lazy(() => import('./components/CoverLetter'));
import {
  AboutPage, ContactPage, FaqPage, PrivacyPage, TermsPage,
  DisclaimerPage, CookiePage, EulaPage,
} from './components/LegalPages';
import { currentUser, logout, setLocalSession, isOfflineSession, type User } from './lib/auth';
import { initSecurity } from './lib/security';
import { cloudEnabled } from './lib/supabase';
import { cloudBootAuth, cloudCurrentUser, touchProfile } from './lib/cloud';
import { consumeAuthRoute, hasAuthCallback } from './lib/authRedirect';
import type { GoogleAuthIssue } from './lib/googleAuth';
import { syncWithCloud } from './lib/store';

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const fn = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);
  return hash.replace(/^#/, '') || '/';
}

export const navigate = (to: string) => {
  window.location.hash = to;
};

export default function App() {
  const [user, setUser] = useState<User | null>(() => currentUser());
  const [menuOpen, setMenuOpen] = useState(false);
  // True while an OAuth callback (`?code=…`) is being exchanged, so the visitor
  // sees "signing you in" instead of the login form and then a jump.
  const [booting, setBooting] = useState(() => cloudEnabled() && hasAuthCallback());
  const [authNotice, setAuthNotice] = useState<GoogleAuthIssue | null>(null);
  const tab = useHashRoute();

  // Initialize application protections on mount
  useEffect(() => {
    initSecurity();
  }, []);

  // Cloud: finish a Google/email redirect round-trip, restore the Supabase session
  // (e.g. new device / after email confirm) and merge cloud resumes into the copy
  // stored in this browser.
  useEffect(() => {
    if (!cloudEnabled()) return;
    let cancelled = false;
    (async () => {
      // Was this page opened as an OAuth callback? Finish it before anything
      // else. `cloudBootAuth()` resolves one shared promise per page load, so a
      // React StrictMode double-mount cannot burn the single-use code twice and
      // failures keep their explanation.
      const redirect = await cloudBootAuth();
      if (cancelled) return;

      if (redirect.attempted) {
        if (redirect.ok && redirect.user) {
          setLocalSession(redirect.user.name, redirect.user.email, redirect.user.provider);
          setUser(currentUser());
          void touchProfile();
          navigate(consumeAuthRoute());
          void syncWithCloud();
        } else {
          // e.g. "Google login is switched off for this project" — shown on the
          // login card together with the exact fix, never as a silent failure.
          setAuthNotice(redirect.issue ?? null);
        }
        setBooting(false);
        return;
      }

      const cu = await cloudCurrentUser();
      if (cancelled) return;
      if (cu) {
        if (!currentUser() || currentUser()?.email !== cu.email) {
          setLocalSession(cu.name, cu.email, cu.provider);
          setUser(currentUser());
        }
        void touchProfile();
        await syncWithCloud();
      } else if (currentUser() && !isOfflineSession()) {
        // A local session without its cloud session must sign in again —
        // unless it was an intentional offline fallback (cloud unreachable at
        // signup/login). Those stay so the user is never locked out of CraftCV.
        logout();
        setUser(null);
      }
      setBooting(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // close drawer on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [tab]);

  // lock body scroll when drawer open on mobile
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  if (booting) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--navy-900, #0F2148)', color: '#fff', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div className="brand-badge" style={{ margin: '0 auto 14px' }}>CV</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Signing you in…</div>
          <div style={{ opacity: 0.75, fontSize: 13.5, marginTop: 6 }}>
            Securely completing your sign-in. One moment.
          </div>
        </div>
      </div>
    );
  }

  const publicPages: Record<string, React.ReactNode> = {
    '/templates': <TemplateLibrary />, '/about': <AboutPage />, '/contact': <ContactPage />, '/privacy': <PrivacyPage />,
    '/terms': <TermsPage />, '/faq': <FaqPage />, '/disclaimer': <DisclaimerPage />,
    '/cookies': <CookiePage />, '/eula': <EulaPage />,
  };
  if (!user && publicPages[tab]) return <div className="public-page"><a className="btn" href="#/">← Back to CraftCV</a>{publicPages[tab]}<Footer /></div>;

  if (!user) {
    // Logged-out visitors get the public storefront on the home route — the
    // product pitch (hero, templates, FAQ) comes BEFORE any login wall.
    if (tab === '/' || tab === '' || !tab.startsWith('/')) {
      return (
        <Landing
          notice={authNotice}
          onStart={(target) => navigate(target || '/editor/new')}
        />
      );
    }
    // Any other deep link (e.g. a bookmarked #/editor/…) keeps the old
    // behaviour: show the login page first.
    return <AuthPage onAuth={() => setUser(currentUser())} notice={authNotice} />;
  }

  let page: React.ReactNode;
  let active = '/';
  if (tab.startsWith('/editor/')) {
    page = <Editor key={tab} id={tab.slice('/editor/'.length)} />;
    active = '/editor';
  } else if (tab === '/templates') {
    page = <TemplateLibrary />; active = '/templates';
  } else if (tab === '/import') {
    page = <ResumeImporter />;
    active = '/import';
  } else if (tab === '/cover-letter') {
    page = <CoverLetter />;
    active = '/cover-letter';
  } else if (tab === '/settings') {
    page = <Settings />;
    active = '/settings';
  } else if (tab === '/about') {
    page = <AboutPage />;
    active = '/about';
  } else if (tab === '/contact') {
    page = <ContactPage />;
    active = '/contact';
  } else if (tab === '/privacy') {
    page = <PrivacyPage />;
    active = '/privacy';
  } else if (tab === '/terms') {
    page = <TermsPage />;
    active = '/terms';
  } else if (tab === '/faq') {
    page = <FaqPage />;
    active = '/faq';
  } else if (tab === '/disclaimer') {
    page = <DisclaimerPage />;
    active = '/disclaimer';
  } else if (tab === '/cookies') {
    page = <CookiePage />;
    active = '/cookies';
  } else if (tab === '/eula') {
    page = <EulaPage />;
    active = '/eula';
  } else {
    page = <Dashboard />;
  }

  const NavLink = ({ to, id, children }: { to: string; id: string; children: React.ReactNode }) => (
    <a
      className={`nav-item ${active === id ? 'active' : ''}`}
      href={`#${to}`}
      onClick={(e) => { e.preventDefault(); navigate(to); }}
    >
      {children}
    </a>
  );

  return (
    <div className="shell">
      {/* Mobile top bar — visible only on small screens */}
      <header className="mobile-topbar no-print">
        <button
          className="menu-btn"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
        >
          <span className="hamburger" aria-hidden>
            <span></span><span></span><span></span>
          </span>
        </button>
        <a href="#/" onClick={(e)=>{e.preventDefault(); navigate('/');}} className="mobile-brand">
          <div className="brand-badge">CV</div>
          <span className="mobile-brand-name">CraftCV</span>
        </a>
        <div className="mobile-top-actions">
          <button className="btn small primary" onClick={() => navigate('/editor/new')} style={{ padding: '7px 12px', fontSize: 13 }}>+ New</button>
        </div>
      </header>

      {/* Sidebar / Drawer */}
      <aside className={`sidebar no-print ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-badge">CV</div>
          <div>
            <div className="brand-name">CraftCV</div>
            <div className="brand-sub">Resume Studio · Free</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" id="/"><span className="nav-icon">▦</span> Dashboard</NavLink>
          <NavLink to="/editor/new" id="/editor"><span className="nav-icon">✎</span> New resume</NavLink>
          <NavLink to="/templates" id="/templates"><span className="nav-icon">▧</span> Templates</NavLink>
          <NavLink to="/import" id="/import"><span className="nav-icon">📤</span> Upload & Edit</NavLink>
          <NavLink to="/cover-letter" id="/cover-letter"><span className="nav-icon">✉</span> Cover letter</NavLink>
          <NavLink to="/settings" id="/settings"><span className="nav-icon">⚙</span> Settings</NavLink>
        </nav>

        {/* Mobile-only quick links section inside drawer */}
        <div className="drawer-extra">
          <div className="drawer-label">Help & Legal</div>
          <a className="drawer-link" href="#/about" onClick={(e)=>{e.preventDefault();navigate('/about');}}>About us</a>
          <a className="drawer-link" href="#/faq" onClick={(e)=>{e.preventDefault();navigate('/faq');}}>FAQ</a>
          <a className="drawer-link" href="#/contact" onClick={(e)=>{e.preventDefault();navigate('/contact');}}>Contact</a>
          <a className="drawer-link" href="#/privacy" onClick={(e)=>{e.preventDefault();navigate('/privacy');}}>Privacy</a>
        </div>

        <div className="sidebar-foot">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: 'var(--navy-700)',
              display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 14,
              border: '1px solid rgba(255,255,255,.15)', flex: '0 0 auto'
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--silver-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
            </div>
          </div>
          <button
            className="btn small"
            style={{ width: '100%', justifyContent: 'center', background: 'rgba(255,255,255,.08)', borderColor: 'rgba(255,255,255,.15)', color: 'var(--silver-200)' }}
            onClick={() => { logout(); setUser(null); navigate('/'); }}
          >
            ⎋ &nbsp;Logout
          </button>
        </div>
      </aside>

      {/* Overlay */}
      <div className={`sidebar-overlay ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden />

      <main className={`main ${active === '/editor' ? 'wide' : ''}`}>
        <Suspense fallback={<div className="notice" role="status">Loading your workspace…</div>}>{page}</Suspense>
        <Footer />
      </main>

      {/* Mobile bottom nav — quick access on very small screens */}
      <nav className="bottom-nav no-print" aria-label="Primary">
        <a className={`bottom-nav-item ${active==='/'?'active':''}`} href="#/" onClick={(e)=>{e.preventDefault();navigate('/');}}>
          <span className="bn-icon">▦</span><span>Home</span>
        </a>
        <a className={`bottom-nav-item ${active==='/import'?'active':''}`} href="#/import" onClick={(e)=>{e.preventDefault();navigate('/import');}}>
          <span className="bn-icon">📤</span><span>Upload</span>
        </a>
        <a className={`bottom-nav-item ${active==='/editor'?'active':''}`} href="#/editor/new" onClick={(e)=>{e.preventDefault();navigate('/editor/new');}}>
          <span className="bn-icon">✎</span><span>Create</span>
        </a>
        <a className={`bottom-nav-item ${active==='/settings'?'active':''}`} href="#/settings" onClick={(e)=>{e.preventDefault();navigate('/settings');}}>
          <span className="bn-icon">⚙</span><span>Settings</span>
        </a>
      </nav>
    </div>
  );
}
