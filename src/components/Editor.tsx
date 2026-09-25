import { useEffect, useMemo, useRef, useState } from 'react';
import { STEPS, completeness, emptyResume, type Resume } from '../lib/types';
import { downloadResumeJson, loadResumes, sampleResume, upsertResume } from '../lib/store';
import {
  clearImportDraft, draftResumeFor, forgetImportInfo, importInfoFor, isDraftResume, subscribeImportDraft,
} from '../lib/importDraft';
import { fieldById } from '../lib/fields';
import { navigate } from '../App';
import { recordDownload } from '../lib/cloud';
import Preview, { A4 } from './Preview';
import AtsCheck from './AtsCheck';
import DeviceSheet, { type A4Fit, type DeviceMode } from './DeviceSheet';
import {
  StepBasics, StepDesign, StepEducation, StepExperience, StepExtras, StepSkills, StepSummary,
} from './Steps';

function stepValid(step: number, r: Resume): string[] {
  const p = r.personal;
  switch (STEPS[step].id) {
    case 'basics': {
      const errs: string[] = [];
      if (!p.fullName.trim()) errs.push('Full name is required');
      if (!p.headline.trim()) errs.push('Target job title is required');
      if (!/^\S+@\S+\.\S+$/.test(p.email)) errs.push('A valid email is required');
      if (!p.phone.trim()) errs.push('Phone number is required');
      if (!p.city.trim()) errs.push('City is required');
      return errs;
    }
    case 'summary':
      return r.summary.trim().length < 40 ? ['Summary needs at least 2–3 lines (40+ characters)' as string] : [];
    case 'experience': {
      if (r.fresher) return [];
      const ok = r.experience.some((e) => e.role.trim() && e.company.trim() && e.start.trim());
      return ok ? [] : ['Add at least one job (role, company, start) or mark yourself a fresher'];
    }
    case 'education': {
      const ok = r.education.some((e) => e.degree.trim() && e.school.trim() && e.year.trim());
      return ok ? [] : ['Add at least one education entry (degree, institute, year)'];
    }
    case 'skills':
      return r.skills.filter(Boolean).length >= 3 ? [] : ['Pick at least 3 skills'];
    default:
      return [];
  }
}

export default function Editor({ id }: { id: string }) {
  const initial = useMemo<Resume>(() => {
    if (id === 'new') return emptyResume();
    if (id === 'sample') return sampleResume();
    // An unsaved import draft always wins: nothing the user typed on the
    // import screen may be lost by opening the editor.
    const draft = draftResumeFor(id);
    if (draft) return draft;
    const found = loadResumes().find((r) => r.id === id);
    return found ?? emptyResume();
  }, [id]);

  const [r, setR] = useState<Resume>(initial);
  const [step, setStep] = useState(Math.min(initial.step, STEPS.length - 1));
  const [maxVisited, setMaxVisited] = useState(Math.min(initial.step, STEPS.length - 1));
  const [touched, setTouched] = useState(false);
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');
  const dirtyRef = useRef(false);

  // ---- preview views: A4 sheet (fit width / whole page) + phone + desktop --
  // DeviceSheet lays the sheet out at true A4 px and scales it into an
  // exact-size frame, so the full page is always visible on any viewport.
  const [device, setDevice] = useState<DeviceMode>('a4');
  const [fitMode, setFitMode] = useState<A4Fit>(() =>
    typeof window !== 'undefined' && window.innerWidth > window.innerHeight + 40 ? 'page' : 'width',
  );

  // autosave (debounced) — never persists a brand-new resume the user hasn't touched
  useEffect(() => {
    const isNew = id === 'new' || id === 'sample';
    if (isNew && !dirtyRef.current) return;
    const t = setTimeout(() => {
      upsertResume({ ...r, step: Math.max(r.step, maxVisited) });
      // the draft and the saved copy are identical now — retire the draft
      if (isDraftResume(id)) clearImportDraft();
    }, 350);
    return () => clearTimeout(t);
  }, [r, maxVisited, id]);

  // Keep following the import screen if it is still open for this resume:
  // edits made over there appear here immediately (and vice-versa).
  useEffect(() => {
    if (!isDraftResume(id)) return;
    return subscribeImportDraft((d) => {
      if (d && d.resume.id === id) {
        dirtyRef.current = true;
        setR(d.resume);
      }
    });
  }, [id]);

  const [importInfo, setImportInfo] = useState(() => importInfoFor(id));

  const set = (patch: Partial<Resume>) => {
    dirtyRef.current = true;
    setR((prev) => ({ ...prev, ...patch }));
  };
  // The design step is a full-width gallery: every card is already a live
  // preview of this resume, so the side preview pane is not shown there.
  const isDesignStep = STEPS[step].id === 'design';
  const errs = touched ? stepValid(step, r) : [];
  const canNext = stepValid(step, r).length === 0;
  const pct = completeness(r);
  const remainingMin = STEPS.slice(step).reduce((a, s) => a + s.minutes, 0);
  const f = fieldById(r.fieldId);

  const go = (i: number) => {
    if (i > step && !canNext) { setTouched(true); return; }
    setTouched(false);
    setStep(i);
    setMaxVisited((m) => Math.max(m, i));
    setMobileTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownload = () => {
    // Save name first
    setR((prev) => ({ ...prev, name: prev.name.startsWith('Untitled') && prev.personal.fullName ? `${prev.personal.fullName} — ${prev.personal.headline}` : prev.name }));

    recordDownload(r);
    setTimeout(() => window.print(), 100);
  };

  const stepBody = [
    <StepBasics key="b" r={r} set={set} />,
    <StepSummary key="s" r={r} set={set} />,
    <StepExperience key="e" r={r} set={set} />,
    <StepEducation key="ed" r={r} set={set} />,
    <StepSkills key="sk" r={r} set={set} />,
    <StepExtras key="x" r={r} set={set} />,
    <StepDesign key="d" r={r} set={set} />,
  ][step];

  return (
    <div className="editor-root">
      {importInfo && (
        <div className="notice no-print" style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>
            📥 <b>Imported from {importInfo.fileName}</b> ({importInfo.format.toUpperCase()}
            {importInfo.meta?.method === 'ocr' || importInfo.meta?.method === 'mixed' ? ` · OCR${importInfo.meta?.ocrConfidence ? ` ${importInfo.meta.ocrConfidence}%` : ''}` : ' · text layer'})
            — fields were auto-filled. Double-check the name, phone number and dates.
          </span>
          <button
            className="btn small"
            onClick={() => { forgetImportInfo(id); setImportInfo(null); }}
          >Got it</button>
        </div>
      )}

      <div className="page-head no-print">
        <div style={{ minWidth: 0, flex: '1 1 260px' }}>
          <div className="page-title" style={{ fontSize: 20, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {r.personal.fullName ? `${r.personal.fullName} — ${r.personal.headline || f.label}` : 'New resume'}
          </div>
          <div className="page-sub">
            {f.icon} {f.label} · <b>{pct}%</b> complete · about <b>{Math.ceil(remainingMin)} min</b> left
          </div>
        </div>
        <div className="row editor-head-actions">
          <button className="btn" onClick={() => navigate('/')}>← Dashboard</button>
          <button
            className="btn"
            title="Download this resume as JSON — portable backup, re-upload it any time (Upload & Edit)"
            onClick={() => downloadResumeJson(r)}
          >
            ⤓ JSON
          </button>
          <button
            className="btn primary"
            disabled={pct < 100}
            title={pct < 100 ? 'Finish mandatory fields first' : 'Download PDF — free, unlimited, no watermark'}
            onClick={handleDownload}
          >
            ⬇ Download PDF
          </button>
        </div>
      </div>

      <div className="stepper no-print" style={{ marginBottom: 16 }}>
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            className={`step-pill ${i === step ? 'current' : i < step || stepValid(i, r).length === 0 ? 'done' : ''}`}
            onClick={() => { if (i <= maxVisited || i <= step + 1) go(i); }}
            disabled={i > maxVisited + 1}
          >
            <span className="dot">{i < step || (i !== step && stepValid(i, r).length === 0) ? '✓' : i + 1}</span>
            {s.short}
          </button>
        ))}
        <div style={{ flex: 1, minWidth: 12 }} />
        <div className="progress" style={{ width: 140, alignSelf: 'center', flex: '0 0 140px' }}>
          <div style={{ width: `${pct}%` }} />
        </div>
      </div>

      {!isDesignStep && (
        <div className="editor-mobile-tabs no-print" role="tablist" aria-label="Editor view">
          <button role="tab" aria-selected={mobileTab === 'form'} className={mobileTab === 'form' ? 'active' : ''} onClick={() => setMobileTab('form')}>✎ Edit</button>
          <button role="tab" aria-selected={mobileTab === 'preview'} className={mobileTab === 'preview' ? 'active' : ''} onClick={() => setMobileTab('preview')}>👁 Preview</button>
        </div>
      )}

      <div className={`editor-grid ${isDesignStep ? 'editor-grid-design' : ''}`}>
        <div className={`card pad no-print editor-form ${!isDesignStep && mobileTab === 'preview' ? 'editor-pane-hidden' : ''}`}>
          <h3 style={{ color: 'var(--navy-900)', marginBottom: 4, fontSize: 16 }}>{STEPS[step].title}</h3>
          <div className="hint" style={{ marginBottom: 14 }}>Step {step + 1} of {STEPS.length} · ~{STEPS[step].minutes} min</div>

          {errs.length > 0 && (
            <div className="notice err">{errs.map((e) => <div key={e}>• {e}</div>)}</div>
          )}

          {!isDesignStep && <AtsCheck r={r} />}

          {stepBody}

          <div className="step-foot">
            <button className="btn" disabled={step === 0} onClick={() => go(step - 1)}>← Back</button>
            <div className="row" style={{ flex: '1 1 auto', justifyContent: 'flex-end' }}>
              {step === STEPS.length - 1 ? (
                <button className="btn primary" disabled={pct < 100} onClick={handleDownload}>
                  ⬇ Finish & download PDF
                </button>
              ) : (
                <button className="btn primary" onClick={() => { setTouched(true); if (canNext) go(step + 1); }}>
                  Next: {STEPS[step + 1].short} →
                </button>
              )}
            </div>
          </div>
          {!canNext && touched && (
            <div className="hint" style={{ marginTop: 8 }}>Fill required items above to continue — they are fields recruiters always look for.</div>
          )}
        </div>

        {!isDesignStep && (
          <div className={`preview-pane panel no-print editor-preview ${mobileTab === 'form' ? 'editor-pane-hidden' : ''}`}>
            <div className="preview-toolbar">
              <b style={{ color: 'var(--navy-900)', fontSize: 13 }}>Live preview · updates as you type</b>
            </div>
            <div className="editor-view-tabs" role="tablist" aria-label="Preview view">
              <div className="chips" style={{ gap: 4 }}>
                <button
                  role="tab"
                  aria-selected={device === 'a4' && fitMode === 'width'}
                  className={`chip ${device === 'a4' && fitMode === 'width' ? 'on' : ''}`}
                  style={{ padding: '5px 11px', minHeight: 30, fontSize: 12 }}
                  onClick={() => { setDevice('a4'); setFitMode('width'); }}
                >▤ Fit width</button>
                <button
                  role="tab"
                  aria-selected={device === 'a4' && fitMode === 'page'}
                  className={`chip ${device === 'a4' && fitMode === 'page' ? 'on' : ''}`}
                  style={{ padding: '5px 11px', minHeight: 30, fontSize: 12 }}
                  onClick={() => { setDevice('a4'); setFitMode('page'); }}
                >▤ Whole page</button>
              </div>
              <div className="chips" style={{ gap: 4 }}>
                <button
                  role="tab"
                  aria-selected={device === 'phone'}
                  className={`chip ${device === 'phone' ? 'on' : ''}`}
                  style={{ padding: '5px 11px', minHeight: 30, fontSize: 12 }}
                  onClick={() => setDevice('phone')}
                >📱 Mobile</button>
                <button
                  role="tab"
                  aria-selected={device === 'desktop'}
                  className={`chip ${device === 'desktop' ? 'on' : ''}`}
                  style={{ padding: '5px 11px', minHeight: 30, fontSize: 12 }}
                  onClick={() => setDevice('desktop')}
                >🖥 Desktop</button>
              </div>
            </div>
            <DeviceSheet r={r} mode={device} fit={fitMode} idPrefix="editor" />
            <div className="row" style={{ justifyContent: 'center', marginTop: 6 }}>
              <button className="btn small primary" disabled={pct < 100} onClick={handleDownload} style={{ flex: '0 0 auto' }}>
                ⬇ Download PDF
              </button>
            </div>
            <div className="hint" style={{ textAlign: 'center', fontSize: 11.5 }}>
              {device === 'a4'
                ? 'Exact A4 page — what you see here is what prints'
                : device === 'phone'
                  ? 'How it opens on a mobile phone — the whole page fits the screen'
                  : 'How it opens on a desktop — the whole page fits the window'}
            </div>
          </div>
        )}
      </div>

      <div className="print-root" aria-hidden="true"><Preview r={r} /></div>

    </div>
  );
}
