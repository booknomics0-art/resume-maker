import { useMemo, useState } from 'react';
import { LAYOUT_META, TEMPLATES, TEMPLATE_COUNT, type LayoutId } from '../lib/templates';
import type { Resume } from '../lib/types';
import { fieldById } from '../lib/fields';
import { Thumb } from './Preview';

type Filter = 'all' | LayoutId;

const FILTERS: Filter[] = ['all', 'portrait', 'studio', 'monogram', 'timeline', 'infographic', 'corporate', 'split', 'classic', 'minimal', 'metro', 'compact'];
const NEW_FAMILIES = new Set<Filter>(['portrait', 'studio', 'monogram', 'timeline', 'infographic', 'corporate']);

const countByLayout: Record<string, number> = TEMPLATES.reduce(
  (acc, t) => ({ ...acc, [t.layout]: (acc[t.layout] ?? 0) + 1 }),
  {} as Record<string, number>,
);

export default function TemplateGallery({
  r, onSelect, compact,
}: {
  r: Resume;
  onSelect: (templateId: string) => void;
  compact?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const f = fieldById(r.fieldId);

  const ordered = useMemo(() => {
    const base = filter === 'all' ? TEMPLATES : TEMPLATES.filter((t) => t.layout === filter);
    return [...base].sort((a, b) => {
      const ai = a.bestFor.includes(r.fieldId) ? 0 : 1;
      const bi = b.bestFor.includes(r.fieldId) ? 0 : 1;
      return ai - bi;
    });
  }, [filter, r.fieldId]);

  return (
    <div>
      <div className="chips" style={{ marginBottom: 14 }}>
        {FILTERS.map((fl) => (
          <button
            key={fl}
            className={`chip ${filter === fl ? 'on' : ''}`}
            onClick={() => setFilter(fl)}
          >
            {fl === 'all' ? `All ${TEMPLATE_COUNT}` : `${NEW_FAMILIES.has(fl) ? '✨ ' : ''}${LAYOUT_META[fl].label} ${countByLayout[fl] ?? 0}`}
          </button>
        ))}
      </div>
      {filter !== 'all' && (
        <p className="hint" style={{ margin: '8px 2px 12px' }}>{LAYOUT_META[filter].blurb}.</p>
      )}
      <div className="tpl-grid" style={compact ? { gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' } : undefined}>
        {ordered.map((t) => {
          const recommended = t.bestFor.includes(r.fieldId);
          return (
            <div
              key={t.id}
              className={`card tpl-card ${r.templateId === t.id ? 'selected' : ''}`}
              onClick={() => onSelect(t.id)}
            >
              {recommended && <div className="badge">★ Best for {f.label}</div>}
              <div className="thumb">
                <Thumb r={{ ...r, templateId: t.id }} tpl={t} />
              </div>
              <div className="tpl-body">
                <h4>{t.name} {r.templateId === t.id && '✓'}</h4>
                <p>{t.tagline}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
