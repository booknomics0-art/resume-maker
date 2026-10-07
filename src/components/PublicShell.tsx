import type { ReactNode } from 'react';
import { navigate } from '../lib/navigation';

export default function PublicShell({ children, onStart }: { children: ReactNode; onStart: (target?: string) => void }) {
  return (
    <div className="public-shell">
      <header className="land-top">
        <div className="land-top-inner">
          <a className="brand public-brand-link" href="/" onClick={(e)=>{e.preventDefault();navigate('/');}} style={{ padding: 0 }}>
            <div className="brand-badge">RM</div>
            <div><div className="brand-name">ResumeMakery</div><div className="brand-sub">Resume Studio · Free forever</div></div>
          </a>
          <nav className="land-top-nav" aria-label="Public navigation">
            <a href="/resume-templates" onClick={(e)=>{e.preventDefault();navigate('/resume-templates');}}>Templates</a>
            <a href="/ats-resume-checker" onClick={(e)=>{e.preventDefault();navigate('/ats-resume-checker');}}>ATS Checker</a>
            <a href="/resume-for-freshers" onClick={(e)=>{e.preventDefault();navigate('/resume-for-freshers');}}>Freshers</a>
          </nav>
          <div className="land-top-actions">
            <a className="btn small" href="/login" onClick={(e)=>{e.preventDefault();navigate('/login');}}>Sign in</a>
            <button type="button" className="btn small primary" onClick={() => onStart('/editor/new')}>Start free</button>
          </div>
        </div>
      </header>
      <main className="public-shell-main">{children}</main>
    </div>
  );
}
