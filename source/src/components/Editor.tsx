import { useEffect, useMemo, useRef, useState } from 'react';
import { STEPS, completeness, emptyResume, missingRequirements, type Resume } from '../lib/types';
import { downloadResumeJson, loadResumes, resumeStorageKey, sampleResume, upsertResume } from '../lib/store';
import {
  clearImportDraft, draftResumeFor, forgetImportInfo, importInfoFor, isDraftResume, subscribeImportDraft,
} from '../lib/importDraft';
import { fieldById } from '../lib/fields';
import { navigate } from '../App';
import { recordDownload } from '../lib/cloud';
import { trackEvent } from '../lib/track';
import Preview, { A4 } from './Preview';
import AtsCheck from './AtsCheck';
import ResumeScore from './ResumeScore';
import DeviceSheet, { type A4Fit, type DeviceMode } from './DeviceSheet';
import {
  StepBasics, StepDesign, StepEducation, StepExperience, StepExtras, StepSkills, StepSummary,
} from './Steps';

function stepValid(step: number, r: Resume): string[] {
  return missingRequirements(r).filter(item => item.step === STEPS[step].id).map(item => `${item.label} is required`);
}

export default function Editor({ id }: { id: string }) {
  const initial = useMemo<Resume>(() => {
    if (id === 'new') {
      const resume = emptyResume();
      try { const chosen = sessionStorage.getItem('craftcv.selected-template'); if (chosen) resume.templateId = chosen; } catch {}
      return resume;
    }
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
  const owner = useRef(resumeStorageKey());

  // ---- preview views: A4 sheet (fit width / whole page) + phone + desktop --
  // DeviceSheet lays the sheet out at true A4 px and scales it into an
  // exact-size frame, so the full page is always visible on any viewport.
  const [device, setDevice] = useState<DeviceMode>('a4');
  const [fitMode, setFitMode] = useState<A4Fit>(() =>
    typeof window !== 'undefined' && window.innerWidth > window.innerHeight + 40 ? 'page' : 'width',
  );
  // how many A4 pages the resume currently spans — 1, 2 or 3, the user's call
  const [pages, setPages] = useState(1);

  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const latest = useRef({ r, maxVisited });
  latest.current = { r, maxVisited };
  const persist = () => {
    if (!dirtyRef.current) return true;
    try {
      const snapshot = latest.current;
      const name = snapshot.r.name.startsWith('Untitled') && snapshot.r.personal.fullName
        ? `${snapshot.r.personal.fullName} — ${snapshot.r.personal.headline || 'Resume'}` : snapshot.r.name;
      upsertResume({ ...snapshot.r, name, step: Math.max(snapshot.r.step, snapshot.maxVisited) }, owner.current);
      if (isDraftResume(id)) clearImportDraft();
      dirtyRef.current = false;
      return true;
    } catch { return false; }
  };
  useEffect(() => {
    const flush = () => { persist(); };
    const beforeLeave = (event: BeforeUnloadEvent) => {
      if (!persist()) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', beforeLeave);
    return () => { flush(); window.removeEventListener('pagehide', flush); window.removeEventListener('beforeunload', beforeLeave); };
  }, [id]);

  // autosave (debounced) — never persists a brand-new resume the user hasn't touched
  useEffect(() => {
    if (!dirtyRef.current) return;
    setSaveState('saving');
    const t = setTimeout(() => setSaveState(persist() ? 'saved' : 'error'), 350);
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
    setR((prev) => { const next = { ...prev, ...patch }; latest.current = { ...latest.current, r: next }; return next; });
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
    // Sections are freely accessible; required fields gate the final export.
    setTouched(false);
    setStep(i);
    dirtyRef.current = true;
    setMaxVisited((m) => Math.max(m, i));
    setMobileTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownload = () => {
    // Save name first
    set({ name: r.name.startsWith('Untitled') && r.personal.fullName ? `${r.personal.fullName} — ${r.personal.headline}` : r.name });

    // The browser names the saved PDF after the page title — give it the
    // resume's own name so the file lands as "Amit Shukla — Senior Software
    // Engineer.pdf", never as the app's title.
    const base = (r.name && !r.name.startsWith('Untitled'))
      ? r.name
      : (r.personal.fullName ? `${r.personal.fullName} — ${r.personal.headline}` : 'resume');
    const clean = base.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'resume';
    const prevTitle = document.title;
    const restore = () => { document.title = prevTitle; window.removeEventListener('afterprint', restore); };
    document.title = clean;
    window.addEventListener('afterprint', restore);
    window.setTimeout(restore, 60_000); // safety net if afterprint never fires

    recordDownload(r);
    trackEvent('download');
    setTimeout(() => window.print(), 150);
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
            <span className={`save-status ${saveState}`} role="status">{saveState === 'saved' ? '✓ Saved on this device' : saveState === 'saving' ? 'Saving…' : 'Save failed — export a JSON backup'}</span><br />
            {f.icon} {f.label} · <b>{pct}%</b> complete · about <b>{Math.ceil(remainingMin)} min</b> left
          </div>
        </div>
        <div className="row editor-head-actions">
          <button className="btn" onClick={() => { if (persist()) navigate('/'); else setSaveState('error'); }}>← Dashboard</button>
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
            className={`step-pill ${i === step ? 'current' : stepValid(i, r).length === 0 ? 'done' : ''}`}
            onClick={() => go(i)}
            aria-current={i === step ? 'step' : undefined}
          >
            <span className="dot">{i !== step && stepValid(i, r).length === 0 ? '✓' : i + 1}</span>
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

          {!isDesignStep && <details className="editor-review"><summary>Check job description match</summary><AtsCheck r={r} /></details>}
          {!isDesignStep && <details className="editor-review"><summary>Review resume quality</summary><ResumeScore r={r} /></details>}

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
              <span
                className={`page-badge ${pages > 1 ? 'multi' : ''}`}
                title={pages === 1 ? 'Fits one A4 page' : `Spans ${pages} A4 pages — that is fine, the PDF downloads all of them`}
              >
                A4 · {pages} {pages === 1 ? 'page' : 'pages'}
              </span>
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
            <DeviceSheet r={r} mode={device} fit={fitMode} idPrefix="editor" onPages={setPages} />
            <div className="row" style={{ justifyContent: 'center', marginTop: 6 }}>
              <button className="btn small primary" disabled={pct < 100} onClick={handleDownload} style={{ flex: '0 0 auto' }}>
                ⬇ Download PDF
              </button>
            </div>
            <div className="hint" style={{ textAlign: 'center', fontSize: 11.5 }}>
              {device === 'a4'
                ? (pages > 1
                  ? `Your resume is ${pages} pages — every page is in the PDF. Recruiters like 1–2, so tighten if you can`
                  : 'Exact A4 page — what you see here is what prints')
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
