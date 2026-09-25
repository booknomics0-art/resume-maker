import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ACTIVE_FAMILIES, CATEGORY_META, CATEGORY_ORDER, COLLECTION_NAME, LAYOUT_META,
  TEMPLATES, TEMPLATE_COUNT, type CategoryId, type LayoutId, type Template,
} from '../lib/templates';
import type { Resume } from '../lib/types';
import { fieldById, type Field } from '../lib/fields';
import { Thumb } from './Preview';

/** Two chip rows over one catalogue: *who it is for* (category) and *how the
 *  page is built* (family). Both are derived from the catalogue, so an empty
 *  chip is impossible — a family or category only appears when it has a design. */
const countBy: (key: 'category' | 'layout') => Record<string, number> = (key) =>
  TEMPLATES.reduce((acc, t) => {
    const k = String(t[key]);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

const countByCategory = countBy('category');
const countByFamily = countBy('layout');

/**
 * Cards below the fold are not mounted until they come close to the viewport.
 * Each thumbnail renders a full A4 page, so mounting every design at once made
 * the design step janky on phones. The placeholder keeps the exact A4 box, so
 * the grid never shifts when the real preview appears.
 */
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
  const recommended = t.bestFor.includes(field.id);

  return (
    <article
      ref={ref}
      className={`card tpl-card ${selected ? 'selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Use the ${t.name} design — ${t.tagline}`}
      onClick={() => onSelect(t.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(t.id); }
      }}
    >
      <div className="tpl-thumb">
        {near ? <Thumb r={{ ...r, templateId: t.id }} tpl={t} /> : <div className="thumb-fit tpl-skel" aria-hidden="true" />}
        {recommended && (
          <span className="tpl-star" title={`Best fit for ${field.label}`} aria-hidden="true">★</span>
        )}
        {selected && <span className="tpl-check" aria-hidden="true">✓</span>}
        <span className="tpl-cta" aria-hidden="true">{selected ? 'Applied' : 'Use this design'}</span>
      </div>

      {/* intentionally minimal: the design speaks for itself — name + one tap */}
      <div className="tpl-body">
        <div className="tpl-name">
          <h4 title={t.name}>{t.name}</h4>
          <span className="tpl-swatch" aria-hidden="true">
            {[t.pal.p, t.pal.p2, t.pal.a].filter(Boolean).map((c, i) => (
              <i key={i} style={{ background: c }} />
            ))}
          </span>
        </div>
        <span className="tpl-cta-mobile" aria-hidden="true">{selected ? '✓ Applied' : 'Use this design →'}</span>
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
    const base = TEMPLATES.filter((t) => {
      if (cat !== 'all' && t.category !== cat) return false;
      if (fam !== 'all' && t.layout !== fam) return false;
      if (bestOnly && !t.bestFor.includes(r.fieldId)) return false;
      if (!words.length) return true;
      const hay = `${t.name} ${t.tagline} ${LAYOUT_META[t.layout]?.label || ''} ${t.strengths.join(' ')}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    // Best fit for the chosen field first, everything else in catalogue order.
    return [...base].sort((a, b) => {
      const ai = a.bestFor.includes(r.fieldId) ? 0 : 1;
      const bi = b.bestFor.includes(r.fieldId) ? 0 : 1;
      return ai - bi;
    });
  }, [cat, fam, q, bestOnly, r.fieldId]);

  const total = list.length;
  const active = TEMPLATES.find((t) => t.id === r.templateId);
  const filtersOn = cat !== 'all' || fam !== 'all' || bestOnly || q.trim().length > 0;
  const clearFilters = () => { setCat('all'); setFam('all'); setQ(''); setBestOnly(false); };

  const filterLabel = [
    cat === 'all' ? null : CATEGORY_META[cat].label,
    fam === 'all' ? null : LAYOUT_META[fam].label,
  ].filter(Boolean).join(' · ');

  const filterBlurb = [
    cat === 'all' ? null : CATEGORY_META[cat].blurb,
    fam === 'all' ? null : LAYOUT_META[fam].blurb,
  ].filter(Boolean).join(' · ');

  return (
    <div className="tpl-shell">
      <div className="tpl-bar">
        <div className="chips tpl-chips" role="group" aria-label="Template categories">
          <button
            type="button"
            title={`Show all ${TEMPLATE_COUNT} ${COLLECTION_NAME.toLowerCase()} designs`}
            className={`chip tpl-chip tpl-chip-cat ${cat === 'all' ? 'on' : ''}`}
            aria-pressed={cat === 'all'}
            onClick={() => setCat('all')}
          >
            All {TEMPLATE_COUNT}
          </button>
          {CATEGORY_ORDER.map((c) => (
            <button
              key={c}
              type="button"
              title={`${CATEGORY_META[c].label} — ${CATEGORY_META[c].blurb}`}
              className={`chip tpl-chip tpl-chip-cat ${cat === c ? 'on' : ''}`}
              aria-pressed={cat === c}
              onClick={() => setCat((cur) => (cur === c ? 'all' : c))}
            >
              {CATEGORY_META[c].label} {countByCategory[c] ?? 0}
            </button>
          ))}
        </div>

        <div className="chips tpl-chips tpl-chips-fam" role="group" aria-label="Template families">
          <button
            type="button"
            title="Show every layout family"
            className={`chip tpl-chip ${fam === 'all' ? 'on' : ''}`}
            aria-pressed={fam === 'all'}
            onClick={() => setFam('all')}
          >
            All layouts
          </button>
          {ACTIVE_FAMILIES.map((l) => (
            <button
              key={l}
              type="button"
              title={`${LAYOUT_META[l].label} — ${LAYOUT_META[l].blurb}`}
              className={`chip tpl-chip ${fam === l ? 'on' : ''}`}
              aria-pressed={fam === l}
              onClick={() => setFam((cur) => (cur === l ? 'all' : l))}
            >
              {LAYOUT_META[l].label} {countByFamily[l] ?? 0}
            </button>
          ))}
        </div>

        <div className="tpl-tools">
          <span className="tpl-count">
            {total === 1 ? '1 template' : `${total} templates`}
            {filterLabel && ` · ${filterLabel}`}
            {bestOnly && ` · best fit`}
            {q.trim() && ` · “${q.trim()}”`}
          </span>
          <div className="tpl-search">
            <span className="tpl-search-ico" aria-hidden="true">⌕</span>
            <input
              className="input"
              type="search"
              value={q}
              placeholder="Search templates…"
              aria-label="Search templates"
              onChange={(e) => setQ(e.target.value)}
            />
            {q && (
              <button type="button" className="tpl-search-x" onClick={() => setQ('')} aria-label="Clear search">✕</button>
            )}
          </div>
          <button
            type="button"
            className={`chip tpl-chip tpl-best ${bestOnly ? 'on' : ''}`}
            aria-pressed={bestOnly}
            title={`Show only templates that fit ${f.label} best`}
            onClick={() => setBestOnly((v) => !v)}
          >
            ★ Best for {f.label}
          </button>
        </div>
      </div>

      <div className="tpl-meta">
        <span>
          {active ? <>Applied: <b>{active.name}</b></> : 'Tap any design to apply it'}
          {' · '}<span className="tpl-star tpl-star-inline" aria-hidden="true">★</span> = best fit for {f.label}
        </span>
      </div>

      {(filtersOn || bestOnly) && (
        <p className="hint tpl-blurb">
          {filterBlurb}
          {bestOnly && <> Showing only the designs that suit <b>{f.label}</b> best.</>}
        </p>
      )}

      {total === 0 ? (
        <div className="tpl-empty">
          <div className="tpl-empty-ico" aria-hidden="true">⌕</div>
          <h4>No template matches “{q.trim() || filterLabel}”</h4>
          <p className="hint">Try a different word — or clear the filters to see all {TEMPLATE_COUNT} designs.</p>
          <button type="button" className="btn small" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="tpl-grid">
          {list.map((t) => (
            <TplCard
              key={t.id}
              t={t}
              r={r}
              field={f}
              selected={r.templateId === t.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      {total > 0 && filtersOn && (
        <div className="tpl-foot-actions">
          <button
            type="button"
            className="btn small"
            onClick={clearFilters}
          >
            Clear filters · show all {TEMPLATE_COUNT}
          </button>
        </div>
      )}
    </div>
  );
}
