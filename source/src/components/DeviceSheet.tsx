/**
 * DeviceSheet — the resume preview in three modes:
 *
 *   'a4'      the exact A4 sheet (what prints), fitted to width or whole page,
 *             and growing to show page-break markers when content is longer
 *   'phone'   the whole page inside a phone frame  — how it looks on mobile
 *   'desktop' the whole page inside a desktop/browser frame
 *
 * The phone and desktop modes are true mockups: the same A4 sheet rendered by
 * Preview.tsx, scaled to fit inside the device screen exactly like a PDF viewer
 * shows a document. Everything on the sheet (name, number, every section) is
 * real markup, so what fits here is what prints here — in every template.
 */

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Resume } from '../lib/types';
import type { Template } from '../lib/templates';
import Preview, { A4 } from './Preview';

export type DeviceMode = 'a4' | 'phone' | 'desktop';
export type A4Fit = 'width' | 'page';

/** Measures an element's content box (live, including container resizes). */
function useBoxSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const compute = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, ...box };
}

/** Multi-page A4 sheet: true A4 px scaled into an exact-size frame. */
function A4View({
  r, tpl, fit, maxSheetPx, idPrefix, onPages,
}: {
  r: Resume; tpl?: Template; fit: A4Fit; maxSheetPx?: number; idPrefix: string;
  onPages?: (n: number) => void;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [h, setH] = useState(0);
  const [winH, setWinH] = useState(typeof window !== 'undefined' ? window.innerHeight : 900);
  const [contentH, setContentH] = useState(A4.h);

  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    const compute = () => {
      setW(el.clientWidth);
      setH(el.clientHeight);
      setWinH(window.innerHeight);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener('resize', compute);
    return () => { ro.disconnect(); window.removeEventListener('resize', compute); };
  }, []);

  // measure the real (unscaled) sheet height so content longer than one A4
  // page is never cut off — page-break guides mark where print splits
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const compute = () => setContentH(Math.max(A4.h, el.offsetHeight));
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [r]);

  // report how many A4 pages the sheet spans so the editor can badge it
  useEffect(() => {
    if (onPages) onPages(Math.max(1, Math.ceil((contentH - 4) / A4.h)));
  }, [contentH, onPages]);

  const cap = maxSheetPx ?? A4.w;
  const widthScale = w > 0 ? Math.min(1, cap / A4.w, (w - 2) / A4.w) : 0;
  // "whole page": the entire A4 page visible at once — constrained by the pane
  // when it has a real height, and always by the window (the holder grows with
  // its content, so window height is the reliable ceiling on phones).
  const availH = Math.min(h > 200 ? h : Number.MAX_SAFE_INTEGER, winH - 240);
  const scale = fit === 'page'
    ? Math.max(0.12, Math.min(widthScale, availH / A4.h))
    : widthScale;

  return (
    <div
      id={`${idPrefix}-panel`}
      role="tabpanel"
      aria-labelledby={`${idPrefix}-tab-a4`}
      className="sheet-holder"
      ref={holderRef}
    >
      {scale > 0 && (
        <div className="sheet-frame" style={{ width: A4.w * scale, height: contentH * scale }}>
          <div ref={sheetRef} className="sheet-scale" style={{ width: A4.w, transform: `scale(${scale})` }}>
            <Preview r={r} tpl={tpl} />
            {Array.from({ length: Math.floor((contentH - 4) / A4.h) }).map((_, i) => (
              <div className="page-break" key={i} style={{ top: (i + 1) * A4.h }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="dev-phone" role="img" aria-label="Mobile phone preview of this resume">
      <div className="dev-phone-notch" aria-hidden="true" />
      <div className="dev-phone-screen">{children}</div>
      <div className="dev-phone-bar" aria-hidden="true" />
    </div>
  );
}

function DesktopFrame({ children }: { children: ReactNode }) {
  return (
    <div className="dev-desk" role="img" aria-label="Desktop preview of this resume">
      <div className="dev-desk-chrome" aria-hidden="true">
        <span /><span /><span />
        <em>resume.pdf — A4</em>
      </div>
      <div className="dev-desk-screen">{children}</div>
      <div className="dev-desk-base" aria-hidden="true" />
    </div>
  );
}

export function DeviceTabs({
  mode, onChange, idPrefix = 'dev',
}: {
  mode: DeviceMode;
  onChange: (m: DeviceMode) => void;
  idPrefix?: string;
}) {
  const items: Array<{ id: DeviceMode; label: string }> = [
    { id: 'a4', label: '▤ A4 sheet' },
    { id: 'phone', label: '📱 Mobile' },
    { id: 'desktop', label: '🖥 Desktop' },
  ];
  return (
    <div className="chips dev-tabs" role="tablist" aria-label="Preview device">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${it.id}`}
          aria-selected={mode === it.id}
          aria-controls={`${idPrefix}-panel`}
          className={`chip dev-chip ${mode === it.id ? 'on' : ''}`}
          onClick={() => onChange(it.id)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export default function DeviceSheet({
  r, tpl, mode = 'a4', fit = 'width', idPrefix = 'dev', maxSheetPx, onPages,
}: {
  r: Resume;
  tpl?: Template;
  mode?: DeviceMode;
  /** for 'a4' only: fit the sheet to the pane width, or show the whole page at once */
  fit?: A4Fit;
  idPrefix?: string;
  /** cap the rendered A4 width in 'a4' mode (narrow side panes) */
  maxSheetPx?: number;
  /** report how many A4 pages the content spans (live, as it is edited) */
  onPages?: (n: number) => void;
}) {
  if (mode === 'a4') {
    return <A4View r={r} tpl={tpl} fit={fit} maxSheetPx={maxSheetPx} idPrefix={idPrefix} onPages={onPages} />;
  }

  return (
    <div
      id={`${idPrefix}-panel`}
      role="tabpanel"
      aria-labelledby={`${idPrefix}-tab-${mode}`}
      className={`dev-holder ${mode === 'phone' ? 'dev-holder-phone' : 'dev-holder-desk'}`}
    >
      {mode === 'phone' ? (
        <PhoneFrame>
          <FitScreen r={r} tpl={tpl} idPrefix={idPrefix} />
        </PhoneFrame>
      ) : (
        <DesktopFrame>
          <FitScreen r={r} tpl={tpl} idPrefix={idPrefix} />
        </DesktopFrame>
      )}
    </div>
  );
}

/** Fits the whole A4 page inside the device screen — like a PDF viewer's
 *  "fit page" zoom. The entire sheet (and every detail on it) stays visible. */
function FitScreen({ r, tpl }: { r: Resume; tpl?: Template; idPrefix: string }) {
  const screen = useBoxSize<HTMLDivElement>();
  const scale = screen.w > 0 && screen.h > 0
    ? Math.max(0.05, Math.min((screen.w - 8) / A4.w, (screen.h - 8) / A4.h))
    : 0;
  return (
    <div className="dev-screen-box" ref={screen.ref}>
      {scale > 0 && (
        <div className="sheet-frame" style={{ width: A4.w * scale, height: A4.h * scale }}>
          <div className="sheet-scale" style={{ width: A4.w, height: A4.h, transform: `scale(${scale})` }}>
            <Preview r={r} tpl={tpl} />
          </div>
        </div>
      )}
    </div>
  );
}
