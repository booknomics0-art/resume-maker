import { useEffect, useMemo, useState } from 'react';
import { importInfoFor } from '../lib/importDraft';
import { claimPendingOriginal, loadOriginalDocument, type OriginalDocumentRecord } from '../lib/originalDocument';
import { navigate } from '../lib/navigation';

type Align = 'left' | 'center' | 'right';
type Mode = 'view' | 'edit';

interface TextBox {
  id: string;
  original: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
  originalFontSize: number;
  fontFamily: string;
  background: string;
  color: string;
  bold: boolean;
  originalBold: boolean;
  italic: boolean;
  originalItalic: boolean;
  underline: boolean;
  align: Align;
  changed: boolean;
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

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read original resume'));
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
  const pts = [
    [x + 2, y - 3], [x + w / 2, y - 3], [x + Math.max(2, w - 2), y - 3],
    [x + 2, y + h + 3], [x + w / 2, y + h + 3], [x + Math.max(2, w - 2), y + h + 3],
  ];
  let r = 0; let g = 0; let b = 0; let count = 0;
  for (const [rawX, rawY] of pts) {
    const px = clamp(Math.round(rawX), 0, Math.max(0, ctx.canvas.width - 1));
    const py = clamp(Math.round(rawY), 0, Math.max(0, ctx.canvas.height - 1));
    try {
      const data = ctx.getImageData(px, py, 1, 1).data;
      if (data[3] < 20) continue;
      r += data[0]; g += data[1]; b += data[2]; count++;
    } catch { /* local canvas */ }
  }
  if (!count) return 'rgb(255,255,255)';
  return `rgb(${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)})`;
}

function textColor(background: string) {
  const m = background.match(/rgb\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/i);
  if (!m) return '#111827';
  const lum = .299 * Number(m[1]) + .587 * Number(m[2]) + .114 * Number(m[3]);
  return lum < 130 ? '#fff' : '#111827';
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
    // Mobile is intentionally lighter than desktop. 1050px is already sharper
    // than the physical phone viewport and avoids multi-page canvas memory spikes.
    const scale = Math.min(1.45, 1050 / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const ctx = canvas.getContext('2d', { willReadFrequently: true } as any) as CanvasRenderingContext2D | null;
    if (!ctx) throw new Error('Canvas is unavailable on this phone.');
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
      const w = Math.max(6, (Number(item.width) || text.length * fontHeight * .46) * scale);
      const h = Math.max(10, fontHeight * 1.25);
      if (x > viewport.width || y > viewport.height || x + w < 0 || y + h < 0) continue;
      const style = (tc.styles || {})[item.fontName] || {};
      const family = String(style.fontFamily || 'Arial, sans-serif');
      const inferred = `${String(item.fontName || '')} ${family}`;
      const background = sampleBackground(ctx, x, y, w, h);
      const fontSize = clamp(fontHeight / viewport.width * 100, .62, 8);
      const bold = /bold|black|semibold|demi/i.test(inferred);
      const italic = /italic|oblique/i.test(inferred);
      boxes.push({
        id: `p${pageNo}-t${index++}`,
        original: text,
        text,
        x: clamp(x / viewport.width * 100, 0, 100),
        y: clamp(y / viewport.height * 100, 0, 100),
        w: clamp(w / viewport.width * 100, .8, 100),
        h: clamp(h / viewport.height * 100, 1, 20),
        fontSize,
        originalFontSize: fontSize,
        fontFamily: family,
        background,
        color: textColor(background),
        bold,
        originalBold: bold,
        italic,
        originalItalic: italic,
        underline: false,
        align: 'left',
        changed: false,
      });
    }

    pages.push({
      id: `page-${pageNo}`,
      image: canvas.toDataURL('image/jpeg', .9),
      width: canvas.width,
      height: canvas.height,
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
    return [{ id: 'page-1', image: await blobToDataUrl(blob), width: image.naturalWidth || 1000, height: image.naturalHeight || 1400, boxes: [] }];
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadEdits(id: string): SavedEdit[] {
  try {
    const value = JSON.parse(localStorage.getItem(editKey(id)) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function applyEdits(pages: PageModel[], edits: SavedEdit[]) {
  return pages.map((page, pageIndex) => ({
    ...page,
    boxes: page.boxes.map((box) => {
      const edit = edits.find((e) => e.page === pageIndex && e.id === box.id);
      if (!edit) return box;
      const next = {
        ...box,
        text: String(edit.text ?? box.text),
        fontSize: Number(edit.fontSize) || box.fontSize,
        bold: !!edit.bold,
        italic: !!edit.italic,
        underline: !!edit.underline,
        align: edit.align || 'left',
      };
      return {
        ...next,
        changed: next.text !== box.original
          || Math.abs(next.fontSize - box.originalFontSize) > .001
          || next.bold !== box.originalBold
          || next.italic !== box.originalItalic
          || next.underline,
      };
    }),
  }));
}

export default function MobileExactResumeEditor({ id, onOpenGuided }: { id: string; onOpenGuided: () => void }) {
  const [source, setSource] = useState<OriginalDocumentRecord | null>(null);
  const [pages, setPages] = useState<PageModel[]>([]);
  const [mode, setMode] = useState<Mode>('view');
  const [selected, setSelected] = useState<{ page: number; id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const info = useMemo(() => importInfoFor(id), [id]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    let cancelled = false;
    (async () => {
      try {
        const original = await loadOriginalDocument(id) || await claimPendingOriginal(id);
        if (cancelled) return;
        setSource(original);
        if (!original) throw new Error('Original file is missing. Re-upload it once to keep the real layout and photo.');
        let rendered: PageModel[];
        if (isPdf(original)) rendered = await renderPdf(original.blob);
        else if (isImage(original)) rendered = await renderImage(original.blob);
        else throw new Error('For exact mobile editing, upload a PDF or image. DOCX can still be edited in Structured editor.');
        if (!cancelled) setPages(applyEdits(rendered, loadEdits(id)));
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Could not open this resume on mobile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!pages.length) return;
    const edits: SavedEdit[] = [];
    pages.forEach((page, pageIndex) => page.boxes.filter((b) => b.changed).forEach((b) => edits.push({
      page: pageIndex, id: b.id, text: b.text, fontSize: b.fontSize,
      bold: b.bold, italic: b.italic, underline: b.underline, align: b.align,
    })));
    try {
      if (edits.length) localStorage.setItem(editKey(id), JSON.stringify(edits));
      else localStorage.removeItem(editKey(id));
    } catch { /* private mode */ }
  }, [id, pages]);

  const selectedBox = selected ? pages[selected.page]?.boxes.find((b) => b.id === selected.id) : null;
  const editCount = pages.reduce((n, p) => n + p.boxes.filter((b) => b.changed).length, 0);

  const patchSelected = (patch: Partial<TextBox>) => {
    if (!selected) return;
    setPages((prev) => prev.map((page, pi) => pi !== selected.page ? page : ({
      ...page,
      boxes: page.boxes.map((box) => {
        if (box.id !== selected.id) return box;
        const next = { ...box, ...patch };
        return {
          ...next,
          changed: next.text !== box.original
            || Math.abs(next.fontSize - box.originalFontSize) > .001
            || next.bold !== box.originalBold
            || next.italic !== box.originalItalic
            || next.underline,
        };
      }),
    })));
  };

  const restoreSelected = () => {
    if (!selectedBox) return;
    patchSelected({
      text: selectedBox.original,
      fontSize: selectedBox.originalFontSize,
      bold: selectedBox.originalBold,
      italic: selectedBox.originalItalic,
      underline: false,
      align: 'left',
    });
  };

  const downloadOriginal = () => source && saveBlob(source.blob, source.name || 'resume');

  const downloadEdited = async () => {
    if (!source || !editCount || downloading) return;
    setDownloading(true);
    setError('');
    try {
      const html = pages.map((page) => {
        const overlays = page.boxes.filter((b) => b.changed).map((b) => {
          const fontMm = clamp(b.fontSize * 2.1, 1.3, 20);
          return `<div style="position:absolute;left:${b.x}%;top:${b.y}%;width:${b.w}%;min-height:${b.h}%;box-sizing:border-box;background:${b.background};color:${b.color};font-family:${b.fontFamily};font-size:${fontMm}mm;font-weight:${b.bold ? 700 : 400};font-style:${b.italic ? 'italic' : 'normal'};text-decoration:${b.underline ? 'underline' : 'none'};text-align:${b.align};line-height:1.06;white-space:pre-wrap;overflow:visible;">${escapeHtml(b.text)}</div>`;
        }).join('');
        return `<section class="sheet mobile-exact-print"><img src="${page.image}" alt=""/>${overlays}</section>`;
      }).join('');
      if (html.length > 2_800_000) throw new Error('Edited export is too large on this phone. Download the original, or make fewer changes.');
      const css = `@page{size:A4;margin:0}*{box-sizing:border-box}html,body,.print-root{margin:0;padding:0;background:#fff}.mobile-exact-print{position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always}.mobile-exact-print:last-child{page-break-after:auto}.mobile-exact-print>img{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;display:block}`;
      const title = `edited-${source.name.replace(/\.[^.]+$/, '') || 'resume'}`;
      const response = await fetch('/api/pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, css, title }),
      });
      if (!response.ok) throw new Error(await response.text() || 'Could not generate edited PDF.');
      saveBlob(await response.blob(), `${title}.pdf`);
    } catch (e: any) {
      setError(e?.message || 'Could not generate edited PDF.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <div className="card pad mobile-exact-loading"><b>Opening your resume…</b><span>Keeping the original layout and photo intact.</span></div>;
  }

  if (!source || !pages.length) {
    return (
      <div className="card pad mobile-exact-error">
        <h3>Could not open the exact mobile view</h3>
        <p className="hint">{error}</p>
        <button className="btn primary" onClick={() => navigate('/import')}>Re-upload resume</button>
        <button className="btn" onClick={onOpenGuided}>Open Structured editor</button>
      </div>
    );
  }

  return (
    <div className="mobile-exact-root">
      <div className="mobile-exact-bar no-print">
        <div className="mobile-exact-file">
          <b>{source.name}</b>
          <span>{info?.meta?.pages ? `${info.meta.pages} pages · ` : ''}original layout preserved</span>
        </div>
        <div className="mobile-exact-tabs">
          <button className={mode === 'view' ? 'active' : ''} onClick={() => { setMode('view'); setSelected(null); }}>Original</button>
          <button className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}>Quick edit</button>
        </div>
      </div>

      <div className="mobile-exact-actions no-print">
        <button className="btn small" onClick={() => navigate('/import')}>Upload another</button>
        <button className="btn small" onClick={downloadOriginal}>Original PDF</button>
        <button className="btn small" onClick={onOpenGuided}>Structured</button>
        {editCount > 0 && <button className="btn small primary" disabled={downloading} onClick={downloadEdited}>{downloading ? 'Preparing…' : `Save edited (${editCount})`}</button>}
      </div>

      {error && <div className="notice err no-print">{error}</div>}
      {mode === 'edit' && !pages.some((p) => p.boxes.length) && <div className="notice no-print">This page is image-only. The original stays intact; use Structured editor for OCR-based text editing.</div>}

      <main className={`mobile-exact-pages ${selectedBox ? 'with-sheet' : ''}`}>
        {pages.map((page, pageIndex) => (
          <section className="mobile-exact-page-wrap" key={page.id}>
            <div className="mobile-exact-page" style={{ aspectRatio: `${page.width}/${page.height}` }}>
              <img src={page.image} alt={`Resume page ${pageIndex + 1}`} draggable={false} />
              {mode === 'edit' && page.boxes.filter((b) => b.changed).map((b) => (
                <div key={`edit-${b.id}`} className="mobile-exact-replacement" style={{
                  left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, minHeight: `${b.h}%`,
                  fontSize: `clamp(6px, ${b.fontSize}cqw, 28px)`, fontFamily: b.fontFamily,
                  background: b.background, color: b.color, fontWeight: b.bold ? 700 : 400,
                  fontStyle: b.italic ? 'italic' : 'normal', textDecoration: b.underline ? 'underline' : 'none', textAlign: b.align,
                }}>{b.text}</div>
              ))}
              {mode === 'edit' && page.boxes.map((b) => (
                <button key={`hit-${b.id}`} type="button" className={`mobile-exact-hit ${selected?.page === pageIndex && selected.id === b.id ? 'active' : ''}`}
                  aria-label={`Edit ${b.original}`} onClick={() => setSelected({ page: pageIndex, id: b.id })}
                  style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${Math.max(b.w, 2.5)}%`, height: `${Math.max(b.h, 2.2)}%` }} />
              ))}
            </div>
            <span className="mobile-exact-page-label">Page {pageIndex + 1}</span>
          </section>
        ))}
      </main>

      {mode === 'edit' && selectedBox && selected && (
        <aside className="mobile-exact-sheet no-print">
          <div className="mobile-exact-sheet-head">
            <b>Edit selected text</b>
            <button aria-label="Close editor" onClick={() => setSelected(null)}>×</button>
          </div>
          <textarea className="textarea" value={selectedBox.text} onChange={(e) => patchSelected({ text: e.target.value })} />
          <div className="mobile-exact-format">
            <button className={`btn small ${selectedBox.bold ? 'primary' : ''}`} onClick={() => patchSelected({ bold: !selectedBox.bold })}><b>B</b></button>
            <button className={`btn small ${selectedBox.italic ? 'primary' : ''}`} onClick={() => patchSelected({ italic: !selectedBox.italic })}><i>I</i></button>
            <button className={`btn small ${selectedBox.underline ? 'primary' : ''}`} onClick={() => patchSelected({ underline: !selectedBox.underline })}><u>U</u></button>
            <button className="btn small" onClick={() => patchSelected({ fontSize: clamp(selectedBox.fontSize * .94, .55, 9) })}>A−</button>
            <button className="btn small" onClick={() => patchSelected({ fontSize: clamp(selectedBox.fontSize * 1.06, .55, 9) })}>A＋</button>
            <button className="btn small" onClick={restoreSelected}>Restore</button>
          </div>
          <div className="mobile-exact-sheet-note">Changes save locally as you type. Original PDF is never modified.</div>
        </aside>
      )}

      <style>{`
        .mobile-exact-root{max-width:760px;margin:0 auto;min-width:0;overflow-x:hidden}
        .mobile-exact-loading,.mobile-exact-error{max-width:520px;margin:28px auto;display:grid;gap:10px;text-align:center}
        .mobile-exact-bar{position:sticky;top:calc(56px + var(--safe-top));z-index:44;background:rgba(255,255,255,.97);backdrop-filter:blur(10px);border:1px solid var(--silver-200);border-radius:12px;padding:9px;margin-bottom:8px;box-shadow:0 5px 18px rgba(15,33,72,.08)}
        .mobile-exact-file{min-width:0;margin-bottom:8px}.mobile-exact-file b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--navy-900);font-size:14px}.mobile-exact-file span{font-size:11px;color:var(--silver-500)}
        .mobile-exact-tabs{display:grid;grid-template-columns:1fr 1fr;background:var(--silver-100);padding:3px;border-radius:9px}.mobile-exact-tabs button{border:0;background:transparent;border-radius:7px;padding:8px;font-weight:800;color:var(--silver-500)}.mobile-exact-tabs button.active{background:#fff;color:var(--navy-900);box-shadow:0 1px 4px rgba(15,33,72,.12)}
        .mobile-exact-actions{display:flex;gap:6px;overflow-x:auto;padding:2px 0 9px;scrollbar-width:none}.mobile-exact-actions::-webkit-scrollbar{display:none}.mobile-exact-actions .btn{flex:0 0 auto}
        .mobile-exact-pages{display:grid;gap:14px;padding-bottom:12px}.mobile-exact-pages.with-sheet{padding-bottom:48dvh}
        .mobile-exact-page-wrap{width:100%;min-width:0}.mobile-exact-page{position:relative;width:100%;overflow:hidden;background:#fff;border:1px solid var(--silver-200);box-shadow:0 8px 26px rgba(15,33,72,.11);container-type:inline-size}.mobile-exact-page>img{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;display:block;pointer-events:none;user-select:none}.mobile-exact-page-label{display:block;text-align:center;font-size:11px;color:var(--silver-500);padding-top:4px}
        .mobile-exact-hit{position:absolute;z-index:5;border:1px solid transparent;background:transparent;border-radius:3px;padding:0;min-width:18px!important;min-height:18px!important}.mobile-exact-hit:active,.mobile-exact-hit.active{border-color:#2563eb;background:rgba(37,99,235,.05);box-shadow:0 0 0 2px rgba(37,99,235,.15)}
        .mobile-exact-replacement{position:absolute;z-index:4;box-sizing:border-box;line-height:1.06;white-space:pre-wrap;overflow:visible;pointer-events:none}
        .mobile-exact-sheet{position:fixed;left:8px;right:8px;bottom:calc(64px + var(--safe-bottom));z-index:95;background:#fff;border:1px solid var(--silver-200);border-radius:16px 16px 12px 12px;padding:12px;box-shadow:0 -14px 38px rgba(15,33,72,.22);max-height:44dvh;overflow:auto}.mobile-exact-sheet-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.mobile-exact-sheet-head button{border:0;background:var(--silver-100);width:32px;height:32px;border-radius:50%;font-size:22px;color:var(--navy-700)}.mobile-exact-sheet .textarea{min-height:76px;max-height:18dvh;resize:none}.mobile-exact-format{display:flex;gap:6px;overflow-x:auto;margin-top:8px;padding-bottom:2px}.mobile-exact-format .btn{flex:0 0 auto}.mobile-exact-sheet-note{font-size:11px;color:var(--silver-500);margin-top:7px}
      `}</style>
    </div>
  );
}
