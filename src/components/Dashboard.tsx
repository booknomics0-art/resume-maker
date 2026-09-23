import { useState } from 'react';
import { completeness } from '../lib/types';
import {
  deleteResume, duplicateResume, loadResumes, sampleResume, upsertResume,
} from '../lib/store';
import { fieldById } from '../lib/fields';
import { navigate } from '../App';
import { Thumb } from './Preview';

export default function Dashboard() {
  const [resumes, setResumes] = useState(loadResumes());
  const refresh = () => setResumes(loadResumes());

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
          <div className="page-sub">Fill details, pick template, download PDF. About 10 minutes.</div>
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
        <div className="empty">
          <h3>No resumes yet</h3>
          <p>
            Create your first resume, or load the sample to see a finished example
            (Aarav Sharma, Frontend Developer) that you can edit freely.
            <br />Or upload existing resume for advanced editing.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn primary" onClick={newResume}>+ Create resume</button>
            <button className="btn" onClick={() => navigate('/import')}>📤 Upload existing</button>
            <button className="btn" onClick={addSample}>Open the sample</button>
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
