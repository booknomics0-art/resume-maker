/**
 * CraftCV Resume Importer — upload → auto-fill → edit → live preview → save.
 *
 * What happens when a file is dropped in:
 *   1. the file is read in the browser (pdf.js text layer, or the built-in OCR
 *      engine for scans and photos — see lib/pdfExtract.ts + lib/ocr.ts),
 *   2. the text is structured into resume fields (lib/resumeParser.ts),
 *   3. every extracted value is written straight into the form on the left
 *      *and* into the draft store, so the A4 sheet on the right is already
 *      showing the imported resume,
 *   4. from then on the form and the preview are the same object: every
 *      keystroke re-renders the sheet instantly (and survives a page reload
 *      through sessionStorage),
 *   5. "Save & open in editor" persists it and hands the same resume to the
 *      full editor, which picks the draft up if it is still unsaved.
 *
 * Nothing is uploaded anywhere — extraction and OCR both run on the device.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  parseResumeFile, parseResumeText, parsedToResume,
  type ParseMeta, type SupportedFormat,
} from '../lib/resumeParser';
import { sanitizeInput, sanitizeURL } from '../lib/security';
import { completeness, emptyResume, missingRequirements, uid, type Resume } from '../lib/types';
import { upsertResume } from '../lib/store';
import { FIELDS, fieldById } from '../lib/fields';
import { LAYOUT_META, TEMPLATES, TEMPLATE_COUNT } from '../lib/templates';
import { ocrAssetMode, type OcrAssetMode } from '../lib/ocr';
import { navigate } from '../App';
import LiveSheet from './LiveSheet';
import {
  StepBasics, StepDesign, StepEducation, StepExperience, StepExtras, StepSkills, StepSummary,
} from './Steps';
import {
  clearImportDraft, loadImportDraft, rememberImportInfo, saveImportDraft, type ImportDraft,
} from '../lib/importDraft';

type ImportStep = 'upload' | 'parsing' | 'review' | 'saved';

const METHOD_LABEL: Record<string, string> = {
  text: 'Text layer (pdf.js) — exact',
  ocr: 'Built-in OCR — scanned image read on your device',
  mixed: 'Text layer + OCR (some pages were images)',
};

const ACCEPT = '.pdf,.docx,.doc,.txt,.json,.jpg,.jpeg,.png,.webp,.bmp,image/*';

const TABS = [
  { id: 'basics', label: '👤 Basics' },
  { id: 'summary', label: '📝 Summary' },
  { id: 'experience', label: '💼 Experience' },
  { id: 'education', label: '🎓 Education' },
  { id: 'skills', label: '🛠 Skills' },
  { id: 'extras', label: '➕ Extras' },
  { id: 'design', label: '🎨 Template' },
];

/** Sanitize everything before it can reach the store / the DOM. */
function sanitizeResume(r: Resume): Resume {
  const clean = {
    ...r,
    name: r.personal.fullName ? `${r.personal.fullName} — ${r.personal.headline || 'Resume'}` : r.name,
    personal: {
      fullName: sanitizeInput(r.personal.fullName, 100),
      headline: sanitizeInput(r.personal.headline, 100),
      email: sanitizeInput(r.personal.email, 100),
      phone: sanitizeInput(r.personal.phone, 30),
      city: sanitizeInput(r.personal.city, 50),
      linkedin: sanitizeURL(r.personal.linkedin),
      website: sanitizeURL(r.personal.website),
      photo: r.personal.photo,
    },
    summary: sanitizeInput(r.summary, 4000),
    bestExperience: sanitizeInput(r.bestExperience, 2000),
    skills: r.skills.map((s) => sanitizeInput(s, 60)).filter(Boolean),
    hobbies: r.hobbies.map((h) => sanitizeInput(h, 60)).filter(Boolean),
    achievements: r.achievements.map((a) => sanitizeInput(a, 400)).filter(Boolean),
    experience: r.experience.map((e) => ({
      ...e,
      role: sanitizeInput(e.role, 100),
      company: sanitizeInput(e.company, 100),
      location: sanitizeInput(e.location, 60),
      start: sanitizeInput(e.start, 20),
      end: sanitizeInput(e.end, 20),
      bullets: e.bullets.map((b) => sanitizeInput(b, 400)).filter(Boolean).slice(0, 12),
    })),
    education: r.education.map((ed) => ({
      ...ed,
      degree: sanitizeInput(ed.degree, 100),
      school: sanitizeInput(ed.school, 100),
      location: sanitizeInput(ed.location, 60),
      year: sanitizeInput(ed.year, 30),
      note: sanitizeInput(ed.note, 160),
    })),
    projects: r.projects.map((p) => ({
      id: p.id || uid(),
      name: sanitizeInput(p.name, 80),
      link: sanitizeURL(p.link),
      points: sanitizeInput(p.points, 1200),
    })),
    certs: r.certs.map((c) => ({
      id: c.id || uid(),
      name: sanitizeInput(c.name, 90),
      issuer: sanitizeInput(c.issuer, 60),
      year: sanitizeInput(c.year, 20),
    })),
    languages: r.languages.map((l) => ({
      id: l.id || uid(),
      name: sanitizeInput(l.name, 40),
      level: sanitizeInput(l.level, 40),
    })).filter((l) => l.name),
  };
  return clean;
}

/** Human summary of everything the parser managed to pull out. */
function detectedFields(r: Resume): Array<{ label: string; tab: number }> {
  const p = r.personal;
  const out: Array<{ label: string; tab: number }> = [];
  if (p.fullName) out.push({ label: `Name · ${p.fullName}`, tab: 0 });
  if (p.headline) out.push({ label: `Role · ${p.headline}`, tab: 0 });
  if (p.email) out.push({ label: `Email · ${p.email}`, tab: 0 });
  if (p.phone) out.push({ label: `Phone · ${p.phone}`, tab: 0 });
  if (p.city) out.push({ label: `City · ${p.city}`, tab: 0 });
  if (p.linkedin) out.push({ label: 'LinkedIn', tab: 0 });
  if (p.website) out.push({ label: 'Website', tab: 0 });
  if (r.summary) out.push({ label: `Summary · ${r.summary.length} chars`, tab: 1 });
  if (r.experience.length) out.push({ label: `Experience · ${r.experience.length}`, tab: 2 });
  if (r.education.length) out.push({ label: `Education · ${r.education.length}`, tab: 3 });
  if (r.skills.length) out.push({ label: `Skills · ${r.skills.length}`, tab: 4 });
  if (r.projects.length) out.push({ label: `Projects · ${r.projects.length}`, tab: 5 });
  if (r.certs.length) out.push({ label: `Certificates · ${r.certs.length}`, tab: 5 });
  if (r.achievements.length) out.push({ label: `Achievements · ${r.achievements.length}`, tab: 5 });
  if (r.languages.length) out.push({ label: `Languages · ${r.languages.length}`, tab: 5 });
  if (r.hobbies.length) out.push({ label: `Hobbies · ${r.hobbies.length}`, tab: 5 });
  return out;
}

export default function ResumeImporter() {
  const [step, setStep] = useState<ImportStep>(() => (loadImportDraft() ? 'review' : 'upload'));
  const [draft, setDraft] = useState<ImportDraft | null>(() => loadImportDraft());
  const [format, setFormat] = useState<SupportedFormat>(() => loadImportDraft()?.format ?? 'unknown');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<{ stage: string; pct: number } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [tab, setTab] = useState(0);
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');
  const [showReport, setShowReport] = useState(false);
  const [textDraft, setTextDraft] = useState('');
  const [elapsed, setElapsed] = useState(0);
  // Which copy of the OCR engine this build will actually use — worth showing,
  // because a CDN fallback is exactly what used to make scans fail on the live site.
  const [engineMode, setEngineMode] = useState<OcrAssetMode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const runIdRef = useRef(0);
  const lastFileRef = useRef<File | null>(null);

  const r = draft?.resume ?? emptyResume();
  const meta: ParseMeta | null = draft?.meta ?? null;
  const pct = completeness(r);
  const missing = missingRequirements(r);
  const detected = useMemo(() => detectedFields(r), [r]);

  // keep the raw-text editor in sync when a new import lands
  useEffect(() => {
    setTextDraft(draft?.rawText ?? '');
  }, [draft?.rawText]);

  useEffect(() => {
    let alive = true;
    ocrAssetMode()
      .then((m) => { if (alive) setEngineMode(m); })
      .catch(() => { if (alive) setEngineMode('cdn'); });
    return () => { alive = false; };
  }, []);

  // a visible clock while parsing: scanned PDFs legitimately take 10–30s
  useEffect(() => {
    if (step !== 'parsing') return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [step]);

  // ── reading a file ────────────────────────────────────────────────────────
  const handleFile = async (f: File, forceOcr = false) => {
    setError('');
    if (f.size > 25 * 1024 * 1024) {
      setError('That file is larger than 25MB. Please upload a smaller file (or compress the PDF).');
      return;
    }
    const runId = ++runIdRef.current;
    lastFileRef.current = f;
    setFormat(f.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'unknown');
    setProgress({ stage: 'Starting…', pct: 0 });
    setStep('parsing');

    const result = await parseResumeFile(f, {
      onProgress: (p) => { if (runId === runIdRef.current) setProgress({ stage: p.stage, pct: p.pct }); },
      forceOcr,
    });
    if (runId !== runIdRef.current) return; // a newer upload took over

    setFormat(result.format);
    if (result.error || !result.resume) {
      setError(result.error || 'Could not read that file. Try another format, or copy-paste the text.');
      setStep('upload');
      return;
    }
    const next: ImportDraft = {
      resume: result.resume,
      fileName: f.name,
      fileSize: f.size,
      format: result.format,
      meta: result.meta ?? null,
      rawText: result.text,
      updatedAt: Date.now(),
    };
    saveImportDraft(next);
    rememberImportInfo(next.resume.id, { fileName: f.name, format: result.format, meta: result.meta ?? null });
    setDraft(next);
    setTab(0);
    setStep('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Every form edit lands here: update state, autosave the draft. */
  const set = (patch: Partial<Resume>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, resume: { ...prev.resume, ...patch } };
      saveImportDraft(next);
      return next;
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const reparseFromText = () => {
    if (!draft) return;
    if (!confirm('Re-read the structured fields from the text below?\n\nThis replaces the values currently in the form (your template, photo and template choice stay).')) return;
    const parsed = parseResumeText(textDraft, { ocr: draft.meta?.method !== 'text' });
    const fresh = parsedToResume(parsed);
    // one atomic draft write: the edited text and the re-read fields together,
    // so neither can overwrite the other
    const next: ImportDraft = {
      ...draft,
      rawText: textDraft,
      resume: {
        ...fresh,
        id: draft.resume.id,
        name: draft.resume.name,
        templateId: draft.resume.templateId,
        fieldId: draft.resume.fieldId,
        personal: { ...fresh.personal, photo: draft.resume.personal.photo },
      },
      updatedAt: Date.now(),
    };
    saveImportDraft(next);
    setDraft(next);
    setTab(0);
  };

  const handleSave = () => {
    if (!draft) return;
    if (!r.personal.fullName.trim()) {
      setTab(0);
      setError('Please add the full name — it is the one field every resume needs.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(r.personal.email.trim())) {
      setTab(0);
      setError('Please add a valid email address.');
      return;
    }
    setError('');
    rememberImportInfo(r.id, { fileName: draft.fileName, format: draft.format, meta: draft.meta });
    const saved = upsertResume(sanitizeResume(r));
    clearImportDraft();
    setDraft(null);
    setStep('saved');
    setTimeout(() => navigate(`/editor/${saved.id}`), 900);
  };

  // ── parsing screen ────────────────────────────────────────────────────────
  if (step === 'parsing') {
    return (
      <div className="card pad" style={{ maxWidth: 620, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 34, marginBottom: 10 }}>🧠</div>
        <h3 style={{ color: 'var(--navy-900)', marginBottom: 6 }}>Reading your resume…</h3>
        <p className="hint" style={{ minHeight: 34 }}>{progress?.stage || 'Extracting text…'}</p>
        <div className="progress" style={{ marginTop: 14, height: 8 }}>
          <div style={{ width: `${Math.max(4, Math.min(100, progress?.pct || 0))}%`, transition: 'width .25s ease' }} />
        </div>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
          <span className="hint" style={{ fontSize: 12 }}>{format.toUpperCase()} · {Math.round((lastFileRef.current?.size || 0) / 1024)}KB</span>
          <span className="hint" style={{ fontSize: 12 }}>{elapsed}s</span>
        </div>
        <div className="notice" style={{ marginTop: 18, textAlign: 'left', fontSize: 12.5 }}>
          <b>Why this can take a moment:</b> text-based PDFs are instant. Scanned pages and photos are read
          with the built-in OCR engine — first run loads a 3MB English model (cached in your browser
          afterwards, so a second import is much faster). Everything stays on your device.
        </div>
        <button
          className="btn small"
          style={{ marginTop: 14 }}
          onClick={() => { runIdRef.current++; setStep(loadImportDraft() ? 'review' : 'upload'); }}
        >
          Cancel
        </button>
      </div>
    );
  }

  if (step === 'saved') {
    return (
      <div className="card pad" style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 46, marginBottom: 10 }}>✅</div>
        <h3 style={{ color: 'var(--navy-900)' }}>Imported &amp; saved</h3>
        <p className="hint">Opening the full editor so you can finish the details and download the PDF…</p>
        <div className="progress" style={{ marginTop: 16 }}><div style={{ width: '100%' }} /></div>
      </div>
    );
  }

  // ── review screen: form (left) ⇄ live resume (right) ──────────────────────
  if (step === 'review' && draft) {
    const jump = (id: string) => {
      setMobileTab('form');
      document.getElementById(`import-sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const sections = [
      { id: 'basics', label: '👤 Basics', node: <StepBasics r={r} set={set} /> },
      { id: 'summary', label: '📝 Summary', node: <StepSummary r={r} set={set} /> },
      { id: 'experience', label: '💼 Experience', node: <StepExperience r={r} set={set} /> },
      { id: 'education', label: '🎓 Education', node: <StepEducation r={r} set={set} /> },
      { id: 'skills', label: '🛠 Skills', node: <StepSkills r={r} set={set} /> },
      { id: 'extras', label: '➕ Extras', node: <StepExtras r={r} set={set} /> },
      { id: 'design', label: '🎨 Template', node: <StepDesign r={r} set={set} /> },
    ];

    return (
      <div className="editor-root">
        <div className="page-head">
          <div style={{ minWidth: 0, flex: '1 1 260px' }}>
            <div className="page-title" style={{ fontSize: 20 }}>📥 Imported — check &amp; edit</div>
            <div className="page-sub">
              <b>{draft.fileName}</b> · {draft.format.toUpperCase()} · {METHOD_LABEL[meta?.method || 'text'] || meta?.method}
              {meta?.ocrConfidence ? ` · ${meta.ocrConfidence}% OCR confidence` : ''} · <b>{pct}%</b> complete
            </div>
          </div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => setStep('upload')}>← Upload different</button>
            {draft.format === 'pdf' && (
              <button className="btn" onClick={() => lastFileRef.current && handleFile(lastFileRef.current, true)}>
                🔁 Re-run OCR
              </button>
            )}
            <button className="btn primary" onClick={handleSave}>💾 Save &amp; open in editor →</button>
          </div>
        </div>

        {error && <div className="notice err">{error}</div>}

        {meta?.warning && (
          <div className="notice" style={{ borderColor: 'var(--amber-500, #d97706)', background: '#fffbeb' }}>
            ⚠️ {meta.warning}
          </div>
        )}

        {/* auto-fill summary — click a chip to jump to that section */}
        <div className="card pad" style={{ marginBottom: 16, padding: '14px 16px' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <b style={{ color: 'var(--navy-900)', fontSize: 14 }}>
              🎯 {detected.length ? `${detected.length} groups auto-filled from your file` : 'Nothing could be auto-filled'}
            </b>
            <span className="hint" style={{ fontSize: 12 }}>
              {missing.length ? `${missing.length} required item${missing.length > 1 ? 's' : ''} still missing: ${missing.slice(0, 3).map((m) => m.label).join(', ')}${missing.length > 3 ? '…' : ''}` : 'All mandatory fields are filled ✓'}
            </span>
          </div>
          <div className="chips" style={{ marginTop: 10 }}>
            {detected.map((d) => (
              <button key={d.label} className="chip" style={{ cursor: 'pointer' }} onClick={() => jump(TABS[d.tab]?.id || 'basics')}>
                {d.label}
              </button>
            ))}
            {!detected.length && <span className="hint">Fill the sections manually on the left — the preview updates as you type.</span>}
          </div>
        </div>

        <div className="editor-mobile-tabs" role="tablist" aria-label="Import view">
          <button role="tab" aria-selected={mobileTab === 'form'} className={mobileTab === 'form' ? 'active' : ''} onClick={() => setMobileTab('form')}>✎ Edit fields</button>
          <button role="tab" aria-selected={mobileTab === 'preview'} className={mobileTab === 'preview' ? 'active' : ''} onClick={() => setMobileTab('preview')}>👁 Resume</button>
        </div>

        <div className="editor-grid">
          {/* ── the auto-filled form ── */}
          <div className={`card pad editor-form ${mobileTab === 'preview' ? 'editor-pane-hidden' : ''}`}>
            <div className="chips" style={{ marginBottom: 14, position: 'sticky', top: 0, zIndex: 2, background: 'var(--card, #fff)', paddingBottom: 8 }}>
              {sections.map((s) => (
                <button
                  key={s.id}
                  className="chip"
                  onClick={() => jump(s.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="hint" style={{ marginBottom: 12 }}>
              Every section is open — nothing is hidden in another tab. Edit any field and the resume on the right changes with you.
            </div>

            {sections.map((s) => (
              <section key={s.id} id={`import-sec-${s.id}`} className="import-sec" style={{ marginBottom: 22 }}>
                <div style={{ fontWeight: 800, color: 'var(--navy-900)', fontSize: 14, marginBottom: 8, paddingTop: 4 }}>{s.label}</div>
                {s.node}
              </section>
            ))}

            <div className="step-foot">
              <button
                className="btn"
                disabled={!missing.length}
                onClick={() => missing[0] && jump(missing[0].step)}
              >
                Jump to missing
              </button>
              <div className="row" style={{ flex: '1 1 auto', justifyContent: 'flex-end' }}>
                <button className="btn primary" onClick={handleSave}>💾 Save &amp; open in editor →</button>
              </div>
            </div>
          </div>

          {/* ── the live resume ── */}
          <div className={`preview-pane panel ${mobileTab === 'form' ? 'editor-pane-hidden' : ''}`}>
            <div className="preview-toolbar">
              <b style={{ color: 'var(--navy-900)', fontSize: 13 }}>Live resume · updates as you type</b>
              <span className="hint" style={{ fontSize: 12 }}>A4 · {Math.ceil(1)} page view</span>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <select
                className="select"
                style={{ flex: '1 1 150px', minWidth: 130, padding: '8px 10px' }}
                value={r.templateId}
                onChange={(e) => set({ templateId: e.target.value })}
                aria-label="Template"
              >
                {TEMPLATE_GROUPS.map((g) => (
                  <optgroup key={g.layout} label={g.label}>
                    {g.items.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <select
                className="select"
                style={{ flex: '1 1 130px', minWidth: 120, padding: '8px 10px' }}
                value={r.fieldId}
                onChange={(e) => set({ fieldId: e.target.value })}
                aria-label="Career field"
              >
                {FIELDS.map((f) => <option key={f.id} value={f.id}>{f.icon} {f.label}</option>)}
              </select>
            </div>

            <LiveSheet r={r} />

            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn small primary" onClick={handleSave}>💾 Save &amp; open in editor →</button>
            </div>
            <div className="hint" style={{ textAlign: 'center', fontSize: 11.5 }}>
              {fieldById(r.fieldId).label} layout · {completeness(r)}% complete · changes save automatically
            </div>
          </div>
        </div>

        {/* ── import report ── */}
        <div className="card pad" style={{ marginTop: 18 }}>
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <b style={{ color: 'var(--navy-900)', fontSize: 14 }}>📄 Extracted text &amp; import report</b>
            <button className="btn small" onClick={() => setShowReport((s) => !s)}>
              {showReport ? 'Hide' : 'Show'} details
            </button>
          </div>
          {showReport && (
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 18 }} className="import-report">
              <div>
                <label className="f">Text we read from the file (editable)</label>
                <textarea
                  className="textarea"
                  style={{ minHeight: 260, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5 }}
                  value={textDraft}
                  onChange={(e) => setTextDraft(e.target.value)}
                  onBlur={() => {
                    // merge into whatever the latest draft is (a field may have
                    // been edited in this same tick) instead of the stale copy
                    const current = loadImportDraft() ?? draft;
                    saveImportDraft({ ...current, rawText: textDraft });
                  }}
                />
                <div className="row" style={{ marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn small" onClick={reparseFromText}>🔄 Re-read fields from this text</button>
                  <span className="hint" style={{ fontSize: 12 }}>{textDraft.length} characters · fix a line here if OCR misread it, then re-read.</span>
                </div>
              </div>
              <div>
                <label className="f">How it was read</label>
                <table className="tbl" style={{ fontSize: 12.5 }}>
                  <tbody>
                    <tr><td><b>File</b></td><td style={{ wordBreak: 'break-all' }}>{draft.fileName}</td></tr>
                    <tr><td><b>Format</b></td><td>{draft.format.toUpperCase()}</td></tr>
                    <tr><td><b>Size</b></td><td>{(draft.fileSize / 1024).toFixed(1)} KB</td></tr>
                    {meta?.pages ? <tr><td><b>Pages</b></td><td>{meta.pages}</td></tr> : null}
                    <tr><td><b>Extraction</b></td><td>{METHOD_LABEL[meta?.method || ''] || meta?.method || 'text layer'}</td></tr>
                    {meta?.ocrPages ? <tr><td><b>Pages needing OCR</b></td><td>{meta.ocrPages}</td></tr> : null}
                    {meta?.ocrConfidence ? <tr><td><b>OCR confidence</b></td><td>{meta.ocrConfidence}%</td></tr> : null}
                    <tr><td><b>Auto-filled</b></td><td>{detected.length} field groups</td></tr>
                    <tr><td><b>Skills found</b></td><td>{r.skills.length}</td></tr>
                    <tr><td><b>Experience</b></td><td>{r.experience.length} entries</td></tr>
                    <tr><td><b>Education</b></td><td>{r.education.length} entries</td></tr>
                  </tbody>
                </table>
                <div className="notice" style={{ marginTop: 12, fontSize: 12 }}>
                  🔒 <b>Private by design:</b> the file is parsed and OCR-ed inside this browser tab — it is never
                  uploaded to a server. Content is sanitised before it is saved.
                </div>
                <div className="notice" style={{ marginTop: 10, fontSize: 12 }}>
                  💡 <b>OCR tip:</b> scanned text is 90–98% accurate. Always eyeball the name, phone number and dates —
                  those are the three fields recruiters check first.
                </div>
              </div>
            </div>
          )}
        </div>

        <style>{`
          @media (max-width: 900px) {
            .import-report { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    );
  }

  // ── upload screen ─────────────────────────────────────────────────────────
  const pending = loadImportDraft();
  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div className="page-head">
        <div>
          <div className="page-title">📤 Upload &amp; Edit Resume</div>
          <div className="page-sub">
            PDF, DOCX, TXT, JSON — and photos (JPG/PNG). Text-based files are read instantly; scanned pages and
            photos are read by the OCR engine that runs inside your browser. Extracted details are filled into the
            form automatically, with the resume live beside it.
          </div>
        </div>
      </div>

      {pending && (
        <div className="notice" style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span>📝 You have an unsaved import (<b>{pending.fileName}</b>).</span>
          <button className="btn small primary" onClick={() => { setDraft(pending); setStep('review'); }}>Continue editing it →</button>
        </div>
      )}

      <div className="card pad">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? 'var(--navy-600)' : 'var(--silver-300)'}`,
            borderRadius: 12,
            padding: '40px 20px',
            textAlign: 'center',
            background: dragActive ? 'var(--navy-50)' : 'var(--silver-100)',
            transition: 'all .2s',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
          <h3 style={{ color: 'var(--navy-900)', marginBottom: 6 }}>
            {dragActive ? 'Drop your resume here' : 'Drag &amp; drop your resume'}
          </h3>
          <p className="hint" style={{ marginBottom: 16 }}>
            PDF · DOCX · TXT · JSON · photo of a page (JPG/PNG) · Max 25MB · parsed on your device
          </p>
          <button className="btn primary" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
            📁 Choose a file
          </button>
          <input ref={fileInputRef} type="file" accept={ACCEPT} style={{ display: 'none' }} onChange={onFileChange} />
        </div>

        {error && <div className="notice err" style={{ marginTop: 16 }}>{error}</div>}

        <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div style={{ background: 'var(--navy-50)', borderRadius: 10, padding: 16, border: '1px solid var(--navy-100)' }}>
            <b style={{ color: 'var(--navy-800)', fontSize: 14 }}>🔒 Nothing leaves your device</b>
            <p className="hint" style={{ marginTop: 6, fontSize: 12.5 }}>
              No server upload. PDF parsing and OCR both run locally in this tab.
            </p>
          </div>
          <div style={{ background: 'var(--silver-100)', borderRadius: 10, padding: 16, border: '1px solid var(--silver-200)' }}>
            <b style={{ color: 'var(--navy-800)', fontSize: 14 }}>🖼 Scanned &amp; photographed files</b>
            <p className="hint" style={{ marginTop: 6, fontSize: 12.5 }}>
              Image-only PDFs and phone photos are read by the built-in OCR engine — the English model is bundled
              with the app, so it works offline and even on restricted networks.
            </p>
            <div className="hint" style={{ marginTop: 8, fontSize: 11.5 }}>
              Engine:&nbsp;
              {engineMode === 'local' && <b style={{ color: 'var(--navy-700)' }}>bundled · works offline ✓</b>}
              {engineMode === 'cdn' && <b style={{ color: 'var(--err)' }}>not bundled — scans may fail on strict networks</b>}
              {engineMode === null && <span>checking…</span>}
            </div>
          </div>
          <div style={{ background: 'var(--silver-100)', borderRadius: 10, padding: 16, border: '1px solid var(--silver-200)' }}>
            <b style={{ color: 'var(--navy-800)', fontSize: 14 }}>⚡ Auto-filled, then live</b>
            <p className="hint" style={{ marginTop: 6, fontSize: 12.5 }}>
              Name, email, phone, jobs, dates, skills and more drop straight into the form — edit anything and the
              resume preview changes as you type.
            </p>
          </div>
        </div>

        <div className="notice" style={{ marginTop: 20 }}>
          <b>How it works</b>
          <ol style={{ margin: '8px 0 0 18px', padding: 0 }}>
            <li>Upload your existing resume — text PDF, DOCX, TXT, or a scan/photo.</li>
            <li>We read it (text layer first, OCR only where it is needed) and structure it into fields.</li>
            <li>The form on the left is filled automatically and the resume shows beside it, live.</li>
            <li>Fix anything, pick a template, save — then download a clean PDF from the editor.</li>
          </ol>
        </div>

        <div style={{ marginTop: 20 }}>
          <h4 style={{ color: 'var(--navy-900)', fontSize: 14, marginBottom: 8 }}>💡 What reads best</h4>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Your file</th><th>What we do</th><th>Typical result</th></tr></thead>
              <tbody>
                <tr><td><b>PDF (text-based)</b></td><td>Exact text layer via pdf.js — no OCR</td><td>95%+ · instant</td></tr>
                <tr><td><b>PDF (scanned/image)</b></td><td>Auto-detected → built-in OCR, page by page</td><td>90–98% · few seconds</td></tr>
                <tr><td><b>Photo of a resume</b></td><td>Desk cropped, contrast fixed, then OCR</td><td>90–97% · few seconds</td></tr>
                <tr><td><b>DOCX</b></td><td>Word XML text runs, paragraph structure kept</td><td>90–95%</td></tr>
                <tr><td><b>TXT / JSON</b></td><td>Direct read (JSON restores a previous export)</td><td>100%</td></tr>
              </tbody>
            </table>
          </div>
          <p className="hint" style={{ marginTop: 8, fontSize: 12 }}>
            Blurry or dark scans are the one weak spot — a straight, well-lit photo usually reads better than a
            faded photocopy. You can always fix any line in the extracted-text panel and re-read the fields.
          </p>
        </div>
      </div>

      <div className="card pad" style={{ marginTop: 18 }}>
        <h4 style={{ margin: '0 0 8px', color: 'var(--navy-900)' }}>🆚 Starting fresh instead?</h4>
        <p className="hint" style={{ marginBottom: 12 }}>Use the guided 7-step builder — 10 minutes, {TEMPLATE_COUNT} templates, no watermark, 100% free.</p>
        <div className="row">
          <button className="btn primary" onClick={() => navigate('/editor/new')}>+ Create a new resume</button>
          <button className="btn" onClick={() => navigate('/')}>← Back to dashboard</button>
        </div>
      </div>
    </div>
  );
}

/** Template list for the preview dropdown, grouped by design family so a
 *  100+ entry menu stays navigable. */
const TEMPLATE_OPTIONS = TEMPLATES.map((t) => ({
  id: t.id,
  name: t.name,
  layoutLabel: LAYOUT_META[t.layout]?.label || t.layout,
}));
const TEMPLATE_GROUPS = (Object.keys(LAYOUT_META) as (keyof typeof LAYOUT_META)[]).map((layout) => ({
  layout,
  label: LAYOUT_META[layout].label,
  items: TEMPLATES.filter((t) => t.layout === layout),
}));
