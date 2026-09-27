/**
 * ATS keyword check — the editor's job-description matcher.
 *
 * Paste a job description and the component reports, live and on-device:
 * which of the JD's keywords your resume already covers, which are missing,
 * and a coverage score. Competitors gate this behind a paid tier; here it is
 * free and needs no server — nothing leaves the browser.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Resume } from '../lib/types';
import { loadJd, matchKeywords, resumeToText, saveJd, type AtsReport } from '../lib/ats';

export default function AtsCheck({ r }: { r: Resume }) {
  const [open, setOpen] = useState(false);
  const [jd, setJd] = useState(() => loadJd(r.id));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resumeText = useMemo(() => resumeToText(r), [r]);
  // the report is LIVE: typing into the JD or editing any resume field
  // re-computes the match instantly, so the score never lies about a stale
  // version of the resume.
  const shown: AtsReport | null = useMemo(() => {
    if (!jd.trim()) return null;
    const rep = matchKeywords(jd, resumeText);
    return rep.total > 0 ? rep : null;
  }, [jd, resumeText]);

  // persist the JD per resume (debounced) so it survives a reload
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveJd(r.id, jd), 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [jd, r.id]);

  const clear = () => setJd('');

  const tone =
    !shown ? null : shown.score >= 75 ? 'good' : shown.score >= 50 ? 'mid' : 'low';

  return (
    <div className="card ats-check" style={{ marginTop: 14, borderLeft: '4px solid var(--navy-600)' }}>
      <div className="spread" style={{ alignItems: 'center' }}>
        <button
          type="button"
          className="ats-head"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <b>🎯 ATS keyword check</b>
          <span className="hint" style={{ fontSize: 12 }}>
            Paste a job description · see covered &amp; missing keywords
          </span>
        </button>
        <span className="row" style={{ gap: 8 }}>
          {shown && (
            <span className={`ats-score ats-score-${tone}`}>
              {shown.score}% <small>{shown.covered.length}/{shown.total}</small>
            </span>
          )}
          <button
            type="button"
            className="btn small"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            style={{ minWidth: 30, padding: '6px 10px' }}
          >
            {open ? '▲' : '▼'}
          </button>
        </span>
      </div>

      {open && (
        <div style={{ marginTop: 12 }}>
          <label className="f">Job description</label>
          <textarea
            className="textarea"
            rows={4}
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job description here — title, responsibilities, requirements. It stays on this device."
            style={{ fontSize: 12.5 }}
          />
          <div className="row" style={{ marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn small" disabled={!jd} onClick={clear}>Clear</button>
            <span className="hint" style={{ fontSize: 11.5 }}>
              Live score · updates as you type here or edit the resume · 100% on-device, your JD is never uploaded
            </span>
          </div>

          {jd.trim() && !shown && (
            <div className="hint" style={{ marginTop: 10 }}>
              No recognisable keywords found in that text yet — paste the full description (responsibilities +
              requirements), not just the title.
            </div>
          )}

          {shown && (
            <div style={{ marginTop: 12 }}>
              <div className="row" style={{ gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <b style={{ color: 'var(--navy-900)' }}>
                  {shown.score >= 75 ? 'Strong match' : shown.score >= 50 ? 'Decent match' : 'Weak match'} — {shown.covered.length} of {shown.total} JD keywords are on your resume
                </b>
                <span className="hint" style={{ fontSize: 11.5 }}>{shown.jdWords} words read from the description</span>
              </div>

              {shown.covered.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <label className="f" style={{ fontSize: 12 }}>✓ Already covered</label>
                  <div className="chips">
                    {shown.covered.map((k) => (
                      <span key={k} className="chip ats-chip ok">{k}</span>
                    ))}
                  </div>
                </div>
              )}

              {shown.missing.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <label className="f" style={{ fontSize: 12 }}>Missing — add them if (and only if) it is true</label>
                  <div className="chips">
                    {shown.missing.map((k) => (
                      <span key={k} className="chip ats-chip miss">{k}</span>
                    ))}
                  </div>
                  <div className="hint" style={{ marginTop: 6, fontSize: 11.5 }}>
                    Most land naturally in <b>Skills</b>; a few belong inside an <b>Experience</b> bullet
                    where you actually used them. Recruiters search for the terms, so matching spelling
                    ("Power BI" not "Powerbi") matters.
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  );
}
