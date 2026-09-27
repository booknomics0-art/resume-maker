import { useEffect, useMemo, useState } from 'react';
import { completeness, missingRequirements } from '../lib/types';
import { deleteResume, duplicateResume, loadResumes, sampleResume, upsertResume } from '../lib/store';
import { currentUser } from '../lib/auth';
import { fieldById } from '../lib/fields';
import { TEMPLATE_COUNT, templateById } from '../lib/templates';
import { navigate } from '../App';
import { Thumb } from './Preview';
import { RESUMES_CHANGED_EVENT } from '../lib/cloud';
import CloudBadge from './CloudBadge';

export default function Dashboard() {
  const [resumes, setResumes] = useState(loadResumes());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [error, setError] = useState('');
  const refresh = () => setResumes(loadResumes());
  const sample = useMemo(() => sampleResume(), []);
  useEffect(() => {
    window.addEventListener(RESUMES_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener(RESUMES_CHANGED_EVENT, refresh); window.removeEventListener('storage', refresh); };
  }, []);
  const done = resumes.filter((r) => completeness(r) === 100).length;
  const recent = [...resumes].sort((a,b) => b.updatedAt - a.updatedAt)[0];
  const list = resumes.filter(r => {
    const match = `${r.name} ${r.personal.fullName} ${r.personal.headline} ${fieldById(r.fieldId).label}`.toLowerCase().includes(query.toLowerCase().trim());
    return match && (filter === 'all' || (filter === 'ready' ? completeness(r) === 100 : completeness(r) < 100));
  }).sort((a,b) => sort === 'name' ? a.name.localeCompare(b.name) : b.updatedAt - a.updatedAt);
  const act = (action: () => void) => { try { action(); setError(''); refresh(); } catch { setError('Could not save the change. Your browser storage may be full. Export a JSON backup from the editor.'); } };
  const addSample = () => act(() => { upsertResume(sample); navigate(`/editor/${sample.id}`); });
  const firstName = currentUser()?.name.split(' ')[0] || 'there';
  const missing = recent ? missingRequirements(recent) : [];
  return (
    <div className="studio-dashboard">
      <div className="page-head studio-page-head">
        <div><span className="studio-eyebrow">YOUR CAREER WORKSPACE</span><h1 className="page-title">Welcome back, {firstName}<span className="muted-dot">.</span></h1><p className="page-sub">A little progress today. A stronger first impression tomorrow.</p></div>
        <CloudBadge />
      </div>
      <section className="studio-hero" aria-labelledby="workspace-title">
        <div className="studio-hero-copy">
          <span className="studio-tag">YOUR NEXT CHAPTER STARTS HERE</span>
          <h2 id="workspace-title">Make your experience<br /><em>impossible to overlook.</em></h2>
          <p>Shape your story, find your design, and leave with a resume you are proud to send.</p>
          <div className="row"><button className="btn studio-light" onClick={() => navigate('/editor/new')}>+ Create a resume</button><button className="btn studio-outline" onClick={() => navigate('/import')}>Import existing resume ↗</button></div>
          <div className="studio-hero-note">Free templates <span>·</span> Live preview <span>·</span> No-watermark PDF</div>
        </div>
        <div className="studio-hero-art" aria-hidden="true"><div className="studio-orbit" /><div className="studio-sample-paper"><Thumb r={sample} /></div><div className="studio-art-label"><span>✓</span> Your story. Beautifully presented.</div></div>
      </section>
      <div className="studio-metrics">
        <div><span className="metric-icon">▤</span><div><b>{resumes.length.toString().padStart(2,'0')}</b><span>My resumes</span></div></div>
        <div><span className="metric-icon">✓</span><div><b>{done.toString().padStart(2,'0')}</b><span>Essentials complete</span></div></div>
        <div><span className="metric-icon">◷</span><div><b>{(resumes.length - done).toString().padStart(2,'0')}</b><span>In progress</span></div></div>
        <div><span className="metric-icon">▦</span><div><b>{TEMPLATE_COUNT}</b><span>Designs to explore</span></div></div>
      </div>
      {recent && <div className="studio-continue"><div><span className="studio-eyebrow">PICK UP WHERE YOU LEFT OFF</span><h3>{recent.name}</h3><p>{missing.length ? `Next up: ${missing[0].label.toLowerCase()}.` : 'Your essentials are complete. Review your content and export when ready.'}</p></div><button className="btn" onClick={() => navigate(`/editor/${recent.id}`)}>Continue editing →</button></div>}
      <section aria-labelledby="my-resumes-title">
        <div className="studio-section-head"><div><h2 id="my-resumes-title">My resumes <span className="count-badge">{resumes.length}</span></h2><p>One story, tailored for every opportunity.</p></div><button className="btn primary" onClick={() => navigate('/editor/new')}>+ New resume</button></div>
        <div className="studio-library-tools">
          <div className="chips" aria-label="Filter resumes">{[['all','All resumes'],['draft','In progress'],['ready','Complete']].map(([id,label]) => <button key={id} className={`chip ${filter === id ? 'on' : ''}`} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</div>
          <div className="row"><input className="input studio-search" type="search" aria-label="Search resumes" placeholder="Search your resumes…" value={query} onChange={e => setQuery(e.target.value)} /><select className="input studio-sort" aria-label="Sort resumes" value={sort} onChange={e => setSort(e.target.value)}><option value="recent">Recently edited</option><option value="name">Name A–Z</option></select></div>
        </div>
        {error && <div className="notice err" role="alert">{error}</div>}
        {list.length ? <div className="resume-grid studio-resume-grid">{list.map(r => {
          const pct = completeness(r);
          return <article className="card resume-card" key={r.id}>
            <button className="studio-resume-thumb" onClick={() => navigate(`/editor/${r.id}`)} aria-label={`Edit ${r.name}`}><div className="thumb-wrap"><Thumb r={r} /></div><span className={`resume-state ${pct === 100 ? 'complete' : ''}`}>{pct === 100 ? 'Essentials complete' : 'In progress'}</span></button>
            <div className="body"><h3 className="resume-name">{r.name}</h3><p className="studio-template-name">{templateById(r.templateId).name} · {fieldById(r.fieldId).label}</p><div className="progress" aria-label={`${pct}% complete`}><div style={{ width: `${pct}%` }} /></div><div className="mini-meta"><span>{pct}% complete</span><span>Edited {new Date(r.updatedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span></div><div className="card-actions"><button className="btn small primary" onClick={() => navigate(`/editor/${r.id}`)}>Edit resume ↗</button><button className="btn small" onClick={() => act(() => { duplicateResume(r.id); })}>Duplicate</button><button className="btn small danger" aria-label={`Delete ${r.name}`} onClick={() => { if (confirm(`Delete "${r.name}"? This cannot be undone.`)) act(() => deleteResume(r.id)); }}>Delete</button></div></div>
          </article>;
        })}</div> : <div className="studio-empty"><span className="studio-empty-icon">▤</span><h3>{resumes.length ? 'No matching resumes' : 'Your next opportunity starts with a page.'}</h3><p>{resumes.length ? 'Try another search or filter.' : 'Start from scratch, or explore a completed example and make it yours.'}</p><div className="row">{resumes.length ? <button className="btn" onClick={() => { setQuery(''); setFilter('all'); }}>Clear filters</button> : <><button className="btn primary" onClick={() => navigate('/editor/new')}>Create my first resume →</button><button className="btn" onClick={addSample}>Explore a sample</button></>}</div></div>}
      </section>
      <div className="studio-help-grid"><article><span className="studio-eyebrow">01 / MAKE IT RELEVANT</span><h3>Every role deserves its own version.</h3><p>Duplicate a resume and tailor your summary, skills and achievements to the job description.</p></article><article><span className="studio-eyebrow">02 / COMPLETE THE PICTURE</span><h3>A thoughtful introduction goes further.</h3><p>Pair your resume with a focused cover letter that connects your experience to the role.</p><button className="btn small" onClick={() => navigate('/cover-letter')}>Write a cover letter ↗</button></article></div>
    </div>
  );
}
