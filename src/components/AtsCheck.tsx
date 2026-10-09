/**
 * ATS Job Match 2.0 — keeps the existing honest keyword coverage score and
 * adds deterministic, on-device guidance: what is weak, why it matters and
 * what the user can truthfully improve next.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Resume } from '../lib/types';
import { loadJd, matchKeywords, resumeToText, saveJd, type AtsReport } from '../lib/ats';
import { buildAtsDiagnostics } from '../lib/atsDiagnostics';
import './AtsCheckV2.css';

const PRIORITY_LABEL = {
  high: 'Fix first',
  medium: 'Improve',
  low: 'Polish',
} as const;

export default function AtsCheck({ r }: { r: Resume }) {
  const [open, setOpen] = useState(false);
  const [jd, setJd] = useState(() => loadJd(r.id));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resumeText = useMemo(() => resumeToText(r), [r]);
  const shown: AtsReport | null = useMemo(() => {
    if (!jd.trim()) return null;
    const report = matchKeywords(jd, resumeText);
    return report.total > 0 ? report : null;
  }, [jd, resumeText]);

  const diagnostics = useMemo(
    () => shown ? buildAtsDiagnostics(r, shown) : null,
    [r, shown],
  );

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveJd(r.id, jd), 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [jd, r.id]);

  const clear = () => setJd('');
  const tone = !shown ? null : shown.score >= 75 ? 'good' : shown.score >= 50 ? 'mid' : 'low';

  return (
    <div className="card ats-check ats2">
      <div className="ats2-head-row">
        <button
          type="button"
          className="ats-head"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <b>🎯 ATS Job Match 2.0</b>
          <span className="hint" style={{ fontSize: 12 }}>
            Job match · resume readiness · exact priority fixes
          </span>
        </button>

        <div className="ats2-head-actions">
          {shown && (
            <span className={`ats-score ats-score-${tone}`} title="Job-description keyword coverage">
              {shown.score}% <small>{shown.covered.length}/{shown.total}</small>
            </span>
          )}
          <button
            type="button"
            className="btn small ats2-toggle"
            aria-label={open ? 'Close ATS Job Match' : 'Open ATS Job Match'}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {open && (
        <div className="ats2-body">
          <label className="f">Job description</label>
          <textarea
            className="textarea ats2-jd"
            rows={5}
            value={jd}
            onChange={(event) => setJd(event.target.value)}
            placeholder="Paste the full job description here — title, responsibilities and requirements. It stays on this device."
          />

          <div className="ats2-meta-row">
            <button type="button" className="btn small" disabled={!jd} onClick={clear}>Clear</button>
            <span className="hint" style={{ fontSize: 11.5 }}>
              Live and on-device · updates when the job description or resume changes
            </span>
          </div>

          {jd.trim() && !shown && (
            <div className="hint" style={{ marginTop: 10 }}>
              No recognisable job keywords found yet. Paste the full description — responsibilities and requirements work better than only a job title.
            </div>
          )}

          {shown && diagnostics && (
            <>
              <div className="ats2-score-grid" aria-label="ATS Job Match scores">
                <article className="ats2-score-card">
                  <span className="ats2-score-label">Job match</span>
                  <div className="ats2-score-value">
                    <strong>{shown.score}%</strong>
                    <span>{shown.covered.length}/{shown.total} JD keywords</span>
                  </div>
                  <p className="ats2-score-copy">
                    Exact keyword coverage against this job description. This is not an interview guarantee.
                  </p>
                </article>

                <article className="ats2-score-card">
                  <span className="ats2-score-label">Resume readiness</span>
                  <div className="ats2-score-value">
                    <strong>{diagnostics.readinessScore}%</strong>
                    <span>{diagnostics.passedChecks}/{diagnostics.totalChecks} checks</span>
                  </div>
                  <p className="ats2-score-copy">
                    Contact, summary, evidence and readability checks that apply to this resume. Fresher mode does not require formal work history.
                  </p>
                </article>
              </div>

              <section className="ats2-section" aria-labelledby="ats-priority-fixes">
                <div className="ats2-section-head">
                  <b id="ats-priority-fixes">Priority fixes</b>
                  <span>{diagnostics.issues.length ? 'Ordered by likely impact' : 'No major issue detected by these checks'}</span>
                </div>

                {diagnostics.issues.length > 0 ? (
                  <div className="ats2-issues">
                    {diagnostics.issues.map((issue) => (
                      <article className="ats2-issue" key={issue.id}>
                        <div className="ats2-issue-top">
                          <span className={`ats2-priority ats2-priority-${issue.priority}`}>
                            {PRIORITY_LABEL[issue.priority]}
                          </span>
                          <h4>{issue.title}</h4>
                        </div>
                        <p><b>Why:</b> {issue.why}</p>
                        <p><b>Fix:</b> {issue.fix}</p>
                        {issue.terms && issue.terms.length > 0 && (
                          <div className="ats2-term-row" aria-label="Relevant terms">
                            {issue.terms.map((term) => (
                              <span className="chip ats-chip miss" key={`${issue.id}-${term}`}>{term}</span>
                            ))}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="ats2-issue">
                    <div className="ats2-issue-top">
                      <span className="ats2-priority ats2-priority-low">Looks good</span>
                      <h4>No major structural or job-match issue surfaced by the current checks.</h4>
                    </div>
                    <p>Keep every claim truthful and do a final spelling, date and PDF scan before applying.</p>
                  </div>
                )}
              </section>

              {diagnostics.passedSignals.length > 0 && (
                <section className="ats2-section" aria-label="Checks already passing">
                  <div className="ats2-section-head"><b>Already working</b><span>Keep these strengths</span></div>
                  <div className="ats2-pass-row">
                    {diagnostics.passedSignals.map((signal) => (
                      <span className="ats2-pass" key={signal}>✓ {signal}</span>
                    ))}
                  </div>
                </section>
              )}

              <details className="ats2-keyword-details">
                <summary>View all covered and missing job keywords</summary>

                {shown.covered.length > 0 && (
                  <div className="ats2-keyword-block">
                    <label className="f" style={{ fontSize: 12 }}>✓ Already covered</label>
                    <div className="chips">
                      {shown.covered.map((keyword) => (
                        <span key={keyword} className="chip ats-chip ok">{keyword}</span>
                      ))}
                    </div>
                  </div>
                )}

                {shown.missing.length > 0 && (
                  <div className="ats2-keyword-block">
                    <label className="f" style={{ fontSize: 12 }}>Missing — add only when it is true</label>
                    <div className="chips">
                      {shown.missing.map((keyword) => (
                        <span key={keyword} className="chip ats-chip miss">{keyword}</span>
                      ))}
                    </div>
                  </div>
                )}
              </details>

              <div className="ats2-disclaimer">
                ResumeMakery does not know an employer's private ATS rules and cannot promise an interview. These results compare the resume you wrote with the job description you pasted and highlight deterministic content signals. Never add a skill, metric or experience you cannot support.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
