import { lazy, Suspense, useEffect, useState } from 'react';
const Dashboard = lazy(() => import('./components/Dashboard'));
const Editor = lazy(() => import('./components/EnhancedEditor'));
const Settings = lazy(() => import('./components/Settings'));
const AuthPage = lazy(() => import('./components/AuthPage'));
const Landing = lazy(() => import('./components/Landing'));
const SeoLanding = lazy(() => import('./components/SeoLanding'));
const PublicShell = lazy(() => import('./components/PublicShell'));
import Footer from './components/Footer';
const ResumeImporter = lazy(() => import('./components/ResumeImporter'));
const CoverLetter = lazy(() => import('./components/CoverLetter'));
const AboutPage = lazy(() => import('./components/LegalPages').then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('./components/LegalPages').then((m) => ({ default: m.ContactPage })));
const FaqPage = lazy(() => import('./components/LegalPages').then((m) => ({ default: m.FaqPage })));
const PrivacyPage = lazy(() => import('./components/LegalPages').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./components/LegalPages').then((m) => ({ default: m.TermsPage })));
const DisclaimerPage = lazy(() => import('./components/LegalPages').then((m) => ({ default: m.DisclaimerPage })));
const CookiePage = lazy(() => import('./components/LegalPages').then((m) => ({ default: m.CookiePage })));
const EulaPage = lazy(() => import('./components/LegalPages').then((m) => ({ default: m.EulaPage })));
import { currentUser, logout, setLocalSession, isOfflineSession, type User } from './lib/auth';
import { initSecurity } from './lib/security';
import { cloudEnabled } from './lib/supabase';
import { cloudBootAuth, cloudCurrentUser, cloudResumeGoogleStart, touchProfile } from './lib/cloud';
import { hasAuthCallback } from './lib/authRedirect';
import type { GoogleAuthIssue } from './lib/googleAuth';
import { syncWithCloud } from './lib/store';
import { migrateLegacyHashRoute, NAVIGATION_EVENT, navigate, normalizePath } from './lib/navigation';
import { applySeo } from './lib/seo';

function usePathRoute() {
  const [path, setPath] = useState(() => {
    migrateLegacyHashRoute();
    return normalizePath(window.location.pathname || '/');
  });
  useEffect(() => {
    const sync = () => setPath(normalizePath(window.location.pathname || '/'));
    window.addEventListener('popstate', sync);
    window.addEventListener(NAVIGATION_EVENT, sync as EventListener);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(NAVIGATION_EVENT, sync as EventListener);
    };
  }, []);
  return path;
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => currentUser());
  const [menuOpen, setMenuOpen] = useState(false);
  // True while an OAuth callback (`?code=…`) is being exchanged, so the visitor
  // sees "signing you in" instead of the login form and then a jump.
  const [booting, setBooting] = useState(() => cloudEnabled() && hasAuthCallback());
  const [authNotice, setAuthNotice] = useState<GoogleAuthIssue | null>(null);
  const tab = usePathRoute();

  useEffect(() => { applySeo(tab); }, [tab]);

  // Initialize application protections on mount
  useEffect(() => {
    initSecurity();
  }, []);

  // A preview iframe cannot finish Google sign-in itself (Google refuses to be
  // framed, and its storage is partitioned). The button opens a top-level tab
  // with ?google=start; that tab starts the handshake here, once.
  useEffect(() => {
    if (!cloudEnabled()) return;
    const pending = cloudResumeGoogleStart();
    if (!pending) return;
    let cancelled = false;
    void pending.then((res) => {
      if (cancelled || res.ok) return;
      if (res.issue) setAuthNotice(res.issue);
      const path = normalizePath(window.location.pathname || '/');
      if (path === '/') navigate('/login');
    });
    return () => { cancelled = true; };
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
          await syncWithCloud();
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
        // signup/login). Those stay so the user is never locked out of ResumeMakery.
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
            Finishing the Google handshake with Supabase. One moment.
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    if (tab === '/' || tab === '') {
      return (
        <Suspense fallback={<div className="card pad">Loading ResumeMakery…</div>}>
          <Landing notice={authNotice} onStart={(target) => navigate(target || '/editor/new')} />
        </Suspense>
      );
    }

    const seoRoutes = new Set([
      '/resume-builder',
      '/ats-resume-checker',
      '/job-description-resume-match',
      '/ats-keyword-checker',
      '/resume-score-checker',
      '/resume-editor',
      '/resume-templates',
      '/resume-for-freshers',
    ]);
    if (seoRoutes.has(tab)) {
      return (
        <Suspense fallback={<div className="card pad">Loading ResumeMakery…</div>}>
          <PublicShell onStart={(target) => navigate(target || '/editor/new')}>
            <SeoLanding route={tab} onStart={(target) => navigate(target || '/editor/new')} />
          </PublicShell>
        </Suspense>
      );
    }

    const publicInfo: Record<string, React.ReactNode> = {
      '/about': <AboutPage />,
      '/contact': <ContactPage />,
      '/faq': <FaqPage />,
      '/privacy': <PrivacyPage />,
      '/terms': <TermsPage />,
      '/disclaimer': <DisclaimerPage />,
      '/cookies': <CookiePage />,
      '/eula': <EulaPage />,
    };
    if (publicInfo[tab]) {
      return (
        <Suspense fallback={<div className="card pad">Loading ResumeMakery…</div>}>
          <PublicShell onStart={(target) => navigate(target || '/editor/new')}>
            {publicInfo[tab]}
          </PublicShell>
        </Suspense>
      );
    }

    return (
      <Suspense fallback={<div className="card pad">Loading sign-in…</div>}>
        <AuthPage onAuth={() => setUser(currentUser())} notice={authNotice} />
      </Suspense>
    );
  }

  let page: React.ReactNode;
  let active = '/';
  if (tab.startsWith('/editor/')) {
    page = <Editor key={tab} id={tab.slice('/editor/'.length)} />;
    active = '/editor';
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
      href={to}
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
        <a href="/" onClick={(e)=>{e.preventDefault(); navigate('/');}} className="mobile-brand">
          <div className="brand-badge">RM</div>
          <span className="mobile-brand-name">ResumeMakery</span>
        </a>
        <div className="mobile-top-actions">
          <button className="btn small primary" onClick={() => navigate('/editor/new')} style={{ padding: '7px 12px', fontSize: 13 }}>+ New</button>
        </div>
      </header>

      {/* Sidebar / Drawer */}
      <aside className={`sidebar no-print ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-badge">RM</div>
          <div>
            <div className="brand-name">ResumeMakery</div>
            <div className="brand-sub">Resume Studio · Free</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" id="/"><span className="nav-icon">▦</span> Dashboard</NavLink>
          <NavLink to="/editor/new" id="/editor"><span className="nav-icon">✎</span> New resume</NavLink>
          <NavLink to="/import" id="/import"><span className="nav-icon">📤</span> Upload & Edit</NavLink>
          <NavLink to="/cover-letter" id="/cover-letter"><span className="nav-icon">✉</span> Cover letter</NavLink>
          <NavLink to="/settings" id="/settings"><span className="nav-icon">⚙</span> Settings</NavLink>
        </nav>

        {/* Mobile-only quick links section inside drawer */}
        <div className="drawer-extra">
          <div className="drawer-label">Help & Legal</div>
          <a className="drawer-link" href="/about" onClick={(e)=>{e.preventDefault();navigate('/about');}}>About us</a>
          <a className="drawer-link" href="/faq" onClick={(e)=>{e.preventDefault();navigate('/faq');}}>FAQ</a>
          <a className="drawer-link" href="/contact" onClick={(e)=>{e.preventDefault();navigate('/contact');}}>Contact</a>
          <a className="drawer-link" href="/privacy" onClick={(e)=>{e.preventDefault();navigate('/privacy');}}>Privacy</a>
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
        <Suspense fallback={<div className="card pad">Loading workspace…</div>}>
          {page}
        </Suspense>
        <Footer />
      </main>

      {/* Mobile bottom nav — quick access on very small screens */}
      <nav className="bottom-nav no-print" aria-label="Primary">
        <a className={`bottom-nav-item ${active==='/'?'active':''}`} href="/" onClick={(e)=>{e.preventDefault();navigate('/');}}>
          <span className="bn-icon">▦</span><span>Home</span>
        </a>
        <a className={`bottom-nav-item ${active==='/import'?'active':''}`} href="/import" onClick={(e)=>{e.preventDefault();navigate('/import');}}>
          <span className="bn-icon">📤</span><span>Upload</span>
        </a>
        <a className={`bottom-nav-item ${active==='/editor'?'active':''}`} href="/editor/new" onClick={(e)=>{e.preventDefault();navigate('/editor/new');}}>
          <span className="bn-icon">✎</span><span>Create</span>
        </a>
        <a className={`bottom-nav-item ${active==='/settings'?'active':''}`} href="/settings" onClick={(e)=>{e.preventDefault();navigate('/settings');}}>
          <span className="bn-icon">⚙</span><span>Settings</span>
        </a>
      </nav>
    </div>
  );
}
