import { useState } from 'react';
import { completeness } from '../lib/types';
import {
  deleteResume, duplicateResume, loadResumes, sampleResume, upsertResume,
} from '../lib/store';
import { fieldById } from '../lib/fields';
import { navigate } from '../App';
import { Thumb } from './Preview';
import { getBillingState, isPro, getRemainingFreeDownloads } from '../lib/billing';

export default function Dashboard() {
  const [resumes, setResumes] = useState(loadResumes());
  const refresh = () => setResumes(loadResumes());
  const billing = getBillingState();
  const pro = isPro();
  const remaining = getRemainingFreeDownloads();

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
          <div className="page-sub">Fill details, pick template, download PDF. About 10 minutes. {pro ? 'PRO: Unlimited downloads ✓' : `Free: ${remaining} download${remaining===1?'':'s'} left`}</div>
        </div>
        <div className="row">
          <button className="btn" onClick={() => navigate('/import')}>📤 Upload & Edit Resume</button>
          <button className="btn" onClick={addSample}>Load sample resume</button>
          <button className="btn primary" onClick={newResume}>+ New resume</button>
        </div>
      </div>

      {/* Upload Banner — Advanced Feature Highlight */}
      <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden', border: '2px solid var(--navy-600)', background: 'linear-gradient(135deg, var(--navy-50), #fff)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, padding: '18px 20px' }}>
          <div style={{ fontSize: 36, flex: '0 0 auto' }}>📤</div>
          <div style={{ flex: '1 1 300px' }}>
            <b style={{ color: 'var(--navy-900)', fontSize: 16 }}>New: Upload Existing Resume & Advanced Edit</b>
            <p className="hint" style={{ margin: '4px 0 0', fontSize: 13.5, lineHeight: 1.5 }}>
              Already have a resume? Upload PDF, DOCX, TXT, or JSON — we parse with advanced heuristics (90%+ accuracy), then let you edit everything: add photo, change template, rewrite bullets, advanced-level editing. 100% private, stays in browser, XSS sanitized.
            </p>
          </div>
          <div style={{ flex: '0 0 auto', display: 'flex', gap: 8 }}>
            <button className="btn primary" onClick={() => navigate('/import')} style={{ fontWeight: 800 }}>📤 Upload & Edit →</button>
          </div>
        </div>
        <div style={{ background: 'var(--navy-900)', color: 'var(--silver-300)', padding: '8px 20px', fontSize: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span>✅ PDF, DOCX, TXT, JSON</span><span>🔒 No server upload</span><span>⚡ 90%+ parsing accuracy</span><span>✏️ Full advanced edit</span><span>🛡️ XSS protected</span>
        </div>
      </div>

      {/* Billing Status Card */}
      <div className="card pad" style={{ marginBottom: 20, background: pro ? '#eef6f0' : '#fff8e6', borderColor: pro ? '#c3e6cb' : '#f0ddc0' }}>
        <div className="spread">
          <div>
            <b style={{ color: pro ? '#0f6848' : 'var(--warn)' }}>{pro ? '💎 Pro Active — Unlimited Downloads' : `📄 Free Plan — ${billing.freeDownloadsUsed}/${billing.freeDownloadsLimit} downloads used`}</b>
            <div className="hint" style={{ marginTop: 4, fontSize: 13 }}>
              {pro ? (
                <>Unlocked on {billing.proUnlockedAt ? new Date(billing.proUnlockedAt).toLocaleDateString() : ''} · Total downloads: {billing.totalDownloads} · Transaction: {billing.transactionId?.slice(0, 20)}...</>
              ) : (
                <>You have <b>{remaining} free download{remaining===1?'':'s'} left</b>. After that, ₹20 one-time unlocks unlimited forever. No subscription. · Total downloads: {billing.totalDownloads}</>
              )}
            </div>
          </div>
          {!pro && (
            <button className="btn primary" onClick={() => navigate('/pricing')} style={{ flex: '0 0 auto' }}>Unlock Pro — ₹20</button>
          )}
        </div>
        <div className="progress" style={{ marginTop: 12, height: 8 }}>
          <div style={{ width: pro ? '100%' : `${(billing.freeDownloadsUsed / billing.freeDownloadsLimit) * 100}%`, background: pro ? 'var(--ok)' : 'var(--warn)' }} />
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
                  <Thumb r={r} width={180} />
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

      <div className="card pad" style={{ marginTop: 20 }}>
        <h4 style={{ margin: '0 0 8px', color: 'var(--navy-900)' }}>🔒 High-Tech Security Features Active</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          <div className="hint" style={{ fontSize: 12.5 }}>✅ XSS Sanitization — all inputs stripped of scripts</div>
          <div className="hint" style={{ fontSize: 12.5 }}>✅ SHA-256 Password Hashing with Salt</div>
          <div className="hint" style={{ fontSize: 12.5 }}>✅ Rate Limiting — brute force blocked</div>
          <div className="hint" style={{ fontSize: 12.5 }}>✅ HMAC Integrity — storage tamper detection</div>
          <div className="hint" style={{ fontSize: 12.5 }}>✅ CSRF Tokens — 64-char secure random</div>
          <div className="hint" style={{ fontSize: 12.5 }}>✅ CSP Headers — no inline scripts</div>
        </div>
      </div>
    </div>
  );
}
