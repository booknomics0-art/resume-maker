import { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import Editor from './components/Editor';
import Pricing from './components/Pricing';
import Settings from './components/Settings';
import AuthPage from './components/AuthPage';
import Footer from './components/Footer';
import {
  AboutPage, ContactPage, FaqPage, PrivacyPage, RefundPage, TermsPage,
} from './components/LegalPages';
import { currentUser, logout, type User } from './lib/auth';

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
  const tab = useHashRoute();

  if (!user) {
    return <AuthPage onAuth={() => setUser(currentUser())} />;
  }

  let page: React.ReactNode;
  let active = '/';
  if (tab.startsWith('/editor/')) {
    page = <Editor key={tab} id={tab.slice('/editor/'.length)} />;
    active = '/editor';
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
  } else {
    page = <Dashboard />;
  }

  return (
    <div className="shell">
      <aside className="sidebar no-print">
        <div className="brand">
          <div className="brand-badge">CV</div>
          <div>
            <div className="brand-name">CraftCV</div>
            <div className="brand-sub">Resume Studio</div>
          </div>
        </div>
        <a className={`nav-item ${active === '/' ? 'active' : ''}`} href="#/" onClick={() => navigate('/')}>
          ▦ &nbsp;Dashboard
        </a>
        <a className={`nav-item ${active === '/editor' ? 'active' : ''}`} href="#/editor/new" onClick={() => navigate('/editor/new')}>
          ✎ &nbsp;New resume
        </a>
        <a className={`nav-item ${active === '/pricing' ? 'active' : ''}`} href="#/pricing" onClick={() => navigate('/pricing')}>
          ◈ &nbsp;Pricing
        </a>
        <a className={`nav-item ${active === '/settings' ? 'active' : ''}`} href="#/settings" onClick={() => navigate('/settings')}>
          ⚙ &nbsp;Settings
        </a>
        <div className="sidebar-foot">
          <div style={{ color: 'var(--silver-300)', fontWeight: 600, marginBottom: 2 }}>
            {user.name.split(' ')[0]}
          </div>
          {user.email}<br />
          <button
            className="nav-item"
            style={{ padding: '6px 0', marginTop: 6, color: 'var(--silver-400)' }}
            onClick={() => { logout(); setUser(null); navigate('/'); }}
          >
            ⎋ &nbsp;Logout
          </button>
        </div>
      </aside>
      <main className={`main ${active === '/editor' ? 'wide' : ''}`}>
        {page}
        <Footer />
      </main>
    </div>
  );
}
