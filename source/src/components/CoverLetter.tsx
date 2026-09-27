// Cover letter builder — the free answer to paid builders' paywalled letters.
//
// Pick a resume, name the company and role, and the letter drafts itself from
// facts already on the resume (see src/lib/coverLetter.ts). The body stays
// fully editable; the sheet previews live at A4 and prints through the same
// clean pipeline as the resume (no branding, saved under the user's name).

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Resume } from '../lib/types';
import { loadResumes, sampleResume } from '../lib/store';
import { draftCoverLetter } from '../lib/coverLetter';
import { trackEvent } from '../lib/track';
import { navigate } from '../App';

type Layout = 'classic' | 'modern' | 'compact';

/** Same technique as Preview's Thumb: measure the pane, scale the 794px sheet. */
function useFillWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof ResizeObserver === 'undefined') { setW(el.clientWidth); return; }
    const ro = new ResizeObserver((entries) => {
      setW(Math.round(entries[0]?.contentRect.width ?? 0));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

const LAYOUTS: { id: Layout; label: string; hint: string }[] = [
  { id: 'classic', label: 'Classic', hint: 'Centred header, timeless' },
  { id: 'modern', label: 'Modern', hint: 'Navy band, contemporary' },
  { id: 'compact', label: 'Compact', hint: 'Tight and short' },
];

function todayLine(): string {
  return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Render body text: paragraphs separated by blank lines, "• " lines become a list. */
function BodyBlocks({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
        const isBullets = lines.every((l) => l.startsWith('•')) && lines.length > 0;
        if (isBullets) {
          return (
            <ul key={bi} className="cl-list">
              {lines.map((l, li) => <li key={li}>{l.replace(/^•\s*/, '')}</li>)}
            </ul>
          );
        }
        return <p key={bi} className="cl-p">{lines.join(' ')}</p>;
      })}
    </>
  );
}

export default function CoverLetter() {
  const resumes = loadResumes();
  const hasResumes = resumes.length > 0;
  const [resumeId, setResumeId] = useState<string>(() => {
    const best = [...resumes].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    return best?.id ?? 'sample';
  });
  const r: Resume = useMemo(() => {
    if (resumeId === 'sample') return sampleResume();
    return resumes.find((x) => x.id === resumeId) ?? sampleResume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId, resumes.length]);

  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [manager, setManager] = useState('');
  const [layout, setLayout] = useState<Layout>('classic');
  // null = follow the auto-draft; a string = the user's custom edit
  const [body, setBody] = useState<string | null>(null);

  const draft = useMemo(
    () => draftCoverLetter(r, { company, role, hiringManager: manager }),
    [r, company, role, manager],
  );
  const bodyText = body ?? draft.paragraphs.join('\n\n');

  const p = r.personal;
  const contactBits = [p.email, p.phone, p.city, p.linkedin].map((s) => s.trim()).filter(Boolean);
  const fileName = `${p.fullName || 'Cover letter'} — Cover letter`.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();

  const handlePrint = () => {
    trackEvent('cover_letter');
    const prevTitle = document.title;
    const restore = () => { document.title = prevTitle; window.removeEventListener('afterprint', restore); };
    document.title = fileName;
    window.addEventListener('afterprint', restore);
    window.setTimeout(restore, 60_000);
    setTimeout(() => window.print(), 150);
  };

  return (
    <div className="cl-root">
      <div className="page-head no-print">
        <div>
          <div className="page-title">Cover letter</div>
          <div className="page-sub">
            Drafted from your resume in seconds — fully editable, prints clean. Free, like everything here.
          </div>
        </div>
        <div className="row">
          {hasResumes && <button className="btn" onClick={() => navigate('/')}>← My resumes</button>}
          <button className="btn primary" onClick={handlePrint}>⬇ Download PDF</button>
        </div>
      </div>

      {!hasResumes && (
        <div className="notice no-print" style={{ marginBottom: 14 }}>
          You are seeing the <b>sample resume</b> — create your own resume first and the letter will draft from it.{' '}
          <a href="#/editor/new" onClick={(e) => { e.preventDefault(); navigate('/editor/new'); }}>Create a resume →</a>
        </div>
      )}

      <div className="cl-grid">
        <div className="card pad no-print cl-form">
          <h3 style={{ color: 'var(--navy-900)', fontSize: 16, marginTop: 0 }}>Letter setup</h3>

          {hasResumes && (
            <div style={{ marginBottom: 12 }}>
              <label className="f">Use resume</label>
              <select className="input" value={resumeId} onChange={(e) => { setResumeId(e.target.value); setBody(null); }}>
                {resumes.map((x) => (
                  <option key={x.id} value={x.id}>{x.personal.fullName || x.name} — {x.personal.headline || 'untitled'}</option>
                ))}
                <option value="sample">Sample resume (Amit Shukla)</option>
              </select>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label className="f">Company you are applying to</label>
            <input className="input" placeholder="e.g. Infosys" value={company} onChange={(e) => setCompany(e.target.value)} />
            {!company.trim() && <div className="hint">Left empty, the letter uses [Company name] so you cannot send it half-filled.</div>}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="f">Role / job title</label>
            <input className="input" placeholder="Defaults to your resume's job title" value={role} onChange={(e) => setRole(e.target.value)} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="f">Hiring manager's name (optional)</label>
            <input className="input" placeholder="e.g. Priya Sharma" value={manager} onChange={(e) => setManager(e.target.value)} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="f">Layout</label>
            <div className="chips">
              {LAYOUTS.map((l) => (
                <button key={l.id} type="button" className={`chip ${layout === l.id ? 'on' : ''}`} title={l.hint}
                  onClick={() => setLayout(l.id)}>{l.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="f">Letter body {body === null ? '(auto-drafted — edit freely)' : '(your edit)'}</label>
            <textarea
              className="input cl-body-input"
              rows={14}
              value={bodyText}
              onChange={(e) => setBody(e.target.value)}
              spellCheck
            />
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
              <button className="btn small" onClick={() => setBody(null)}>↻ Re-draft from resume</button>
              <span className="hint">Lines starting with “•” print as bullets.</span>
            </div>
          </div>
        </div>

        <div className="cl-preview no-print">
          <div className="preview-toolbar">
            <b style={{ color: 'var(--navy-900)', fontSize: 13 }}>Live A4 preview</b>
          </div>
          <SheetPreview r={r} greeting={draft.greeting} body={bodyText} layout={layout} contact={contactBits}
            company={company} manager={manager} />
        </div>
      </div>

      {/* print-only page — exactly what the PDF gets */}
      <div className="print-root">
        <div className="sheet cl-sheet">
          <LetterSheet r={r} greeting={draft.greeting} body={bodyText} layout={layout} contact={contactBits}
            company={company} manager={manager} />
        </div>
      </div>
    </div>
  );
}

/** Scaled, resizable A4 preview of the letter (layout height measured live). */
function SheetPreview(props: {
  r: Resume; greeting: string; body: string; layout: Layout; contact: string[]; company: string; manager: string;
}) {
  const { ref, w } = useFillWidth<HTMLDivElement>();
  const scale = w > 0 ? Math.min(1, w / 794) : 1;
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [naturalH, setNaturalH] = useState(1123);
  useEffect(() => {
    const el = sheetRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      setNaturalH(Math.max(1123, Math.round(entries[0]?.contentRect.height ?? 1123)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="cl-sheet-box" ref={ref}>
      {w > 0 && (
        <div style={{ width: Math.round(794 * scale), height: Math.round(naturalH * scale) }}>
          <div
            ref={sheetRef}
            className="sheet cl-sheet"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
          >
            <LetterSheet {...props} />
          </div>
        </div>
      )}
    </div>
  );
}

function LetterSheet({
  r, greeting, body, layout, contact, company, manager,
}: {
  r: Resume;
  greeting: string;
  body: string;
  layout: Layout;
  contact: string[];
  company: string;
  manager: string;
}) {
  const p = r.personal;
  const role = p.headline || 'the advertised role';
  return (
    <div className={`cl-page cl-${layout}`}>
      <header className="cl-head">
        <div className="cl-name">{p.fullName || 'Your Name'}</div>
        {p.headline && <div className="cl-headline">{p.headline}</div>}
        {contact.length > 0 && <div className="cl-contact">{contact.join('  ·  ')}</div>}
      </header>

      <div className="cl-meta">
        <div className="cl-date">{todayLine()}</div>
        <div className="cl-recipient">
          {manager || 'Hiring Manager'}
          <br />
          {company || '[Company name]'}
        </div>
      </div>

      <div className="cl-subject">Subject: Application for the {role} role</div>
      <div className="cl-greeting">{greeting}</div>

      <BodyBlocks text={body} />

      <div className="cl-signoff">
        <div>Sincerely,</div>
        <div className="cl-sig-name">{p.fullName || 'Your Name'}</div>
        {p.headline && <div className="cl-sig-sub">{p.headline}</div>}
      </div>
    </div>
  );
}
