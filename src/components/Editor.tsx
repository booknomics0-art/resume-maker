import { useEffect, useMemo, useRef, useState } from 'react';
import { STEPS, completeness, emptyResume, type Resume } from '../lib/types';
import { loadResumes, sampleResume, upsertResume } from '../lib/store';
import { fieldById } from '../lib/fields';
import { navigate } from '../App';
import Preview from './Preview';
import {
  StepBasics, StepDesign, StepEducation, StepExperience, StepExtras, StepSkills, StepSummary,
} from './Steps';

function useContainerScale(baseWidth = 794) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.7);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const compute = () => setScale(Math.min(1, el.clientWidth / baseWidth));
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [baseWidth]);
  return { ref, scale };
}

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
    const found = loadResumes().find((r) => r.id === id);
    return found ?? emptyResume();
  }, [id]);

  const [r, setR] = useState<Resume>(initial);
  const [step, setStep] = useState(Math.min(initial.step, STEPS.length - 1));
  const [maxVisited, setMaxVisited] = useState(Math.min(initial.step, STEPS.length - 1));
  const [touched, setTouched] = useState(false);
  const dirtyRef = useRef(false);
  const { ref: scaleRef, scale } = useContainerScale();

  // autosave (debounced) — never persists a brand-new resume the user hasn't touched
  useEffect(() => {
    const isNew = id === 'new' || id === 'sample';
    if (isNew && !dirtyRef.current) return;
    const t = setTimeout(() => upsertResume({ ...r, step: Math.max(r.step, maxVisited) }), 350);
    return () => clearTimeout(t);
  }, [r, maxVisited, id]);

  const set = (patch: Partial<Resume>) => {
    dirtyRef.current = true;
    setR((prev) => ({ ...prev, ...patch }));
  };
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div>
      <div className="page-head no-print">
        <div>
          <div className="page-title" style={{ fontSize: 20 }}>
            {r.personal.fullName ? `${r.personal.fullName} — ${r.personal.headline || f.label}` : 'New resume'}
          </div>
          <div className="page-sub">
            {f.icon} {f.label} · <b>{pct}%</b> complete · about <b>{Math.ceil(remainingMin)} min</b> left
          </div>
        </div>
        <div className="row">
          <button className="btn" onClick={() => navigate('/')}>← Dashboard</button>
          <button
            className="btn primary"
            disabled={pct < 100}
            title={pct < 100 ? 'Finish the mandatory fields first' : 'Download as PDF'}
            onClick={() => {
              setR((prev) => ({ ...prev, name: prev.name.startsWith('Untitled') && prev.personal.fullName ? `${prev.personal.fullName} — ${prev.personal.headline}` : prev.name }));
              setTimeout(() => window.print(), 100);
            }}
          >
            ⬇ Download PDF
          </button>
        </div>
      </div>

      <div className="stepper no-print" style={{ marginBottom: 18 }}>
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
        <div style={{ flex: 1 }} />
        <div className="progress" style={{ width: 160, alignSelf: 'center' }}>
          <div style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="editor-grid">
        <div className="card pad no-print">
          <h3 style={{ color: 'var(--navy-900)', marginBottom: 4 }}>{STEPS[step].title}</h3>
          <div className="hint" style={{ marginBottom: 14 }}>
            Step {step + 1} of {STEPS.length} · ~{STEPS[step].minutes} min
          </div>

          {errs.length > 0 && (
            <div className="notice err">
              {errs.map((e) => <div key={e}>• {e}</div>)}
            </div>
          )}

          {stepBody}

          <div className="step-foot">
            <button className="btn" disabled={step === 0} onClick={() => go(step - 1)}>← Back</button>
            <div className="row">
              {step === STEPS.length - 1 ? (
                <button
                  className="btn primary"
                  disabled={pct < 100}
                  onClick={() => setTimeout(() => window.print(), 100)}
                >
                  ⬇ Finish &amp; download PDF
                </button>
              ) : (
                <button className="btn primary" onClick={() => { setTouched(true); if (canNext) go(step + 1); }}>
                  Next: {STEPS[step + 1].short} →
                </button>
              )}
            </div>
          </div>
          {!canNext && touched && (
            <div className="hint" style={{ marginTop: 8 }}>
              Fill the required items above to continue — they are the fields recruiters always look for.
            </div>
          )}
        </div>

        <div className="preview-pane panel no-print">
          <div className="preview-toolbar">
            <b style={{ color: 'var(--navy-900)', fontSize: 13 }}>Live preview</b>
            <span className="hint">updates as you type · A4</span>
          </div>
          <div className="sheet-holder" ref={scaleRef} style={{ width: '100%' }}>
            <div className="sheet-scale" style={{ transform: `scale(${scale})`, width: 794 }}>
              <Preview r={r} />
            </div>
          </div>
        </div>
      </div>

      {/* hidden full-size copy used only for printing / PDF export */}
      <div className="print-root" aria-hidden="true">
        <Preview r={r} />
      </div>
    </div>
  );
}
