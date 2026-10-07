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
  const [booting, setBooting] = useState(() => cloudEnabled() && hasAuthCallback());
  const [authNotice, setAuthNotice] = useState<GoogleAuthIssue | null>(null);
  const tab = usePathRoute();

  useEffect(() => { applySeo(tab); }, [tab]);
  useEffect(() => { initSecurity(); }, []);

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

  useEffect(() => {
    if (!cloudEnabled()) return;
    let cancelled = false;
    (async () => {
      const redirect = await cloudBootAuth();
      if (cancelled) return;

      if (redirect.attempted) {
        if (redirect.ok && redirect.user) {
          setLocalSession(redirect.user.name, redirect.user.email, redirect.user.provider);
          setUser(currentUser());
          void touchProfile();
          await syncWithCloud();
        } else {
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
        logout();
        setUser(null);
      }
      setBooting(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { setMenuOpen(false); }, [tab]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  if (booting) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--navy-900, #0F2148)', color: '#fff', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div className="brand-badge" style={{ margin: '0 auto 14px' }}>RM</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Signing you in…</div>
          <div style={{ opacity: 0.75, fontSize: 13.5, marginTop: 6 }}>
            Finishing the Google handshake with Supabase.
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

    const seoRoutes = new Set(['/resume-builder', '/ats-resume-checker', '/resume-editor', '/resume-templates', '/resume-for-freshers', '/cover-letter-builder']);
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
    <a className={`nav-item ${active === id ? 'active' : ''}`} href={to} onClick={(e) => { e.preventDefault(); navigate(to); }}>
      {children}
    </a>
  );

  return (
    <div className="shell">
      <header className="mobile-topbar no-print">
        <button className="menu-btn" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}>
          <span className="hamburger" aria-hidden><span></span><span></span><span></span></span>
        </button>
        <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="mobile-brand">
          <div className="brand-badge">RM</div><span className="mobile-brand-name">ResumeMakery</span>
        </a>
        <div className="mobile-top-actions"><button className="btn small primary" onClick={() => navigate('/editor/new')} style={{ padding: '7px 12px', fontSize: 13 }}>+ New</button></div>
      </header>

      <aside className={`sidebar no-print ${menuOpen ? 'open' : ''}`}>
        <div className="brand"><div className="brand-badge">RM</div><div><div className="brand-name">ResumeMakery</div><div className="brand-sub">Resume Studio</div></div></div>
        <nav className="nav">
          <NavLink to="/" id="/">Dashboard</NavLink>
          <NavLink to="/editor/new" id="/editor">New resume</NavLink>
          <NavLink to="/import" id="/import">Import resume</NavLink>
          <NavLink to="/cover-letter" id="/cover-letter">Cover letter</NavLink>
          <NavLink to="/settings" id="/settings">Settings</NavLink>
        </nav>
        <div className="sidebar-footer"><button className="btn small" onClick={() => { logout(); setUser(null); navigate('/'); }}>Sign out</button></div>
      </aside>
      {menuOpen && <button className="drawer-backdrop no-print" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <main className="main">
        <Suspense fallback={<div className="card pad">Loading…</div>}>{page}</Suspense>
        <Footer />
      </main>
    </div>
  );
}
