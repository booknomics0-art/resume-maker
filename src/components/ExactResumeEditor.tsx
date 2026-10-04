import { useEffect, useMemo, useState } from 'react';
import { importInfoFor } from '../lib/importDraft';
import { claimPendingOriginal, loadOriginalDocument, type OriginalDocumentRecord } from '../lib/originalDocument';
import { navigate } from '../lib/navigation';

type Align = 'left' | 'center' | 'right';
type ViewMode = 'original' | 'edit';

interface TextBox {
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
  originalFontSize: number;
  originalBold: boolean;
  originalItalic: boolean;
  originalUnderline: boolean;
  originalAlign: Align;
  changed: boolean;
  custom?: boolean;
}

interface PageModel {
  id: string;
  image: string;
  width: number;
  height: number;
  boxes: TextBox[];
}

interface SavedEdit {
  page: number;
  id: string;
  text: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: Align;
  custom?: boolean;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  fontFamily?: string;
  background?: string;
  color?: string;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const editKey = (id: string) => `craftcv.exact-editor.v2.${id}`;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read original resume'));
    reader.readAsDataURL(blob);
  });
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
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function parseRgb(value: string): [number, number, number] | null {
  const match = value.match(/rgb\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/i);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function contrastColor(background: string) {
  const rgb = parseRgb(background);
  if (!rgb) return '#111827';
  const [r, g, b] = rgb;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance < 130 ? '#ffffff' : '#111827';
}

/**
 * Estimate the page colour around a text run rather than sampling through the
 * glyph itself. Most resumes use flat white or coloured section bands; this
 * makes replacement text substantially less "sticker-like" than the old
 * corner-only sampler.
 */
function sampleBackground(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const pad = Math.max(2, Math.min(7, h * .35));
  const points: Array<[number, number]> = [
    [x + 2, y - pad], [x + w * .5, y - pad], [x + Math.max(2, w - 2), y - pad],
    [x + 2, y + h + pad], [x + w * .5, y + h + pad], [x + Math.max(2, w - 2), y + h + pad],
    [x - pad, y + h * .5], [x + w + pad, y + h * .5],
  ];
  let r = 0; let g = 0; let b = 0; let count = 0;
  for (const [rawX, rawY] of points) {
    const px = clamp(Math.round(rawX), 0, Math.max(0, ctx.canvas.width - 1));
    const py = clamp(Math.round(rawY), 0, Math.max(0, ctx.canvas.height - 1));
    try {
      const data = ctx.getImageData(px, py, 1, 1).data;
      if (data[3] < 20) continue;
      r += data[0]; g += data[1]; b += data[2]; count++;
    } catch {
      // Local PDF canvas pixels are always same-origin. Keep a safe fallback.
    }
  }
  if (!count) return 'rgb(255,255,255)';
  return `rgb(${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)})`;
}

function hasChanges(box: TextBox) {
  return !!box.custom
    || box.text !== box.original
    || Math.abs(box.fontSize - box.originalFontSize) > .001
    || box.bold !== box.originalBold
    || box.italic !== box.originalItalic
    || box.underline !== box.originalUnderline
    || box.align !== box.originalAlign;
}

function patchWithChangeState(box: TextBox, patch: Partial<TextBox>): TextBox {
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

  for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
    const page = await doc.getPage(pageNo);
    const base = page.getViewport({ scale: 1 });
    // About 145-170 PPI for a normal A4 page: crisp on desktop/mobile while
    // keeping multi-page edited exports comfortably below the PDF API cap.
    const scale = Math.min(2.15, 1700 / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const ctx = canvas.getContext('2d', { willReadFrequently: true } as any) as CanvasRenderingContext2D | null;
    if (!ctx) throw new Error('Canvas is not available in this browser.');
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
      const fontHeight = Math.max(
        6,
        (Number(item.height) || Math.hypot(Number(transform[2]) || 0, Number(transform[3]) || 10)) * scale,
      );
      const y = viewport.height - ((Number(transform[5]) || 0) * scale) - fontHeight;
      const w = Math.max(5, (Number(item.width) || text.length * fontHeight * .46) * scale);
      const h = Math.max(fontHeight * 1.2, 8);
      if (x > viewport.width || y > viewport.height || x + w < 0 || y + h < 0) continue;

      const background = sampleBackground(ctx, x, y, w, h);
      const style = (tc.styles || {})[item.fontName] || {};
      const fontFamily = String(style.fontFamily || 'Arial, sans-serif');
      const inferred = `${String(item.fontName || '')} ${fontFamily}`;
      const bold = /bold|black|semibold|demi/i.test(inferred);
      const italic = /italic|oblique/i.test(inferred);
      const fontSize = clamp(fontHeight / viewport.width * 100, .62, 8);

      boxes.push({
        id: `p${pageNo}-t${index++}`,
        original: text,
        text,
        x: clamp(x / viewport.width * 100, 0, 100),
        y: clamp(y / viewport.height * 100, 0, 100),
        w: clamp(w / viewport.width * 100, .55, 100),
        h: clamp(h / viewport.height * 100, .65, 20),
        fontSize,
        fontFamily,
        background,
        color: contrastColor(background),
        bold,
        italic,
        underline: false,
        align: 'left',
        originalFontSize: fontSize,
        originalBold: bold,
        originalItalic: italic,
        originalUnderline: false,
        originalAlign: 'left',
        changed: false,
      });
    }

    let image = '';
    try {
      image = canvas.toDataURL('image/webp', .93);
      if (!image.startsWith('data:image/webp')) image = canvas.toDataURL('image/jpeg', .95);
    } catch {
      image = canvas.toDataURL('image/jpeg', .95);
    }

    pages.push({ id: `page-${pageNo}`, image, width: canvas.width, height: canvas.height, boxes });
  }
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
    const data = await blobToDataUrl(blob);
    return [{ id: 'page-1', image: data, width: image.naturalWidth || 1000, height: image.naturalHeight || 1400, boxes: [] }];
  } finally {
    URL.revokeObjectURL(url);
  }
}

function isPdf(source: OriginalDocumentRecord) {
  return source.type === 'application/pdf' || source.name.toLowerCase().endsWith('.pdf');
}

function isImage(source: OriginalDocumentRecord) {
  return source.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(source.name);
}

function loadSavedEdits(id: string): SavedEdit[] {
  try {
    const raw = localStorage.getItem(editKey(id));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function applySavedEdits(pages: PageModel[], edits: SavedEdit[]): PageModel[] {
  if (!edits.length) return pages;
  const next = pages.map((page) => ({ ...page, boxes: [...page.boxes] }));
  for (const edit of edits) {
    const page = next[edit.page];
    if (!page) continue;
    if (edit.custom) {
      const box: TextBox = {
        id: edit.id,
        original: '',
        text: edit.text || '',
        x: edit.x ?? 10,
        y: edit.y ?? 10,
        w: edit.w ?? 28,
        h: edit.h ?? 4,
        fontSize: edit.fontSize || 2.1,
        fontFamily: edit.fontFamily || 'Arial, sans-serif',
        background: edit.background || 'rgb(255,255,255)',
        color: edit.color || '#111827',
        bold: !!edit.bold,
        italic: !!edit.italic,
        underline: !!edit.underline,
        align: edit.align || 'left',
        originalFontSize: edit.fontSize || 2.1,
        originalBold: false,
        originalItalic: false,
        originalUnderline: false,
        originalAlign: 'left',
        changed: true,
        custom: true,
      };
      if (!page.boxes.some((b) => b.id === box.id)) page.boxes.push(box);
      continue;
    }
    page.boxes = page.boxes.map((box) => box.id !== edit.id ? box : patchWithChangeState(box, {
      text: edit.text,
      fontSize: edit.fontSize,
      bold: edit.bold,
      italic: edit.italic,
      underline: edit.underline,
      align: edit.align,
    }));
  }
  return next;
}

function serializeEdits(pages: PageModel[]): SavedEdit[] {
  const out: SavedEdit[] = [];
  pages.forEach((page, pageIndex) => {
    page.boxes.filter((box) => box.changed || box.custom).forEach((box) => {
      out.push({
        page: pageIndex,
        id: box.id,
        text: box.text,
        fontSize: box.fontSize,
        bold: box.bold,
        italic: box.italic,
        underline: box.underline,
        align: box.align,
        custom: box.custom,
        ...(box.custom ? {
          x: box.x, y: box.y, w: box.w, h: box.h,
          fontFamily: box.fontFamily, background: box.background, color: box.color,
        } : {}),
      });
    });
  });
  return out;
}

export default function ExactResumeEditor({ id, onOpenGuided }: { id: string; onOpenGuided: () => void }) {
  const [source, setSource] = useState<OriginalDocumentRecord | null>(null);
  const [pages, setPages] = useState<PageModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<ViewMode>('original');
  const [selected, setSelected] = useState<{ page: number; id: string } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const info = useMemo(() => importInfoFor(id), [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setHydrated(false);
      setError('');
      try {
        const original = await loadOriginalDocument(id) || await claimPendingOriginal(id);
        if (cancelled) return;
        setSource(original);
        if (!original) {
          setError('This older import does not have its original file saved. Re-upload it once and Exact Edit will preserve the real layout, photo and graphics.');
          return;
        }

        let rendered: PageModel[] = [];
        if (isPdf(original)) rendered = await renderPdf(original.blob);
        else if (isImage(original)) rendered = await renderImage(original.blob);
        else {
          setError('Exact visual editing is available for PDF and image resumes. Your original file is preserved, but DOCX exact pagination depends on Microsoft Word fonts and rendering. Export the DOCX as PDF and upload that for exact visual editing.');
          return;
        }
        if (cancelled) return;
        setPages(applySavedEdits(rendered, loadSavedEdits(id)));
        setHydrated(true);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Could not open the original resume.');
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
    } catch {
      // Editing still works if browser storage is unavailable.
    }
  }, [hydrated, id, pages]);

  const selectedBox = selected ? pages[selected.page]?.boxes.find((box) => box.id === selected.id) : null;
  const editCount = useMemo(() => pages.reduce((n, page) => n + page.boxes.filter((box) => box.changed || box.custom).length, 0), [pages]);

  const patchBox = (pageIndex: number, boxId: string, patch: Partial<TextBox>) => {
    setPages((prev) => prev.map((page, pi) => pi !== pageIndex ? page : {
      ...page,
      boxes: page.boxes.map((box) => box.id === boxId ? patchWithChangeState(box, patch) : box),
    }));
  };

  const selectBox = (page: number, id2: string) => {
    setSelected({ page, id: id2 });
  };

  const resetSelected = () => {
    if (!selected || !selectedBox) return;
    if (selectedBox.custom) {
      setPages((prev) => prev.map((page, pi) => pi !== selected.page ? page : {
        ...page,
        boxes: page.boxes.filter((box) => box.id !== selected.id),
      }));
      setSelected(null);
      return;
    }
    patchBox(selected.page, selected.id, {
      text: selectedBox.original,
      fontSize: selectedBox.originalFontSize,
      bold: selectedBox.originalBold,
      italic: selectedBox.originalItalic,
      underline: selectedBox.originalUnderline,
      align: selectedBox.originalAlign,
    });
  };

  const addText = () => {
    if (!pages.length) return;
    const pageIndex = selected?.page ?? 0;
    const id2 = `custom-${Date.now().toString(36)}`;
    const box: TextBox = {
      id: id2,
      original: '',
      text: 'New text',
      x: 10,
      y: 10,
      w: 28,
      h: 4,
      fontSize: 2.1,
      fontFamily: 'Arial, sans-serif',
      background: 'rgb(255,255,255)',
      color: '#111827',
      bold: false,
      italic: false,
      underline: false,
      align: 'left',
      originalFontSize: 2.1,
      originalBold: false,
      originalItalic: false,
      originalUnderline: false,
      originalAlign: 'left',
      changed: true,
      custom: true,
    };
    setPages((prev) => prev.map((page, pi) => pi === pageIndex ? { ...page, boxes: [...page.boxes, box] } : page));
    setMode('edit');
    setSelected({ page: pageIndex, id: id2 });
  };

  const clearAllEdits = () => {
    if (!confirm('Discard all Exact Edit changes and return to the untouched uploaded resume?')) return;
    setPages((prev) => prev.map((page) => ({
      ...page,
      boxes: page.boxes
        .filter((box) => !box.custom)
        .map((box) => ({
          ...box,
          text: box.original,
          fontSize: box.originalFontSize,
          bold: box.originalBold,
          italic: box.originalItalic,
          underline: box.originalUnderline,
          align: box.originalAlign,
          changed: false,
        })),
    })));
    setSelected(null);
  };

  const downloadOriginal = () => {
    if (!source) return;
    saveBlob(source.blob, source.name || 'resume');
  };

  const downloadEdited = async () => {
    if (!source || !editCount || downloading) return;
    setDownloading(true);
    setError('');
    try {
      const html = pages.map((page) => {
        const overlays = page.boxes.filter((box) => box.changed || box.custom).map((box) => {
          const fontMm = clamp(box.fontSize * 2.1, 1.3, 20);
          return `<div style="position:absolute;left:${box.x}%;top:${box.y}%;width:${box.w}%;min-height:${box.h}%;box-sizing:border-box;padding:0 .15mm;background:${box.background};color:${box.color};font-family:${box.fontFamily};font-size:${fontMm}mm;font-weight:${box.bold ? 700 : 400};font-style:${box.italic ? 'italic' : 'normal'};text-decoration:${box.underline ? 'underline' : 'none'};text-align:${box.align};line-height:1.06;white-space:pre-wrap;overflow:visible;">${escapeHtml(box.text)}</div>`;
        }).join('');
        return `<section class="sheet exact-print-page"><img alt="" src="${page.image}"/>${overlays}</section>`;
      }).join('');

      if (html.length > 2_900_000) {
        throw new Error('This resume is too large for a safe edited export. Download the untouched original, or edit fewer pages at once.');
      }

      const css = `
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; }
        html, body, .print-root { margin:0; padding:0; background:#fff; }
        .exact-print-page { position:relative; width:210mm; height:297mm; overflow:hidden; page-break-after:always; }
        .exact-print-page:last-child { page-break-after:auto; }
        .exact-print-page > img { position:absolute; inset:0; width:100%; height:100%; object-fit:fill; display:block; }
      `;
      const title = `edited-${source.name.replace(/\.[^.]+$/, '') || 'resume'}`;
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    return (
      <div className="card pad" style={{ maxWidth: 720, margin: '42px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 34, marginBottom: 8 }}>📄</div>
        <h3 style={{ marginBottom: 6 }}>Opening your original resume…</h3>
        <p className="hint">No template conversion. Keeping the uploaded layout, photo, spacing and graphics intact.</p>
      </div>
    );
  }

  if (!source || !pages.length) {
    return (
      <div className="card pad" style={{ maxWidth: 760, margin: '32px auto' }}>
        <h2 style={{ color: 'var(--navy-900)' }}>Open the real source file</h2>
        <p className="hint" style={{ fontSize: 14 }}>{error}</p>
        <div className="row" style={{ marginTop: 16, flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={() => navigate('/import')}>📤 Re-upload resume</button>
          <button className="btn" onClick={onOpenGuided}>Use structured editor</button>
          {source && <button className="btn" onClick={downloadOriginal}>Download original</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="exact2-root">
      <header className="exact2-head no-print">
        <div className="exact2-title-wrap">
          <div className="exact2-kicker">Original resume workspace</div>
          <div className="page-title exact2-title">{source.name}</div>
          <div className="page-sub exact2-sub">
            {info?.meta?.pages ? `${info.meta.pages} page${info.meta.pages > 1 ? 's' : ''} · ` : ''}
            source layout locked · photo &amp; artwork preserved
          </div>
        </div>
        <div className="exact2-head-actions">
          <button className="btn" onClick={() => navigate('/import')}>Upload another</button>
          <button className="btn" onClick={downloadOriginal}>Download original</button>
          {editCount > 0 && (
            <button className="btn primary" onClick={downloadEdited} disabled={downloading}>
              {downloading ? 'Preparing…' : `Download edited PDF (${editCount})`}
            </button>
          )}
        </div>
      </header>

      <div className="exact2-modebar no-print">
        <div className="exact2-segment" role="tablist" aria-label="Resume view mode">
          <button role="tab" aria-selected={mode === 'original'} className={mode === 'original' ? 'active' : ''} onClick={() => { setMode('original'); setSelected(null); }}>
            👁 Original
          </button>
          <button role="tab" aria-selected={mode === 'edit'} className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}>
            ✎ Quick edit
          </button>
        </div>
        <div className="exact2-mode-actions">
          {mode === 'edit' && <button className="btn small" onClick={addText}>＋ Add text</button>}
          {editCount > 0 && <button className="btn small" onClick={clearAllEdits}>Reset all</button>}
          <button className="btn small" onClick={onOpenGuided}>Structured editor</button>
        </div>
      </div>

      {mode === 'original' && (
        <div className="exact2-note no-print">
          <b>Untouched view.</b> This is the uploaded document itself — not a CraftCV template recreation. Switch to Quick edit only when you need to change text.
        </div>
      )}

      {mode === 'edit' && !pages.some((page) => page.boxes.length) && (
        <div className="notice no-print" style={{ marginBottom: 14 }}>
          This file is image-only, so it has no selectable PDF text layer. The original visual is still preserved. You can add text overlays here, or use Structured editor for OCR-based field editing.
        </div>
      )}

      {error && <div className="notice err no-print" style={{ marginBottom: 14 }}>{error}</div>}

      <div className={`exact2-workspace ${mode === 'edit' ? 'editing' : 'viewing'}`}>
        <main className="exact2-pages" aria-label="Resume pages">
          {pages.map((page, pageIndex) => (
            <section key={page.id} className="exact2-page-wrap">
              <div className="exact2-page" style={{ aspectRatio: `${page.width} / ${page.height}` }}>
                <img src={page.image} alt={`Original resume page ${pageIndex + 1}`} draggable={false} />

                {page.boxes.filter((box) => box.changed || box.custom).map((box) => (
                  <div
                    key={`replacement-${box.id}`}
                    className="exact2-replacement"
                    style={{
                      left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, minHeight: `${box.h}%`,
                      fontSize: `clamp(6px, ${box.fontSize}cqw, 50px)`, fontFamily: box.fontFamily,
                      background: box.background, color: box.color,
                      fontWeight: box.bold ? 700 : 400, fontStyle: box.italic ? 'italic' : 'normal',
                      textDecoration: box.underline ? 'underline' : 'none', textAlign: box.align,
                    }}
                  >
                    {box.text}
                  </div>
                ))}

                {mode === 'edit' && page.boxes.map((box) => {
                  const active = selected?.page === pageIndex && selected.id === box.id;
                  return (
                    <button
                      key={`hit-${box.id}`}
                      type="button"
                      className={`exact2-hit ${active ? 'active' : ''} ${box.changed || box.custom ? 'changed' : ''}`}
                      aria-label={`Edit text: ${box.original || box.text || 'new text'}`}
                      title={box.original || box.text || 'Edit text'}
                      onClick={() => selectBox(pageIndex, box.id)}
                      style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${Math.max(box.w, 1.3)}%`, height: `${Math.max(box.h, 1.4)}%` }}
                    />
                  );
                })}
              </div>
              <div className="exact2-page-label no-print">Page {pageIndex + 1}</div>
            </section>
          ))}
        </main>

        {mode === 'edit' && (
          <aside className="exact2-inspector no-print" aria-label="Quick edit controls">
            {selectedBox && selected ? (
              <>
                <div className="exact2-inspector-head">
                  <div>
                    <div className="exact2-kicker">Selected text</div>
                    <b>{selectedBox.custom ? 'New text block' : 'Edit only this text'}</b>
                  </div>
                  <button className="exact2-close" aria-label="Close text editor" onClick={() => setSelected(null)}>×</button>
                </div>

                {!selectedBox.custom && (
                  <div className="exact2-original-copy" title={selectedBox.original}>
                    <span>Original</span>
                    <div>{selectedBox.original}</div>
                  </div>
                )}

                <label className="f" htmlFor="exact-edit-text">Text</label>
                <textarea
                  id="exact-edit-text"
                  className="textarea exact2-textarea"
                  value={selectedBox.text}
                  autoFocus
                  onChange={(e) => patchBox(selected.page, selected.id, { text: e.target.value })}
                />

                <div className="exact2-format-row">
                  <button className={`btn small ${selectedBox.bold ? 'primary' : ''}`} onClick={() => patchBox(selected.page, selected.id, { bold: !selectedBox.bold })}><b>B</b></button>
                  <button className={`btn small ${selectedBox.italic ? 'primary' : ''}`} onClick={() => patchBox(selected.page, selected.id, { italic: !selectedBox.italic })}><i>I</i></button>
                  <button className={`btn small ${selectedBox.underline ? 'primary' : ''}`} onClick={() => patchBox(selected.page, selected.id, { underline: !selectedBox.underline })}><u>U</u></button>
                  <span className="exact2-divider" />
                  <button className="btn small" aria-label="Decrease font size" onClick={() => patchBox(selected.page, selected.id, { fontSize: clamp(selectedBox.fontSize * .94, .55, 9) })}>A−</button>
                  <button className="btn small" aria-label="Increase font size" onClick={() => patchBox(selected.page, selected.id, { fontSize: clamp(selectedBox.fontSize * 1.06, .55, 9) })}>A＋</button>
                </div>

                <div className="exact2-format-row">
                  <button className={`btn small ${selectedBox.align === 'left' ? 'primary' : ''}`} onClick={() => patchBox(selected.page, selected.id, { align: 'left' })}>Left</button>
                  <button className={`btn small ${selectedBox.align === 'center' ? 'primary' : ''}`} onClick={() => patchBox(selected.page, selected.id, { align: 'center' })}>Center</button>
                  <button className={`btn small ${selectedBox.align === 'right' ? 'primary' : ''}`} onClick={() => patchBox(selected.page, selected.id, { align: 'right' })}>Right</button>
                </div>

                <div className="exact2-inspector-foot">
                  <button className="btn" onClick={resetSelected}>{selectedBox.custom ? 'Delete block' : 'Restore original'}</button>
                  {selectedBox.changed && <span className="exact2-saved">Saved locally ✓</span>}
                </div>
              </>
            ) : (
              <div className="exact2-empty-inspector">
                <div className="exact2-empty-icon">✎</div>
                <h3>Click the text you want to change</h3>
                <p>Nothing moves until you edit it. The page, photo and graphics stay locked underneath.</p>
                <button className="btn" onClick={addText}>＋ Add a new text block</button>
                {editCount > 0 && <div className="exact2-edit-count">{editCount} saved change{editCount === 1 ? '' : 's'}</div>}
              </div>
            )}
          </aside>
        )}
      </div>

      <style>{`
        .exact2-root { max-width: 1260px; margin: 0 auto; }
        .exact2-head { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; margin-bottom:12px; }
        .exact2-title-wrap { min-width:0; }
        .exact2-kicker { color:var(--navy-500, #365486); font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; margin-bottom:3px; }
        .exact2-title { font-size:20px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:680px; }
        .exact2-sub { margin-top:3px; }
        .exact2-head-actions, .exact2-mode-actions { display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
        .exact2-modebar { position:sticky; top:0; z-index:45; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:9px 10px; margin-bottom:12px; border:1px solid var(--silver-200); border-radius:12px; background:rgba(255,255,255,.96); backdrop-filter:blur(10px); box-shadow:0 5px 20px rgba(15,33,72,.08); }
        .exact2-segment { display:inline-flex; padding:3px; background:var(--silver-100, #f2f4f7); border-radius:9px; gap:2px; }
        .exact2-segment button { border:0; background:transparent; color:var(--navy-700); padding:8px 13px; border-radius:7px; font-weight:800; cursor:pointer; }
        .exact2-segment button.active { background:#fff; color:var(--navy-900); box-shadow:0 1px 5px rgba(15,33,72,.13); }
        .exact2-note { margin-bottom:14px; padding:10px 13px; border-radius:10px; background:#f8fafc; border:1px solid var(--silver-200); color:#42526b; font-size:13px; }
        .exact2-workspace.editing { display:grid; grid-template-columns:minmax(0, 1fr) 330px; gap:18px; align-items:start; }
        .exact2-pages { display:grid; gap:22px; justify-items:center; min-width:0; }
        .exact2-page-wrap { width:min(100%, 900px); }
        .exact2-page { position:relative; width:100%; overflow:hidden; background:#fff; box-shadow:0 16px 46px rgba(10,22,48,.14); border:1px solid rgba(15,33,72,.12); container-type:inline-size; }
        .exact2-page > img { position:absolute; inset:0; width:100%; height:100%; object-fit:fill; display:block; pointer-events:none; user-select:none; }
        .exact2-page-label { text-align:center; margin-top:7px; font-size:11.5px; color:var(--silver-600, #6b7280); }
        .exact2-hit { position:absolute; z-index:4; border:1px solid transparent; background:transparent; border-radius:2px; cursor:text; padding:0; min-width:5px; min-height:6px; transition:border-color .12s ease, box-shadow .12s ease, background .12s ease; }
        .exact2-hit:hover { border-color:rgba(37,99,235,.48); background:rgba(37,99,235,.035); }
        .exact2-hit.active { border-color:#2563eb; box-shadow:0 0 0 2px rgba(37,99,235,.16); background:rgba(37,99,235,.04); }
        .exact2-hit.changed { border-color:rgba(5,150,105,.35); }
        .exact2-hit.changed.active { border-color:#2563eb; }
        .exact2-replacement { position:absolute; z-index:3; box-sizing:border-box; padding:0 1px; margin:0; line-height:1.06; white-space:pre-wrap; overflow:visible; pointer-events:none; }
        .exact2-inspector { position:sticky; top:72px; padding:16px; border:1px solid var(--silver-200); border-radius:14px; background:#fff; box-shadow:0 12px 34px rgba(15,33,72,.09); min-height:260px; }
        .exact2-inspector-head { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; margin-bottom:12px; }
        .exact2-close { border:0; background:var(--silver-100); color:var(--navy-700); width:30px; height:30px; border-radius:50%; font-size:22px; line-height:1; cursor:pointer; }
        .exact2-original-copy { padding:9px 10px; margin-bottom:12px; border:1px solid var(--silver-200); border-radius:9px; background:#fafbfc; }
        .exact2-original-copy span { display:block; font-size:10px; text-transform:uppercase; letter-spacing:.06em; font-weight:800; color:var(--silver-600); margin-bottom:3px; }
        .exact2-original-copy div { font-size:12px; color:var(--navy-700); max-height:62px; overflow:auto; }
        .exact2-textarea { min-height:105px; resize:vertical; font-size:14px; line-height:1.45; }
        .exact2-format-row { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:10px; }
        .exact2-divider { width:1px; height:24px; background:var(--silver-200); margin:0 2px; }
        .exact2-inspector-foot { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:16px; padding-top:13px; border-top:1px solid var(--silver-200); }
        .exact2-saved { color:#047857; font-size:11.5px; font-weight:700; }
        .exact2-empty-inspector { text-align:center; padding:24px 8px; }
        .exact2-empty-icon { width:48px; height:48px; display:grid; place-items:center; border-radius:50%; background:#eef4ff; color:#1d4ed8; font-size:22px; margin:0 auto 12px; }
        .exact2-empty-inspector h3 { margin:0 0 6px; color:var(--navy-900); font-size:16px; }
        .exact2-empty-inspector p { margin:0 auto 14px; color:var(--silver-600); font-size:12.5px; line-height:1.55; max-width:250px; }
        .exact2-edit-count { margin-top:13px; color:#047857; font-size:12px; font-weight:800; }
        @media (max-width: 920px) {
          .exact2-workspace.editing { grid-template-columns:minmax(0,1fr) 290px; gap:12px; }
          .exact2-inspector { padding:13px; }
        }
        @media (max-width: 760px) {
          .exact2-root { margin:0 -4px; }
          .exact2-head { flex-direction:column; gap:10px; }
          .exact2-title { max-width:92vw; font-size:18px; }
          .exact2-head-actions { width:100%; justify-content:flex-start; overflow-x:auto; flex-wrap:nowrap; padding-bottom:2px; }
          .exact2-head-actions .btn { flex:0 0 auto; }
          .exact2-modebar { top:0; padding:7px; border-radius:10px; align-items:center; }
          .exact2-mode-actions { overflow-x:auto; flex-wrap:nowrap; justify-content:flex-end; }
          .exact2-mode-actions .btn { flex:0 0 auto; }
          .exact2-segment button { padding:7px 10px; font-size:12.5px; }
          .exact2-workspace.editing { display:block; }
          .exact2-pages { gap:16px; padding-bottom:230px; }
          .exact2-page-wrap { width:100%; }
          .exact2-inspector { position:fixed; left:8px; right:8px; bottom:calc(66px + env(safe-area-inset-bottom)); top:auto; z-index:90; max-height:42vh; overflow:auto; border-radius:16px 16px 12px 12px; box-shadow:0 -14px 40px rgba(15,33,72,.18); }
          .exact2-empty-inspector { padding:12px 6px; }
          .exact2-empty-icon { display:none; }
          .exact2-empty-inspector p { margin-bottom:9px; }
          .exact2-original-copy { display:none; }
          .exact2-textarea { min-height:78px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .exact2-hit { transition:none; }
        }
      `}</style>
    </div>
  );
}
