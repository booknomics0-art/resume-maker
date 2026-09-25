import { useEffect, useState } from 'react';
import { completeness } from '../lib/types';
import {
  deleteResume, duplicateResume, loadResumes, sampleResume, upsertResume,
} from '../lib/store';
import { fieldById } from '../lib/fields';
import { navigate } from '../App';
import { Thumb } from './Preview';
import { RESUMES_CHANGED_EVENT } from '../lib/cloud';
import CloudBadge from './CloudBadge';

export default function Dashboard() {
  const [resumes, setResumes] = useState(loadResumes());
  const refresh = () => setResumes(loadResumes());
  useEffect(() => {
    window.addEventListener(RESUMES_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(RESUMES_CHANGED_EVENT, refresh);
  }, []);

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

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Fill details, pick template, download PDF. About 10 minutes. <CloudBadge /></div>
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
              Create your first resume, or load the finished sample —
              <b> Amit Shukla, Senior Software Engineer</b> — and edit any field.
              <br />Or upload an existing resume (PDF, DOCX or photo) for advanced editing.
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
              <div className="card resume-card" key={r.id}>
                <div className="thumb" onClick={() => navigate(`/editor/${r.id}`)} style={{ cursor: 'pointer' }}>
                  <div className="thumb-wrap"><Thumb r={r} /></div>
                </div>
                <div className="body">
                  <b style={{ color: 'var(--navy-900)' }}>{r.name}</b>
                  <div className="mini-meta">
                    <span>{f.icon} {f.label}</span>
                    <span>{new Date(r.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="progress"><div style={{ width: `${pct}%` }} /></div>
                  <div className="mini-meta">
                    <span>{pct === 100 ? '✓ Ready to send' : `${pct}% complete`}</span>
                  </div>
                  <div className="card-actions">
                    <button className="btn small primary" onClick={() => navigate(`/editor/${r.id}`)}>Open</button>
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

    </div>
  );
}
