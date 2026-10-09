import { useMemo, useState } from 'react';
import type { Resume, StepId } from '../lib/types';
import { STEPS } from '../lib/types';
import { buildRecruiterView } from '../lib/recruiterView';
import './RecruiterView.css';

const PRIORITY_LABEL = {
  high: 'Fix first',
  medium: 'Improve',
  low: 'Polish',
} as const;

function openStep(step: StepId): void {
  const index = STEPS.findIndex((item) => item.id === step);
  if (index < 0) return;
  const buttons = document.querySelectorAll<HTMLButtonElement>('.stepper .step-pill');
  const target = buttons[index];
  if (!target) return;
  target.click();
  window.requestAnimationFrame(() => {
    document.querySelector('.editor-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

export default function RecruiterView({ r }: { r: Resume }) {
  const [open, setOpen] = useState(false);
  const report = useMemo(() => buildRecruiterView(r), [r]);
  const tone = report.score >= 85 ? 'good' : report.score >= 70 ? 'mid' : 'low';

  return (
    <section className="card recruiter-view no-print" aria-label="6-Second Recruiter View">
      <div className="rv-head-row">
        <button
          type="button"
          className="rv-head"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <b>👀 6-Second Recruiter View</b>
          <span>First scan · strongest proof · top 3 fixes</span>
        </button>
        <div className="rv-head-actions">
          <span className={`rv-score rv-score-${tone}`} title="Deterministic first-scan heuristic">
            {report.score}<small>/100</small>
          </span>
          <button
            type="button"
            className="btn small rv-toggle"
            aria-label={open ? 'Close Recruiter View' : 'Open Recruiter View'}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {open && (
        <div className="rv-body">
          <div className="rv-summary-grid">
            <article className="rv-summary-card rv-summary-score">
              <span className="rv-kicker">First impression</span>
              <strong>{report.verdict}</strong>
              <p>{report.biggestConcern}</p>
            </article>

            <article className="rv-summary-card">
              <span className="rv-kicker">Strongest proof</span>
              <strong>{report.strongestProof}</strong>
              <p>Lead with credible evidence. Never add a metric or claim you cannot support.</p>
            </article>
          </div>

          <section className="rv-section" aria-labelledby="rv-first-scan">
            <div className="rv-section-head">
              <b id="rv-first-scan">What a recruiter can understand first</b>
              <span>Content-first scan, not eye tracking</span>
            </div>
            <ol className="rv-scan-list">
              {report.firstScan.map((item, index) => (
                <li key={`${index}-${item}`}>
                  <span>{index + 1}</span>
                  <p>{item}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="rv-section" aria-labelledby="rv-top-fixes">
            <div className="rv-section-head">
              <b id="rv-top-fixes">Top 3 changes</b>
              <span>Only the highest-impact fixes</span>
            </div>

            {report.topFixes.length ? (
              <div className="rv-fixes">
                {report.topFixes.map((fix) => (
                  <article className="rv-fix" key={fix.id}>
                    <div className="rv-fix-top">
                      <span className={`rv-priority rv-priority-${fix.priority}`}>{PRIORITY_LABEL[fix.priority]}</span>
                      <h4>{fix.title}</h4>
                    </div>
                    <p><b>Why:</b> {fix.why}</p>
                    <p><b>Do:</b> {fix.action}</p>
                    <button type="button" className="btn small rv-fix-button" onClick={() => openStep(fix.step)}>
                      Fix in {STEPS.find((item) => item.id === fix.step)?.short ?? 'editor'} →
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rv-good-state">
                <b>No high-impact first-scan issue detected.</b>
                <span>Do a final spelling, date and PDF review before applying.</span>
              </div>
            )}
          </section>

          <div className="rv-detail-grid">
            <section className="rv-section rv-compact" aria-label="Buried strengths">
              <div className="rv-section-head"><b>Buried strengths</b><span>Consider surfacing these</span></div>
              {report.buriedStrengths.length ? (
                <div className="rv-chip-list">
                  {report.buriedStrengths.map((item) => <span className="rv-chip" key={item}>{item}</span>)}
                </div>
              ) : (
                <p className="rv-empty">No obvious buried strength detected yet.</p>
              )}
            </section>

            <section className="rv-section rv-compact" aria-label="Signals already working">
              <div className="rv-section-head"><b>Already working</b><span>Keep these</span></div>
              {report.passedSignals.length ? (
                <div className="rv-chip-list">
                  {report.passedSignals.map((item) => <span className="rv-chip rv-chip-pass" key={item}>✓ {item}</span>)}
                </div>
              ) : (
                <p className="rv-empty">Complete the basics to create stronger first-scan signals.</p>
              )}
            </section>
          </div>

          <div className="rv-disclaimer">
            This is a deterministic first-scan heuristic based on the resume content you entered. It is not eye tracking, a recruiter simulation or a hiring guarantee. Different recruiters, roles and templates can change what gets noticed first.
          </div>
        </div>
      )}
    </section>
  );
}
