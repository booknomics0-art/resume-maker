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
  fontSize: number;
  fontFamily: string;
  background: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: Align;
  lineHeight: number;
  originalFontSize: number;
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
  boxes: TextBox[];
};

type SavedEdit = {
  page: number;
  id: string;
  text: string;
  fontSize: number;
  fontFamily?: string;
  color?: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: Align;
  lineHeight?: number;
  custom?: boolean;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  background?: string;
};

const HISTORY_LIMIT = 30;
const editKey = (id: string) => `craftcv.exact-editor.v2.${id}`;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const clonePages = (pages: PageModel[]): PageModel[] => pages.map((page) => ({
  ...page,
  boxes: page.boxes.map((box) => ({ ...box })),
}));

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
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

function parseRgb(value: string): [number, number, number] | null {
  const m = value.match(/rgb\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/i);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function contrastColor(background: string) {
  const rgb = parseRgb(background);
  if (!rgb) return '#111827';
  const [r, g, b] = rgb;
  return 0.299 * r + 0.587 * g + 0.114 * b < 130 ? '#ffffff' : '#111827';
}

function sampleBackground(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const pad = Math.max(2, Math.min(7, h * 0.35));
  const points: Array<[number, number]> = [
    [x + 2, y - pad], [x + w * 0.5, y - pad], [x + Math.max(2, w - 2), y - pad],
    [x + 2, y + h + pad], [x + w * 0.5, y + h + pad], [x + Math.max(2, w - 2), y + h + pad],
    [x - pad, y + h * 0.5], [x + w + pad, y + h * 0.5],
  ];
  let r = 0; let g = 0; let b = 0; let count = 0;
  for (const [rawX, rawY] of points) {
    const px = clamp(Math.round(rawX), 0, Math.max(0, ctx.canvas.width - 1));
    const py = clamp(Math.round(rawY), 0, Math.max(0, ctx.canvas.height - 1));
    try {
      const data = ctx.getImageData(px, py, 1, 1).data;
      if (data[3] < 20) continue;
      r += data[0]; g += data[1]; b += data[2]; count += 1;
    } catch { /* same-origin PDF canvas */ }
  }
  if (!count) return 'rgb(255,255,255)';
  return `rgb(${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)})`;
}

function hasChanges(box: TextBox) {
  return !!box.custom
    || box.text !== box.original
    || Math.abs(box.fontSize - box.originalFontSize) > 0.001
    || box.fontFamily !== box.originalFontFamily
    || box.color !== box.originalColor
    || box.bold !== box.originalBold
    || box.italic !== box.originalItalic
    || box.underline !== box.originalUnderline
    || box.align !== box.originalAlign
    || Math.abs(box.lineHeight - box.originalLineHeight) > 0.001;
}

function withChangeState(box: TextBox, patch: Partial<TextBox>): TextBox {
  const next = { ...box, ...patch };
  return { ...next, changed: hasChanges(next) };
}

async function renderPdf(blob: Blob): Promise<PageModel[]> {
  const pdfjs: any = await import('pdfjs-dist');
  const workerModule: any = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const doc = await pdfjs.getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: true }).promise;
  const pages: PageModel[] = [];
  const phone = typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches;
  const maxPx = phone ? 1080 : 1650;
  const maxScale = phone ? 1.55 : 2.05;

  for (let pageNo = 1; pageNo <= doc.numPages; pageNo += 1) {
    const page = await doc.getPage(pageNo);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(maxScale, maxPx / Math.max(base.width, base.height));
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
      const transform = item.transform || [1, 0, 0, 10, 0, 0];
      const x = (Number(transform[4]) || 0) * scale;
      const fontHeight = Math.max(6, (Number(item.height) || Math.hypot(Number(transform[2]) || 0, Number(transform[3]) || 10)) * scale);
      const y = viewport.height - ((Number(transform[5]) || 0) * scale) - fontHeight;
      const w = Math.max(6, (Number(item.width) || text.length * fontHeight * 0.46) * scale);
      const h = Math.max(fontHeight * 1.22, 8);
      if (x > viewport.width || y > viewport.height || x + w < 0 || y + h < 0) continue;

      const style = (tc.styles || {})[item.fontName] || {};
      const family = String(style.fontFamily || 'Arial, sans-serif');
      const inferred = `${String(item.fontName || '')} ${family}`;
      const background = sampleBackground(ctx, x, y, w, h);
      const color = contrastColor(background);
      const fontSize = clamp(fontHeight / viewport.width * 100, 0.55, 8);
      const bold = /bold|black|semibold|demi/i.test(inferred);
      const italic = /italic|oblique/i.test(inferred);

      boxes.push({
        id: `p${pageNo}-t${index++}`,
        original: text,
        text,
        x: clamp(x / viewport.width * 100, 0, 100),
        y: clamp(y / viewport.height * 100, 0, 100),
        w: clamp(w / viewport.width * 100, 0.65, 100),
        h: clamp(h / viewport.height * 100, 0.72, 20),
        fontSize,
        fontFamily: family,
        background,
        color,
        bold,
        italic,
        underline: false,
        align: 'left',
        lineHeight: 1.08,
        originalFontSize: fontSize,
        originalFontFamily: family,
        originalColor: color,
        originalBold: bold,
        originalItalic: italic,
        originalUnderline: false,
        originalAlign: 'left',
        originalLineHeight: 1.08,
        changed: false,
      });
    }

    let image = '';
    try {
      image = canvas.toDataURL('image/webp', 0.91);
      if (!image.startsWith('data:image/webp')) image = canvas.toDataURL('image/jpeg', 0.93);
    } catch {
      image = canvas.toDataURL('image/jpeg', 0.93);
    }
    pages.push({ id: `page-${pageNo}`, image, width: canvas.width, height: canvas.height, boxes });
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
    return [{ id: 'page-1', image: await blobToDataUrl(blob), width: image.naturalWidth || 1000, height: image.naturalHeight || 1400, boxes: [] }];
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadEdits(id: string): SavedEdit[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(editKey(id)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function applyEdits(pages: PageModel[], edits: SavedEdit[]): PageModel[] {
  if (!edits.length) return pages;
  const next = clonePages(pages);
  edits.forEach((edit) => {
    const page = next[edit.page];
    if (!page) return;
    if (edit.custom) {
      const fontFamily = edit.fontFamily || 'Arial, sans-serif';
      const color = edit.color || '#111827';
      page.boxes.push({
        id: edit.id,
        original: '', text: edit.text || '', x: edit.x ?? 10, y: edit.y ?? 10,
        w: edit.w ?? 30, h: edit.h ?? 4, fontSize: edit.fontSize || 2,
        fontFamily, background: edit.background || 'rgb(255,255,255)', color,
        bold: !!edit.bold, italic: !!edit.italic, underline: !!edit.underline,
        align: edit.align || 'left', lineHeight: edit.lineHeight || 1.08,
        originalFontSize: edit.fontSize || 2, originalFontFamily: fontFamily,
        originalColor: color, originalBold: false, originalItalic: false,
        originalUnderline: false, originalAlign: 'left', originalLineHeight: 1.08,
        changed: true, custom: true,
      });
      return;
    }
    page.boxes = page.boxes.map((box) => box.id !== edit.id ? box : withChangeState(box, {
      text: edit.text,
      fontSize: edit.fontSize || box.fontSize,
      fontFamily: edit.fontFamily || box.fontFamily,
      color: edit.color || box.color,
      bold: !!edit.bold,
      italic: !!edit.italic,
      underline: !!edit.underline,
      align: edit.align || box.align,
      lineHeight: edit.lineHeight || box.lineHeight,
    }));
  });
  return next;
}

function serializeEdits(pages: PageModel[]): SavedEdit[] {
  const out: SavedEdit[] = [];
  pages.forEach((page, pageIndex) => {
    page.boxes.filter((box) => box.changed || box.custom).forEach((box) => {
      out.push({
        page: pageIndex, id: box.id, text: box.text, fontSize: box.fontSize,
        fontFamily: box.fontFamily, color: box.color, bold: box.bold,
        italic: box.italic, underline: box.underline, align: box.align,
        lineHeight: box.lineHeight, custom: box.custom,
        ...(box.custom ? { x: box.x, y: box.y, w: box.w, h: box.h, background: box.background } : {}),
      });
    });
  });
  return out;
}

function pointSize(box: TextBox | null | undefined) {
  return box ? Math.round(box.fontSize * 5.95) : 11;
}

function stripListPrefix(line: string) {
  return line.replace(/^\s*(?:[•●▪◦-]|\d+[.)])\s+/, '');
}

export default function PremiumPdfEditor({
  id,
  onOpenGuided,
  onOpenExact,
}: {
  id: string;
  onOpenGuided: () => void;
  onOpenExact: () => void;
}) {
  const [source, setSource] = useState<OriginalDocumentRecord | null>(null);
  const [pages, setPages] = useState<PageModel[]>([]);
  const [selected, setSelected] = useState<{ page: number; id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [historyTick, setHistoryTick] = useState(0);
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
        if (!original) throw new Error('The original upload is missing. Re-upload the resume once so the editor can preserve its real layout and photo.');
        let rendered: PageModel[];
        if (isPdf(original)) rendered = await renderPdf(original.blob);
        else if (isImage(original)) rendered = await renderImage(original.blob);
        else throw new Error('Premium visual editing works with PDF and image resumes. Export a DOCX to PDF first for pixel-accurate editing.');
        if (cancelled) return;
        setPages(applyEdits(rendered, loadEdits(id)));
        undoRef.current = [];
        redoRef.current = [];
        setHistoryTick((n) => n + 1);
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
    } catch { /* private mode */ }
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
    mutatePages((prev) => prev.map((page, pi) => pi !== pageIndex ? page : {
      ...page,
      boxes: page.boxes.map((box) => box.id === boxId ? withChangeState(box, patch) : box),
    }));
  };

  const undo = () => {
    const previous = undoRef.current.pop();
    if (!previous) return;
    redoRef.current = [...redoRef.current.slice(-(HISTORY_LIMIT - 1)), clonePages(pages)];
    setPages(clonePages(previous));
    setSelected(null);
    setHistoryTick((n) => n + 1);
  };

  const redo = () => {
    const next = redoRef.current.pop();
    if (!next) return;
    undoRef.current = [...undoRef.current.slice(-(HISTORY_LIMIT - 1)), clonePages(pages)];
    setPages(clonePages(next));
    setSelected(null);
    setHistoryTick((n) => n + 1);
  };

  const addText = () => {
    if (!pages.length) return;
    const pageIndex = selected?.page ?? 0;
    const id2 = `custom-${Date.now().toString(36)}`;
    const box: TextBox = {
      id: id2, original: '', text: 'New text', x: 10, y: 10, w: 32, h: 4,
      fontSize: 1.85, fontFamily: 'Arial, sans-serif', background: 'rgb(255,255,255)', color: '#111827',
      bold: false, italic: false, underline: false, align: 'left', lineHeight: 1.15,
      originalFontSize: 1.85, originalFontFamily: 'Arial, sans-serif', originalColor: '#111827',
      originalBold: false, originalItalic: false, originalUnderline: false, originalAlign: 'left', originalLineHeight: 1.15,
      changed: true, custom: true,
    };
    mutatePages((prev) => prev.map((page, pi) => pi === pageIndex ? { ...page, boxes: [...page.boxes, box] } : page));
    setSelected({ page: pageIndex, id: id2 });
  };

  const restoreSelected = () => {
    if (!selected || !selectedBox) return;
    if (selectedBox.custom) {
      mutatePages((prev) => prev.map((page, pi) => pi !== selected.page ? page : {
        ...page, boxes: page.boxes.filter((box) => box.id !== selected.id),
      }));
      setSelected(null);
      return;
    }
    patchBox(selected.page, selected.id, {
      text: selectedBox.original,
      fontSize: selectedBox.originalFontSize,
      fontFamily: selectedBox.originalFontFamily,
      color: selectedBox.originalColor,
      bold: selectedBox.originalBold,
      italic: selectedBox.originalItalic,
      underline: selectedBox.originalUnderline,
      align: selectedBox.originalAlign,
      lineHeight: selectedBox.originalLineHeight,
    });
  };

  const clearSelected = () => {
    if (!selected || !selectedBox) return;
    if (selectedBox.custom) return restoreSelected();
    patchBox(selected.page, selected.id, { text: '' });
  };

  const resetAll = () => {
    if (!confirm('Discard all text edits and return to the untouched uploaded resume?')) return;
    mutatePages((prev) => prev.map((page) => ({
      ...page,
      boxes: page.boxes.filter((box) => !box.custom).map((box) => ({
        ...box,
        text: box.original,
        fontSize: box.originalFontSize,
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

  const applyList = (numbered: boolean) => {
    if (!selected || !selectedBox) return;
    const lines = (selectedBox.text || '').split(/\n/).map(stripListPrefix);
    const text = lines.map((line, i) => line.trim() ? `${numbered ? `${i + 1}.` : '•'} ${line}` : '').join('\n');
    patchBox(selected.page, selected.id, { text });
  };

  const downloadOriginal = () => source && saveBlob(source.blob, source.name || 'resume');

  const downloadEdited = async () => {
    if (!source || !editCount || downloading) return;
    setDownloading(true); setError('');
    try {
      const html = pages.map((page) => {
        const overlays = page.boxes.filter((box) => box.changed || box.custom).map((box) => {
          const fontMm = clamp(box.fontSize * 2.1, 1.3, 20);
          return `<div style="position:absolute;left:${box.x}%;top:${box.y}%;width:${box.w}%;min-height:${box.h}%;box-sizing:border-box;padding:0 .15mm;background:${box.background};color:${box.color};font-family:${box.fontFamily};font-size:${fontMm}mm;font-weight:${box.bold ? 700 : 400};font-style:${box.italic ? 'italic' : 'normal'};text-decoration:${box.underline ? 'underline' : 'none'};text-align:${box.align};line-height:${box.lineHeight};white-space:pre-wrap;overflow:visible;">${escapeHtml(box.text)}</div>`;
        }).join('');
        return `<section class="sheet premium-print-page"><img alt="" src="${page.image}"/>${overlays}</section>`;
      }).join('');
      if (html.length > 2_900_000) throw new Error('This edited resume is too large for a safe export. Try fewer pages or fewer edits.');
      const css = `@page{size:A4;margin:0}*{box-sizing:border-box}html,body,.print-root{margin:0;padding:0;background:#fff}.premium-print-page{position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always}.premium-print-page:last-child{page-break-after:auto}.premium-print-page>img{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;display:block}`;
      const title = `edited-${source.name.replace(/\.[^.]+$/, '') || 'resume'}`;
      const response = await fetch('/api/pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, css, title }),
      });
      if (!response.ok) throw new Error(await response.text() || 'Could not generate the edited PDF.');
      saveBlob(await response.blob(), `${title}.pdf`);
    } catch (e: any) {
      setError(e?.message || 'Could not generate the edited PDF.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <div className="premium-pdf-loading card pad"><div className="premium-loader">PDF</div><b>Opening the original resume…</b><span>Keeping the real design, photo, spacing and graphics.</span></div>;
  }

  if (!source || !pages.length) {
    return (
      <div className="premium-pdf-loading card pad">
        <h3>Open the real source file</h3>
        <p className="hint">{error}</p>
        <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={() => navigate('/import')}>Re-upload</button>
          <button className="btn" onClick={onOpenGuided}>Structured editor</button>
        </div>
      </div>
    );
  }

  const currentPt = pointSize(selectedBox);
  const pageWidth = mobile ? `${Math.round(100 * zoom)}%` : `${Math.round(820 * zoom)}px`;

  return (
    <div className="premium-pdf-root">
      <header className="premium-pdf-head no-print">
        <div className="premium-pdf-title">
          <div className="premium-pdf-kicker">Premium source-preserving editor</div>
          <div className="page-title">{source.name}</div>
          <div className="page-sub">{info?.meta?.pages ? `${info.meta.pages} page${info.meta.pages > 1 ? 's' : ''} · ` : ''}original PDF is the canvas · photo and artwork stay locked</div>
        </div>
        <div className="premium-pdf-actions">
          <button className="btn" onClick={downloadOriginal}>Original</button>
          <button className="btn" onClick={onOpenExact}>Exact view</button>
          {editCount > 0 && <button className="btn primary" disabled={downloading} onClick={downloadEdited}>{downloading ? 'Preparing…' : `Download edited (${editCount})`}</button>}
        </div>
      </header>

      <div className="premium-ribbon no-print" role="toolbar" aria-label="PDF text formatting">
        <div className="premium-tool-group">
          <button className="premium-tool" disabled={!undoRef.current.length} onClick={undo} title="Undo">↶</button>
          <button className="premium-tool" disabled={!redoRef.current.length} onClick={redo} title="Redo">↷</button>
        </div>
        <div className="premium-tool-group premium-font-tools">
          <select className="premium-select premium-font-select" disabled={!selectedBox} value={selectedBox?.fontFamily || 'Arial, sans-serif'} onChange={(e) => selected && patchBox(selected.page, selected.id, { fontFamily: e.target.value })} aria-label="Font family">
            <option value="Arial, sans-serif">Arial</option>
            <option value="Calibri, Arial, sans-serif">Calibri</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="'Segoe UI', Arial, sans-serif">Segoe UI</option>
          </select>
          <input className="premium-size-input" disabled={!selectedBox} type="number" min={6} max={72} value={currentPt} onChange={(e) => selected && patchBox(selected.page, selected.id, { fontSize: clamp(Number(e.target.value || 11) / 5.95, 0.55, 9) })} aria-label="Font size in points" />
        </div>
        <div className="premium-tool-group">
          <button className={`premium-tool ${selectedBox?.bold ? 'on' : ''}`} disabled={!selectedBox} onClick={() => selected && selectedBox && patchBox(selected.page, selected.id, { bold: !selectedBox.bold })}><b>B</b></button>
          <button className={`premium-tool ${selectedBox?.italic ? 'on' : ''}`} disabled={!selectedBox} onClick={() => selected && selectedBox && patchBox(selected.page, selected.id, { italic: !selectedBox.italic })}><i>I</i></button>
          <button className={`premium-tool ${selectedBox?.underline ? 'on' : ''}`} disabled={!selectedBox} onClick={() => selected && selectedBox && patchBox(selected.page, selected.id, { underline: !selectedBox.underline })}><u>U</u></button>
          <label className={`premium-color ${selectedBox ? '' : 'disabled'}`} title="Text color"><span>A</span><input disabled={!selectedBox} type="color" value={selectedBox?.color || '#111827'} onChange={(e) => selected && patchBox(selected.page, selected.id, { color: e.target.value })} /></label>
        </div>
        <div className="premium-tool-group">
          <button className={`premium-tool ${selectedBox?.align === 'left' ? 'on' : ''}`} disabled={!selectedBox} onClick={() => selected && patchBox(selected.page, selected.id, { align: 'left' })} title="Align left">≡</button>
          <button className={`premium-tool ${selectedBox?.align === 'center' ? 'on' : ''}`} disabled={!selectedBox} onClick={() => selected && patchBox(selected.page, selected.id, { align: 'center' })} title="Align center">≣</button>
          <button className={`premium-tool ${selectedBox?.align === 'right' ? 'on' : ''}`} disabled={!selectedBox} onClick={() => selected && patchBox(selected.page, selected.id, { align: 'right' })} title="Align right">≡→</button>
          <select className="premium-select premium-line-select" disabled={!selectedBox} value={selectedBox?.lineHeight || 1.08} onChange={(e) => selected && patchBox(selected.page, selected.id, { lineHeight: Number(e.target.value) })} aria-label="Line spacing">
            <option value="1.0">1.0</option><option value="1.08">1.08</option><option value="1.15">1.15</option><option value="1.3">1.3</option><option value="1.5">1.5</option>
          </select>
        </div>
        <div className="premium-tool-group">
          <button className="premium-tool premium-tool-wide" disabled={!selectedBox} onClick={() => applyList(false)}>• List</button>
          <button className="premium-tool premium-tool-wide" disabled={!selectedBox} onClick={() => applyList(true)}>1. List</button>
        </div>
        <div className="premium-tool-group">
          <button className="premium-tool premium-tool-wide" onClick={addText}>＋ Text</button>
          <button className="premium-tool" disabled={!selectedBox} onClick={clearSelected} title="Clear selected text">⌫</button>
        </div>
        <div className="premium-tool-group premium-zoom-group">
          <button className="premium-tool" onClick={() => setZoom((z) => clamp(Number((z - 0.1).toFixed(2)), 0.7, 1.5))}>−</button>
          <span className="premium-zoom-label">{Math.round(zoom * 100)}%</span>
          <button className="premium-tool" onClick={() => setZoom((z) => clamp(Number((z + 0.1).toFixed(2)), 0.7, 1.5))}>＋</button>
        </div>
      </div>

      <div className="premium-help no-print"><b>How to edit:</b> click text on the real PDF → type in the editor panel → format it from the ribbon. The underlying photo, columns, shapes and spacing are never rebuilt.</div>
      {error && <div className="notice err no-print premium-error">{error}</div>}
      {!pages.some((page) => page.boxes.length) && <div className="notice no-print premium-error">This file is image-only. The visual stays intact; use ＋ Text for overlays or Structured editor for OCR-based field editing.</div>}

      <div className={`premium-workspace ${selectedBox ? 'has-selection' : ''}`}>
        <main className="premium-pages-scroll" aria-label="Uploaded resume pages">
          <div className="premium-pages">
            {pages.map((page, pageIndex) => (
              <section className="premium-page-wrap" style={{ width: pageWidth }} key={page.id}>
                <div className="premium-page" style={{ aspectRatio: `${page.width}/${page.height}` }}>
                  <img src={page.image} alt={`Original resume page ${pageIndex + 1}`} draggable={false} />
                  {page.boxes.filter((box) => box.changed || box.custom).map((box) => (
                    <div key={`replacement-${box.id}`} className="premium-replacement" style={{
                      left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, minHeight: `${box.h}%`,
                      fontSize: `clamp(6px, ${box.fontSize}cqw, 52px)`, fontFamily: box.fontFamily,
                      background: box.background, color: box.color, fontWeight: box.bold ? 700 : 400,
                      fontStyle: box.italic ? 'italic' : 'normal', textDecoration: box.underline ? 'underline' : 'none',
                      textAlign: box.align, lineHeight: box.lineHeight,
                    }}>{box.text}</div>
                  ))}
                  {page.boxes.map((box) => {
                    const active = selected?.page === pageIndex && selected.id === box.id;
                    return <button key={`hit-${box.id}`} type="button" className={`premium-hit ${active ? 'active' : ''} ${box.changed || box.custom ? 'changed' : ''}`}
                      aria-label={`Edit text: ${box.original || box.text || 'new text'}`} title={box.original || box.text || 'Edit text'}
                      onClick={() => setSelected({ page: pageIndex, id: box.id })}
                      style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${Math.max(box.w, mobile ? 3 : 1.4)}%`, height: `${Math.max(box.h, mobile ? 2.3 : 1.4)}%` }} />;
                  })}
                </div>
                <div className="premium-page-label no-print">Page {pageIndex + 1}</div>
              </section>
            ))}
          </div>
        </main>

        <aside className={`premium-inspector no-print ${selectedBox ? 'open' : ''}`} aria-label="Selected text editor">
          {selectedBox && selected ? (
            <>
              <div className="premium-inspector-head"><div><span>Selected text</span><b>{selectedBox.custom ? 'New text block' : 'Edit on the original PDF'}</b></div><button aria-label="Close editor" onClick={() => setSelected(null)}>×</button></div>
              {!mobile && !selectedBox.custom && <div className="premium-original"><span>Original</span><div>{selectedBox.original}</div></div>}
              <label className="f" htmlFor="premium-edit-text">Text</label>
              <textarea id="premium-edit-text" className="textarea premium-textarea" value={selectedBox.text} onChange={(e) => patchBox(selected.page, selected.id, { text: e.target.value })} />
              <div className="premium-inspector-grid">
                <label><span>Font</span><select value={selectedBox.fontFamily} onChange={(e) => patchBox(selected.page, selected.id, { fontFamily: e.target.value })}><option value="Arial, sans-serif">Arial</option><option value="Calibri, Arial, sans-serif">Calibri</option><option value="Georgia, serif">Georgia</option><option value="'Times New Roman', serif">Times New Roman</option><option value="'Segoe UI', Arial, sans-serif">Segoe UI</option></select></label>
                <label><span>Size</span><input type="number" min={6} max={72} value={currentPt} onChange={(e) => patchBox(selected.page, selected.id, { fontSize: clamp(Number(e.target.value || 11) / 5.95, 0.55, 9) })} /></label>
                <label><span>Text color</span><input className="premium-inspector-color" type="color" value={selectedBox.color} onChange={(e) => patchBox(selected.page, selected.id, { color: e.target.value })} /></label>
                <label><span>Spacing</span><select value={selectedBox.lineHeight} onChange={(e) => patchBox(selected.page, selected.id, { lineHeight: Number(e.target.value) })}><option value="1">1.0</option><option value="1.08">1.08</option><option value="1.15">1.15</option><option value="1.3">1.3</option><option value="1.5">1.5</option></select></label>
              </div>
              {selectedBox.custom && <div className="premium-position-grid"><label>X<input type="number" min={0} max={95} step={0.5} value={Number(selectedBox.x.toFixed(1))} onChange={(e) => patchBox(selected.page, selected.id, { x: clamp(Number(e.target.value), 0, 95) })} /></label><label>Y<input type="number" min={0} max={95} step={0.5} value={Number(selectedBox.y.toFixed(1))} onChange={(e) => patchBox(selected.page, selected.id, { y: clamp(Number(e.target.value), 0, 95) })} /></label><label>Width<input type="number" min={5} max={95} step={1} value={Number(selectedBox.w.toFixed(0))} onChange={(e) => patchBox(selected.page, selected.id, { w: clamp(Number(e.target.value), 5, 95) })} /></label></div>}
              <div className="premium-inspector-actions"><button className="btn" onClick={restoreSelected}>{selectedBox.custom ? 'Delete block' : 'Restore original'}</button><button className="btn" onClick={clearSelected}>Clear text</button><span>{selectedBox.changed ? 'Saved locally ✓' : 'Original'}</span></div>
            </>
          ) : (
            <div className="premium-empty"><div>✎</div><h3>Select text on the page</h3><p>The PDF stays exactly where it is. Only the text you change is replaced.</p><button className="btn primary" onClick={addText}>＋ Add text</button>{editCount > 0 && <button className="btn" onClick={resetAll}>Reset all edits</button>}</div>
          )}
        </aside>
      </div>

      <style>{`
        .premium-pdf-root{max-width:1440px;margin:0 auto;min-width:0}.premium-pdf-loading{max-width:640px;margin:36px auto;display:grid;gap:9px;place-items:center;text-align:center}.premium-loader{width:54px;height:54px;border-radius:15px;display:grid;place-items:center;background:linear-gradient(145deg,#0f2148,#28528f);color:#fff;font-weight:900;font-size:12px;box-shadow:0 12px 26px rgba(15,33,72,.22)}
        .premium-pdf-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:10px}.premium-pdf-title{min-width:0}.premium-pdf-kicker{font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;font-weight:900;color:#315786;margin-bottom:2px}.premium-pdf-title .page-title{font-size:19px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:720px}.premium-pdf-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}
        .premium-ribbon{position:sticky;top:0;z-index:55;display:flex;align-items:center;gap:7px;padding:8px;margin-bottom:9px;border:1px solid #dfe5ee;border-radius:12px;background:rgba(255,255,255,.97);backdrop-filter:blur(14px);box-shadow:0 8px 28px rgba(15,33,72,.1);overflow-x:auto;scrollbar-width:thin}.premium-tool-group{display:flex;align-items:center;gap:3px;padding-right:7px;border-right:1px solid #e5eaf1;flex:0 0 auto}.premium-tool-group:last-child{border-right:0;padding-right:0}.premium-tool{height:32px;min-width:32px;border:1px solid transparent;border-radius:7px;background:transparent;color:#263b5c;font:inherit;font-size:12px;font-weight:800;cursor:pointer;padding:0 8px}.premium-tool:hover:not(:disabled){background:#f0f4fa;border-color:#d8e0ec}.premium-tool.on{background:#e7eef9;border-color:#bfcfe5;color:#0f3a73}.premium-tool:disabled{opacity:.32;cursor:not-allowed}.premium-tool-wide{min-width:auto}.premium-select,.premium-size-input{height:32px;border:1px solid #d7dfea;border-radius:7px;background:#fff;color:#23344e;font:inherit;font-size:12px;padding:0 7px}.premium-font-select{width:132px}.premium-size-input{width:56px;text-align:center}.premium-line-select{width:65px}.premium-color{height:32px;min-width:36px;border:1px solid transparent;border-radius:7px;display:flex;align-items:center;justify-content:center;position:relative;font-weight:900;color:#263b5c}.premium-color input{position:absolute;inset:0;opacity:0;cursor:pointer}.premium-color span{border-bottom:3px solid currentColor;line-height:18px}.premium-color.disabled{opacity:.32}.premium-zoom-label{font-size:11px;font-weight:800;min-width:40px;text-align:center;color:#4b5f79}
        .premium-help{margin-bottom:11px;padding:9px 12px;border-radius:9px;border:1px solid #e1e7ef;background:#f8fafc;color:#526278;font-size:12px}.premium-error{margin-bottom:10px}.premium-workspace{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:17px;align-items:start}.premium-pages-scroll{min-width:0;overflow:auto;padding:3px 4px 22px}.premium-pages{display:grid;gap:22px;justify-items:center;min-width:max-content;width:100%}.premium-page-wrap{max-width:none;transition:width .15s ease}.premium-page{position:relative;width:100%;overflow:hidden;background:#fff;border:1px solid rgba(15,33,72,.13);box-shadow:0 17px 52px rgba(15,33,72,.16);container-type:inline-size}.premium-page>img{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;display:block;pointer-events:none;user-select:none}.premium-page-label{text-align:center;margin-top:6px;font-size:11px;color:#6c788a}.premium-hit{position:absolute;z-index:5;border:1px solid transparent;background:transparent;padding:0;border-radius:2px;cursor:text;min-width:6px;min-height:7px}.premium-hit:hover{border-color:rgba(37,99,235,.48);background:rgba(37,99,235,.04)}.premium-hit.active{border-color:#2563eb;background:rgba(37,99,235,.05);box-shadow:0 0 0 2px rgba(37,99,235,.15)}.premium-hit.changed{border-color:rgba(5,150,105,.38)}.premium-replacement{position:absolute;z-index:4;box-sizing:border-box;padding:0 1px;margin:0;white-space:pre-wrap;overflow:visible;pointer-events:none}
        .premium-inspector{position:sticky;top:58px;min-height:285px;padding:15px;border:1px solid #dde4ed;border-radius:14px;background:#fff;box-shadow:0 13px 38px rgba(15,33,72,.1)}.premium-inspector-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:10px}.premium-inspector-head>div{display:grid;gap:2px}.premium-inspector-head span{font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:900;color:#58708f}.premium-inspector-head b{font-size:14px;color:#172e50}.premium-inspector-head button{border:0;width:31px;height:31px;border-radius:50%;background:#f0f3f7;color:#314866;font-size:21px;cursor:pointer}.premium-original{padding:8px 9px;border:1px solid #e3e8ef;border-radius:8px;background:#fafbfd;margin-bottom:10px}.premium-original span{display:block;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.07em;color:#748197;margin-bottom:2px}.premium-original div{font-size:11.5px;color:#364a66;max-height:54px;overflow:auto}.premium-textarea{min-height:110px;resize:vertical;font-size:14px;line-height:1.4}.premium-inspector-grid{display:grid;grid-template-columns:1fr 82px;gap:8px;margin-top:10px}.premium-inspector-grid label,.premium-position-grid label{display:grid;gap:4px;font-size:10px;font-weight:800;color:#5b6d83}.premium-inspector-grid select,.premium-inspector-grid input,.premium-position-grid input{width:100%;height:34px;border:1px solid #d8e0ea;border-radius:7px;background:#fff;color:#1f334f;padding:0 7px;font:inherit;font-size:12px}.premium-inspector-color{padding:3px!important}.premium-position-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-top:9px}.premium-inspector-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:13px;padding-top:11px;border-top:1px solid #e4e9f0}.premium-inspector-actions span{margin-left:auto;font-size:10.5px;font-weight:800;color:#16805f}.premium-empty{text-align:center;padding:28px 8px;display:grid;gap:8px;justify-items:center}.premium-empty>div{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#edf3fb;color:#235aa1;font-size:21px}.premium-empty h3{margin:0;color:#172e50;font-size:16px}.premium-empty p{margin:0 0 4px;color:#68768a;font-size:12px;line-height:1.5;max-width:240px}
        @media(max-width:1000px){.premium-workspace{grid-template-columns:minmax(0,1fr) 292px;gap:11px}.premium-inspector{padding:12px}.premium-font-select{width:116px}}
        @media(max-width:760px){.premium-pdf-root{margin:0 -5px;overflow:visible}.premium-pdf-head{display:block;padding:0 7px}.premium-pdf-title .page-title{font-size:16px;max-width:90vw}.premium-pdf-actions{margin-top:8px;justify-content:flex-start;overflow-x:auto;flex-wrap:nowrap;padding-bottom:2px}.premium-pdf-actions .btn{flex:0 0 auto}.premium-ribbon{top:calc(56px + var(--safe-top));margin:0 -5px 8px;border-radius:0;padding:7px 8px;box-shadow:0 5px 18px rgba(15,33,72,.11)}.premium-tool{height:34px;min-width:34px}.premium-help{margin:0 7px 8px;font-size:11px}.premium-error{margin:0 7px 8px}.premium-workspace{display:block}.premium-pages-scroll{padding:3px 7px 48dvh;overflow-x:auto;overscroll-behavior-x:contain}.premium-pages{display:grid;min-width:100%;justify-items:start;gap:14px}.premium-page-wrap{min-width:calc(100vw - 28px)}.premium-page{box-shadow:0 8px 26px rgba(15,33,72,.13)}.premium-hit{min-width:20px!important;min-height:20px!important}.premium-page-label{font-size:10px}.premium-inspector{position:fixed;left:8px;right:8px;bottom:calc(64px + var(--safe-bottom));top:auto;z-index:100;max-height:46dvh;overflow:auto;border-radius:17px 17px 12px 12px;box-shadow:0 -15px 40px rgba(15,33,72,.23);padding:12px}.premium-inspector:not(.open){display:none}.premium-textarea{min-height:78px;max-height:18dvh;resize:none}.premium-inspector-grid{grid-template-columns:minmax(0,1fr) 76px}.premium-position-grid{grid-template-columns:1fr 1fr 1fr}.premium-inspector-actions{position:sticky;bottom:-12px;background:#fff;padding-bottom:2px}.premium-original{display:none}.premium-font-select{width:110px}.premium-size-input{width:50px}.premium-zoom-group{position:sticky;right:0;background:#fff;padding-left:4px}.premium-ribbon::-webkit-scrollbar,.premium-pdf-actions::-webkit-scrollbar{display:none}}
        @media(prefers-reduced-motion:reduce){.premium-page-wrap{transition:none}}
      `}</style>
      <span style={{ display: 'none' }}>{historyTick}</span>
    </div>
  );
}
