// Resume Score card — the free, instant alternative to paid "expert review".
// Sits beside the ATS check in the editor form pane (inside a .no-print
// container) and reacts live as the resume is edited.

import { useMemo, useState } from 'react';
import type { Resume } from '../lib/types';
import { resumeScore, type ScoreCheck } from '../lib/resumeScore';

function ScoreRing({ score }: { score: number }) {
  const radius = 26;
  const circ = 2 * Math.PI * radius;
  const filled = (score / 100) * circ;
  const color = score >= 80 ? 'var(--ok)' : score >= 50 ? 'var(--warn)' : 'var(--err)';
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={`Resume score ${score} out of 100`}>
      <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--silver-200)" strokeWidth="6" />
      <circle
        cx="32" cy="32" r={radius} fill="none" stroke={color} strokeWidth="6"
        strokeLinecap="round" strokeDasharray={`${filled} ${circ}`}
        transform="rotate(-90 32 32)" style={{ transition: 'stroke-dasharray .3s ease' }}
      />
      <text x="32" y="37" textAnchor="middle" fontSize="16" fontWeight="800" fill="var(--ink)">{score}</text>
    </svg>
  );
}

function CheckRow({ c }: { c: ScoreCheck }) {
  return (
    <li className="score-check">
      <span className="score-check-mark" aria-hidden>{c.ok ? '✅' : '⚠️'}</span>
      <span>
        <b className={c.ok ? 'score-ok-label' : undefined}>{c.label}</b>
        {!c.ok && <span className="score-tip"> — {c.tip}</span>}
      </span>
    </li>
  );
}

export default function ResumeScore({ r }: { r: Resume }) {
  const { score, checks } = useMemo(() => resumeScore(r), [r]);
  const [open, setOpen] = useState(false);

  const failing = checks.filter((c) => !c.ok);
  const passed = checks.length - failing.length;
  const verdict =
    score >= 90 ? 'Outstanding — ready to send.'
    : score >= 75 ? 'Strong. A few touches and it is perfect.'
    : score >= 50 ? 'Good base — finish the checks below.'
    : 'Early days — work through the list below.';

  const groups: { key: ScoreCheck['group']; label: string }[] = [
    { key: 'essentials', label: 'Essentials' },
    { key: 'content', label: 'Content quality' },
    { key: 'extras', label: 'Human touches' },
  ];

  return (
    <section className="card pad score-card" aria-label="Resume score">
      <div className="score-head">
        <ScoreRing score={score} />
        <div className="score-head-text">
          <div className="score-title">Resume score</div>
          <div className="score-verdict">{verdict}</div>
          <div className="score-sub">{passed} of {checks.length} checks passed · updates live</div>
        </div>
      </div>

      {failing.length > 0 && (
        <ul className="score-list">
          {failing.slice(0, open ? undefined : 3).map((c) => <CheckRow key={c.id} c={c} />)}
        </ul>
      )}
      {failing.length === 0 && (
        <p className="score-allgood">Every check passes — this resume reads like a professional wrote it. 🎉</p>
      )}

      <button type="button" className="btn small score-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? 'Show fewer' : `Show all ${checks.length} checks`}
      </button>

      {open && (
        <div className="score-groups">
          {groups.map((g) => (
            <div key={g.key} className="score-group">
              <div className="score-group-label">{g.label}</div>
              <ul className="score-list">
                {checks.filter((c) => c.group === g.key).map((c) => <CheckRow key={c.id} c={c} />)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
