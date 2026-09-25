// Renders a resume in one of the layout families of the Professional collection.
// Used at full size in the editor, scaled down for thumbnails.
// The template's palette is applied as CSS custom properties on .sheet;
// structural variants (mod-invert, mod-serif, mod-band-flat, mod-band-tint)
// add a modifier class — see templates.css.

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { Resume } from '../lib/types';
import {
  SECTION_LABELS, SIDE_SECTIONS, hasSection, sectionOrder, templateById, type SectionId, type Template,
} from '../lib/templates';

/** A4 at 96dpi — the canonical sheet size used by preview, thumbs and print. */
export const A4 = { w: 794, h: 1123 };

/** Measures the element's own width so an A4 sheet can scale to any container. */
function useFillWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const compute = () => setW(el.clientWidth);
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

function sheetVars(t: Template): CSSProperties {
  const s: Record<string, string> = { '--p': t.pal.p, '--a': t.pal.a };
  if (t.pal.p2) s['--p2'] = t.pal.p2;
  if (t.pal.p3) s['--p3'] = t.pal.p3;
  if (t.pal.pm) s['--pm'] = t.pal.pm;
  return s as CSSProperties;
}

function sheetClass(t: Template): string {
  return `sheet tpl-${t.layout}${t.mods.length ? ' ' + t.mods.join(' ') : ''}`;
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

function ContactBits({ r }: { r: Resume }) {
  const p = r.personal;
  const bits = [p.email, p.phone, p.city, p.linkedin, p.website].filter(Boolean);
  return (
    <div className="s-contact">
      {bits.map((b, i) => (
        <span key={i}>{b}</span>
      ))}
    </div>
  );
}

function SectionBody({ r, id }: { r: Resume; id: SectionId }) {
  switch (id) {
    case 'summary':
      return <p>{r.summary}</p>;
    case 'highlight':
      return <p>{r.bestExperience}</p>;
    case 'experience':
      return (
        <>
          {r.experience.map((e) => (
            <div className="s-item" key={e.id}>
              <div className="s-item-head">
                <div>
                  <b>{e.role}</b>
                  <div className="s-item-sub">{e.company}{e.location ? ` · ${e.location}` : ''}</div>
                </div>
                <span className="s-dates">
                  {e.start} – {e.current ? 'Present' : e.end}
                </span>
              </div>
              <ul>
                {e.bullets.filter(Boolean).map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </>
      );
    case 'education':
      return (
        <table className="s-table">
          <tbody>
            {r.education.map((e) => (
              <tr key={e.id}>
                <td className="edu-deg">
                  <b>{e.degree}</b>
                  {e.note && <div className="s-item-sub">{e.note}</div>}
                </td>
                <td className="edu-school">
                  {e.school}
                  {e.location && <div className="s-item-sub">{e.location}</div>}
                </td>
                <td className="edu-year">{e.year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    case 'skills':
      return (
        <div className="s-skillset">
          {r.skills.filter(Boolean).map((s) => (
            <span className="s-skill" key={s}>{s}</span>
          ))}
        </div>
      );
    case 'projects':
      return (
        <>
          {r.projects.map((p) => (
            <div className="s-item" key={p.id}>
              <div className="s-item-head">
                <b>{p.name}</b>
                <span className="s-dates">{p.link}</span>
              </div>
              <ul>
                {p.points.split('\n').filter(Boolean).map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          ))}
        </>
      );
    case 'certs':
      return (
        <>
          {r.certs.map((c) => (
            <div className="s-item" key={c.id}>
              <div className="s-item-head">
                <b>{c.name}</b>
                <span className="s-dates">{c.year}</span>
              </div>
              <div className="s-item-sub">{c.issuer}</div>
            </div>
          ))}
        </>
      );
    case 'languages':
      return (
        <div className="s-skillset">
          {r.languages.map((l) => (
            <span className="s-skill" key={l.id}>
              {l.name} · {l.level}
            </span>
          ))}
        </div>
      );
    case 'achievements':
      return (
        <ul>
          {r.achievements.filter(Boolean).map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      );
    case 'hobbies':
      return (
        <div className="s-skillset">
          {r.hobbies.filter(Boolean).map((h) => (
            <span className="s-skill" key={h}>{h}</span>
          ))}
        </div>
      );
    default:
      return null;
  }
}

function Section({
  r, id, timeline, index, ledger,
}: {
  r: Resume;
  id: SectionId;
  /** experience gets a dot-and-line timeline */
  timeline?: boolean;
  /** 1-based number rendered in the margin (Editorial family) */
  index?: number;
  /** ruled rows with the dates pushed into a left column (Ledger family) */
  ledger?: boolean;
}) {
  if (!hasSection(r, id)) return null;
  const cls = `sec sec-${id}${timeline ? ' tl' : ''}${index !== undefined ? ' numbered' : ''}${ledger ? ' led' : ''}`;
  return (
    <section className={cls} style={{ marginBottom: 13 }}>
      {index !== undefined && <span className="sec-no" aria-hidden="true">{String(index).padStart(2, '0')}</span>}
      <h3 className="s-sec-title">{SECTION_LABELS[id]}</h3>
      <SectionBody r={r} id={id} />
    </section>
  );
}

/**
 * The photo frame every family uses. Either the uploaded photo, or a
 * placeholder in exactly the same box — so the layout keeps its shape (and the
 * candidate can see where the photo will sit) before anything is uploaded.
 */
function HeaderPhoto({ r, size = 66, square }: { r: Resume; size?: number; square?: boolean }) {
  const box = { width: size, height: size };
  if (!r.personal.photo) {
    return (
      <div className={`s-photo ph${square ? ' sq' : ''}`} style={box} aria-hidden="true">
        {initials(r.personal.fullName)}
      </div>
    );
  }
  return <img className={`s-photo${square ? ' sq' : ''}`} src={r.personal.photo} alt="" style={box} />;
}

/** Experience with dates in a left gutter and a dotted line — Timeline family. */
function TimelineExperience({ r }: { r: Resume }) {
  if (!hasSection(r, 'experience')) return null;
  return (
    <section className="sec sec-experience" style={{ marginBottom: 13 }}>
      <h3 className="s-sec-title">{SECTION_LABELS.experience}</h3>
      <div className="tl-list">
        {r.experience.map((e) => (
          <div className="tl-row" key={e.id}>
            <div className="tl-date">{e.start}<br />– {e.current ? 'Present' : e.end}</div>
            <div className="tl-dot" />
            <div className="tl-body">
              <b>{e.role}</b>
              <div className="s-item-sub">{e.company}{e.location ? ` · ${e.location}` : ''}</div>
              <ul>{e.bullets.filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Short section names for the vertical Spine strip — the full labels
 *  ("Hobbies & Interests") would make the strip taller than the page. */
const SPINE_LABELS: Record<SectionId, string> = {
  summary: 'Profile',
  highlight: 'Highlights',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certs: 'Certificates',
  languages: 'Languages',
  achievements: 'Awards',
  hobbies: 'Interests',
};

/** Deterministic pseudo-level so bars look intentional without asking users for a % — Infographic family. */
function barWidth(i: number, total: number) {
  const base = 94 - (i / Math.max(1, total - 1)) * 34; // 94% → 60%
  return Math.round(base);
}

function SkillBars({ r }: { r: Resume }) {
  const skills = r.skills.filter(Boolean);
  if (!skills.length) return null;
  return (
    <section className="sec sec-skills" style={{ marginBottom: 13 }}>
      <h3 className="s-sec-title">{SECTION_LABELS.skills}</h3>
      {skills.map((sk, i) => (
        <div className="bar" key={sk}>
          <span>{sk}</span>
          <i><b style={{ width: `${barWidth(i, skills.length)}%` }} /></i>
        </div>
      ))}
    </section>
  );
}

const LEVEL_DOTS: Record<string, number> = {
  native: 5, fluent: 5, professional: 4, advanced: 4, intermediate: 3, conversational: 3, basic: 2, beginner: 1,
};
function LanguageDots({ r }: { r: Resume }) {
  if (!hasSection(r, 'languages')) return null;
  return (
    <section className="sec sec-languages" style={{ marginBottom: 13 }}>
      <h3 className="s-sec-title">{SECTION_LABELS.languages}</h3>
      {r.languages.map((l) => {
        const n = LEVEL_DOTS[l.level.trim().toLowerCase()] ?? 3;
        return (
          <div className="dots" key={l.id}>
            <span>{l.name}</span>
            <i>{[1, 2, 3, 4, 5].map((k) => <b key={k} className={k <= n ? 'on' : ''} />)}</i>
          </div>
        );
      })}
    </section>
  );
}

export default function Preview({ r, tpl }: { r: Resume; tpl?: Template }) {
  const t = tpl ?? templateById(r.templateId);
  const order = sectionOrder(t, r.fieldId);
  const sideSet = SIDE_SECTIONS[t.layout] ?? [];
  /** Every rendered section, in order — used by the Spine labels. */
  const orderedSections = order.filter((s) => hasSection(r, s));
  const mainSections = order.filter((s) => !sideSet.includes(s));
  const sideSections: SectionId[] = sideSet.filter((s) => order.includes(s));
  const p = r.personal;
  const contactLines = [p.email, p.phone, p.city, p.linkedin, p.website].filter(Boolean);
  const name = r.personal.fullName || 'Your Name';
  const headline = r.personal.headline || 'Target Job Title';

  if (t.layout === 'split') {
    return (
      <div className={sheetClass(t)} style={sheetVars(t)}>
        <aside className="side">
          {r.personal.photo ? (
            <img className="avatar avatar-photo" src={r.personal.photo} alt="" />
          ) : (
            <div className="avatar">{initials(name)}</div>
          )}
          <div className="side-block">
            <h3 className="s-sec-title">Contact</h3>
            {r.personal.email && <div className="contact-line">{r.personal.email}</div>}
            {r.personal.phone && <div className="contact-line">{r.personal.phone}</div>}
            {r.personal.city && <div className="contact-line">{r.personal.city}</div>}
            {r.personal.linkedin && <div className="contact-line">{r.personal.linkedin}</div>}
            {r.personal.website && <div className="contact-line">{r.personal.website}</div>}
          </div>
          {sideSections.map((s) => (
            <div className="side-block" key={s}>
              <Section r={r} id={s} />
            </div>
          ))}
        </aside>
        <div className="main">
          <div style={{ marginBottom: 14 }}>
            <h1 className="s-name">{name}</h1>
            <div className="s-headline">{headline}</div>
          </div>
          {mainSections.map((s) => (
            <Section r={r} id={s} key={s} timeline={s === 'experience'} />
          ))}
        </div>
      </div>
    );
  }

  if (t.layout === 'classic') {
    return (
      <div className={sheetClass(t)} style={sheetVars(t)}>
        <div className="head">
          <HeaderPhoto r={r} size={76} />
          <h1 className="s-name">{name}</h1>
          <div className="s-headline">{headline}</div>
          <ContactBits r={r} />
        </div>
        {mainSections.map((s) => (
          <Section r={r} id={s} key={s} />
        ))}
      </div>
    );
  }

  if (t.layout === 'metro') {
    return (
      <div className={sheetClass(t)} style={sheetVars(t)}>
        <div className="band">
          <div className="band-inner">
            <div>
              <h1 className="s-name">{name}</h1>
              <div className="s-headline">{headline}</div>
              <ContactBits r={r} />
            </div>
            <HeaderPhoto r={r} size={78} />
          </div>
        </div>
        <div className="body">
          {mainSections.map((s) => (
            <Section r={r} id={s} key={s} />
          ))}
        </div>
      </div>
    );
  }

  if (t.layout === 'compact') {
    return (
      <div className={sheetClass(t)} style={sheetVars(t)}>
        <div className="head">
          <HeaderPhoto r={r} size={62} />
          <div style={{ flex: 1 }}>
            <h1 className="s-name">{name}</h1>
            <div className="s-headline">{headline}</div>
          </div>
          <ContactBits r={r} />
        </div>
        {mainSections.map((s) => (
          <Section r={r} id={s} key={s} />
        ))}
      </div>
    );
  }

  // ---------- photo / panel / margin families ----------

  if (t.layout === 'portrait') {
    return (
      <div className={sheetClass(t)} style={sheetVars(t)}>
        <div className="head">
          <div>
            <h1 className="s-name">{name}</h1>
            <div className="s-headline">{headline}</div>
          </div>
          {p.photo ? <img className="s-photo" src={p.photo} alt="" /> : <div className="s-photo ph">{initials(name)}</div>}
        </div>
        <div className="cols">
          <aside className="side">
            <section className="sec">
              <h3 className="s-sec-title">Contact</h3>
              {contactLines.map((c, i) => <div className="contact-line" key={i}>{c}</div>)}
            </section>
            {sideSections.map((s) => <Section r={r} id={s} key={s} />)}
          </aside>
          <div className="main">
            {mainSections.map((s) => <Section r={r} id={s} key={s} />)}
          </div>
        </div>
      </div>
    );
  }

  if (t.layout === 'studio') {
    return (
      <div className={sheetClass(t)} style={sheetVars(t)}>
        <aside className="side">
          {p.photo ? <img className="avatar" src={p.photo} alt="" /> : <div className="avatar ph">{initials(name)}</div>}
          <section className="sec">
            <h3 className="s-sec-title">Contact</h3>
            {contactLines.map((c, i) => <div className="contact-line" key={i}>{c}</div>)}
          </section>
          {sideSections.map((s) => <Section r={r} id={s} key={s} />)}
        </aside>
        <div className="main">
          <div className="head">
            <h1 className="s-name">{name}</h1>
            <div className="s-headline">{headline}</div>
          </div>
          {mainSections.map((s) => <Section r={r} id={s} key={s} timeline={s === 'experience'} />)}
        </div>
      </div>
    );
  }

  if (t.layout === 'monogram') {
    return (
      <div className={sheetClass(t)} style={sheetVars(t)}>
        <div className="head">
          {p.photo ? <img className="seal seal-photo" src={p.photo} alt="" /> : <div className="seal">{initials(name)}</div>}
          <h1 className="s-name">{name}</h1>
          <div className="s-headline">{headline}</div>
          <ContactBits r={r} />
        </div>
        {mainSections.map((s) => <Section r={r} id={s} key={s} />)}
      </div>
    );
  }

  if (t.layout === 'timeline') {
    return (
      <div className={sheetClass(t)} style={sheetVars(t)}>
        <div className="head">
          <div className="head-inner">
            <div>
              <h1 className="s-name">{name}</h1>
              <div className="s-headline">{headline}</div>
            </div>
            <HeaderPhoto r={r} size={74} />
          </div>
          <ContactBits r={r} />
        </div>
        <div className="body">
          {mainSections.map((s) => (
            s === 'experience' ? <TimelineExperience r={r} key={s} /> : <Section r={r} id={s} key={s} />
          ))}
        </div>
      </div>
    );
  }

  if (t.layout === 'infographic') {
    return (
      <div className={sheetClass(t)} style={sheetVars(t)}>
        <div className="main">
          <div className="head">
            <h1 className="s-name">{name}</h1>
            <div className="s-headline">{headline}</div>
          </div>
          {mainSections.map((s) => <Section r={r} id={s} key={s} timeline={s === 'experience'} />)}
        </div>
        <aside className="side">
          {p.photo ? <img className="avatar" src={p.photo} alt="" /> : <div className="avatar ph">{initials(name)}</div>}
          <section className="sec">
            <h3 className="s-sec-title">Contact</h3>
            {contactLines.map((c, i) => <div className="contact-line" key={i}>{c}</div>)}
          </section>
          {sideSections.map((s) => (
            s === 'skills' ? <SkillBars r={r} key={s} />
              : s === 'languages' ? <LanguageDots r={r} key={s} />
                : <Section r={r} id={s} key={s} />
          ))}
        </aside>
      </div>
    );
  }

  // ---------- second wave of studio families ----------

  if (t.layout === 'editorial') {
    let n = 0;
    return (
      <div className={sheetClass(t)} style={sheetVars(t)}>
        <div className="head ed-head">
          <div>
            <h1 className="s-name">{name}</h1>
            <div className="s-headline">{headline}</div>
            <ContactBits r={r} />
          </div>
          <HeaderPhoto r={r} size={80} square />
        </div>
        {mainSections.map((s) => {
          n += 1;
          return <Section r={r} id={s} key={s} index={n} />;
        })}
      </div>
    );
  }

  if (t.layout === 'spine') {
    return (
      <div className={sheetClass(t)} style={sheetVars(t)}>
        <aside className="spine">
          {p.photo ? <img className="spine-photo" src={p.photo} alt="" /> : <div className="spine-mono">{initials(name)}</div>}
          {orderedSections.map((s) => (
            <div className="spine-label" key={s}>{SPINE_LABELS[s]}</div>
          ))}
          <div className="spine-name" aria-hidden="true">{name}</div>
        </aside>
        <div className="spine-body">
          <div className="head">
            <h1 className="s-name">{name}</h1>
            <div className="s-headline">{headline}</div>
            <ContactBits r={r} />
          </div>
          {orderedSections.map((s) => <Section r={r} id={s} key={s} />)}
        </div>
      </div>
    );
  }

  if (t.layout === 'soft') {
    return (
      <div className={sheetClass(t)} style={sheetVars(t)}>
        <div className="head">
          <div>
            <h1 className="s-name">{name}</h1>
            <div className="s-headline">{headline}</div>
          </div>
          {p.photo ? <img className="s-photo" src={p.photo} alt="" /> : <div className="s-photo ph">{initials(name)}</div>}
        </div>
        <div className="soft-panels">
          <div className="panel">
            <section className="sec soft-contact">
              <h3 className="s-sec-title">Contact</h3>
              {contactLines.map((c, i) => <div className="contact-line" key={i}>{c}</div>)}
            </section>
            {sideSections.map((s) => (
              <div className="panel" key={s}><Section r={r} id={s} /></div>
            ))}
          </div>
          <div className="main">
            {mainSections.map((s) => <Section r={r} id={s} key={s} />)}
          </div>
        </div>
      </div>
    );
  }

  if (t.layout === 'banner') {
    return (
      <div className={sheetClass(t)} style={sheetVars(t)}>
        <div className="band">
          <div className="band-inner">
            <div>
              <h1 className="s-name">{name}</h1>
              <div className="s-headline">{headline}</div>
            </div>
            <HeaderPhoto r={r} size={92} />
          </div>
        </div>
        <div className="rails">
          <div className="main">
            {mainSections.map((s) => <Section r={r} id={s} key={s} />)}
          </div>
          <aside className="rail">
            <section className="sec">
              <h3 className="s-sec-title">Contact</h3>
              {contactLines.map((c, i) => <div className="contact-line" key={i}>{c}</div>)}
            </section>
            {sideSections.map((s) => <Section r={r} id={s} key={s} />)}
          </aside>
        </div>
      </div>
    );
  }

  if (t.layout === 'ledger') {
    return (
      <div className={sheetClass(t)} style={sheetVars(t)}>
        <div className="head">
          <div>
            <h1 className="s-name">{name}</h1>
            <div className="s-headline">{headline}</div>
          </div>
          <div className="head-right">
            <HeaderPhoto r={r} size={68} />
            <div className="s-contact">{contactLines.map((c, i) => <span key={i}>{c}</span>)}</div>
          </div>
        </div>
        {mainSections.map((s) => <Section r={r} id={s} key={s} ledger />)}
      </div>
    );
  }

  if (t.layout === 'corporate') {
    return (
      <div className={sheetClass(t)} style={sheetVars(t)}>
        <div className="head">
          <div>
            <h1 className="s-name">{name}</h1>
            <div className="s-headline">{headline}</div>
          </div>
          <div className="head-right">
            <HeaderPhoto r={r} size={64} />
            <div className="s-contact">{contactLines.map((c, i) => <span key={i}>{c}</span>)}</div>
          </div>
        </div>
        {mainSections.filter((id) => hasSection(r, id)).map((id) => (
          <div className={`crow sec sec-${id}`} key={id}>
            <div className="label"><h3 className="s-sec-title">{SECTION_LABELS[id]}</h3></div>
            <div className="content"><SectionBody r={r} id={id} /></div>
          </div>
        ))}
      </div>
    );
  }

  // ---------- display families (masthead / panel band / tint sheet / gradient spine) ----------

  if (t.layout === 'masthead') {
    const numbered = t.mods.includes('mod-numbered');
    let n = 0;
    return (
      <div className={sheetClass(t)} style={sheetVars(t)}>
        <div className="mast-top">
          <div>
            <h1 className="mast-name s-name">{name}</h1>
            <div className="mast-role">{headline}</div>
          </div>
          {p.photo ? <img className="mast-photo" src={p.photo} alt="" /> : <div className="mast-photo ph">{initials(name)}</div>}
        </div>
        <div className="mast-strip">{contactLines.map((c, i) => <span key={i}>{c}</span>)}</div>
        <div className="mast-cols">
          <div className="main">
            {mainSections.map((s) => {
              n += 1;
              return <Section r={r} id={s} key={s} index={numbered ? n : undefined} />;
            })}
          </div>
          <aside className="rail">
            <section className="sec">
              <h3 className="s-sec-title">Contact</h3>
              {contactLines.map((c, i) => <div className="contact-line" key={i}>{c}</div>)}
            </section>
            {sideSections.map((s) => <Section r={r} id={s} key={s} />)}
          </aside>
        </div>
      </div>
    );
  }

  if (t.layout === 'panelband') {
    return (
      <div className={sheetClass(t)} style={sheetVars(t)}>
        <div className="band">
          <div className="band-inner">
            {p.photo ? (
              <img className="band-photo" src={p.photo} alt="" />
            ) : (
              <div className="band-photo ph">{initials(name)}</div>
            )}
            <div>
              <h1 className="s-name">{name}</h1>
              <div className="s-headline">{headline}</div>
              <div className="s-contact">{contactLines.map((c, i) => <span key={i}>{c}</span>)}</div>
            </div>
          </div>
        </div>
        <div className="cols">
          <aside className="side">
            {sideSections.map((s) => <Section r={r} id={s} key={s} />)}
          </aside>
          <div className="main">
            {mainSections.map((s) => <Section r={r} id={s} key={s} timeline={s === 'experience'} />)}
          </div>
        </div>
      </div>
    );
  }

  if (t.layout === 'tintsheet') {
    return (
      <div className={sheetClass(t)} style={sheetVars(t)}>
        {p.photo ? <img className="tint-photo" src={p.photo} alt="" /> : <div className="tint-photo ph">{initials(name)}</div>}
        <div className="tint-head">
          <h1 className="s-name">{name}</h1>
          <div className="s-headline">{headline}</div>
        </div>
        <div className="tint-contact">{contactLines.map((c, i) => <span key={i}>{c}</span>)}</div>
        <div className="tint-cols">
          <div className="main">
            {mainSections.map((s) => <Section r={r} id={s} key={s} timeline={s === 'experience'} />)}
          </div>
          <aside className="aside">
            {sideSections.map((s) => <Section r={r} id={s} key={s} />)}
          </aside>
        </div>
      </div>
    );
  }

  if (t.layout === 'spinegradient') {
    return (
      <div className={sheetClass(t)} style={sheetVars(t)}>
        <aside className="rail">
          {p.photo ? (
            <img className="rail-photo" src={p.photo} alt="" />
          ) : (
            <div className="rail-photo ph">{initials(name)}</div>
          )}
          <div>
            <div className="rail-role">{headline}</div>
            <h1 className="rail-name s-name">{name}</h1>
          </div>
          <div className="rail-block">
            <h4>Contact</h4>
            {contactLines.map((c, i) => <div key={i}>{c}</div>)}
          </div>
          {sideSections.map((s) => (
            <div className="rail-block" key={s}>
              <h4>{SPINE_LABELS[s]}</h4>
              {s === 'skills' && r.skills.filter(Boolean).map((sk) => <div key={sk}>{sk}</div>)}
              {s === 'languages' && r.languages.map((l) => <div key={l.id}>{l.name}{l.level ? ` — ${l.level}` : ''}</div>)}
              {s === 'certs' && r.certs.map((c) => <div key={c.id}>{c.name}{c.year ? ` (${c.year})` : ''}</div>)}
              {s === 'hobbies' && r.hobbies.filter(Boolean).map((h) => <div key={h}>{h}</div>)}
            </div>
          ))}
        </aside>
        <div className="body">
          {mainSections.map((s) => <Section r={r} id={s} key={s} />)}
        </div>
      </div>
    );
  }

  // minimal
  return (
    <div className={sheetClass(t)} style={sheetVars(t)}>
      <div className="head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h1 className="s-name">{name}</h1>
          <div className="s-headline">{headline}</div>
          <ContactBits r={r} />
        </div>
        <HeaderPhoto r={r} size={70} />
      </div>
      {mainSections.map((s) => (
        <Section r={r} id={s} key={s} timeline={s === 'experience'} />
      ))}
    </div>
  );
}

/**
 * Responsive A4 thumbnail — shows the entire first page (794×1123) fitted to the
 * container width. Stays uncropped and correctly proportioned at every
 * mobile/desktop card size (scaling is top-left anchored on an exact-size box).
 */
export function Thumb({ r, tpl }: { r: Resume; tpl?: Template }) {
  const { ref, w } = useFillWidth<HTMLDivElement>();
  const scale = w > 0 ? w / A4.w : 0;
  return (
    <div
      className="thumb-fit"
      ref={ref}
      style={w > 0 ? { height: Math.round(A4.h * scale) } : undefined}
    >
      {scale > 0 && (
        <div className="sheet-scale" style={{ width: A4.w, height: A4.h, transform: `scale(${scale})` }}>
          <Preview r={r} tpl={tpl} />
        </div>
      )}
    </div>
  );
}
