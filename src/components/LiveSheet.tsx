/**
 * LiveSheet — the A4 resume preview that sits next to the form.
 *
 * The sheet is laid out at true A4 pixels (794×1123) and then scaled from its
 * top-left corner inside an exact-size frame, so it stays pixel-accurate at any
 * pane width (and on any phone). It re-measures automatically, and grows to
 * show extra pages when the content is longer than one page.
 */

import { useEffect, useRef, useState } from 'react';
import type { Resume } from '../lib/types';
import Preview, { A4 } from './Preview';

export default function LiveSheet({ r, maxHeight }: { r: Resume; maxHeight?: number }) {
  const holderRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [contentH, setContentH] = useState(A4.h);

  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    const compute = () => setWidth(el.clientWidth);
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener('resize', compute);
    return () => { ro.disconnect(); window.removeEventListener('resize', compute); };
  }, []);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const compute = () => setContentH(Math.max(A4.h, el.offsetHeight));
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [r]);

  const scale = width > 0 ? Math.min(1, (width - 2) / A4.w) : 0;

  return (
    <div className="sheet-holder" ref={holderRef} style={maxHeight ? { maxHeight } : undefined}>
      <div className="sheet-frame" style={{ width: A4.w * scale, height: contentH * scale }}>
        <div ref={sheetRef} className="sheet-scale" style={{ width: A4.w, transform: `scale(${scale})` }}>
          <Preview r={r} />
          {Array.from({ length: Math.floor((contentH - 4) / A4.h) }).map((_, i) => (
            <div className="page-break" key={i} style={{ top: (i + 1) * A4.h }} />
          ))}
        </div>
      </div>
    </div>
  );
}
