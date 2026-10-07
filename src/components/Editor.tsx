import { useEffect, useMemo, useRef, useState } from 'react';
import { STEPS, completeness, emptyResume, type Resume } from '../lib/types';
import { downloadResumeJson, loadResumes, sampleResume, upsertResume } from '../lib/store';
import {
  clearImportDraft, draftResumeFor, forgetImportInfo, importInfoFor, isDraftResume, subscribeImportDraft,
} from '../lib/importDraft';
import { fieldById } from '../lib/fields';
import { navigate } from '../lib/navigation';
import { recordDownload } from '../lib/cloud';
import { trackEvent } from '../lib/track';
import {
  canSharePdfFile, isAppleTouchBrowser, openPdfDownload, preparePdfDownload, releasePdfDownload,
  sharePdfFile, triggerBrowserPdfDownload, type PreparedPdfDownload,
} from '../lib/mobilePdfDownload';
import Preview, { A4 } from './Preview';
import AtsCheck from './AtsCheck';
import ResumeScore from './ResumeScore';
import DeviceSheet, { type A4Fit, type DeviceMode } from './DeviceSheet';
import {
  StepBasics, StepDesign, StepEducation, StepExperience, StepExtras, StepSkills, StepSummary,
} from './Steps';

// No step is ever "incomplete enough" to block the user: every field is
// optional, the Next buttons and the PDF download always work. The progress
// meter and the Resume score stay as gentle advice, never as gates.

function collectPrintableCss(): string {
  const chunks: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      chunks.push(Array.from(sheet.cssRules).map((rule) => rule.cssText).join('\n'));
    } catch {
      // Ignore cross-origin stylesheets. CraftCV's own Vite CSS is same-origin.
    }
  }
  return chunks.join('\n');
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
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');
  const dirtyRef = useRef(false);

  // ---- preview views: A4 sheet (fit width / whole page) + phone + desktop --
  // DeviceSheet lays the sheet out at true A4 px and scales it into an
  // exact-size frame, so the full page is always visible on any viewport.
  const [device, setDevice] = useState<DeviceMode>('a4');
  // Phones default to "whole page": the complete A4 sheet visible at once,
  // nothing cut off. Desktop keeps fit-width (readable) with the page fit one
  // tap away — and landscape tablets behave like desktop.
  const [fitMode, setFitMode] = useState<A4Fit>(() =>
    typeof window !== 'undefined' && (window.innerWidth <= 560 || window.innerWidth > window.innerHeight + 40)
      ? 'page'
      : 'width',
  );
  // how many A4 pages the resume currently spans — 1, 2 or 3, the user's call
  const [pages, setPages] = useState(1);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfDownload, setPdfDownload] = useState<PreparedPdfDownload | null>(null);
  const [pdfNotice, setPdfNotice] = useState('');
  const [pdfError, setPdfError] = useState('');
  const pdfDownloadRef = useRef<PreparedPdfDownload | null>(null);

  const keepPreparedPdf = (next: PreparedPdfDownload | null) => {
    if (pdfDownloadRef.current && pdfDownloadRef.current !== next) releasePdfDownload(pdfDownloadRef.current);
    pdfDownloadRef.current = next;
    setPdfDownload(next);
  };

  useEffect(() => () => releasePdfDownload(pdfDownloadRef.current), []);

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
  const pct = completeness(r);
  const remainingMin = STEPS.slice(step).reduce((a, s) => a + s.minutes, 0);
  const f = fieldById(r.fieldId);

  const go = (i: number) => {
    setStep(i);
    setMaxVisited((m) => Math.max(m, i));
    setMobileTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fallbackPrint = (clean: string) => {
    const prevTitle = document.title;
    const restore = () => { document.title = prevTitle; window.removeEventListener('afterprint', restore); };
    document.title = clean;
    window.addEventListener('afterprint', restore);
    window.setTimeout(restore, 60_000);
    recordDownload(r);
    trackEvent('download_fallback');
    window.setTimeout(() => window.print(), 120);
  };

  const handleDownload = async () => {
    if (downloadingPdf) return;

    setR((prev) => ({ ...prev, name: prev.name.startsWith('Untitled') && prev.personal.fullName ? `${prev.personal.fullName} — ${prev.personal.headline}` : prev.name }));

    const base = (r.name && !r.name.startsWith('Untitled'))
      ? r.name
      : (r.personal.fullName ? `${r.personal.fullName} — ${r.personal.headline}` : 'resume');
    const clean = base.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'resume';

    setPdfError('');
    setPdfNotice('Generating your PDF…');
    setDownloadingPdf(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 55_000);
    try {
      const sheet = document.querySelector('.print-root .sheet');
      if (!(sheet instanceof HTMLElement)) throw new Error('Printable resume sheet not found');

      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          html: sheet.outerHTML,
          css: collectPrintableCss(),
          title: clean,
        }),
      });
      if (!response.ok) throw new Error(`PDF service returned ${response.status}`);

      const blob = await response.blob();
      if (blob.type !== 'application/pdf' || blob.size < 500) {
        throw new Error('PDF service returned an invalid file');
      }

      const prepared = preparePdfDownload(blob, `${clean}.pdf`);
      keepPreparedPdf(prepared);
      const apple = isAppleTouchBrowser();
      if (!apple) triggerBrowserPdfDownload(prepared);
      setPdfNotice(apple
        ? 'PDF ready. On iPhone/iPad, tap Save PDF to use the system Save/Share menu, or Open PDF to view it.'
        : 'PDF ready. Your browser download has started. If it does not appear in Downloads, tap Download again.');
      recordDownload(r);
      trackEvent('download');
    } catch (error: any) {
      console.warn('Direct PDF download unavailable.', error);
      const message = error?.name === 'AbortError'
        ? 'PDF generation timed out. Please try again, or use Print / Save as PDF.'
        : 'The PDF could not be downloaded automatically. Try again or use Print / Save as PDF.';
      setPdfError(message);
      setPdfNotice('');
      trackEvent('download_failed');
    } finally {
      window.clearTimeout(timeout);
      setDownloadingPdf(false);
    }
  };

  const savePreparedPdf = async () => {
    if (!pdfDownload) return;
    try {
      if (canSharePdfFile(pdfDownload)) {
        await sharePdfFile(pdfDownload);
        setPdfNotice('Save/Share menu opened. Choose Save to Files, Downloads, Drive, or another destination.');
      } else {
        triggerBrowserPdfDownload(pdfDownload);
        setPdfNotice('Download requested again. Check your browser Downloads.');
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      openPdfDownload(pdfDownload);
      setPdfNotice('PDF opened in the browser. Use the browser Share/Download control to save it.');
    }
  };

  const openPreparedPdf = () => {
    if (!pdfDownload) return;
    openPdfDownload(pdfDownload);
    setPdfNotice('PDF opened. Use your browser Share/Download control if you want another copy.');
  };

  const downloadPreparedAgain = () => {
    if (!pdfDownload) return;
    if (isAppleTouchBrowser()) openPdfDownload(pdfDownload);
    else triggerBrowserPdfDownload(pdfDownload);
    setPdfNotice(isAppleTouchBrowser()
      ? 'PDF opened. On iPhone/iPad use Share → Save to Files.'
      : 'Download requested again. Check your browser Downloads.');
  };

  const dismissPdfStatus = () => {
    setPdfNotice('');
    setPdfError('');
  };

  const stepBody = [
    <StepBasics key="b" r={r} set={set} />,
    <StepSummary key="s" r={r} set={set} />,
    <StepEducation key="ed" r={r} set={set} />,
    <StepExperience key="e" r={r} set={set} />,
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
            title="Download PDF — free, unlimited, no watermark"
            onClick={handleDownload}
            disabled={downloadingPdf}
          >
            {downloadingPdf ? 'Preparing PDF…' : '⬇ Download PDF'}
          </button>
        </div>
      </div>

      <div className="stepper no-print" style={{ marginBottom: 16 }}>
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            className={`step-pill ${i === step ? 'current' : i < step ? 'done' : ''}`}
            onClick={() => go(i)}
          >
            <span className="dot">{i < step ? '✓' : i + 1}</span>
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

          {!isDesignStep && <AtsCheck r={r} />}
          {!isDesignStep && <ResumeScore r={r} />}

          <div className="step-body">{stepBody}</div>

          <div className="step-foot">
            <button className="btn" disabled={step === 0} onClick={() => go(step - 1)}>← Back</button>
            <div className="row" style={{ flex: '1 1 auto', justifyContent: 'flex-end' }}>
              {step === STEPS.length - 1 ? (
                <button className="btn primary" onClick={handleDownload} disabled={downloadingPdf}>
                  {downloadingPdf ? 'Preparing PDF…' : '⬇ Finish & download PDF'}
                </button>
              ) : (
                <button className="btn primary" onClick={() => go(step + 1)}>
                  Next: {STEPS[step + 1].short} →
                </button>
              )}
            </div>
          </div>
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
                  className={`chip dev-chip ${device === 'a4' && fitMode === 'width' ? 'on' : ''}`}
                  onClick={() => { setDevice('a4'); setFitMode('width'); }}
                >▤ Fit width</button>
                <button
                  role="tab"
                  aria-selected={device === 'a4' && fitMode === 'page'}
                  className={`chip dev-chip ${device === 'a4' && fitMode === 'page' ? 'on' : ''}`}
                  onClick={() => { setDevice('a4'); setFitMode('page'); }}
                >▤ Whole page</button>
              </div>
              <div className="chips" style={{ gap: 4 }}>
                <button
                  role="tab"
                  aria-selected={device === 'phone'}
                  className={`chip dev-chip ${device === 'phone' ? 'on' : ''}`}
                  onClick={() => setDevice('phone')}
                >📱 Mobile</button>
                <button
                  role="tab"
                  aria-selected={device === 'desktop'}
                  className={`chip dev-chip ${device === 'desktop' ? 'on' : ''}`}
                  onClick={() => setDevice('desktop')}
                >🖥 Desktop</button>
              </div>
            </div>
            <DeviceSheet r={r} mode={device} fit={fitMode} idPrefix="editor" onPages={setPages} />
            <div className="row" style={{ justifyContent: 'center', marginTop: 6 }}>
              <button className="btn small primary" onClick={handleDownload} disabled={downloadingPdf} style={{ flex: '0 0 auto' }}>
                {downloadingPdf ? 'Preparing PDF…' : '⬇ Download PDF'}
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

      {(downloadingPdf || pdfNotice || pdfError) && (
        <section
          className={`pdf-download-status no-print ${pdfError ? 'error' : pdfDownload ? 'ready' : 'working'}`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="pdf-download-status-icon" aria-hidden="true">{pdfError ? '!' : pdfDownload ? '✓' : '↓'}</div>
          <div className="pdf-download-status-copy">
            <b>{pdfError ? 'PDF needs your attention' : pdfDownload ? 'PDF ready' : 'Preparing PDF'}</b>
            <span>{pdfError || pdfNotice || 'Generating your resume. Keep this page open.'}</span>
          </div>
          <div className="pdf-download-status-actions">
            {pdfDownload && !pdfError && (
              <>
                <button className="btn small primary" type="button" onClick={savePreparedPdf}>Save PDF</button>
                <button className="btn small" type="button" onClick={openPreparedPdf}>Open PDF</button>
                <button className="btn small" type="button" onClick={downloadPreparedAgain}>Download again</button>
              </>
            )}
            {pdfError && (
              <>
                <button className="btn small primary" type="button" onClick={handleDownload}>Try again</button>
                <button className="btn small" type="button" onClick={() => fallbackPrint((r.personal.fullName || 'resume').trim() || 'resume')}>Print / Save as PDF</button>
              </>
            )}
          </div>
          {!downloadingPdf && <button className="pdf-download-status-close" type="button" aria-label="Dismiss PDF status" onClick={dismissPdfStatus}>×</button>}
        </section>
      )}

      <div className="print-root" aria-hidden="true"><Preview r={r} /></div>

      <style>{`
        .pdf-download-status{position:fixed;right:18px;bottom:18px;z-index:140;width:min(470px,calc(100vw - 36px));display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:10px 12px;align-items:center;padding:13px 14px;border:1px solid #d8e2ef;border-radius:16px;background:rgba(255,255,255,.985);box-shadow:0 18px 50px rgba(10,22,48,.22);backdrop-filter:blur(14px)}
        .pdf-download-status.ready{border-color:#b9decf}.pdf-download-status.error{border-color:#efc8c8}.pdf-download-status-icon{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#eaf2ff;color:#174c8c;font-size:18px;font-weight:900}.pdf-download-status.ready .pdf-download-status-icon{background:#e8f7f0;color:#08724f}.pdf-download-status.error .pdf-download-status-icon{background:#fff0f0;color:#a83232}.pdf-download-status-copy{display:grid;gap:2px;min-width:0}.pdf-download-status-copy b{font-size:13.5px;color:#102344}.pdf-download-status-copy span{font-size:11.8px;line-height:1.4;color:#5d6b7e}.pdf-download-status-actions{grid-column:2 / -1;display:flex;gap:6px;flex-wrap:wrap}.pdf-download-status-close{position:absolute;right:6px;top:5px;width:28px;height:28px;border:0;border-radius:50%;background:transparent;color:#718096;font-size:20px;cursor:pointer}
        @media(max-width:760px){.pdf-download-status{left:8px;right:8px;bottom:calc(70px + var(--safe-bottom));width:auto;grid-template-columns:36px minmax(0,1fr);padding:12px 11px;border-radius:15px}.pdf-download-status-icon{width:34px;height:34px;font-size:16px}.pdf-download-status-copy{padding-right:24px}.pdf-download-status-copy b{font-size:13px}.pdf-download-status-copy span{font-size:11.5px}.pdf-download-status-actions{grid-column:1 / -1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.pdf-download-status-actions .btn{width:100%;min-width:0;white-space:normal;min-height:40px}.pdf-download-status-actions .btn:nth-child(3){grid-column:1 / -1}.pdf-download-status-close{right:5px;top:4px}}
      `}</style>
    </div>
  );
}
