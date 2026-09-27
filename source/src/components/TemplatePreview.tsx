import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Resume } from '../lib/types';
import { CATEGORY_META, LAYOUT_META, type Template } from '../lib/templates';
import Preview, { A4 } from './Preview';

/** Native modal supplies focus containment, Escape and background inertness. */
export default function TemplatePreview({ r, template, onClose, onSelect, onPrevious, onNext }: {
  r: Resume; template: Template; onClose: () => void; onSelect: () => void;
  onPrevious: () => void; onNext: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [height, setHeight] = useState(A4.h);
  const [zoom, setZoom] = useState<'fit' | number>('fit');
  useEffect(() => {
    const el = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    el.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { el.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  useEffect(() => {
    const update = () => {
      setWidth(viewport.current?.clientWidth || 600);
      setHeight(sheet.current?.offsetHeight || A4.h);
    };
    const observer = new ResizeObserver(update);
    if (viewport.current) observer.observe(viewport.current);
    if (sheet.current) observer.observe(sheet.current);
    update();
    return () => observer.disconnect();
  }, []);
  const scale = zoom === 'fit' ? Math.min(1, Math.max(0.2, (width - 48) / A4.w)) : zoom;
  return createPortal(
    <dialog className="template-dialog no-print" ref={dialog} aria-labelledby="template-dialog-title" onCancel={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="template-dialog-head">
        <div><span className="studio-eyebrow">Template preview</span><h2 id="template-dialog-title">{template.name}</h2></div>
        <button type="button" className="btn" aria-label="Close template preview" onClick={onClose}>✕</button>
      </div>
      <div className="template-dialog-body">
        <div className="template-reader">
          <div className="template-reader-tools">
            <button className="btn small" onClick={onPrevious} aria-label="Previous template">←</button>
            <label>Zoom <select aria-label="Preview zoom" value={zoom} onChange={(e) => setZoom(e.target.value === 'fit' ? 'fit' : Number(e.target.value))}>
              <option value="fit">Fit width</option><option value="0.75">75%</option><option value="1">100%</option><option value="1.25">125%</option>
            </select></label>
            <button className="btn small" onClick={onNext} aria-label="Next template">→</button>
          </div>
          <div className="template-reader-scroll" ref={viewport}>
            <div className="template-reader-paper" style={{ width: A4.w * scale, height: height * scale }}>
              <div ref={sheet} style={{ width: A4.w, transform: `scale(${scale})`, transformOrigin: 'top left' }}><Preview r={r} tpl={template} /></div>
            </div>
          </div>
        </div>
        <aside className="template-details">
          <span className="studio-tag">{CATEGORY_META[template.category].label}</span>
          <h3>A considered design.<br />Your story, clearly told.</h3>
          <p>{template.tagline}</p>
          <dl><dt>Layout</dt><dd>{LAYOUT_META[template.layout].label}</dd><dt>Paper size</dt><dd>A4 · all content visible</dd><dt>Included</dt><dd>Free PDF · no watermark</dd></dl>
          <ul>{template.strengths.map(s => <li key={s}>{s}</li>)}</ul>
          <p className="hint">Previewing does not change your resume. Apply the design when you are ready.</p>
          <button className="btn primary" onClick={onSelect}>Use this template →</button>
        </aside>
      </div>
    </dialog>, document.body,
  );
}
