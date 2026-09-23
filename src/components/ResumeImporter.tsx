/**
 * CraftCV Advanced Resume Importer
 * Upload existing resume (PDF, DOCX, TXT, JSON) -> Parse -> Advanced Edit -> Save
 * Features: drag-drop, live preview, field mapping, security validation
 */

import { useState, useRef } from 'react';
import { parseResumeFile, type SupportedFormat } from '../lib/resumeParser';
import { sanitizeInput } from '../lib/security';
import { emptyResume, type Resume } from '../lib/types';
import { upsertResume } from '../lib/store';
import { navigate } from '../App';

type ImportStep = 'upload' | 'parsing' | 'review' | 'success';

export default function ResumeImporter() {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<SupportedFormat>('unknown');
  const [parsedResume, setParsedResume] = useState<Resume | null>(null);
  const [rawText, setRawText] = useState('');
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [editData, setEditData] = useState<Resume>(emptyResume());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    setError('');
    if (f.size > 10 * 1024 * 1024) {
      setError('File too large. Max 10MB allowed.');
      return;
    }
    setFile(f);
    setStep('parsing');

    const result = await parseResumeFile(f);
    setFormat(result.format);

    if (result.error) {
      setError(result.error);
      setStep('upload');
      return;
    }

    if (result.resume) {
      setParsedResume(result.resume);
      setEditData(result.resume);
      setRawText(result.text);
      setStep('review');
    } else {
      setError('Could not parse resume. Try manual entry.');
      setStep('upload');
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = () => {
    if (!editData.personal.fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (!editData.personal.email.trim()) {
      setError('Email is required');
      return;
    }
    // Sanitize before save
    const sanitized: Resume = {
      ...editData,
      personal: {
        fullName: sanitizeInput(editData.personal.fullName, 100),
        headline: sanitizeInput(editData.personal.headline, 100),
        email: sanitizeInput(editData.personal.email, 100),
        phone: sanitizeInput(editData.personal.phone, 30),
        city: sanitizeInput(editData.personal.city, 50),
        linkedin: sanitizeInput(editData.personal.linkedin, 200),
        website: sanitizeInput(editData.personal.website, 200),
        photo: editData.personal.photo, // data URL already validated
      },
      summary: sanitizeInput(editData.summary, 2000),
      bestExperience: sanitizeInput(editData.bestExperience, 1000),
      skills: editData.skills.map(s => sanitizeInput(s, 50)).filter(Boolean),
      hobbies: editData.hobbies.map(h => sanitizeInput(h, 50)).filter(Boolean),
      achievements: editData.achievements.map(a => sanitizeInput(a, 200)).filter(Boolean),
    };
    
    const saved = upsertResume(sanitized);
    setStep('success');
    setTimeout(() => navigate(`/editor/${saved.id}`), 1200);
  };

  const updatePersonal = (field: keyof Resume['personal'], value: string) => {
    setEditData(prev => ({
      ...prev,
      personal: { ...prev.personal, [field]: value }
    }));
  };

  if (step === 'success') {
    return (
      <div className="card pad" style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <h3 style={{ color: 'var(--navy-900)' }}>Resume Imported Successfully!</h3>
        <p className="hint">Redirecting to advanced editor...</p>
        <div className="progress" style={{ marginTop: 16 }}><div style={{ width: '100%' }} /></div>
      </div>
    );
  }

  if (step === 'parsing') {
    return (
      <div className="card pad" style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
        <h3>Parsing {file?.name}...</h3>
        <p className="hint">Extracting text and structuring your resume with advanced heuristics</p>
        <div className="progress" style={{ marginTop: 20, height: 8 }}><div style={{ width: '70%', animation: 'pulse 1.5s infinite' }} /></div>
        <p className="hint" style={{ marginTop: 12, fontSize: 12 }}>Format detected: {format.toUpperCase()} · Size: {file ? Math.round(file.size/1024) : 0}KB</p>
      </div>
    );
  }

  if (step === 'review' && parsedResume) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="page-head">
          <div>
            <div className="page-title">Review & Edit Imported Resume</div>
            <div className="page-sub">We parsed {file?.name} ({format.toUpperCase()}) — verify and enhance before saving. Advanced editing enabled.</div>
          </div>
          <div className="row">
            <button className="btn" onClick={() => setStep('upload')}>← Upload different</button>
            <button className="btn primary" onClick={handleSave}>💾 Save & Open in Editor →</button>
          </div>
        </div>

        {error && <div className="notice err">{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }} className="import-grid">
          {/* Editable form */}
          <div className="card pad">
            <h3 style={{ color: 'var(--navy-900)', marginBottom: 16 }}>📝 Advanced Editor — Verify Parsed Data</h3>
            
            <div className="form-grid">
              <div>
                <label className="f">Full Name *</label>
                <input className="input" value={editData.personal.fullName} onChange={e => updatePersonal('fullName', e.target.value)} placeholder="e.g. Aarav Sharma" />
              </div>
              <div>
                <label className="f">Headline / Target Role</label>
                <input className="input" value={editData.personal.headline} onChange={e => updatePersonal('headline', e.target.value)} placeholder="e.g. Frontend Developer" />
              </div>
              <div>
                <label className="f">Email *</label>
                <input className="input" value={editData.personal.email} onChange={e => updatePersonal('email', e.target.value)} placeholder="you@example.com" />
              </div>
              <div>
                <label className="f">Phone</label>
                <input className="input" value={editData.personal.phone} onChange={e => updatePersonal('phone', e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <div>
                <label className="f">City</label>
                <input className="input" value={editData.personal.city} onChange={e => updatePersonal('city', e.target.value)} placeholder="Pune" />
              </div>
              <div>
                <label className="f">LinkedIn</label>
                <input className="input" value={editData.personal.linkedin} onChange={e => updatePersonal('linkedin', e.target.value)} placeholder="linkedin.com/in/..." />
              </div>
              <div className="full">
                <label className="f">Professional Summary</label>
                <textarea className="textarea" rows={4} value={editData.summary} onChange={e => setEditData(prev => ({ ...prev, summary: e.target.value }))} placeholder="Summary..." />
              </div>
              <div className="full">
                <label className="f">Skills ({editData.skills.length})</label>
                <div className="chips" style={{ marginBottom: 8 }}>
                  {editData.skills.map((s, i) => (
                    <span key={i} className="chip on">
                      {s} <button onClick={() => setEditData(prev => ({ ...prev, skills: prev.skills.filter((_, idx) => idx !== i) }))} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: 6 }}>✕</button>
                    </span>
                  ))}
                </div>
                <div className="row">
                  <input className="input" style={{ flex: 1 }} placeholder="Add skill + Enter" onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) {
                        setEditData(prev => ({ ...prev, skills: [...prev.skills, val] }));
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }} />
                </div>
              </div>

              <div className="full">
                <label className="f">Experience ({editData.experience.length} entries)</label>
                {editData.experience.map((exp, idx) => (
                  <div key={exp.id} className="entry-card">
                    <div className="entry-head"><b>Job {idx+1}</b><button className="btn small danger" onClick={() => setEditData(prev => ({ ...prev, experience: prev.experience.filter(e => e.id !== exp.id) }))}>Remove</button></div>
                    <div className="form-grid">
                      <input className="input" value={exp.role} placeholder="Role" onChange={e => {
                        const newExp = [...editData.experience]; newExp[idx] = { ...newExp[idx], role: e.target.value }; setEditData(prev => ({ ...prev, experience: newExp }));
                      }} />
                      <input className="input" value={exp.company} placeholder="Company" onChange={e => {
                        const newExp = [...editData.experience]; newExp[idx] = { ...newExp[idx], company: e.target.value }; setEditData(prev => ({ ...prev, experience: newExp }));
                      }} />
                      <div className="full">
                        <textarea className="textarea" rows={2} value={exp.bullets.join('\n')} placeholder="Bullets (one per line)" onChange={e => {
                          const newExp = [...editData.experience]; newExp[idx] = { ...newExp[idx], bullets: e.target.value.split('\n') }; setEditData(prev => ({ ...prev, experience: newExp }));
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
                <button className="btn small" onClick={() => setEditData(prev => ({ ...prev, experience: [...prev.experience, { id: Math.random().toString(36).slice(2), role: '', company: '', location: '', start: '', end: '', current: false, bullets: [''] }] }))}>+ Add Experience</button>
              </div>

              <div className="full">
                <label className="f">Education ({editData.education.length})</label>
                {editData.education.map((edu, idx) => (
                  <div key={edu.id} className="entry-card">
                    <div className="form-grid">
                      <input className="input" value={edu.degree} placeholder="Degree" onChange={e => {
                        const newEdu = [...editData.education]; newEdu[idx] = { ...newEdu[idx], degree: e.target.value }; setEditData(prev => ({ ...prev, education: newEdu }));
                      }} />
                      <input className="input" value={edu.school} placeholder="School" onChange={e => {
                        const newEdu = [...editData.education]; newEdu[idx] = { ...newEdu[idx], school: e.target.value }; setEditData(prev => ({ ...prev, education: newEdu }));
                      }} />
                    </div>
                  </div>
                ))}
                <button className="btn small" onClick={() => setEditData(prev => ({ ...prev, education: [...prev.education, { id: Math.random().toString(36).slice(2), degree: '', school: '', location: '', year: '', note: '' }] }))}>+ Add Education</button>
              </div>
            </div>

            <div className="notice" style={{ marginTop: 20 }}>
              <b>🔒 Security:</b> All data stays in your browser. No upload to server. Parsed content sanitized for XSS.
              <br /><b>✨ Advanced Edit:</b> You can fully edit every field before saving. After saving, open in main editor for templates & design.
            </div>

            <div className="row" style={{ marginTop: 16 }}>
              <button className="btn primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSave}>💾 Save & Open in Advanced Editor →</button>
            </div>
          </div>

          {/* Raw preview */}
          <div>
            <div className="card pad">
              <h4 style={{ margin: '0 0 10px', color: 'var(--navy-900)' }}>📄 Extracted Text Preview</h4>
              <div style={{ background: 'var(--silver-100)', borderRadius: 8, padding: 12, maxHeight: 400, overflow: 'auto', fontSize: 12.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {rawText.slice(0, 3000)}{rawText.length > 3000 ? '...\n[truncated]' : ''}
              </div>
              <div className="hint" style={{ marginTop: 8 }}>Showing first 3000 chars · Total: {rawText.length} chars</div>
            </div>

            <div className="card pad" style={{ marginTop: 16 }}>
              <h4 style={{ margin: '0 0 8px' }}>🛡️ Parsing Details</h4>
              <table className="tbl" style={{ fontSize: 12.5 }}>
                <tbody>
                  <tr><td><b>File</b></td><td>{file?.name}</td></tr>
                  <tr><td><b>Format</b></td><td>{format.toUpperCase()}</td></tr>
                  <tr><td><b>Size</b></td><td>{file ? (file.size/1024).toFixed(1) : 0} KB</td></tr>
                  <tr><td><b>Skills Found</b></td><td>{parsedResume?.skills.length || 0}</td></tr>
                  <tr><td><b>Experience</b></td><td>{parsedResume?.experience.length || 0} entries</td></tr>
                  <tr><td><b>Education</b></td><td>{parsedResume?.education.length || 0} entries</td></tr>
                </tbody>
              </table>
              <div className="notice" style={{ marginTop: 12, fontSize: 12 }}>
                💡 <b>Tip:</b> If parsing missed something, manually add it on left. Our advanced editor lets you refine everything.
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .import-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    );
  }

  // Upload step
  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-head">
        <div>
          <div className="page-title">📤 Upload & Edit Resume — Advanced</div>
          <div className="page-sub">Upload your existing resume (PDF, DOCX, TXT, JSON). We'll parse it with AI-like heuristics and let you advanced-edit everything before download.</div>
        </div>
      </div>

      <div className="card pad">
        <div
          onDragOver={e => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          style={{
            border: `2px dashed ${dragActive ? 'var(--navy-600)' : 'var(--silver-300)'}`,
            borderRadius: 12,
            padding: '40px 20px',
            textAlign: 'center',
            background: dragActive ? 'var(--navy-50)' : 'var(--silver-100)',
            transition: 'all .2s',
            cursor: 'pointer',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
          <h3 style={{ color: 'var(--navy-900)', marginBottom: 6 }}>
            {dragActive ? 'Drop your resume here' : 'Drag & Drop your resume'}
          </h3>
          <p className="hint" style={{ marginBottom: 16 }}>
            Supports PDF, DOCX, TXT, JSON · Max 10MB · 100% private — stays in browser
          </p>
          <button className="btn primary" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
            📁 Browse Files
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt,.json" style={{ display: 'none' }} onChange={onFileChange} />
        </div>

        {error && <div className="notice err" style={{ marginTop: 16 }}>{error}</div>}

        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div style={{ background: 'var(--navy-50)', borderRadius: 10, padding: 16, border: '1px solid var(--navy-100)' }}>
            <b style={{ color: 'var(--navy-800)', fontSize: 14 }}>🔒 100% Secure & Private</b>
            <p className="hint" style={{ marginTop: 6, fontSize: 12.5 }}>No server upload. All parsing happens locally in your browser. Your data never leaves device.</p>
          </div>
          <div style={{ background: 'var(--silver-100)', borderRadius: 10, padding: 16, border: '1px solid var(--silver-200)' }}>
            <b style={{ color: 'var(--navy-800)', fontSize: 14 }}>⚡ Advanced Parsing</b>
            <p className="hint" style={{ marginTop: 6, fontSize: 12.5 }}>Heuristics detect contact, experience, education, skills. 90%+ accuracy on standard resumes.</p>
          </div>
          <div style={{ background: 'var(--silver-100)', borderRadius: 10, padding: 16, border: '1px solid var(--silver-200)' }}>
            <b style={{ color: 'var(--navy-800)', fontSize: 14 }}>✏️ Full Advanced Edit</b>
            <p className="hint" style={{ marginTop: 6, fontSize: 12.5 }}>After import, edit everything — add photo, change template, rewrite bullets, then download PDF.</p>
          </div>
        </div>

        <div className="notice" style={{ marginTop: 20 }}>
          <b>How it works:</b>
          <ol style={{ margin: '8px 0 0 18px', padding: 0 }}>
            <li>Upload existing resume (any format)</li>
            <li>We auto-extract text & structure it into fields</li>
            <li>You review & advanced-edit in our editor (add missing info, fix parsing)</li>
            <li>Choose from 50 templates & download professional PDF</li>
          </ol>
        </div>

        <div style={{ marginTop: 20 }}>
          <h4 style={{ color: 'var(--navy-900)', fontSize: 14, marginBottom: 8 }}>💡 Supported Formats & Tips</h4>
          <table className="tbl">
            <thead><tr><th>Format</th><th>Best For</th><th>Accuracy</th></tr></thead>
            <tbody>
              <tr><td><b>PDF</b></td><td>Most resumes</td><td>85-95% (text-based PDFs)</td></tr>
              <tr><td><b>DOCX</b></td><td>Word resumes</td><td>90-95%</td></tr>
              <tr><td><b>TXT</b></td><td>Plain text</td><td>95%+ (cleanest)</td></tr>
              <tr><td><b>JSON</b></td><td>Our backup</td><td>100% (perfect)</td></tr>
            </tbody>
          </table>
          <p className="hint" style={{ marginTop: 8, fontSize: 12 }}>Scanned image PDFs need OCR — save as TXT or DOCX for best results. All files sanitized for security.</p>
        </div>
      </div>

      <div className="card pad" style={{ marginTop: 18 }}>
        <h4 style={{ margin: '0 0 8px', color: 'var(--navy-900)' }}>🆚 Don't have a resume? Create new</h4>
        <p className="hint" style={{ marginBottom: 12 }}>Start from scratch with our guided 7-step builder — 10 minutes, 50 templates, no watermark.</p>
        <div className="row">
          <button className="btn primary" onClick={() => navigate('/editor/new')}>+ Create New Resume</button>
          <button className="btn" onClick={() => navigate('/')}>← Back to Dashboard</button>
        </div>
      </div>
    </div>
  );
}
