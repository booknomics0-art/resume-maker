import { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import Editor from './components/Editor';
import Pricing from './components/Pricing';
import Settings from './components/Settings';
import AuthPage from './components/AuthPage';
import Footer from './components/Footer';
import ResumeImporter from './components/ResumeImporter';
import {
  AboutPage, ContactPage, FaqPage, PrivacyPage, RefundPage, TermsPage,
  DisclaimerPage, CookiePage, ShippingPage, CancellationPage, EulaPage,
} from './components/LegalPages';
import { currentUser, logout, type User } from './lib/auth';
import { initSecurity } from './lib/security';
import { getBillingState, isPro } from './lib/billing';

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
  const tab = useHashRoute();

  // Initialize application protections on mount
  useEffect(() => {
    initSecurity();
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

  if (!user) {
    return <AuthPage onAuth={() => setUser(currentUser())} />;
  }

  let page: React.ReactNode;
  let active = '/';
  if (tab.startsWith('/editor/')) {
    page = <Editor key={tab} id={tab.slice('/editor/'.length)} />;
    active = '/editor';
  } else if (tab === '/import') {
    page = <ResumeImporter />;
    active = '/import';
  } else if (tab === '/pricing') {
    page = <Pricing />;
    active = '/pricing';
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
  } else if (tab === '/refund') {
    page = <RefundPage />;
    active = '/refund';
  } else if (tab === '/faq') {
    page = <FaqPage />;
    active = '/faq';
  } else if (tab === '/disclaimer') {
    page = <DisclaimerPage />;
    active = '/disclaimer';
  } else if (tab === '/cookies') {
    page = <CookiePage />;
    active = '/cookies';
  } else if (tab === '/shipping') {
    page = <ShippingPage />;
    active = '/shipping';
  } else if (tab === '/cancellation') {
    page = <CancellationPage />;
    active = '/cancellation';
  } else if (tab === '/eula') {
    page = <EulaPage />;
    active = '/eula';
  } else {
    page = <Dashboard />;
  }

  const billing = getBillingState();
  const pro = isPro();

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
            <div className="brand-sub">Resume Studio {pro ? '· PRO' : ''}</div>
          </div>
        </div>

        {!pro && (
          <div style={{ margin: '8px 8px 12px', padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 4 }}>💎 Free: {billing.freeDownloadsUsed}/{billing.freeDownloadsLimit} used</div>
            <div className="progress" style={{ height: 5, background: 'rgba(255,255,255,0.15)' }}><div style={{ width: `${(billing.freeDownloadsUsed/billing.freeDownloadsLimit)*100}%`, background: '#fff' }} /></div>
            <button className="btn small primary" style={{ width: '100%', marginTop: 10, justifyContent: 'center', fontSize: 12 }} onClick={() => navigate('/pricing')}>Unlock Pro — ₹20</button>
          </div>
        )}

        <nav className="sidebar-nav">
          <NavLink to="/" id="/"><span className="nav-icon">▦</span> Dashboard</NavLink>
          <NavLink to="/editor/new" id="/editor"><span className="nav-icon">✎</span> New resume</NavLink>
          <NavLink to="/import" id="/import"><span className="nav-icon">📤</span> Upload & Edit</NavLink>
          <NavLink to="/pricing" id="/pricing"><span className="nav-icon">◈</span> Pricing {pro ? '· PRO ✓' : ''}</NavLink>
          <NavLink to="/settings" id="/settings"><span className="nav-icon">⚙</span> Settings</NavLink>
        </nav>

        {/* Mobile-only quick links section inside drawer */}
        <div className="drawer-extra">
          <div className="drawer-label">Help & Legal</div>
          <a className="drawer-link" href="#/about" onClick={(e)=>{e.preventDefault();navigate('/about');}}>About us</a>
          <a className="drawer-link" href="#/faq" onClick={(e)=>{e.preventDefault();navigate('/faq');}}>FAQ</a>
          <a className="drawer-link" href="#/contact" onClick={(e)=>{e.preventDefault();navigate('/contact');}}>Contact</a>
          <a className="drawer-link" href="#/privacy" onClick={(e)=>{e.preventDefault();navigate('/privacy');}}>Privacy</a>
          <a className="drawer-link" href="#/refund" onClick={(e)=>{e.preventDefault();navigate('/refund');}}>Refund (No Refund)</a>
        </div>

        <div className="sidebar-foot">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: pro ? 'linear-gradient(135deg, #1f8a5b, #0f6848)' : 'var(--navy-700)',
              display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 14,
              border: '1px solid rgba(255,255,255,.15)', flex: '0 0 auto'
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name} {pro && <span style={{ background: '#1f8a5b', fontSize: 10, padding: '1px 6px', borderRadius: 99, marginLeft: 4 }}>PRO</span>}
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
        {page}
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
        <a className={`bottom-nav-item ${active==='/pricing'?'active':''}`} href="#/pricing" onClick={(e)=>{e.preventDefault();navigate('/pricing');}}>
          <span className="bn-icon">◈</span><span>Pricing</span>
        </a>
        <a className={`bottom-nav-item ${active==='/settings'?'active':''}`} href="#/settings" onClick={(e)=>{e.preventDefault();navigate('/settings');}}>
          <span className="bn-icon">⚙</span><span>Settings</span>
        </a>
      </nav>
    </div>
  );
}
