import { useEffect, useState } from 'react';
import { completeness, type Resume } from '../lib/types';
import {
  deleteResume, duplicateResume, loadResumes, sampleResume, upsertResume,
} from '../lib/store';
import { createJobSpecificResume } from '../lib/jobVersion';
import { fieldById } from '../lib/fields';
import { navigate } from '../lib/navigation';
import { Thumb } from './Preview';
import { RESUMES_CHANGED_EVENT } from '../lib/cloud';
import CloudBadge from './CloudBadge';
import './JobVersion.css';

export default function Dashboard() {
  const [resumes, setResumes] = useState(loadResumes());
  const [tailorSource, setTailorSource] = useState<Resume | null>(null);
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const refresh = () => setResumes(loadResumes());

  useEffect(() => {
    window.addEventListener(RESUMES_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(RESUMES_CHANGED_EVENT, refresh);
  }, []);

  useEffect(() => {
    if (!tailorSource) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [tailorSource]);

  const done = resumes.filter((r) => completeness(r) === 100).length;
  const avg = resumes.length
    ? Math.round(resumes.reduce((a, r) => a + completeness(r), 0) / resumes.length)
    : 0;

  const newResume = () => navigate('/editor/new');
  const addSample = () => {
    const s = sampleResume();
    upsertResume(s);
    refresh();
    navigate(`/editor/${s.id}`);
  };

  const openTailor = (resume: Resume) => {
    setTailorSource(resume);
    setCompany(resume.application?.company ?? '');
    setRole(resume.personal.headline || resume.application?.role || '');
    setJobDescription('');
  };

  const closeTailor = () => {
    setTailorSource(null);
    setCompany('');
    setRole('');
    setJobDescription('');
  };

  const createTailoredVersion = () => {
    if (!tailorSource) return;
    const created = createJobSpecificResume(tailorSource.id, { company, role, jobDescription });
    if (!created) return;
    closeTailor();
    refresh();
    navigate(`/editor/${created.id}`);
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Build one master resume, then create a safe copy for each job. <CloudBadge /></div>
        </div>
        <div className="row">
          <button className="btn" onClick={() => navigate('/import')}>📤 Upload & Edit Resume</button>
          <button className="btn" onClick={addSample}>Load sample resume</button>
          <button className="btn primary" onClick={newResume}>+ New resume</button>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><b>{resumes.length}</b><span>Resumes created</span></div>
        <div className="stat"><b>{done}</b><span>Ready to send</span></div>
        <div className="stat silver"><b>{avg}%</b><span>Average completion</span></div>
        <div className="stat silver"><b>500</b><span>Field × template combos</span></div>
      </div>

      {resumes.length === 0 ? (
        <div className="empty empty-sample" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 250px', gap: 28, alignItems: 'center' }}>
          <div style={{ textAlign: 'left' }}>
            <h3 style={{ textAlign: 'left' }}>No resumes yet</h3>
            <p style={{ textAlign: 'left' }}>
              Create your first master resume, or load the finished sample —
              <b> Amit Shukla, Senior Software Engineer</b> — and edit any field.
              <br />After that, use <b>Tailor for job</b> to create a company-specific copy without touching your master.
            </p>
            <div className="row" style={{ justifyContent: 'flex-start', marginTop: 14 }}>
              <button className="btn primary" onClick={newResume}>+ Create resume</button>
              <button className="btn" onClick={() => navigate('/import')}>📤 Upload existing</button>
              <button className="btn" onClick={addSample}>Load the sample →</button>
            </div>
          </div>
          <div
            onClick={addSample}
            title="Click to load this sample resume"
            style={{ cursor: 'pointer', justifySelf: 'center', border: '1px solid var(--silver-200)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 6px 20px rgba(15, 33, 72, .12)', width: 'min(250px, 60%)' }}
          >
            <Thumb r={sampleResume()} />
            <div style={{ padding: '8px 12px', background: 'var(--navy-50)', fontSize: 12, color: 'var(--navy-800)', borderTop: '1px solid var(--silver-200)' }}>
              Sample resume — click to load &amp; edit
            </div>
          </div>
        </div>
      ) : (
        <div className="resume-grid">
          {resumes.map((r) => {
            const pct = completeness(r);
            const f = fieldById(r.fieldId);
            return (
              <div className={`card resume-card ${r.application ? 'job-specific-card' : ''}`} key={r.id}>
                <div className="thumb" onClick={() => navigate(`/editor/${r.id}`)} style={{ cursor: 'pointer' }}>
                  <div className="thumb-wrap"><Thumb r={r} /></div>
                </div>
                <div className="body">
                  {r.application?.kind === 'job-specific' && (
                    <div className="job-version-badge">🎯 {r.application.company} · {r.application.role}</div>
                  )}
                  <b style={{ color: 'var(--navy-900)' }}>{r.name}</b>
                  {r.application?.kind === 'job-specific' && (
                    <div className="job-version-source">Safe copy of {r.application.sourceResumeName}</div>
                  )}
                  <div className="mini-meta">
                    <span>{f.icon} {f.label}</span>
                    <span>{new Date(r.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="progress"><div style={{ width: `${pct}%` }} /></div>
                  <div className="mini-meta">
                    <span>{pct === 100 ? '✓ Ready to send' : `${pct}% complete`}</span>
                  </div>
                  <div className="card-actions job-version-actions">
                    <button className="btn small primary" onClick={() => navigate(`/editor/${r.id}`)}>Open</button>
                    <button className="btn small job-tailor-action" onClick={() => openTailor(r)}>🎯 Tailor for job</button>
                    <button className="btn small" onClick={() => { duplicateResume(r.id); refresh(); }}>Duplicate</button>
                    <button
                      className="btn small danger"
                      onClick={() => {
                        if (confirm(`Delete "${r.name}"?`)) { deleteResume(r.id); refresh(); }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tailorSource && (
        <div className="job-version-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) closeTailor(); }}>
          <section className="job-version-dialog" role="dialog" aria-modal="true" aria-labelledby="job-version-title">
            <div className="job-version-dialog-head">
              <div>
                <span>Job-specific copy</span>
                <h2 id="job-version-title">Tailor without touching your master</h2>
              </div>
              <button className="job-version-close" type="button" aria-label="Close" onClick={closeTailor}>×</button>
            </div>

            <div className="job-version-source-box">
              <b>Source stays unchanged</b>
              <span>{tailorSource.application?.sourceResumeName ?? tailorSource.name}</span>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); createTailoredVersion(); }}>
              <label className="f" htmlFor="job-company">Company</label>
              <input id="job-company" className="input" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={120} placeholder="e.g. Google" autoFocus />

              <label className="f" htmlFor="job-role">Target role</label>
              <input id="job-role" className="input" value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} placeholder="e.g. Frontend Developer" />

              <label className="f" htmlFor="job-description">Job description <span className="job-version-optional">optional</span></label>
              <textarea
                id="job-description"
                className="textarea job-version-jd"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                maxLength={20000}
                placeholder="Paste the job description. ResumeMakery will preload it into ATS Job Match for this copy only."
              />
              <div className="job-version-help">Your original resume is never edited. The new copy gets its own ATS/JD context and can be changed freely.</div>

              <div className="job-version-dialog-actions">
                <button type="button" className="btn" onClick={closeTailor}>Cancel</button>
                <button type="submit" className="btn primary" disabled={!company.trim() || !role.trim()}>Create job-specific copy →</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
