import { useEffect, useRef, useState } from 'react';
import {
  STEPS, uid, type ExperienceItem, type EducationItem, type ProjectItem,
  type CertItem, type Resume,
} from '../lib/types';
import { COMMON_SKILLS, FIELDS, fieldById } from '../lib/fields';
import { LAYOUT_META, TEMPLATE_COUNT, templateById } from '../lib/templates';
import { callAi, loadAiSettings, localPolish, localSummaryDraft } from '../lib/ai';
import TemplateGallery from './TemplateGallery';
import DeviceSheet, { DeviceTabs, type DeviceMode } from './DeviceSheet';

/** Layout families — derived from the template library, never hard-coded. */
const FAMILY_COUNT = Object.keys(LAYOUT_META).length;

export interface StepProps {
  r: Resume;
  set: (patch: Partial<Resume>) => void;
}

/* ---------- small helpers ---------- */

function F({ label, req, children, hint }: { label: string; req?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="f">
        {label}{req && <span className="req">*</span>}
      </label>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

/** Swap an entry one place up/down — order matters on a resume. */
function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function MoveButtons({ index, count, onMove }: { index: number; count: number; onMove: (to: number) => void }) {
  return (
    <span className="row" style={{ gap: 4, margin: '0 8px' }} role="group" aria-label={`Reorder entry ${index + 1}`}>
      <button type="button" className="btn small" title="Move up" disabled={index === 0}
        style={{ padding: '4px 9px', lineHeight: 1.1 }} onClick={() => onMove(index - 1)}>↑</button>
      <button type="button" className="btn small" title="Move down" disabled={index === count - 1}
        style={{ padding: '4px 9px', lineHeight: 1.1 }} onClick={() => onMove(index + 1)}>↓</button>
    </span>
  );
}

export function AiButton({
  section, r, text, onResult,
}: {
  section: string; r: Resume; text: string; onResult: (t: string) => void; label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const cfg = loadAiSettings();
  // AI is always visible now: with a webhook it does a full model rewrite;
  // without one it falls back to the on-device polish/draft helpers so the
  // feature never disappears for the people who have not configured n8n.
  const offline = !cfg.enabled || !cfg.webhookUrl;
  const label = offline ? '✦ Quick polish (offline)' : '✦ Improve with AI';
  return (
    <span>
      <button
        type="button"
        className="btn small"
        disabled={busy || (!text.trim() && offline)}
        onClick={async () => {
          setBusy(true); setMsg('');
          if (offline) {
            // On-device fallback — instant, private, no fabricated facts.
            if (section === 'summary') {
              const polished = text.trim().length >= 40 ? localPolish(text) : localSummaryDraft(r);
              setBusy(false);
              if (polished) {
                onResult(polished);
                setMsg('✓ Drafted on-device — connect an AI webhook in Settings for full rewrites.');
              } else {
                setMsg('Add your target title and 3+ skills first — then I can draft from them.');
              }
            } else {
              const polished = localPolish(text);
              setBusy(false);
              if (polished && polished !== text.trim()) {
                onResult(polished);
                setMsg('✓ Polished on-device — connect an AI webhook in Settings for full rewrites.');
              } else {
                setMsg('Nothing to change on-device. An AI webhook (Settings) can rewrite it fully.');
              }
            }
            return;
          }
          const res = await callAi({
            task: 'enhance',
            section,
            field: fieldById(r.fieldId).label,
            role: r.personal.headline,
            text,
          });
          setBusy(false);
          if (res.ok && res.text) { onResult(res.text); setMsg('✓ Updated — check the wording, keep it truthful.'); }
          else setMsg(`AI error: ${res.error}`);
        }}
      >
        {busy ? 'Working…' : label}
      </button>
      {msg && <span className="hint" style={{ marginLeft: 8 }}>{msg}</span>}
    </span>
  );
}

/** Reads an image file, resizes it to max 400px, returns a JPEG data URL. */
function readPhoto(file: File, cb: (dataUrl: string) => void) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 400;
      const ratio = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      cb(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
}

/* ---------- step 1: basics ---------- */

export function StepBasics({ r, set }: StepProps) {
  const p = r.personal;
  const upd = (patch: Partial<typeof p>) => set({ personal: { ...p, ...patch } });
  const emailOk = !p.email || /^\S+@\S+\.\S+$/.test(p.email);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div className="notice">
        <b>10-minute plan:</b> 7 short steps. Fields marked <span style={{ color: 'var(--err)' }}>*</span> are mandatory —
        everything else can wait. Your field below decides which templates and examples we suggest.
      </div>

      <div className="form-grid">
        <div className="full">
          <label className="f">Profile photo (optional)</label>
          <div className="row">
            {p.photo ? (
              <img src={p.photo} alt="Profile"
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--silver-300)' }} />
            ) : (
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: 'var(--navy-50)',
                border: '2px dashed var(--silver-300)', display: 'grid', placeItems: 'center',
                color: 'var(--silver-400)', fontSize: 22,
              }}>
                📷
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) readPhoto(f, (url) => upd({ photo: url }));
                e.target.value = '';
              }} />
            <button type="button" className="btn small" onClick={() => fileRef.current?.click()}>
              {p.photo ? 'Change photo' : 'Upload photo'}
            </button>
            {p.photo && (
              <button type="button" className="btn small danger" onClick={() => upd({ photo: '' })}>Remove</button>
            )}
          </div>
          <div className="hint">Shown as a round photo on the resume. IT/product companies often prefer without photo — your call.</div>
        </div>

        <F label="Full name" req>
          <input className="input" value={p.fullName} placeholder="e.g. Amit Shukla"
            onChange={(e) => upd({ fullName: e.target.value })} />
        </F>
        <F label="Target job title" req hint="The role you are applying for">
          <input className="input" value={p.headline} placeholder="e.g. Senior Software Engineer"
            onChange={(e) => upd({ headline: e.target.value })} />
        </F>
        <F label="Email" req>
          <input className={`input ${!emailOk ? 'invalid' : ''}`} value={p.email} placeholder="you@example.com"
            onChange={(e) => upd({ email: e.target.value })} />
          {!emailOk && <div className="err-msg">Enter a valid email address</div>}
        </F>
        <F label="Phone" req>
          <input className="input" value={p.phone} placeholder="+91 98765 43210"
            onChange={(e) => upd({ phone: e.target.value })} />
        </F>
        <F label="City" req>
          <input className="input" value={p.city} placeholder="e.g. Pune" onChange={(e) => upd({ city: e.target.value })} />
        </F>
        <F label="LinkedIn">
          <input className="input" value={p.linkedin} placeholder="linkedin.com/in/yourname"
            onChange={(e) => upd({ linkedin: e.target.value })} />
        </F>
        <F label="Website / portfolio">
          <input className="input" value={p.website} placeholder="yoursite.dev"
            onChange={(e) => upd({ website: e.target.value })} />
        </F>
        <div className="full">
          <F label="Career field" req hint="This tunes the templates, suggested skills and examples">
            <div className="chips">
              {FIELDS.map((f) => (
                <button type="button" key={f.id}
                  className={`chip ${r.fieldId === f.id ? 'on' : ''}`}
                  onClick={() => set({ fieldId: f.id })}>
                  {f.icon} {f.label}
                </button>
              ))}
            </div>
          </F>
          <div className="hint" style={{ marginTop: 8 }}>
            {fieldById(r.fieldId).tagline}. Typical titles: {fieldById(r.fieldId).roles.slice(0, 4).join(', ')}.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- step 2: summary ---------- */

export function StepSummary({ r, set }: StepProps) {
  const f = fieldById(r.fieldId);
  const tooShort = r.summary.trim().length > 0 && r.summary.trim().length < 40;
  return (
    <div>
      <F label="Professional summary" req hint="2–3 sentences. Who you are, your strongest proof, one clear number.">
        <textarea className="textarea" rows={6} value={r.summary}
          placeholder="Pick a template below or write your own…"
          onChange={(e) => set({ summary: e.target.value })} />
      </F>
      {tooShort && <div className="err-msg">A little longer — add one concrete result to reach at least 2 lines.</div>}

      <label className="f" style={{ marginTop: 14 }}>Start from a {f.label} template</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {f.summaryTemplates.map((t, i) => (
          <button type="button" key={i} className="tpl-pick"
            onClick={() => set({ summary: t })}>
            <span className="tpl-pick-label">Template {i + 1}</span>
            {t}
          </button>
        ))}
      </div>
      <div className="hint" style={{ marginTop: 6 }}>
        Click one, then replace the <span className="kbd">[brackets]</span> with your own details. Rewrite freely — it's a starting point, not a rule.
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <AiButton section="summary" r={r} text={r.summary} onResult={(t) => set({ summary: t })} />
      </div>
    </div>
  );
}

/* ---------- step 3: experience ---------- */

export function StepExperience({ r, set }: StepProps) {
  const f = fieldById(r.fieldId);
  const [tplFor, setTplFor] = useState<string | null>(null);
  const updItem = (id: string, patch: Partial<ExperienceItem>) =>
    set({ experience: r.experience.map((e) => (e.id === id ? { ...e, ...patch } : e)) });

  const add = () =>
    set({
      experience: [
        ...r.experience,
        { id: uid(), role: '', company: '', location: '', start: '', end: '', current: false, bullets: [''] },
      ],
    });

  const addBullet = (job: ExperienceItem, text: string) => {
    const bullets = job.bullets.filter(Boolean);
    updItem(job.id, { bullets: [...bullets, text, ''] });
  };

  return (
    <div>
      <div className="spread" style={{ marginBottom: 12 }}>
        <div className="hint">Most recent job first. Each bullet: <b>what you did + the result</b>.</div>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-700)' }}>
          <input type="checkbox" checked={r.fresher} style={{ marginRight: 6 }}
            onChange={(e) => set({ fresher: e.target.checked })} />
          I'm a fresher (no work experience yet)
        </label>
      </div>

      {r.fresher ? (
        <div className="notice">
          Skipped — no problem. For freshers, education, projects and skills carry the resume.
          Add personal or college projects in the <b>Extras</b> step.
        </div>
      ) : (
        r.experience.map((e, i) => (
          <div className="entry-card" key={e.id}>
            <div className="entry-head">
              <b>Job {i + 1}</b>
              <MoveButtons index={i} count={r.experience.length}
                onMove={(to) => set({ experience: moveItem(r.experience, i, to) })} />
              <button type="button" className="btn small danger"
                onClick={() => set({ experience: r.experience.filter((x) => x.id !== e.id) })}>
                Remove
              </button>
            </div>
            <div className="form-grid">
              <F label="Role / title" req>
                <input className="input" value={e.role} placeholder={f.roles[0]}
                  onChange={(ev) => updItem(e.id, { role: ev.target.value })} />
              </F>
              <F label="Company" req>
                <input className="input" value={e.company} placeholder="Company name"
                  onChange={(ev) => updItem(e.id, { company: ev.target.value })} />
              </F>
              <F label="Location">
                <input className="input" value={e.location} placeholder="City"
                  onChange={(ev) => updItem(e.id, { location: ev.target.value })} />
              </F>
              <F label="Start" req>
                <input className="input" value={e.start} placeholder="Mar 2022"
                  onChange={(ev) => updItem(e.id, { start: ev.target.value })} />
              </F>
              <F label="End">
                <input className="input" value={e.end} placeholder={e.current ? 'Present' : 'Aug 2024'}
                  disabled={e.current}
                  onChange={(ev) => updItem(e.id, { end: ev.target.value })} />
              </F>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-700)', alignSelf: 'end', paddingBottom: 10 }}>
                <input type="checkbox" checked={e.current} style={{ marginRight: 6 }}
                  onChange={(ev) => updItem(e.id, { current: ev.target.checked, end: ev.target.checked ? '' : e.end })} />
                I currently work here
              </label>
              <div className="full">
                <F label="What you did (one bullet per line)" hint="Start with a verb, add a number where you can. 2–4 bullets per job is enough.">
                  <textarea className="textarea" rows={4} value={e.bullets.join('\n')}
                    placeholder={f.bulletExample.join('\n')}
                    onChange={(ev) => updItem(e.id, { bullets: ev.target.value.split('\n') })} />
                </F>
                <div className="row" style={{ marginTop: 8, justifyContent: 'space-between' }}>
                  <button type="button" className="btn small"
                    onClick={() => setTplFor(tplFor === e.id ? null : e.id)}>
                    {tplFor === e.id ? 'Hide bullet templates ▲' : '📄 Bullet templates ▼'}
                  </button>
                  <AiButton section="experience-bullets" r={r}
                    text={e.bullets.filter(Boolean).join('\n')}
                    onResult={(t) => updItem(e.id, { bullets: t.split('\n').filter(Boolean) })} />
                </div>
                {tplFor === e.id && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="hint">Tap a line to add it to this job, then fill in your own numbers.</div>
                    {f.bulletTemplates.map((t, ti) => (
                      <button type="button" key={ti} className="tpl-pick"
                        onClick={() => addBullet(e, t)}>
                        + {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      {!r.fresher && (
        <button type="button" className="btn" onClick={add}>+ Add job</button>
      )}
      {!r.fresher && r.experience.length === 0 && (
        <div className="err-msg" style={{ marginTop: 8 }}>Add at least one job, or tick “I'm a fresher”.</div>
      )}
    </div>
  );
}

/* ---------- step 4: education ---------- */

export function StepEducation({ r, set }: StepProps) {
  const updItem = (id: string, patch: Partial<EducationItem>) =>
    set({ education: r.education.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  const add = () =>
    set({ education: [...r.education, { id: uid(), degree: '', school: '', location: '', year: '', note: '' }] });

  return (
    <div>
      <div className="hint" style={{ marginBottom: 12 }}>
        Highest qualification first. Add 12th / diploma only if you're a fresher or it strengthens your story.
      </div>
      {r.education.map((e, i) => (
        <div className="entry-card" key={e.id}>
          <div className="entry-head">
            <b>Education {i + 1}</b>
            <MoveButtons index={i} count={r.education.length}
              onMove={(to) => set({ education: moveItem(r.education, i, to) })} />
            <button type="button" className="btn small danger"
              onClick={() => set({ education: r.education.filter((x) => x.id !== e.id) })}>
              Remove
            </button>
          </div>
          <div className="form-grid">
            <F label="Degree / qualification" req>
              <input className="input" value={e.degree} placeholder="B.Tech, Computer Science"
                onChange={(ev) => updItem(e.id, { degree: ev.target.value })} />
            </F>
            <F label="School / college" req>
              <input className="input" value={e.school} placeholder="Institute name"
                onChange={(ev) => updItem(e.id, { school: ev.target.value })} />
            </F>
            <F label="Location">
              <input className="input" value={e.location} placeholder="City"
                onChange={(ev) => updItem(e.id, { location: ev.target.value })} />
            </F>
            <F label="Year of completion" req>
              <input className="input" value={e.year} placeholder="2021"
                onChange={(ev) => updItem(e.id, { year: ev.target.value })} />
            </F>
            <div className="full">
              <F label="Notes (optional)" hint="CGPA / percentage, honours, relevant coursework, societies">
                <input className="input" value={e.note} placeholder="CGPA 8.2/10 · Led the web development club"
                  onChange={(ev) => updItem(e.id, { note: ev.target.value })} />
              </F>
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="btn" onClick={add}>+ Add education</button>
    </div>
  );
}

/* ---------- step 5: skills ---------- */

export function StepSkills({ r, set }: StepProps) {
  const f = fieldById(r.fieldId);
  const [custom, setCustom] = useState('');
  const toggle = (s: string) =>
    set({ skills: r.skills.includes(s) ? r.skills.filter((x) => x !== s) : [...r.skills, s] });
  const addCustom = () => {
    const v = custom.trim();
    if (v && !r.skills.includes(v)) set({ skills: [...r.skills, v] });
    setCustom('');
  };
  const suggestions = [...f.skills, ...COMMON_SKILLS].filter((s) => !r.skills.includes(s));
  return (
    <div>
      <F label="Your skills (at least 3, up to ~12 is clean)" req>
        <div className="chips" style={{ marginBottom: 10 }}>
          {r.skills.filter(Boolean).map((s) => (
            <button type="button" key={s} className="chip on" onClick={() => toggle(s)}>
              {s} ✕
            </button>
          ))}
        </div>
        <div className="row">
          <input className="input" style={{ flex: '1 1 180px', minWidth: 0 }} value={custom} placeholder="Type a skill and press Add"
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} />
          <button type="button" className="btn small" onClick={addCustom} style={{ flex: '0 0 auto' }}>Add</button>
        </div>
      </F>
      <div style={{ marginTop: 14 }}>
        <label className="f">Suggested for {f.label}</label>
        <div className="chips">
          {suggestions.map((s) => (
            <button type="button" key={s} className="chip suggest" onClick={() => toggle(s)}>+ {s}</button>
          ))}
        </div>
        <div className="hint">Communication and Decision Making are offered in every field. Only tick what you can answer in an interview.</div>
      </div>
    </div>
  );
}

/* ---------- step 6: extras ---------- */

export function StepExtras({ r, set }: StepProps) {
  const f = fieldById(r.fieldId);
  const [achv, setAchv] = useState(r.achievements.join('\n'));
  const [hobby, setHobby] = useState('');

  // Keep the achievements textarea honest when the value changes from outside
  // (import re-read, AI rewrite, editor hand-over) — without clobbering what
  // the user is typing right now.
  const lastWritten = useRef(r.achievements.join('\n'));
  useEffect(() => {
    const current = r.achievements.join('\n');
    if (current !== lastWritten.current) {
      lastWritten.current = current;
      setAchv(current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.achievements]);

  const updProject = (id: string, patch: Partial<ProjectItem>) =>
    set({ projects: r.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const updCert = (id: string, patch: Partial<CertItem>) =>
    set({ certs: r.certs.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  const addHobby = () => {
    const v = hobby.trim();
    if (v && !r.hobbies.includes(v)) set({ hobbies: [...r.hobbies, v] });
    setHobby('');
  };

  return (
    <div>
      <div className="hint" style={{ marginBottom: 12 }}>
        All optional, but one strong project, story or certification can decide a shortlist.
        Ideas for {f.label}: {f.projectIdeas.join(' · ')}.
      </div>

      <div style={{ marginBottom: 16 }}>
        <F label="Key highlight (a moment you are proud of)"
          hint="One short story: what happened, what you did, what it taught you. 1–2 lines is perfect.">
          <textarea className="textarea" rows={3} value={r.bestExperience}
            placeholder="e.g. Led a 6-member team at Smart India Hackathon 2020 — built a working prototype in 36 hours and won our track."
            onChange={(e) => set({ bestExperience: e.target.value })} />
        </F>
      </div>

      <div style={{ marginBottom: 16 }}>
        <F label="Hobbies & interests" hint="3–6 real ones. They make you human in the interview room.">
          <div className="chips" style={{ marginBottom: 8 }}>
            {r.hobbies.filter(Boolean).map((h) => (
              <button type="button" key={h} className="chip on"
                onClick={() => set({ hobbies: r.hobbies.filter((x) => x !== h) })}>
                {h} ✕
              </button>
            ))}
          </div>
          <div className="row">
            <input className="input" style={{ flex: '1 1 180px', minWidth: 0 }} value={hobby} placeholder="e.g. Cricket, Photography"
              onChange={(e) => setHobby(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHobby(); } }} />
            <button type="button" className="btn small" onClick={addHobby} style={{ flex: '0 0 auto' }}>Add</button>
          </div>
        </F>
      </div>

      <label className="f">Projects</label>
      {r.projects.map((p, i) => (
        <div className="entry-card" key={p.id}>
          <div className="entry-head">
            <b>Project {i + 1}</b>
            <MoveButtons index={i} count={r.projects.length}
              onMove={(to) => set({ projects: moveItem(r.projects, i, to) })} />
            <button type="button" className="btn small danger"
              onClick={() => set({ projects: r.projects.filter((x) => x.id !== p.id) })}>Remove</button>
          </div>
          <div className="form-grid">
            <F label="Name">
              <input className="input" value={p.name} onChange={(e) => updProject(p.id, { name: e.target.value })} />
            </F>
            <F label="Link">
              <input className="input" value={p.link} onChange={(e) => updProject(p.id, { link: e.target.value })} />
            </F>
            <div className="full">
              <F label="What it does / what you built (one line each)">
                <textarea className="textarea" rows={2} value={p.points}
                  onChange={(e) => updProject(p.id, { points: e.target.value })} />
              </F>
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="btn small"
        onClick={() => set({ projects: [...r.projects, { id: uid(), name: '', link: '', points: '' }] })}>
        + Add project
      </button>

      <label className="f" style={{ marginTop: 18 }}>Certifications</label>
      {r.certs.map((c) => (
        <div className="entry-card" key={c.id}>
          <div className="form-grid">
            <F label="Certification">
              <input className="input" value={c.name} onChange={(e) => updCert(c.id, { name: e.target.value })} />
            </F>
            <F label="Issuer">
              <input className="input" value={c.issuer} onChange={(e) => updCert(c.id, { issuer: e.target.value })} />
            </F>
            <F label="Year">
              <input className="input" value={c.year} onChange={(e) => updCert(c.id, { year: e.target.value })} />
            </F>
            <div style={{ alignSelf: 'end' }}>
              <button type="button" className="btn small danger"
                onClick={() => set({ certs: r.certs.filter((x) => x.id !== c.id) })}>Remove</button>
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="btn small"
        onClick={() => set({ certs: [...r.certs, { id: uid(), name: '', issuer: '', year: '' }] })}>
        + Add certification
      </button>

      <div className="form-grid" style={{ marginTop: 18 }}>
        <F label="Languages">
          {r.languages.map((l) => (
            <div className="row" key={l.id} style={{ marginBottom: 6, flexWrap: 'nowrap', gap: 6 }}>
              <input className="input" style={{ flex: '1 1 90px', minWidth: 0 }} value={l.name} placeholder="Language"
                onChange={(e) => set({ languages: r.languages.map((x) => x.id === l.id ? { ...x, name: e.target.value } : x) })} />
              <select className="select" style={{ flex: '1 1 110px', minWidth: 0 }} value={l.level}
                onChange={(e) => set({ languages: r.languages.map((x) => x.id === l.id ? { ...x, level: e.target.value } : x) })}>
                {['Native', 'Professional', 'Conversational', 'Basic'].map((lv) => <option key={lv}>{lv}</option>)}
              </select>
              <button type="button" className="btn small danger"
                onClick={() => set({ languages: r.languages.filter((x) => x.id !== l.id) })}>✕</button>
            </div>
          ))}
          <button type="button" className="btn small"
            onClick={() => set({ languages: [...r.languages, { id: uid(), name: '', level: 'Professional' }] })}>
            + Add language
          </button>
        </F>
        <F label="Achievements (one per line)">
          <textarea className="textarea" rows={4} value={achv}
            placeholder={'Winner, Smart India Hackathon 2019 (team of 6)\nSpeaker at local meetup'}
            onChange={(e) => {
              lastWritten.current = e.target.value;
              setAchv(e.target.value);
              set({ achievements: e.target.value.split('\n') });
            }} />
        </F>
      </div>
    </div>
  );
}

/* ---------- step 7: design ---------- */

export function StepDesign({ r, set }: StepProps) {
  const f = fieldById(r.fieldId);
  const [device, setDevice] = useState<DeviceMode>('a4');
  const applied = templateById(r.templateId);
  return (
    <div className="design-step">
      <div className="notice design-intro">
        <b>{TEMPLATE_COUNT} templates · {FAMILY_COUNT} families</b> — every thumbnail below is
        <b> your own resume</b> in that design, sized for <b>{f.label}</b> (section order, emphasis and
        spacing follow your field). Tap a card to apply it — the preview below shows your full
        resume in that design straight away, on A4, mobile and desktop.
      </div>

      {/* live preview of the applied design — name, number and every section
          re-flow into the chosen template instantly; switch device to check it
          on mobile and desktop too */}
      <div className="card pad design-device">
        <div className="spread design-device-head">
          <div style={{ minWidth: 0 }}>
            <b style={{ color: 'var(--navy-900)', fontSize: 14 }}>Preview · {applied.name}</b>
            <div className="hint">Your whole resume, fitted to this design — exactly what prints</div>
          </div>
          <DeviceTabs mode={device} onChange={setDevice} idPrefix="design" />
        </div>
        <DeviceSheet r={r} mode={device} idPrefix="design" />
      </div>

      <TemplateGallery r={r} onSelect={(templateId) => set({ templateId })} />

      <p className="hint design-sheet-link">
        Want the whole catalogue on one page?{' '}
        <a href="/template-preview.html" target="_blank" rel="noopener">
          Open the A4 review sheet ↗
        </a>{' '}
        — every design, printed full-size, no login needed.
      </p>

      <div className="design-notes">
        <div className="notice">
          <b>Not sure which one?</b> Keep the ★ pick for {f.label} — you can switch designs any time,
          even after downloading. Nothing gets locked.
        </div>
        <div className="notice">
          <b>10-second honesty check before download</b> — every number should be yours, every tool
          listed is one you have actually used, and no borrowed phrases. Recruiters trust concrete
          facts over adjectives, which is why these designs put your content first, not decoration.
        </div>
      </div>
    </div>
  );
}

export { STEPS };
