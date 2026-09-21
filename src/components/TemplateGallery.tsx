import { TEMPLATES } from '../lib/templates';
import type { Resume } from '../lib/types';
import { fieldById } from '../lib/fields';
import { Thumb } from './Preview';

export default function TemplateGallery({
  r, onSelect, compact,
}: {
  r: Resume;
  onSelect: (templateId: string) => void;
  compact?: boolean;
}) {
  const f = fieldById(r.fieldId);
  const ordered = [...TEMPLATES].sort((a, b) => {
    const ai = a.bestFor.includes(r.fieldId) ? 0 : 1;
    const bi = b.bestFor.includes(r.fieldId) ? 0 : 1;
    return ai - bi;
  });

  return (
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
              <Thumb r={{ ...r, templateId: t.id }} width={170} tpl={t} />
            </div>
            <div className="tpl-body">
              <h4>{t.name} {r.templateId === t.id && '✓'}</h4>
              <p>{t.tagline}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
