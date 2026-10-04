import { useEffect, useMemo, useRef, useState } from 'react';
import { importInfoFor } from '../lib/importDraft';
import { claimPendingOriginal, loadOriginalDocument, type OriginalDocumentRecord } from '../lib/originalDocument';
import { navigate } from '../lib/navigation';

type Align = 'left' | 'center' | 'right';

type TextBox = {
  id: string;
  original: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontPt: number;
  fontFamily: string;
  background: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: Align;
  lineHeight: number;
  originalFontPt: number;
  originalFontFamily: string;
  originalColor: string;
  originalBold: boolean;
  originalItalic: boolean;
  originalUnderline: boolean;
  originalAlign: Align;
  originalLineHeight: number;
  changed: boolean;
  custom?: boolean;
};

type PageModel = {
  id: string;
  image: string;
  width: number;
  height: number;
  widthPt: number;
  heightPt: number;
  boxes: TextBox[];
};

type SavedEdit = {
  version: 3;
  page: number;
  id: string;
  text: string;
  fontPt: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: Align;
  lineHeight: number;
  custom?: boolean;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  background?: string;
};

const HISTORY_LIMIT = 30;
const editKey = (id: string) => `craftcv.premium-exact.v3.${id}`;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const clonePages = (pages: PageModel[]) => pages.map((page) => ({ ...page, boxes: page.boxes.map((box) => ({ ...box })) }));

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;').replace(/\n/g, '<br>');
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read the uploaded resume.'));
    reader.readAsDataURL(blob);
  });
}

function isPdf(source: OriginalDocumentRecord) {
  return source.type === 'application/pdf' || source.name.toLowerCase().endsWith('.pdf');
}

function isImage(source: OriginalDocumentRecord) {
  return source.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(source.name);
}

function sampleBackground(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const pad = Math.max(2, Math.min(7, h * .34));
  const points: Array<[number, number]> = [
    [x + 2, y - pad], [x + w * .5, y - pad], [x + Math.max(2, w - 2), y - pad],
    [x + 2, y + h + pad], [x + w * .5, y + h + pad], [x + Math.max(2, w - 2), y + h + pad],
  ];
  let r = 0; let g = 0; let b = 0; let count = 0;
  for (const [rx, ry] of points) {
    const px = clamp(Math.round(rx), 0, Math.max(0, ctx.canvas.width - 1));
    const py = clamp(Math.round(ry), 0, Math.max(0, ctx.canvas.height - 1));
    try {
      const d = ctx.getImageData(px, py, 1, 1).data;
      if (d[3] < 20) continue;
      r += d[0]; g += d[1]; b += d[2]; count += 1;
    } catch { /* canvas is local */ }
  }
  if (!count) return 'rgb(255,255,255)';
  return `rgb(${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)})`;
}

function contrastColor(background: string) {
  const m = background.match(/rgb\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/i);
  if (!m) return '#111827';
  const lum = .299 * Number(m[1]) + .587 * Number(m[2]) + .114 * Number(m[3]);
  return lum < 130 ? '#fff' : '#111827';
}

function commonFont(fontFamily: string) {
  const value = String(fontFamily || '').trim();
  if (/arial/i.test(value)) return 'Arial, sans-serif';
  if (/calibri/i.test(value)) return 'Calibri, Arial, sans-serif';
  if (/times/i.test(value)) return "'Times New Roman', serif";
  if (/georgia/i.test(value)) return 'Georgia, serif';
  if (/segoe/i.test(value)) return "'Segoe UI', Arial, sans-serif";
  return value || 'Arial, sans-serif';
}

function hasChanges(box: TextBox) {
  return !!box.custom
    || box.text !== box.original
    || Math.abs(box.fontPt - box.originalFontPt) > .01
    || box.fontFamily !== box.originalFontFamily
    || box.color !== box.originalColor
    || box.bold !== box.originalBold
    || box.italic !== box.originalItalic
    || box.underline !== box.originalUnderline
    || box.align !== box.originalAlign
    || Math.abs(box.lineHeight - box.originalLineHeight) > .001;
}

function withChangeState(box: TextBox, patch: Partial<TextBox>) {
  const next = { ...box, ...patch };
  return { ...next, changed: hasChanges(next) };
}

function spatialOrder(a: TextBox, b: TextBox) {
  const rowTolerance = Math.max(.45, Math.min(a.h, b.h) * .65);
  if (Math.abs(a.y - b.y) > rowTolerance) return a.y - b.y;
  return a.x - b.x;
}

async function renderPdf(blob: Blob): Promise<PageModel[]> {
  const pdfjs: any = await import('pdfjs-dist');
  const workerModule: any = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const doc = await pdfjs.getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: true }).promise;
  const phone = typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches;
  const pages: PageModel[] = [];

  for (let pageNo = 1; pageNo <= doc.numPages; pageNo += 1) {
    const page = await doc.getPage(pageNo);
    const base = page.getViewport({ scale: 1 });
    const maxPx = phone ? 1120 : 1750;
    const scale = Math.min(phone ? 1.6 : 2.15, maxPx / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const ctx = canvas.getContext('2d', { willReadFrequently: true } as any) as CanvasRenderingContext2D | null;
    if (!ctx) throw new Error('Canvas is unavailable in this browser.');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;

    const tc = await page.getTextContent();
    const boxes: TextBox[] = [];
    let index = 0;
    for (const item of tc.items as any[]) {
      const text = String(item?.str || '');
      if (!text.trim()) continue;
      const tr = item.transform || [1, 0, 0, 10, 0, 0];
      const transformed = pdfjs.Util?.transform ? pdfjs.Util.transform(viewport.transform, tr) : null;
      const style = (tc.styles || {})[item.fontName] || {};
      const rawFontHeight = transformed ? Math.hypot(Number(transformed[2]) || 0, Number(transformed[3]) || 0) : Math.max(6, Math.hypot(Number(tr[2]) || 0, Number(tr[3]) || 10) * scale);
      const fontHeight = Math.max(6, rawFontHeight);
      const ascent = typeof style.ascent === 'number' ? style.ascent : (typeof style.descent === 'number' ? 1 + style.descent : .82);
      const x = transformed ? Number(transformed[4]) || 0 : (Number(tr[4]) || 0) * scale;
      const baseline = transformed ? Number(transformed[5]) || 0 : viewport.height - ((Number(tr[5]) || 0) * scale);
      const y = baseline - fontHeight * ascent;
      const w = Math.max(6, (Number(item.width) || text.length * (fontHeight / scale) * .46) * scale);
      const h = Math.max(8, fontHeight * 1.18);
      if (x > viewport.width || y > viewport.height || x + w < 0 || y + h < 0) continue;

      const family = commonFont(String(style.fontFamily || 'Arial, sans-serif'));
      const inferred = `${String(item.fontName || '')} ${family}`;
      const background = sampleBackground(ctx, x, y, w, h);
      const color = contrastColor(background);
      const fontPt = clamp(fontHeight / scale, 5, 72);
      const bold = /bold|black|semibold|demi/i.test(inferred);
      const italic = /italic|oblique/i.test(inferred);
      boxes.push({
        id: `p${pageNo}-t${index++}`,
        original: text,
        text,
        x: clamp(x / viewport.width * 100, 0, 100),
        y: clamp(y / viewport.height * 100, 0, 100),
        w: clamp(w / viewport.width * 100, .55, 100),
        h: clamp(h / viewport.height * 100, .62, 20),
        fontPt,
        fontFamily: family,
        background,
        color,
        bold,
        italic,
        underline: false,
        align: 'left',
        lineHeight: 1.04,
        originalFontPt: fontPt,
        originalFontFamily: family,
        originalColor: color,
        originalBold: bold,
        originalItalic: italic,
        originalUnderline: false,
        originalAlign: 'left',
        originalLineHeight: 1.04,
        changed: false,
      });
    }

    boxes.sort(spatialOrder);
    let image = '';
    try {
      image = canvas.toDataURL('image/webp', .94);
      if (!image.startsWith('data:image/webp')) image = canvas.toDataURL('image/jpeg', .96);
    } catch {
      image = canvas.toDataURL('image/jpeg', .96);
    }
    pages.push({
      id: `page-${pageNo}`,
      image,
      width: canvas.width,
      height: canvas.height,
      widthPt: base.width,
      heightPt: base.height,
      boxes,
    });
    page.cleanup?.();
  }
  doc.cleanup?.();
  return pages;
}

async function renderImage(blob: Blob): Promise<PageModel[]> {
  const image = new Image();
  const url = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Could not open the uploaded image.'));
      image.src = url;
    });
    const width = image.naturalWidth || 1000;
    const height = image.naturalHeight || 1400;
    return [{ id: 'page-1', image: await blobToDataUrl(blob), width, height, widthPt: 595.28, heightPt: 595.28 * height / width, boxes: [] }];
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadEdits(id: string): SavedEdit[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(editKey(id)) || '[]');
    return Array.isArray(parsed) ? parsed.filter((e) => e && e.version === 3) : [];
  } catch { return []; }
}

function applyEdits(pages: PageModel[], edits: SavedEdit[]) {
  const next = clonePages(pages);
  for (const edit of edits) {
    const page = next[edit.page];
    if (!page) continue;
    if (edit.custom) {
      page.boxes.push({
        id: edit.id, original: '', text: edit.text || '', x: edit.x ?? 10, y: edit.y ?? 10,
        w: edit.w ?? 32, h: edit.h ?? 4, fontPt: edit.fontPt || 11,
        fontFamily: edit.fontFamily || 'Arial, sans-serif', background: edit.background || 'rgb(255,255,255)',
        color: edit.color || '#111827', bold: !!edit.bold, italic: !!edit.italic, underline: !!edit.underline,
        align: edit.align || 'left', lineHeight: edit.lineHeight || 1.1,
        originalFontPt: edit.fontPt || 11, originalFontFamily: edit.fontFamily || 'Arial, sans-serif', originalColor: edit.color || '#111827',
        originalBold: false, originalItalic: false, originalUnderline: false, originalAlign: 'left', originalLineHeight: 1.1,
        changed: true, custom: true,
      });
      continue;
    }
    page.boxes = page.boxes.map((box) => box.id !== edit.id ? box : withChangeState(box, {
      text: edit.text,
      fontPt: edit.fontPt || box.fontPt,
      fontFamily: edit.fontFamily || box.fontFamily,
      color: edit.color || box.color,
      bold: !!edit.bold,
      italic: !!edit.italic,
      underline: !!edit.underline,
      align: edit.align || box.align,
      lineHeight: edit.lineHeight || box.lineHeight,
    }));
  }
  return next;
}

function serializeEdits(pages: PageModel[]): SavedEdit[] {
  const out: SavedEdit[] = [];
  pages.forEach((page, pageIndex) => page.boxes.filter((box) => box.changed || box.custom).forEach((box) => out.push({
    version: 3,
    page: pageIndex,
    id: box.id,
    text: box.text,
    fontPt: box.fontPt,
    fontFamily: box.fontFamily,
    color: box.color,
    bold: box.bold,
    italic: box.italic,
    underline: box.underline,
    align: box.align,
    lineHeight: box.lineHeight,
    custom: box.custom,
    ...(box.custom ? { x: box.x, y: box.y, w: box.w, h: box.h, background: box.background } : {}),
  })));
  return out;
}

export default function PremiumPdfEditorExact({ id, onOpenGuided, onOpenExact }: { id: string; onOpenGuided: () => void; onOpenExact: () => void }) {
  const [source, setSource] = useState<OriginalDocumentRecord | null>(null);
  const [pages, setPages] = useState<PageModel[]>([]);
  const [selected, setSelected] = useState<{ page: number; id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [, setHistoryTick] = useState(0);
  const undoRef = useRef<PageModel[][]>([]);
  const redoRef = useRef<PageModel[][]>([]);
  const info = useMemo(() => importInfoFor(id), [id]);
  const mobile = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setHydrated(false); setError('');
      try {
        const original = await loadOriginalDocument(id) || await claimPendingOriginal(id);
        if (cancelled) return;
        setSource(original);
        if (!original) throw new Error('Original file is missing. Re-upload once so the editor can keep the real PDF layout.');
        let rendered: PageModel[];
        if (isPdf(original)) rendered = await renderPdf(original.blob);
        else if (isImage(original)) rendered = await renderImage(original.blob);
        else throw new Error('For exact layout editing, upload a PDF or image. Export DOCX to PDF first.');
        if (cancelled) return;
        setPages(applyEdits(rendered, loadEdits(id)));
        undoRef.current = [];
        redoRef.current = [];
        setHydrated(true);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Could not open this resume.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!hydrated || !pages.length) return;
    try {
      const edits = serializeEdits(pages);
      if (edits.length) localStorage.setItem(editKey(id), JSON.stringify(edits));
      else localStorage.removeItem(editKey(id));
    } catch { /* storage unavailable */ }
  }, [hydrated, id, pages]);

  const selectedBox = selected ? pages[selected.page]?.boxes.find((box) => box.id === selected.id) : null;
  const editCount = useMemo(() => pages.reduce((sum, page) => sum + page.boxes.filter((box) => box.changed || box.custom).length, 0), [pages]);

  const mutatePages = (fn: (prev: PageModel[]) => PageModel[]) => {
    setPages((prev) => {
      undoRef.current = [...undoRef.current.slice(-(HISTORY_LIMIT - 1)), clonePages(prev)];
      redoRef.current = [];
      setHistoryTick((n) => n + 1);
      return fn(prev);
    });
  };

  const patchBox = (pageIndex: number, boxId: string, patch: Partial<TextBox>) => {
    mutatePages((prev) => prev.map((page, pi) => pi !== pageIndex ? page : ({
      ...page,
      boxes: page.boxes.map((box) => box.id === boxId ? withChangeState(box, patch) : box),
    })));
  };

  const undo = () => {
    const previous = undoRef.current.pop();
    if (!previous) return;
    redoRef.current = [...redoRef.current.slice(-(HISTORY_LIMIT - 1)), clonePages(pages)];
    setPages(clonePages(previous)); setSelected(null); setHistoryTick((n) => n + 1);
  };

  const redo = () => {
    const next = redoRef.current.pop();
    if (!next) return;
    undoRef.current = [...undoRef.current.slice(-(HISTORY_LIMIT - 1)), clonePages(pages)];
    setPages(clonePages(next)); setSelected(null); setHistoryTick((n) => n + 1);
  };

  const addText = () => {
    if (!pages.length) return;
    const pageIndex = selected?.page ?? 0;
    const id2 = `custom-${Date.now().toString(36)}`;
    const box: TextBox = {
      id: id2, original: '', text: 'New text', x: 10, y: 10, w: 30, h: 4,
      fontPt: 11, fontFamily: 'Arial, sans-serif', background: 'rgb(255,255,255)', color: '#111827',
      bold: false, italic: false, underline: false, align: 'left', lineHeight: 1.1,
      originalFontPt: 11, originalFontFamily: 'Arial, sans-serif', originalColor: '#111827',
      originalBold: false, originalItalic: false, originalUnderline: false, originalAlign: 'left', originalLineHeight: 1.1,
      changed: true, custom: true,
    };
    mutatePages((prev) => prev.map((page, pi) => pi === pageIndex ? { ...page, boxes: [...page.boxes, box] } : page));
    setSelected({ page: pageIndex, id: id2 });
  };

  const restoreSelected = () => {
    if (!selected || !selectedBox) return;
    if (selectedBox.custom) {
      mutatePages((prev) => prev.map((page, pi) => pi !== selected.page ? page : ({ ...page, boxes: page.boxes.filter((box) => box.id !== selected.id) })));
      setSelected(null);
      return;
    }
    patchBox(selected.page, selected.id, {
      text: selectedBox.original,
      fontPt: selectedBox.originalFontPt,
      fontFamily: selectedBox.originalFontFamily,
      color: selectedBox.originalColor,
      bold: selectedBox.originalBold,
      italic: selectedBox.originalItalic,
      underline: selectedBox.originalUnderline,
      align: selectedBox.originalAlign,
      lineHeight: selectedBox.originalLineHeight,
    });
  };

  const resetAll = () => {
    if (!confirm('Discard all Premium Edit changes and return to the untouched PDF?')) return;
    mutatePages((prev) => prev.map((page) => ({
      ...page,
      boxes: page.boxes.filter((box) => !box.custom).map((box) => ({
        ...box,
        text: box.original,
        fontPt: box.originalFontPt,
        fontFamily: box.originalFontFamily,
        color: box.originalColor,
        bold: box.originalBold,
        italic: box.originalItalic,
        underline: box.originalUnderline,
        align: box.originalAlign,
        lineHeight: box.originalLineHeight,
        changed: false,
      })),
    })));
    setSelected(null);
  };

  const downloadOriginal = () => source && saveBlob(source.blob, source.name || 'resume.pdf');

  const downloadEdited = async () => {
    if (!source || !editCount || downloading) return;
    setDownloading(true); setError('');
    try {
      const pageRules = pages.map((page, i) => `@page resume${i}{size:${page.widthPt}pt ${page.heightPt}pt;margin:0}.premium-exact-print.page-${i}{page:resume${i};width:${page.widthPt}pt;height:${page.heightPt}pt}`).join('');
      const html = pages.map((page, pageIndex) => {
        const overlays = page.boxes.filter((box) => box.changed || box.custom).map((box) => {
          return `<div style="position:absolute;left:${box.x}%;top:${box.y}%;width:${box.w}%;height:${box.h}%;box-sizing:border-box;background:${box.background};color:${box.color};font-family:${box.fontFamily};font-size:${box.fontPt}pt;font-weight:${box.bold ? 700 : 400};font-style:${box.italic ? 'italic' : 'normal'};text-decoration:${box.underline ? 'underline' : 'none'};text-align:${box.align};line-height:${box.lineHeight};white-space:pre-wrap;overflow:hidden;">${escapeHtml(box.text)}</div>`;
        }).join('');
        return `<section class="premium-exact-print page-${pageIndex}"><img src="${page.image}" alt=""/>${overlays}</section>`;
      }).join('');
      if (html.length > 3_000_000) throw new Error('This edited file is too large for a safe export. Try fewer edits.');
      const css = `${pageRules}*{box-sizing:border-box}html,body,.print-root{margin:0;padding:0;background:#fff}.premium-exact-print{position:relative;overflow:hidden;break-after:page;page-break-after:always}.premium-exact-print:last-child{break-after:auto;page-break-after:auto}.premium-exact-print>img{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;display:block}`;
      const title = `edited-${source.name.replace(/\.[^.]+$/, '') || 'resume'}`;
      const response = await fetch('/api/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html, css, title }) });
      if (!response.ok) throw new Error(await response.text() || 'Could not generate the edited PDF.');
      saveBlob(await response.blob(), `${title}.pdf`);
    } catch (e: any) {
      setError(e?.message || 'Could not generate the edited PDF.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="card pad premium3-loading"><b>Opening the exact PDF…</b><span>Locking every page, photo, column and spacing to the source.</span></div>;
  if (!source || !pages.length) return <div className="card pad premium3-loading"><h3>Original file needed</h3><p className="hint">{error}</p><div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}><button className="btn primary" onClick={() => navigate('/import')}>Re-upload</button><button className="btn" onClick={onOpenGuided}>Structured editor</button></div></div>;

  const pageWidth = mobile ? `${Math.round(100 * zoom)}%` : `${Math.round(820 * zoom)}px`;
  const selectedPage = selected ? pages[selected.page] : null;
  const selectedFontCqw = selectedBox && selectedPage ? selectedBox.fontPt / selectedPage.widthPt * 100 : 1.85;

  return (
    <div className="premium3-root">
      <header className="premium3-head no-print">
        <div className="premium3-title"><span>Layout Locked · Premium Edit</span><h2>{source.name}</h2><p>{info?.meta?.pages ? `${info.meta.pages} page${info.meta.pages > 1 ? 's' : ''} · ` : ''}same page order, same positions, same source artwork</p></div>
        <div className="premium3-actions"><button className="btn" onClick={downloadOriginal}>Original</button><button className="btn" onClick={onOpenExact}>Exact view</button>{editCount > 0 && <button className="btn primary" disabled={downloading} onClick={downloadEdited}>{downloading ? 'Preparing…' : `Download edited (${editCount})`}</button>}</div>
      </header>

      <div className="premium3-ribbon no-print" role="toolbar" aria-label="Premium PDF editing tools">
        <div className="premium3-group"><button disabled={!undoRef.current.length} onClick={undo}>↶</button><button disabled={!redoRef.current.length} onClick={redo}>↷</button></div>
        <div className="premium3-group"><select disabled={!selectedBox} value={selectedBox?.fontFamily || 'Arial, sans-serif'} onChange={(e) => selected && patchBox(selected.page, selected.id, { fontFamily: e.target.value })}><option value="Arial, sans-serif">Arial</option><option value="Calibri, Arial, sans-serif">Calibri</option><option value="'Segoe UI', Arial, sans-serif">Segoe UI</option><option value="Georgia, serif">Georgia</option><option value="'Times New Roman', serif">Times New Roman</option></select><input disabled={!selectedBox} type="number" min={5} max={72} step={.5} value={selectedBox ? Number(selectedBox.fontPt.toFixed(1)) : 11} onChange={(e) => selected && patchBox(selected.page, selected.id, { fontPt: clamp(Number(e.target.value || 11), 5, 72) })} /></div>
        <div className="premium3-group"><button className={selectedBox?.bold ? 'on' : ''} disabled={!selectedBox} onClick={() => selected && selectedBox && patchBox(selected.page, selected.id, { bold: !selectedBox.bold })}><b>B</b></button><button className={selectedBox?.italic ? 'on' : ''} disabled={!selectedBox} onClick={() => selected && selectedBox && patchBox(selected.page, selected.id, { italic: !selectedBox.italic })}><i>I</i></button><button className={selectedBox?.underline ? 'on' : ''} disabled={!selectedBox} onClick={() => selected && selectedBox && patchBox(selected.page, selected.id, { underline: !selectedBox.underline })}><u>U</u></button><label className="premium3-color">A<input disabled={!selectedBox} type="color" value={selectedBox?.color || '#111827'} onChange={(e) => selected && patchBox(selected.page, selected.id, { color: e.target.value })} /></label></div>
        <div className="premium3-group"><button disabled={!selectedBox} className={selectedBox?.align === 'left' ? 'on' : ''} onClick={() => selected && patchBox(selected.page, selected.id, { align: 'left' })}>≡</button><button disabled={!selectedBox} className={selectedBox?.align === 'center' ? 'on' : ''} onClick={() => selected && patchBox(selected.page, selected.id, { align: 'center' })}>≣</button><button disabled={!selectedBox} className={selectedBox?.align === 'right' ? 'on' : ''} onClick={() => selected && patchBox(selected.page, selected.id, { align: 'right' })}>≡→</button><select disabled={!selectedBox} value={selectedBox?.lineHeight || 1.04} onChange={(e) => selected && patchBox(selected.page, selected.id, { lineHeight: Number(e.target.value) })}><option value={1}>1.0</option><option value={1.04}>1.04</option><option value={1.1}>1.1</option><option value={1.2}>1.2</option><option value={1.35}>1.35</option></select></div>
        <div className="premium3-group"><button onClick={addText}>＋ Text</button>{editCount > 0 && <button onClick={resetAll}>Reset</button>}</div>
        <div className="premium3-group"><button onClick={() => setZoom((z) => clamp(Number((z - .1).toFixed(2)), .7, 1.5))}>−</button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom((z) => clamp(Number((z + .1).toFixed(2)), .7, 1.5))}>＋</button></div>
      </div>

      <div className="premium3-lock-note no-print"><b>Exact-layout mode:</b> opening Premium Edit never rebuilds the resume. The original PDF is the page. Existing text keeps its original X/Y position and box size; editing cannot reflow the sections below it.</div>
      {error && <div className="notice err no-print" style={{ marginBottom: 10 }}>{error}</div>}

      <div className={`premium3-workspace ${selectedBox ? 'selected' : ''}`}>
        <main className="premium3-scroll" aria-label="Resume pages in original order"><div className="premium3-pages">
          {pages.map((page, pageIndex) => (
            <section key={page.id} className="premium3-page-wrap" style={{ width: pageWidth }}>
              <div className="premium3-page" style={{ aspectRatio: `${page.width}/${page.height}` }}>
                <img src={page.image} alt={`Resume page ${pageIndex + 1}`} draggable={false} />
                {page.boxes.filter((box) => box.changed || box.custom).map((box) => {
                  const fontCqw = box.fontPt / page.widthPt * 100;
                  return <div key={`replace-${box.id}`} className="premium3-replacement" style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%`, fontSize: `${fontCqw}cqw`, fontFamily: box.fontFamily, background: box.background, color: box.color, fontWeight: box.bold ? 700 : 400, fontStyle: box.italic ? 'italic' : 'normal', textDecoration: box.underline ? 'underline' : 'none', textAlign: box.align, lineHeight: box.lineHeight }}>{box.text}</div>;
                })}
                {page.boxes.map((box, boxIndex) => {
                  const active = selected?.page === pageIndex && selected.id === box.id;
                  return <button key={`hit-${box.id}`} type="button" tabIndex={0} data-reading-order={boxIndex + 1} className={`premium3-hit ${active ? 'active' : ''} ${box.changed || box.custom ? 'changed' : ''}`} onClick={() => setSelected({ page: pageIndex, id: box.id })} aria-label={`Edit page ${pageIndex + 1} text ${boxIndex + 1}: ${box.original || box.text}`} style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${Math.max(box.w, mobile ? 3.4 : 1.3)}%`, height: `${Math.max(box.h, mobile ? 2.4 : 1.2)}%` }} />;
                })}
              </div>
              <div className="premium3-page-label no-print">Page {pageIndex + 1} · {Math.round(page.widthPt)} × {Math.round(page.heightPt)} pt</div>
            </section>
          ))}
        </div></main>

        <aside className={`premium3-inspector no-print ${selectedBox ? 'open' : ''}`} aria-label="Selected text editor">
          {selectedBox && selected ? <>
            <div className="premium3-inspector-head"><div><span>{selectedBox.custom ? 'New text block' : 'Locked original position'}</span><b>{selectedBox.custom ? 'Place custom text' : 'Edit this text only'}</b></div><button aria-label="Close editor" onClick={() => setSelected(null)}>×</button></div>
            {!selectedBox.custom && <div className="premium3-original"><small>Original text</small><div>{selectedBox.original}</div></div>}
            <label className="f" htmlFor="premium3-text">Text</label><textarea id="premium3-text" className="textarea premium3-textarea" value={selectedBox.text} onChange={(e) => patchBox(selected.page, selected.id, { text: e.target.value })} />
            <div className="premium3-meta"><span>Size {selectedBox.fontPt.toFixed(1)} pt</span><span>Box {selectedBox.w.toFixed(1)}% × {selectedBox.h.toFixed(1)}%</span><span>{selectedBox.custom ? 'Movable' : 'Position locked'}</span></div>
            {selectedBox.custom && <div className="premium3-position"><label>X<input type="number" min={0} max={95} step={.5} value={Number(selectedBox.x.toFixed(1))} onChange={(e) => patchBox(selected.page, selected.id, { x: clamp(Number(e.target.value), 0, 95) })} /></label><label>Y<input type="number" min={0} max={95} step={.5} value={Number(selectedBox.y.toFixed(1))} onChange={(e) => patchBox(selected.page, selected.id, { y: clamp(Number(e.target.value), 0, 95) })} /></label><label>Width<input type="number" min={5} max={95} step={1} value={Number(selectedBox.w.toFixed(0))} onChange={(e) => patchBox(selected.page, selected.id, { w: clamp(Number(e.target.value), 5, 95) })} /></label></div>}
            <div className="premium3-inspector-actions"><button className="btn" onClick={restoreSelected}>{selectedBox.custom ? 'Delete block' : 'Restore original'}</button><span>{selectedBox.changed ? 'Saved ✓' : 'Original'}</span></div>
          </> : <div className="premium3-empty"><div>✎</div><h3>Click text on the PDF</h3><p>Nothing is reconstructed. Select only the line you want to change.</p><button className="btn primary" onClick={addText}>＋ Add text</button></div>}
        </aside>
      </div>

      <style>{`
        .premium3-root{max-width:1460px;margin:0 auto;min-width:0}.premium3-loading{max-width:620px;margin:38px auto;display:grid;gap:8px;place-items:center;text-align:center}.premium3-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:10px}.premium3-title{min-width:0}.premium3-title>span{font-size:10.5px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#2f5c92}.premium3-title h2{margin:2px 0 1px;font-size:20px;color:#102344;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:760px}.premium3-title p{margin:0;color:#6b7280;font-size:12px}.premium3-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}
        .premium3-ribbon{position:sticky;top:0;z-index:58;display:flex;align-items:center;gap:7px;padding:8px;margin-bottom:8px;border:1px solid #dce4ee;border-radius:12px;background:rgba(255,255,255,.98);backdrop-filter:blur(12px);box-shadow:0 7px 26px rgba(15,33,72,.09);overflow-x:auto;scrollbar-width:none}.premium3-ribbon::-webkit-scrollbar{display:none}.premium3-group{display:flex;align-items:center;gap:4px;padding-right:7px;border-right:1px solid #e5eaf0;flex:0 0 auto}.premium3-group:last-child{border-right:0;padding-right:0}.premium3-group button,.premium3-group select,.premium3-group input[type=number]{height:34px;border:1px solid #d9e1eb;border-radius:7px;background:#fff;color:#1f3556;font:inherit;font-size:12px}.premium3-group button{min-width:34px;padding:0 8px;font-weight:800;cursor:pointer}.premium3-group button.on{background:#eaf2ff;border-color:#8bb4ed;color:#174c8c}.premium3-group button:disabled,.premium3-group select:disabled,.premium3-group input:disabled{opacity:.42;cursor:not-allowed}.premium3-group select{padding:0 24px 0 8px}.premium3-group input[type=number]{width:56px;padding:0 6px}.premium3-group>span{font-size:11px;font-weight:800;color:#49627f;min-width:42px;text-align:center}.premium3-color{height:34px;min-width:34px;display:grid;place-items:center;position:relative;border:1px solid #d9e1eb;border-radius:7px;font-weight:900;color:#263c5a;overflow:hidden}.premium3-color input{position:absolute;inset:auto 3px 2px;width:28px;height:5px;border:0;padding:0;opacity:.9}
        .premium3-lock-note{padding:9px 12px;margin-bottom:10px;border:1px solid #cfe0f5;border-radius:10px;background:#f6faff;color:#36506f;font-size:12.5px}.premium3-workspace{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:18px;align-items:start}.premium3-scroll{min-width:0;overflow-x:auto;padding:2px 8px 18px}.premium3-pages{display:grid;gap:20px;justify-items:center;min-width:max-content;margin:0 auto}.premium3-page-wrap{max-width:none;transition:width .15s ease}.premium3-page{position:relative;width:100%;background:#fff;border:1px solid rgba(15,33,72,.12);box-shadow:0 16px 46px rgba(13,29,59,.16);overflow:hidden;container-type:inline-size}.premium3-page>img{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;display:block;user-select:none;pointer-events:none}.premium3-page-label{text-align:center;margin-top:6px;color:#7b8798;font-size:10.5px}
        .premium3-replacement{position:absolute;z-index:3;box-sizing:border-box;padding:0 .5px;white-space:pre-wrap;overflow:hidden;pointer-events:none;margin:0}.premium3-hit{position:absolute;z-index:4;border:1px solid transparent;background:transparent;border-radius:2px;padding:0;cursor:text;min-width:6px;min-height:7px}.premium3-hit:hover{border-color:rgba(37,99,235,.42);background:rgba(37,99,235,.035)}.premium3-hit.active{border-color:#2563eb;background:rgba(37,99,235,.055);box-shadow:0 0 0 2px rgba(37,99,235,.14)}.premium3-hit.changed{border-color:rgba(5,150,105,.42)}
        .premium3-inspector{position:sticky;top:64px;padding:15px;border:1px solid #dfe5ee;border-radius:14px;background:#fff;box-shadow:0 12px 34px rgba(15,33,72,.1);min-height:250px}.premium3-inspector-head{display:flex;justify-content:space-between;gap:10px;margin-bottom:11px}.premium3-inspector-head span{display:block;font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:900;color:#527198}.premium3-inspector-head b{display:block;color:#142b4d;margin-top:2px}.premium3-inspector-head button{border:0;width:30px;height:30px;border-radius:50%;background:#f0f3f7;color:#294365;font-size:20px;cursor:pointer}.premium3-original{padding:9px;margin-bottom:10px;background:#f8fafc;border:1px solid #e3e8ef;border-radius:8px}.premium3-original small{display:block;color:#7a8798;font-weight:800;text-transform:uppercase;font-size:9px;letter-spacing:.07em;margin-bottom:3px}.premium3-original div{font-size:12px;color:#344a67;max-height:60px;overflow:auto}.premium3-textarea{min-height:110px;resize:vertical;line-height:1.4;font-size:14px}.premium3-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.premium3-meta span{font-size:10.5px;padding:4px 6px;border-radius:6px;background:#f2f5f8;color:#4f647e;font-weight:700}.premium3-position{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-top:10px}.premium3-position label{font-size:10px;color:#65758a;font-weight:800}.premium3-position input{display:block;width:100%;margin-top:3px;border:1px solid #d9e1eb;border-radius:7px;padding:7px}.premium3-inspector-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:13px;padding-top:12px;border-top:1px solid #e7ebf0}.premium3-inspector-actions span{font-size:11px;color:#07825d;font-weight:800}.premium3-empty{text-align:center;padding:24px 6px}.premium3-empty>div{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;margin:0 auto 10px;background:#edf4ff;color:#1d5fa7;font-size:21px}.premium3-empty h3{margin:0 0 5px;color:#172f51;font-size:16px}.premium3-empty p{margin:0 auto 14px;max-width:240px;color:#6a788b;font-size:12px;line-height:1.5}
        @media(max-width:900px){.premium3-workspace{grid-template-columns:minmax(0,1fr) 285px;gap:11px}.premium3-inspector{padding:12px}.premium3-page-wrap{width:min(780px,100vw)!important}}
        @media(max-width:760px){.premium3-root{margin:0 -4px}.premium3-head{display:block;padding:0 4px}.premium3-title h2{font-size:17px;max-width:94vw}.premium3-title p{font-size:11px;line-height:1.35}.premium3-actions{justify-content:flex-start;flex-wrap:nowrap;overflow-x:auto;margin-top:8px;padding-bottom:2px}.premium3-actions .btn{flex:0 0 auto}.premium3-ribbon{top:calc(56px + var(--safe-top));margin:0 0 8px;border-radius:10px;padding:7px 5px;gap:5px}.premium3-group{gap:3px;padding-right:5px}.premium3-group button,.premium3-group select,.premium3-group input[type=number],.premium3-color{height:38px}.premium3-group button{min-width:38px}.premium3-lock-note{font-size:11.5px;margin:0 4px 8px}.premium3-workspace{display:block}.premium3-scroll{padding:1px 0 calc(48dvh + 16px);overflow-x:auto;overscroll-behavior-x:contain}.premium3-pages{justify-items:start;margin:0}.premium3-page-wrap{min-width:100%;max-width:none!important}.premium3-page{box-shadow:0 7px 23px rgba(13,29,59,.14)}.premium3-hit{min-width:20px!important;min-height:20px!important}.premium3-inspector{position:fixed;left:7px;right:7px;bottom:calc(64px + var(--safe-bottom));top:auto;z-index:98;display:none;max-height:46dvh;overflow:auto;border-radius:17px 17px 11px 11px;padding:12px;box-shadow:0 -15px 38px rgba(13,29,59,.24)}.premium3-inspector.open{display:block}.premium3-original{display:none}.premium3-textarea{min-height:78px;max-height:18dvh;resize:none}.premium3-meta{margin-top:7px}.premium3-position{grid-template-columns:1fr 1fr 1fr}.premium3-inspector-actions{margin-top:9px;padding-top:9px}.premium3-page-label{font-size:10px}}
      `}</style>
    </div>
  );
}
