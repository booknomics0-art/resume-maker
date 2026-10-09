import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CATEGORY_META, CATEGORY_ORDER, LAYOUT_META, TEMPLATES,
  type CategoryId, type LayoutId, type Template,
} from '../lib/templates';
import type { Resume } from '../lib/types';
import { fieldById, type Field } from '../lib/fields';
import { Thumb } from './Preview';
import './FresherMode.css';

/**
 * The two legacy `spine` designs used a vertical name/label rail. They remain
 * readable for old saved resumes, but are intentionally removed from the
 * public template catalogue. The picker only surfaces recruiter-safe,
 * conventional professional layouts.
 */
const REMOVED_TEMPLATE_IDS = new Set(['data-spine', 'care-spine']);
const CATALOGUE = TEMPLATES.filter((t) => !REMOVED_TEMPLATE_IDS.has(t.id));
const ACTIVE_GALLERY_FAMILIES = (Object.keys(LAYOUT_META) as LayoutId[])
  .filter((layout) => CATALOGUE.some((t) => t.layout === layout));

const countByCategory = CATALOGUE.reduce((acc, t) => {
  acc[t.category] = (acc[t.category] ?? 0) + 1;
  return acc;
}, {} as Record<string, number>);

/** Lazy-mount A4 previews so the picker remains smooth on phones. */
function useNearViewport<T extends HTMLElement>(rootMargin = '700px') {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === 'undefined') { setNear(true); return; }
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); } },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near, rootMargin]);
  return { ref, near };
}

function TplCard({
  t, r, field, selected, onSelect,
}: {
  t: Template;
  r: Resume;
  field: Field;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const { ref, near } = useNearViewport<HTMLElement>();
  const recommended = t.bestFor.includes(field.id) || (r.fresher && t.category === 'fresher');

  return (
    <article
      ref={ref}
      className={`card tpl-card ${selected ? 'selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Use the ${t.name} design`}
      onClick={() => onSelect(t.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(t.id); }
      }}
    >
      <div className="tpl-thumb">
        {near ? <Thumb r={{ ...r, templateId: t.id }} tpl={t} /> : <div className="thumb-fit tpl-skel" aria-hidden="true" />}
        {recommended && <span className="tpl-star" title={r.fresher && t.category === 'fresher' ? 'Designed for fresher and entry-level resumes' : `Best fit for ${field.label}`} aria-hidden="true">★</span>}
        {selected && <span className="tpl-check" aria-hidden="true">✓</span>}
        <span className="tpl-cta" aria-hidden="true">{selected ? 'Applied' : 'Use design'}</span>
      </div>

      <div className="tpl-body">
        <div className="tpl-name">
          <h4 title={t.name}>{t.name}</h4>
          <span className="tpl-swatch" aria-hidden="true">
            {[t.pal.p, t.pal.p2, t.pal.a].filter(Boolean).map((c, i) => <i key={i} style={{ background: c }} />)}
          </span>
        </div>
        <span className="tpl-cta-mobile" aria-hidden="true">{selected ? '✓ Applied' : 'Use →'}</span>
      </div>
    </article>
  );
}

export default function TemplateGallery({
  r, onSelect,
}: {
  r: Resume;
  onSelect: (templateId: string) => void;
}) {
  const [cat, setCat] = useState<CategoryId | 'all'>('all');
  const [fam, setFam] = useState<LayoutId | 'all'>('all');
  const [q, setQ] = useState('');
  const [bestOnly, setBestOnly] = useState(false);
  const f = fieldById(r.fieldId);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const words = needle ? needle.split(/\s+/) : [];
    const base = CATALOGUE.filter((t) => {
      if (cat !== 'all' && t.category !== cat) return false;
      if (fam !== 'all' && t.layout !== fam) return false;
      if (bestOnly && !t.bestFor.includes(r.fieldId) && !(r.fresher && t.category === 'fresher')) return false;
      if (!words.length) return true;
      const hay = `${t.name} ${t.tagline} ${LAYOUT_META[t.layout]?.label || ''} ${t.strengths.join(' ')}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    return [...base].sort((a, b) => {
      const af = r.fresher && a.category === 'fresher' ? 0 : 1;
      const bf = r.fresher && b.category === 'fresher' ? 0 : 1;
      if (af !== bf) return af - bf;
      const ai = a.bestFor.includes(r.fieldId) ? 0 : 1;
      const bi = b.bestFor.includes(r.fieldId) ? 0 : 1;
      return ai - bi;
    });
  }, [cat, fam, q, bestOnly, r.fieldId, r.fresher]);

  const total = list.length;
  const filtersOn = cat !== 'all' || fam !== 'all' || bestOnly || q.trim().length > 0;
  const clearFilters = () => { setCat('all'); setFam('all'); setQ(''); setBestOnly(false); };
  const filterLabel = [
    cat === 'all' ? null : CATEGORY_META[cat].label,
    fam === 'all' ? null : LAYOUT_META[fam].label,
  ].filter(Boolean).join(' · ');

  return (
    <div className="tpl-shell">
      {r.fresher && (
        <div className="fresher-template-note">
          <span aria-hidden="true">🎓</span>
          <span><b>Fresher Mode:</b> entry-level designs are shown first. They give projects, education and skills room to carry the page without inventing work history.</span>
        </div>
      )}

      <div className="tpl-bar">
        <div className="chips tpl-chips" role="group" aria-label="Template categories">
          <button type="button" className={`chip tpl-chip tpl-chip-cat ${cat === 'all' ? 'on' : ''}`} aria-pressed={cat === 'all'} onClick={() => setCat('all')}>
            All
          </button>
          {CATEGORY_ORDER.filter((c) => (countByCategory[c] ?? 0) > 0).map((c) => (
            <button
              key={c}
              type="button"
              title={CATEGORY_META[c].blurb}
              className={`chip tpl-chip tpl-chip-cat ${cat === c ? 'on' : ''}`}
              aria-pressed={cat === c}
              onClick={() => setCat((cur) => (cur === c ? 'all' : c))}
            >
              {CATEGORY_META[c].label}
            </button>
          ))}
        </div>

        <div className="chips tpl-chips tpl-chips-fam" role="group" aria-label="Template layouts">
          <button type="button" className={`chip tpl-chip ${fam === 'all' ? 'on' : ''}`} aria-pressed={fam === 'all'} onClick={() => setFam('all')}>
            Layouts
          </button>
          {ACTIVE_GALLERY_FAMILIES.map((layout) => (
            <button
              key={layout}
              type="button"
              title={LAYOUT_META[layout].blurb}
              className={`chip tpl-chip ${fam === layout ? 'on' : ''}`}
              aria-pressed={fam === layout}
              onClick={() => setFam((cur) => (cur === layout ? 'all' : layout))}
            >
              {LAYOUT_META[layout].label}
            </button>
          ))}
        </div>

        <div className="tpl-tools">
          <span className="tpl-count">{total} {total === 1 ? 'design' : 'designs'}{filterLabel ? ` · ${filterLabel}` : ''}</span>
          <div className="tpl-search">
            <span className="tpl-search-ico" aria-hidden="true">⌕</span>
            <input className="input" type="search" value={q} placeholder="Search…" aria-label="Search templates" onChange={(e) => setQ(e.target.value)} />
            {q && <button type="button" className="tpl-search-x" onClick={() => setQ('')} aria-label="Clear search">✕</button>}
          </div>
          <button
            type="button"
            className={`chip tpl-chip tpl-best ${bestOnly ? 'on' : ''}`}
            aria-pressed={bestOnly}
            title={r.fresher ? 'Show fresher-first and career-field best fits' : `Show designs that fit ${f.label} best`}
            onClick={() => setBestOnly((v) => !v)}
          >
            {r.fresher ? '🎓 Fresher picks' : '★ Best fit'}
          </button>
        </div>
      </div>

      {total === 0 ? (
        <div className="tpl-empty">
          <div className="tpl-empty-ico" aria-hidden="true">⌕</div>
          <h4>No matching design</h4>
          <p className="hint">Try another search or clear the filters.</p>
          <button type="button" className="btn small" onClick={clearFilters}>Clear filters</button>
        </div>
      ) : (
        <div className="tpl-grid">
          {list.map((t) => (
            <TplCard key={t.id} t={t} r={r} field={f} selected={r.templateId === t.id} onSelect={onSelect} />
          ))}
        </div>
      )}

      {total > 0 && filtersOn && (
        <div className="tpl-foot-actions">
          <button type="button" className="btn small" onClick={clearFilters}>Clear filters</button>
        </div>
      )}
    </div>
  );
}
