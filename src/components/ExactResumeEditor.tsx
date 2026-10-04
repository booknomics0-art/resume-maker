import { useEffect, useMemo, useState } from 'react';
import { importInfoFor } from '../lib/importDraft';
import { claimPendingOriginal, loadOriginalDocument, type OriginalDocumentRecord } from '../lib/originalDocument';
import { navigate } from '../lib/navigation';

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
  align: 'left' | 'center' | 'right';
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

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

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
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function contrastColor(background: string) {
  const match = background.match(/rgb\((\d+),(\d+),(\d+)\)/);
  if (!match) return '#111827';
  const [, r, g, b] = match.map(Number);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
  return luminance < 130 ? '#ffffff' : '#111827';
}

function sampleBackground(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const points = [
    [x + 2, y + 2],
    [x + Math.max(2, w - 2), y + 2],
    [x + 2, y + Math.max(2, h - 2)],
    [x + Math.max(2, w - 2), y + Math.max(2, h - 2)],
  ];
  let r = 0; let g = 0; let b = 0; let count = 0;
  for (const [px0, py0] of points) {
    const px = clamp(Math.round(px0), 0, Math.max(0, ctx.canvas.width - 1));
    const py = clamp(Math.round(py0), 0, Math.max(0, ctx.canvas.height - 1));
    try {
      const data = ctx.getImageData(px, py, 1, 1).data;
      if (data[3] < 20) continue;
      r += data[0]; g += data[1]; b += data[2]; count++;
    } catch {
      // Canvas pixels are local PDF pixels, so this should not fail.
    }
  }
  if (!count) return 'rgb(255,255,255)';
  return `rgb(${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)})`;
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
    // Sharp enough to preserve photos/graphics while staying under the PDF API body cap.
    const scale = Math.min(1.55, 1150 / Math.max(base.width, base.height));
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
      const fontHeight = Math.max(6, (Number(item.height) || Math.hypot(Number(transform[2]) || 0, Number(transform[3]) || 10)) * scale);
      const y = viewport.height - ((Number(transform[5]) || 0) * scale) - fontHeight;
      const w = Math.max(4, (Number(item.width) || text.length * fontHeight * 0.45) * scale);
      const h = Math.max(fontHeight * 1.18, 8);
      if (x > viewport.width || y > viewport.height || x + w < 0 || y + h < 0) continue;
      const bg = sampleBackground(ctx, x, y, w, h);
      const style = (tc.styles || {})[item.fontName] || {};
      boxes.push({
        id: `p${pageNo}-t${index++}`,
        original: text,
        text,
        x: clamp(x / viewport.width * 100, 0, 100),
        y: clamp(y / viewport.height * 100, 0, 100),
        w: clamp(w / viewport.width * 100, 0.5, 100),
        h: clamp(h / viewport.height * 100, 0.6, 20),
        fontSize: clamp(fontHeight / viewport.width * 100, 0.65, 8),
        fontFamily: style.fontFamily || 'Arial, sans-serif',
        background: bg,
        color: contrastColor(bg),
        bold: /bold|black|semibold/i.test(String(item.fontName || '') + ' ' + String(style.fontFamily || '')),
        italic: /italic|oblique/i.test(String(item.fontName || '') + ' ' + String(style.fontFamily || '')),
        underline: false,
        align: 'left',
        changed: false,
      });
    }

    pages.push({
      id: `page-${pageNo}`,
      image: canvas.toDataURL('image/jpeg', 0.94),
      width: canvas.width,
      height: canvas.height,
      boxes,
    });
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

export default function ExactResumeEditor({ id, onOpenGuided }: { id: string; onOpenGuided: () => void }) {
  const [source, setSource] = useState<OriginalDocumentRecord | null>(null);
  const [pages, setPages] = useState<PageModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState<{ page: number; id: string } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const info = useMemo(() => importInfoFor(id), [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const original = await loadOriginalDocument(id) || await claimPendingOriginal(id);
        if (cancelled) return;
        setSource(original);
        if (!original) {
          setError('The original file is not available for this older import. Re-upload it once to use Exact Edit without losing layout, fonts, photos or alignment.');
          return;
        }
        if (isPdf(original)) setPages(await renderPdf(original.blob));
        else if (isImage(original)) setPages(await renderImage(original.blob));
        else setError('Exact visual editing is available for PDF and image resumes. Your original file is still preserved; open the structured editor or re-upload a PDF export for pixel-safe editing.');
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Could not open the original resume.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const activeBox = active ? pages[active.page]?.boxes.find((b) => b.id === active.id) : null;

  const patchBox = (pageIndex: number, boxId: string, patch: Partial<TextBox>) => {
    setPages((prev) => prev.map((page, pi) => pi !== pageIndex ? page : {
      ...page,
      boxes: page.boxes.map((box) => box.id === boxId ? { ...box, ...patch } : box),
    }));
  };

  const addText = () => {
    if (!pages.length) return;
    const id2 = `custom-${Date.now().toString(36)}`;
    const box: TextBox = {
      id: id2, original: '', text: 'New text', x: 10, y: 10, w: 30, h: 4,
      fontSize: 2.2, fontFamily: 'Arial, sans-serif', background: 'rgba(255,255,255,.92)',
      color: '#111827', bold: false, italic: false, underline: false, align: 'left', changed: true, custom: true,
    };
    setPages((prev) => prev.map((page, pi) => pi === 0 ? { ...page, boxes: [...page.boxes, box] } : page));
    setActive({ page: 0, id: id2 });
  };

  const resetActive = () => {
    if (!active || !activeBox) return;
    if (activeBox.custom) {
      setPages((prev) => prev.map((page, pi) => pi !== active.page ? page : { ...page, boxes: page.boxes.filter((b) => b.id !== active.id) }));
      setActive(null);
      return;
    }
    patchBox(active.page, active.id, { text: activeBox.original, changed: false, bold: activeBox.bold, italic: activeBox.italic, underline: false });
  };

  const anyChanges = pages.some((p) => p.boxes.some((b) => b.changed || b.custom));

  const download = async () => {
    if (!source || downloading) return;
    if (!anyChanges && isPdf(source)) {
      saveBlob(source.blob, source.name || 'resume.pdf');
      return;
    }
    setDownloading(true);
    setError('');
    try {
      const html = pages.map((page) => {
        const overlays = page.boxes.filter((b) => b.changed || b.custom).map((b) => `
          <div style="position:absolute;left:${b.x}%;top:${b.y}%;width:${b.w}%;min-height:${b.h}%;box-sizing:border-box;background:${b.background};color:${b.color};font-family:${b.fontFamily};font-size:${b.fontSize}cqw;font-weight:${b.bold ? 700 : 400};font-style:${b.italic ? 'italic' : 'normal'};text-decoration:${b.underline ? 'underline' : 'none'};text-align:${b.align};line-height:1.08;white-space:pre-wrap;overflow:visible;">${escapeHtml(b.text)}</div>`).join('');
        return `<section class="sheet exact-print-page" style="position:relative;overflow:hidden;container-type:inline-size;"><img src="${page.image}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:fill;display:block;"/>${overlays}</section>`;
      }).join('');
      const css = `
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; }
        html,body,.print-root { margin:0; padding:0; background:#fff; }
        .exact-print-page { width:210mm; height:297mm; page-break-after:always; }
        .exact-print-page:last-child { page-break-after:auto; }
      `;
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, css, title: `edited-${source.name.replace(/\.[^.]+$/, '') || 'resume'}` }),
      });
      if (!response.ok) throw new Error(await response.text() || 'Could not generate PDF.');
      saveBlob(await response.blob(), `edited-${source.name.replace(/\.[^.]+$/, '') || 'resume'}.pdf`);
    } catch (e: any) {
      setError(e?.message || 'Could not generate the edited PDF.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <div className="card pad" style={{ maxWidth: 760, margin: '40px auto', textAlign: 'center' }}><h3>Opening your original resume…</h3><p className="hint">Keeping the uploaded layout, photo, fonts and graphics intact.</p></div>;
  }

  if (!source || !pages.length) {
    return (
      <div className="card pad" style={{ maxWidth: 760, margin: '32px auto' }}>
        <h2 style={{ color: 'var(--navy-900)' }}>Exact Edit needs the original file</h2>
        <p className="hint" style={{ fontSize: 14 }}>{error}</p>
        <div className="row" style={{ marginTop: 16, flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={() => navigate('/import')}>📤 Re-upload original resume</button>
          <button className="btn" onClick={onOpenGuided}>Open structured editor</button>
          {source && <button className="btn" onClick={() => saveBlob(source.blob, source.name)}>Download original</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="exact-editor-root">
      <div className="exact-topbar no-print">
        <div style={{ minWidth: 0 }}>
          <div className="page-title" style={{ fontSize: 20 }}>Exact Resume Editor</div>
          <div className="page-sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {source.name}{info?.meta?.pages ? ` · ${info.meta.pages} page${info.meta.pages > 1 ? 's' : ''}` : ''} · original layout preserved
          </div>
        </div>
        <div className="row exact-actions">
          <button className="btn" onClick={() => navigate('/import')}>Upload another</button>
          <button className="btn" onClick={onOpenGuided}>Structured editor</button>
          <button className="btn primary" onClick={download} disabled={downloading}>{downloading ? 'Preparing PDF…' : anyChanges ? 'Download edited PDF' : 'Download original PDF'}</button>
        </div>
      </div>

      <div className="exact-toolbar no-print" aria-label="Text formatting toolbar">
        <button className="btn small" onClick={addText}>＋ Add text</button>
        <button className="btn small" disabled={!activeBox} onClick={() => active && activeBox && patchBox(active.page, active.id, { bold: !activeBox.bold, changed: true })}><b>B</b></button>
        <button className="btn small" disabled={!activeBox} onClick={() => active && activeBox && patchBox(active.page, active.id, { italic: !activeBox.italic, changed: true })}><i>I</i></button>
        <button className="btn small" disabled={!activeBox} onClick={() => active && activeBox && patchBox(active.page, active.id, { underline: !activeBox.underline, changed: true })}><u>U</u></button>
        <button className="btn small" disabled={!activeBox} onClick={() => active && activeBox && patchBox(active.page, active.id, { fontSize: clamp(activeBox.fontSize * .9, .55, 9), changed: true })}>A−</button>
        <button className="btn small" disabled={!activeBox} onClick={() => active && activeBox && patchBox(active.page, active.id, { fontSize: clamp(activeBox.fontSize * 1.1, .55, 9), changed: true })}>A＋</button>
        <button className="btn small" disabled={!activeBox} onClick={() => active && patchBox(active.page, active.id, { align: 'left', changed: true })}>⇤</button>
        <button className="btn small" disabled={!activeBox} onClick={() => active && patchBox(active.page, active.id, { align: 'center', changed: true })}>≡</button>
        <button className="btn small" disabled={!activeBox} onClick={() => active && patchBox(active.page, active.id, { align: 'right', changed: true })}>⇥</button>
        <button className="btn small" disabled={!activeBox} onClick={resetActive}>{activeBox?.custom ? 'Delete text' : 'Reset text'}</button>
        <span className="hint exact-toolbar-hint">Tap/click text exactly where it appears, then type. Photo and page artwork stay untouched.</span>
      </div>

      {error && <div className="notice err" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="exact-pages">
        {pages.map((page, pageIndex) => (
          <div key={page.id} className="exact-page-wrap">
            <div className="exact-page" style={{ aspectRatio: `${page.width} / ${page.height}` }}>
              <img src={page.image} alt={`Original resume page ${pageIndex + 1}`} draggable={false} />
              {page.boxes.map((box) => {
                const focused = active?.page === pageIndex && active.id === box.id;
                const showReplacement = focused || box.changed || box.custom;
                return (
                  <div
                    key={box.id}
                    className={`exact-text-box ${showReplacement ? 'visible' : ''} ${focused ? 'focused' : ''}`}
                    style={{
                      left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, minHeight: `${box.h}%`,
                      fontSize: `clamp(6px, ${box.fontSize}cqw, 48px)`, fontFamily: box.fontFamily,
                      background: showReplacement ? box.background : 'transparent', color: showReplacement ? box.color : 'transparent',
                      fontWeight: box.bold ? 700 : 400, fontStyle: box.italic ? 'italic' : 'normal',
                      textDecoration: box.underline ? 'underline' : 'none', textAlign: box.align,
                    }}
                    contentEditable
                    suppressContentEditableWarning
                    spellCheck
                    role="textbox"
                    aria-label={`Editable text: ${box.original || 'new text'}`}
                    onFocus={(e) => {
                      setActive({ page: pageIndex, id: box.id });
                      if (!showReplacement) {
                        e.currentTarget.style.background = box.background;
                        e.currentTarget.style.color = box.color;
                      }
                    }}
                    onBlur={(e) => {
                      const text = e.currentTarget.innerText.replace(/\r/g, '').trimEnd();
                      patchBox(pageIndex, box.id, { text, changed: box.custom || text !== box.original || box.bold !== /bold|black|semibold/i.test(box.fontFamily) || box.italic || box.underline });
                    }}
                  >
                    {box.text}
                  </div>
                );
              })}
            </div>
            <div className="hint" style={{ textAlign: 'center', marginTop: 6 }}>Page {pageIndex + 1} · original visual is the locked background</div>
          </div>
        ))}
      </div>

      <style>{`
        .exact-editor-root { max-width: 1180px; margin: 0 auto; animation: exactEnter .28s cubic-bezier(.22,.8,.22,1) both; }
        @keyframes exactEnter { from { opacity:.25; transform:translateX(18px); } to { opacity:1; transform:none; } }
        .exact-topbar { display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom:12px; position:sticky; top:0; z-index:30; background:rgba(245,247,250,.96); backdrop-filter:blur(9px); padding:10px 0; }
        .exact-actions { flex-wrap:wrap; justify-content:flex-end; }
        .exact-toolbar { position:sticky; top:68px; z-index:29; display:flex; align-items:center; gap:6px; overflow-x:auto; padding:8px; margin-bottom:14px; border:1px solid var(--silver-200); border-radius:10px; background:rgba(255,255,255,.97); box-shadow:var(--shadow-sm); scrollbar-width:thin; }
        .exact-toolbar .btn { flex:0 0 auto; min-width:38px; }
        .exact-toolbar-hint { margin-left:6px; min-width:280px; }
        .exact-pages { display:grid; gap:22px; justify-items:center; }
        .exact-page-wrap { width:min(100%, 900px); }
        .exact-page { position:relative; width:100%; overflow:hidden; background:#fff; box-shadow:0 14px 42px rgba(10,22,48,.16); border:1px solid var(--silver-200); container-type:inline-size; }
        .exact-page > img { position:absolute; inset:0; width:100%; height:100%; object-fit:fill; user-select:none; pointer-events:none; }
        .exact-text-box { position:absolute; z-index:2; padding:0 1px; margin:0; border:1px solid transparent; outline:none; line-height:1.05; white-space:pre-wrap; overflow:visible; cursor:text; caret-color:#2563eb; min-width:4px; border-radius:1px; }
        .exact-text-box:hover { border-color:rgba(37,99,235,.22); }
        .exact-text-box.focused { border-color:#2563eb; box-shadow:0 0 0 2px rgba(37,99,235,.15); z-index:4; }
        @media (max-width: 760px) {
          .exact-editor-root { margin:0 -6px; }
          .exact-topbar { align-items:flex-start; flex-direction:column; padding:8px 0; }
          .exact-actions { width:100%; justify-content:flex-start; overflow-x:auto; flex-wrap:nowrap; padding-bottom:2px; }
          .exact-actions .btn { flex:0 0 auto; }
          .exact-toolbar { top:122px; margin-left:-2px; margin-right:-2px; border-radius:8px; }
          .exact-toolbar-hint { display:none; }
          .exact-pages { gap:16px; }
          .exact-page-wrap { width:100%; }
        }
        @media (prefers-reduced-motion: reduce) { .exact-editor-root { animation:none; } }
      `}</style>
    </div>
  );
}
