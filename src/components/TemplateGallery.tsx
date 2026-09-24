import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ACTIVE_FAMILIES, COLLECTION_NAME, LAYOUT_META, TEMPLATES, TEMPLATE_COUNT,
  type LayoutId, type Template,
} from '../lib/templates';
import type { Resume } from '../lib/types';
import { fieldById, type Field } from '../lib/fields';
import { Thumb } from './Preview';

type Filter = 'all' | LayoutId;

/** Family chips follow the catalogue: a family only appears when it has a
 *  design in it, so the gallery can never show an empty filter. */
const FILTERS: Filter[] = ['all', ...ACTIVE_FAMILIES];

const countByFamily: Record<string, number> = TEMPLATES.reduce(
  (acc, t) => {
    acc[t.layout] = (acc[t.layout] ?? 0) + 1;
    return acc;
  },
  {} as Record<string, number>,
);

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
      aria-label={`Use the ${t.name} template — ${LAYOUT_META[t.layout]?.label || t.layout} family`}
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

      <div className="tpl-body">
        <div className="tpl-name">
          <h4 title={t.name}>{t.name}</h4>
          {selected && <span className="tpl-applied">✓ Applied</span>}
        </div>
        <p className="tpl-tag">{t.tagline}</p>
        <div className="tpl-foot">
          <span className="tpl-fam">{LAYOUT_META[t.layout]?.label || t.layout}</span>
          <span className="tpl-strength" title={t.strengths.join(' · ')}>{t.strengths[0]}</span>
        </div>
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
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [bestOnly, setBestOnly] = useState(false);
  const f = fieldById(r.fieldId);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const words = needle ? needle.split(/\s+/) : [];
    const base = TEMPLATES.filter((t) => {
      if (filter !== 'all' && t.layout !== filter) return false;
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
  }, [filter, q, bestOnly, r.fieldId]);

  const total = list.length;
  const active = TEMPLATES.find((t) => t.id === r.templateId);
  const filtersOn = filter !== 'all' || bestOnly || q.trim().length > 0;

  const filterLabel = filter === 'all' ? 'All' : LAYOUT_META[filter as LayoutId]?.label || filter;

  const filterBlurb = filter === 'all'
    ? ''
    : (LAYOUT_META[filter as LayoutId]?.blurb ? `${LAYOUT_META[filter as LayoutId].blurb}.` : '');

  return (
    <div className="tpl-shell">
      <div className="tpl-bar">
        <div className="chips tpl-chips" role="group" aria-label="Template families">
          {FILTERS.map((fl) => {
            const count = fl === 'all' ? TEMPLATE_COUNT : (countByFamily[fl] ?? 0);
            return (
              <button
                key={fl}
                type="button"
                title={fl === 'all'
                  ? `Show all ${TEMPLATE_COUNT} ${COLLECTION_NAME.toLowerCase()} designs`
                  : `${LAYOUT_META[fl as LayoutId]?.label} — ${LAYOUT_META[fl as LayoutId]?.blurb}`}
                className={`chip tpl-chip ${filter === fl ? 'on' : ''}`}
                aria-pressed={filter === fl}
                onClick={() => setFilter(fl)}
              >
                {fl === 'all' ? `All ${TEMPLATE_COUNT}` : `${LAYOUT_META[fl as LayoutId]?.label} ${count}`}
              </button>
            );
          })}
        </div>

        <div className="tpl-tools">
          <span className="tpl-count">
            {total === 1 ? '1 template' : `${total} templates`}
            {filter !== 'all' && ` · ${filterLabel}`}
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
          <span className="tpl-star tpl-star-inline" aria-hidden="true">★</span>{' '}
          {active ? <>Applied: <b>{active.name}</b></> : 'Pick any design to apply it'} — gold stars mark the
          best fit for {f.label}
        </span>
        <span className="tpl-meta-right">
          Designs are A4-exact: what you see here is what prints
        </span>
      </div>

      {(filter !== 'all' || bestOnly) && (
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
          <button type="button" className="btn small" onClick={() => { setQ(''); setFilter('all'); setBestOnly(false); }}>
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
            onClick={() => { setQ(''); setFilter('all'); setBestOnly(false); }}
          >
            Clear filters · show all {TEMPLATE_COUNT}
          </button>
        </div>
      )}
    </div>
  );
}
