// Renders a resume in one of the 50 templates (5 layout families x 10 variants).
// Used at full size in the editor, scaled down for thumbnails.
// The template's palette is applied as CSS custom properties on .sheet;
// structural variants (mod-invert, mod-serif, mod-band-flat, mod-band-tint)
// add a modifier class — see templates.css.

import type { CSSProperties } from 'react';
import type { Resume } from '../lib/types';
import {
  SECTION_LABELS, hasSection, sectionOrder, templateById, type SectionId, type Template,
} from '../lib/templates';

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

function Section({ r, id, timeline }: { r: Resume; id: SectionId; timeline?: boolean }) {
  if (!hasSection(r, id)) return null;
  return (
    <section className={`sec sec-${id}${timeline ? ' tl' : ''}`} style={{ marginBottom: 13 }}>
      <h3 className="s-sec-title">{SECTION_LABELS[id]}</h3>
      <SectionBody r={r} id={id} />
    </section>
  );
}

/** Round photo used by the single-column templates, when uploaded. */
function HeaderPhoto({ r, size = 66 }: { r: Resume; size?: number }) {
  if (!r.personal.photo) return null;
  return (
    <img
      className="s-photo"
      src={r.personal.photo}
      alt=""
      style={{ width: size, height: size }}
    />
  );
}

export default function Preview({ r, tpl }: { r: Resume; tpl?: Template }) {
  const t = tpl ?? templateById(r.templateId);
  const order = sectionOrder(t, r.fieldId);
  const mainSections = t.layout === 'split'
    ? order.filter((s) => !['skills', 'languages', 'certs', 'hobbies'].includes(s))
    : order;
  const sideSections: SectionId[] = t.layout === 'split'
    ? (['skills', 'languages', 'certs', 'hobbies'] as SectionId[]).filter((s) => order.includes(s))
    : [];
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
            {r.personal.city && <div className="contact-line">{r.personal.city}, India</div>}
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

/** Scaled-down preview used for thumbnails and dashboard cards. */
export function Thumb({ r, width, tpl }: { r: Resume; width: number; tpl?: Template }) {
  const scale = width / 794;
  return (
    <div style={{ width, height: Math.ceil(1123 * scale), overflow: 'hidden', position: 'relative' }}>
      <div className="sheet-scale" style={{ transform: `scale(${scale})` }}>
        <Preview r={r} tpl={tpl} />
      </div>
    </div>
  );
}
