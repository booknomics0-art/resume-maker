import { useEffect, useMemo, useRef, useState } from 'react';
import { emptyResume, uid, type Resume } from '../lib/types';
import { draftResumeFor, importInfoFor } from '../lib/importDraft';
import { loadResumes, sampleResume, upsertResume } from '../lib/store';
import { navigate } from '../lib/navigation';
import { recordDownload } from '../lib/cloud';
import { trackEvent } from '../lib/track';

type StoredField = { html: string; plain: string };
type CustomBlock = { id: string; html: string; plain: string };
type QuickDoc = {
  version: 1;
  fields: Record<string, StoredField>;
  customBlocks: CustomBlock[];
};

type ActiveField = {
  key: string;
  el: HTMLElement;
  onPlainChange: (value: string) => void;
  singleLine: boolean;
};

const DOC_PREFIX = 'craftcv.quick-editor.v1.';
const EMPTY_DOC: QuickDoc = { version: 1, fields: {}, customBlocks: [] };

function loadQuickDoc(id: string): QuickDoc {
  try {
    const raw = localStorage.getItem(`${DOC_PREFIX}${id}`);
    if (!raw) return { ...EMPTY_DOC, fields: {}, customBlocks: [] };
    const parsed = JSON.parse(raw) as Partial<QuickDoc>;
    return {
      version: 1,
      fields: parsed.fields && typeof parsed.fields === 'object' ? parsed.fields : {},
      customBlocks: Array.isArray(parsed.customBlocks) ? parsed.customBlocks : [],
    };
  } catch {
    return { ...EMPTY_DOC, fields: {}, customBlocks: [] };
  }
}

function saveQuickDoc(id: string, doc: QuickDoc) {
  try {
    localStorage.setItem(`${DOC_PREFIX}${id}`, JSON.stringify(doc));
  } catch {
    // Formatting persistence is a convenience. Plain resume data still autosaves.
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

function normalizePlain(value: string, singleLine = false): string {
  const clean = value.replace(/\r/g, '').replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n').trimEnd();
  return singleLine ? clean.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ') : clean;
}

function sanitizeRichHtml(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;

  const forbidden = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'FORM', 'INPUT', 'BUTTON']);
  const allowed = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'BR', 'P', 'DIV', 'UL', 'OL', 'LI', 'A', 'SPAN', 'FONT', 'HR']);
  const safeStyle = new Set(['text-align', 'font-weight', 'font-style', 'text-decoration', 'color', 'font-size', 'font-family', 'line-height']);

  for (const el of Array.from(template.content.querySelectorAll('*'))) {
    if (forbidden.has(el.tagName)) {
      el.remove();
      continue;
    }
    if (!allowed.has(el.tagName)) {
      el.replaceWith(...Array.from(el.childNodes));
      continue;
    }

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name === 'href' && el.tagName === 'A') {
        const href = attr.value.trim();
        if (!/^(https?:|mailto:|tel:)/i.test(href)) el.removeAttribute(attr.name);
        else {
          el.setAttribute('rel', 'noopener noreferrer');
          el.setAttribute('target', '_blank');
        }
        continue;
      }
      if (name === 'color' && el.tagName === 'FONT') continue;
      if (name === 'size' && el.tagName === 'FONT' && /^[1-7]$/.test(attr.value)) continue;
      if (name === 'style') {
        const safe = attr.value
          .split(';')
          .map((decl) => decl.trim())
          .filter(Boolean)
          .map((decl) => {
            const idx = decl.indexOf(':');
            if (idx < 1) return '';
            const prop = decl.slice(0, idx).trim().toLowerCase();
            const value = decl.slice(idx + 1).trim();
            if (!safeStyle.has(prop)) return '';
            if (/url\s*\(|expression\s*\(|javascript:/i.test(value)) return '';
            return `${prop}:${value}`;
          })
          .filter(Boolean)
          .join(';');
        if (safe) el.setAttribute('style', safe);
        else el.removeAttribute('style');
        continue;
      }
      if (name === 'rel' || name === 'target') continue;
      el.removeAttribute(attr.name);
    }
  }

  return template.innerHTML;
}

function collectPrintableCss(): string {
  const chunks: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      chunks.push(Array.from(sheet.cssRules).map((rule) => rule.cssText).join('\n'));
    } catch {
      // Cross-origin styles are irrelevant to this local editor.
    }
  }
  return chunks.join('\n');
}

function saveBlobAs(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getInitialResume(id: string): Resume {
  if (id === 'sample') return sampleResume();
  const draft = draftResumeFor(id);
  if (draft) return draft;
  return loadResumes().find((item) => item.id === id) ?? emptyResume();
}

function RichField({
  fieldKey,
  value,
  placeholder,
  className = '',
  singleLine = false,
  resolveHtml,
  activate,
  capture,
}: {
  fieldKey: string;
  value: string;
  placeholder?: string;
  className?: string;
  singleLine?: boolean;
  resolveHtml: (key: string, value: string) => string;
  activate: (field: ActiveField) => void;
  capture: (key: string, el: HTMLElement, onPlainChange: (value: string) => void, singleLine: boolean) => void;
  onPlainChange: (value: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onPlainChange = arguments[0].onPlainChange;

  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    const next = resolveHtml(fieldKey, value);
    if (el.innerHTML !== next) el.innerHTML = next;
  }, [fieldKey, resolveHtml, value]);

  return (
    <div
      ref={ref}
      className={`quick-rich ${singleLine ? 'single' : ''} ${className}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      role="textbox"
      aria-label={placeholder || fieldKey}
      data-rich-key={fieldKey}
      data-placeholder={placeholder || 'Click and type…'}
      onFocus={(e) => activate({ key: fieldKey, el: e.currentTarget, onPlainChange, singleLine })}
      onInput={(e) => capture(fieldKey, e.currentTarget, onPlainChange, singleLine)}
      onBlur={(e) => {
        capture(fieldKey, e.currentTarget, onPlainChange, singleLine);
        const clean = sanitizeRichHtml(e.currentTarget.innerHTML);
        if (e.currentTarget.innerHTML !== clean) e.currentTarget.innerHTML = clean;
      }}
      onKeyDown={(e) => {
        if (singleLine && e.key === 'Enter') e.preventDefault();
      }}
      onPaste={(e) => {
        e.preventDefault();
        const plain = e.clipboardData.getData('text/plain');
        if (singleLine) {
          document.execCommand('insertText', false, normalizePlain(plain, true));
          return;
        }
        const rich = e.clipboardData.getData('text/html');
        if (rich) document.execCommand('insertHTML', false, sanitizeRichHtml(rich));
        else document.execCommand('insertText', false, plain);
      }}
    />
  );
}

function ToolButton({ title, children, onClick }: { title: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      className="quick-tool-btn"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function QuickResumeEditor({ id, onOpenGuided }: { id: string; onOpenGuided: () => void }) {
  const [r, setR] = useState<Resume>(() => getInitialResume(id));
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const docRef = useRef<QuickDoc>(loadQuickDoc(id));
  const [customBlocks, setCustomBlocks] = useState<CustomBlock[]>(() => docRef.current.customBlocks);
  const activeRef = useRef<ActiveField | null>(null);
  const selectionRef = useRef<Range | null>(null);
  const dirtyRef = useRef(false);
  const importInfo = useMemo(() => importInfoFor(id), [id]);

  useEffect(() => {
    const onSelection = () => {
      const active = activeRef.current;
      const sel = window.getSelection();
      if (!active || !sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      if (active.el.contains(range.commonAncestorContainer)) selectionRef.current = range.cloneRange();
    };
    document.addEventListener('selectionchange', onSelection);
    return () => document.removeEventListener('selectionchange', onSelection);
  }, []);

  useEffect(() => {
    if (!dirtyRef.current) return;
    const timer = window.setTimeout(() => upsertResume(r), 300);
    return () => window.clearTimeout(timer);
  }, [r]);

  const mutate = (fn: (prev: Resume) => Resume) => {
    dirtyRef.current = true;
    setR((prev) => fn(prev));
  };

  const resolveHtml = (key: string, value: string) => {
    const saved = docRef.current.fields[key];
    if (saved && saved.plain === value) return sanitizeRichHtml(saved.html);
    return escapeHtml(value);
  };

  const persistDoc = () => {
    docRef.current.customBlocks = customBlocks;
    saveQuickDoc(id, docRef.current);
  };

  useEffect(() => {
    docRef.current.customBlocks = customBlocks;
    saveQuickDoc(id, docRef.current);
  }, [customBlocks, id]);

  const capture = (key: string, el: HTMLElement, onPlainChange: (value: string) => void, singleLine: boolean) => {
    const plain = normalizePlain(el.innerText, singleLine);
    const html = sanitizeRichHtml(el.innerHTML);
    docRef.current.fields[key] = { html, plain };
    saveQuickDoc(id, docRef.current);
    onPlainChange(plain);
  };

  const activate = (field: ActiveField) => {
    activeRef.current = field;
  };

  const restoreSelection = () => {
    const active = activeRef.current;
    if (!active) return false;
    active.el.focus();
    const saved = selectionRef.current;
    const sel = window.getSelection();
    if (saved && sel) {
      sel.removeAllRanges();
      sel.addRange(saved);
    }
    return true;
  };

  const syncActive = () => {
    window.requestAnimationFrame(() => {
      const active = activeRef.current;
      if (!active) return;
      capture(active.key, active.el, active.onPlainChange, active.singleLine);
    });
  };

  const command = (name: string, value?: string) => {
    if (!restoreSelection()) return;
    document.execCommand(name, false, value);
    syncActive();
  };

  const setLineHeight = (value: string) => {
    const active = activeRef.current;
    if (!active) return;
    active.el.style.lineHeight = value;
    capture(active.key, active.el, active.onPlainChange, active.singleLine);
  };

  const setPersonal = (key: keyof Resume['personal'], value: string) => mutate((prev) => ({
    ...prev,
    personal: { ...prev.personal, [key]: value },
  }));

  const setExperience = (itemId: string, patch: Partial<Resume['experience'][number]>) => mutate((prev) => ({
    ...prev,
    experience: prev.experience.map((item) => item.id === itemId ? { ...item, ...patch } : item),
  }));

  const setEducation = (itemId: string, patch: Partial<Resume['education'][number]>) => mutate((prev) => ({
    ...prev,
    education: prev.education.map((item) => item.id === itemId ? { ...item, ...patch } : item),
  }));

  const setProject = (itemId: string, patch: Partial<Resume['projects'][number]>) => mutate((prev) => ({
    ...prev,
    projects: prev.projects.map((item) => item.id === itemId ? { ...item, ...patch } : item),
  }));

  const setCert = (itemId: string, patch: Partial<Resume['certs'][number]>) => mutate((prev) => ({
    ...prev,
    certs: prev.certs.map((item) => item.id === itemId ? { ...item, ...patch } : item),
  }));

  const setLanguage = (itemId: string, patch: Partial<Resume['languages'][number]>) => mutate((prev) => ({
    ...prev,
    languages: prev.languages.map((item) => item.id === itemId ? { ...item, ...patch } : item),
  }));

  const addCustomText = () => {
    const block: CustomBlock = { id: uid(), html: '', plain: '' };
    setCustomBlocks((prev) => [...prev, block]);
    window.setTimeout(() => {
      const el = document.querySelector(`[data-rich-key="custom.${block.id}"]`) as HTMLElement | null;
      el?.focus();
    }, 0);
  };

  const updateCustom = (blockId: string, plain: string) => {
    setCustomBlocks((prev) => prev.map((block) => block.id === blockId ? {
      ...block,
      plain,
      html: docRef.current.fields[`custom.${blockId}`]?.html ?? block.html,
    } : block));
  };

  const removeCustom = (blockId: string) => {
    delete docRef.current.fields[`custom.${blockId}`];
    setCustomBlocks((prev) => prev.filter((block) => block.id !== blockId));
  };

  const addExperienceBullet = (itemId: string) => mutate((prev) => ({
    ...prev,
    experience: prev.experience.map((item) => item.id === itemId ? { ...item, bullets: [...item.bullets, ''] } : item),
  }));

  const removeExperienceBullet = (itemId: string, index: number) => mutate((prev) => ({
    ...prev,
    experience: prev.experience.map((item) => item.id === itemId ? {
      ...item,
      bullets: item.bullets.filter((_, i) => i !== index),
    } : item),
  }));

  const downloadPdf = async () => {
    if (downloading) return;
    setDownloadError('');
    setDownloading(true);
    try {
      const saved = upsertResume(r);
      const sheet = document.getElementById('quick-resume-sheet');
      if (!(sheet instanceof HTMLElement)) throw new Error('Resume page not found');

      const clone = sheet.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.quick-only-control').forEach((node) => node.remove());
      clone.querySelectorAll('[contenteditable]').forEach((node) => node.removeAttribute('contenteditable'));
      clone.removeAttribute('id');

      const title = (saved.personal.fullName || saved.name || 'resume')
        .replace(/[\\/:*?"<>|]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || 'resume';

      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: clone.outerHTML, css: collectPrintableCss(), title }),
      });
      if (!response.ok) throw new Error(`PDF service returned ${response.status}`);
      const blob = await response.blob();
      if (blob.type !== 'application/pdf' || blob.size < 500) throw new Error('Invalid PDF returned');
      saveBlobAs(blob, `${title}.pdf`);
      recordDownload(saved);
      trackEvent('download_quick_editor');
    } catch (error) {
      console.warn('Quick editor PDF failed', error);
      setDownloadError('Direct PDF download failed. Your edits are saved — open the Guided editor and use its Download PDF button.');
    } finally {
      setDownloading(false);
    }
  };

  const openGuided = () => {
    upsertResume(r);
    persistDoc();
    onOpenGuided();
  };

  const rich = (
    key: string,
    value: string,
    onPlainChange: (value: string) => void,
    placeholder: string,
    className = '',
    singleLine = false,
  ) => (
    <RichField
      fieldKey={key}
      value={value}
      onPlainChange={onPlainChange}
      placeholder={placeholder}
      className={className}
      singleLine={singleLine}
      resolveHtml={resolveHtml}
      activate={activate}
      capture={capture}
    />
  );

  return (
    <div className="quick-editor-root">
      <div className="quick-editor-head no-print">
        <div>
          <div className="page-title" style={{ fontSize: 21 }}>⚡ Quick Word-like Editor</div>
          <div className="page-sub">
            {importInfo ? `Imported from ${importInfo.fileName} · ` : ''}
            click any text, select words, format them, then download. Plain text edits stay synced with CraftCV.
          </div>
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => navigate('/')}>← Dashboard</button>
          <button className="btn" onClick={openGuided}>Advanced / Guided editor</button>
          <button className="btn primary" onClick={downloadPdf} disabled={downloading}>
            {downloading ? 'Preparing PDF…' : '⬇ Download PDF'}
          </button>
        </div>
      </div>

      <div className="quick-toolbar no-print" role="toolbar" aria-label="Text formatting">
        <div className="quick-tool-group">
          <ToolButton title="Undo" onClick={() => command('undo')}>↶</ToolButton>
          <ToolButton title="Redo" onClick={() => command('redo')}>↷</ToolButton>
        </div>
        <div className="quick-tool-group">
          <ToolButton title="Bold" onClick={() => command('bold')}><b>B</b></ToolButton>
          <ToolButton title="Italic" onClick={() => command('italic')}><i>I</i></ToolButton>
          <ToolButton title="Underline" onClick={() => command('underline')}><u>U</u></ToolButton>
          <ToolButton title="Clear formatting" onClick={() => command('removeFormat')}>Tx</ToolButton>
        </div>
        <label className="quick-select-label" title="Font family">
          <span className="sr-only">Font</span>
          <select defaultValue="Arial" onChange={(e) => command('fontName', e.target.value)}>
            <option>Arial</option>
            <option>Calibri</option>
            <option>Georgia</option>
            <option>Times New Roman</option>
          </select>
        </label>
        <label className="quick-select-label" title="Text size">
          <span className="sr-only">Text size</span>
          <select defaultValue="3" onChange={(e) => command('fontSize', e.target.value)}>
            <option value="2">Small</option>
            <option value="3">Normal</option>
            <option value="4">Large</option>
            <option value="5">XL</option>
          </select>
        </label>
        <div className="quick-tool-group">
          <ToolButton title="Bulleted list" onClick={() => command('insertUnorderedList')}>• List</ToolButton>
          <ToolButton title="Numbered list" onClick={() => command('insertOrderedList')}>1. List</ToolButton>
        </div>
        <div className="quick-tool-group">
          <ToolButton title="Align left" onClick={() => command('justifyLeft')}>≡</ToolButton>
          <ToolButton title="Align center" onClick={() => command('justifyCenter')}>≣</ToolButton>
          <ToolButton title="Align right" onClick={() => command('justifyRight')}>≡→</ToolButton>
          <ToolButton title="Justify" onClick={() => command('justifyFull')}>☰</ToolButton>
        </div>
        <label className="quick-select-label" title="Line spacing">
          <span className="sr-only">Line spacing</span>
          <select defaultValue="1.35" onChange={(e) => setLineHeight(e.target.value)}>
            <option value="1.1">1.0</option>
            <option value="1.35">1.15</option>
            <option value="1.5">1.5</option>
            <option value="1.8">1.8</option>
          </select>
        </label>
        <label className="quick-color" title="Text color">
          <span>A</span>
          <input type="color" defaultValue="#111827" onInput={(e) => command('foreColor', (e.target as HTMLInputElement).value)} />
        </label>
        <div className="quick-tool-group">
          <ToolButton title="Add link" onClick={() => {
            const url = window.prompt('Paste the link (https://…)');
            if (url && /^https?:\/\//i.test(url.trim())) command('createLink', url.trim());
          }}>🔗</ToolButton>
          <ToolButton title="Insert line break" onClick={() => command('insertHTML', '<br>')}>↵</ToolButton>
          <ToolButton title="Insert divider line" onClick={() => command('insertHorizontalRule')}>―</ToolButton>
          <ToolButton title="Add a new free-text line" onClick={addCustomText}>＋ Text</ToolButton>
        </div>
      </div>

      <div className="quick-tip no-print">
        <b>Fast workflow:</b> click text → drag/select the words → use B / I / U / lists / alignment above. On mobile, long-press to select text; the toolbar scrolls horizontally.
      </div>
      {downloadError && <div className="notice err no-print" style={{ marginBottom: 12 }}>{downloadError}</div>}

      <div className="quick-page-wrap">
        <article id="quick-resume-sheet" className="sheet quick-sheet">
          <header className="quick-resume-header">
            {rich('personal.fullName', r.personal.fullName, (v) => setPersonal('fullName', v), 'Your full name', 'quick-name', true)}
            {rich('personal.headline', r.personal.headline, (v) => setPersonal('headline', v), 'Target job title', 'quick-headline', true)}
            <div className="quick-contact-grid">
              {rich('personal.email', r.personal.email, (v) => setPersonal('email', v), 'Email', 'quick-contact', true)}
              {rich('personal.phone', r.personal.phone, (v) => setPersonal('phone', v), 'Phone', 'quick-contact', true)}
              {rich('personal.city', r.personal.city, (v) => setPersonal('city', v), 'City', 'quick-contact', true)}
              {rich('personal.linkedin', r.personal.linkedin, (v) => setPersonal('linkedin', v), 'LinkedIn', 'quick-contact', true)}
              {rich('personal.website', r.personal.website, (v) => setPersonal('website', v), 'Website', 'quick-contact', true)}
            </div>
          </header>

          <section className="quick-section">
            <h2>Professional Summary</h2>
            {rich('summary', r.summary, (v) => mutate((prev) => ({ ...prev, summary: v })), 'Add or edit your professional summary…', 'quick-paragraph')}
          </section>

          {(r.bestExperience || importInfo) && (
            <section className="quick-section">
              <h2>Career Highlight</h2>
              {rich('highlight', r.bestExperience, (v) => mutate((prev) => ({ ...prev, bestExperience: v })), 'Add a strong career highlight…', 'quick-paragraph')}
            </section>
          )}

          {r.experience.length > 0 && (
            <section className="quick-section">
              <h2>Experience</h2>
              {r.experience.map((item) => (
                <div className="quick-entry" key={item.id}>
                  <div className="quick-entry-head">
                    <div className="quick-entry-main">
                      {rich(`exp.${item.id}.role`, item.role, (v) => setExperience(item.id, { role: v }), 'Role', 'quick-entry-title', true)}
                      <div className="quick-entry-subline">
                        {rich(`exp.${item.id}.company`, item.company, (v) => setExperience(item.id, { company: v }), 'Company', 'quick-entry-company', true)}
                        {rich(`exp.${item.id}.location`, item.location, (v) => setExperience(item.id, { location: v }), 'Location', 'quick-entry-location', true)}
                      </div>
                    </div>
                    <div className="quick-dates">
                      {rich(`exp.${item.id}.start`, item.start, (v) => setExperience(item.id, { start: v }), 'Start', 'quick-date', true)}
                      <span>–</span>
                      {rich(`exp.${item.id}.end`, item.current ? 'Present' : item.end, (v) => setExperience(item.id, item.current && v.toLowerCase() === 'present' ? { end: '' } : { end: v, current: v.trim().toLowerCase() === 'present' }), 'End', 'quick-date', true)}
                    </div>
                  </div>
                  <ul className="quick-bullets">
                    {item.bullets.map((bullet, index) => (
                      <li key={`${item.id}-${index}`}>
                        {rich(`exp.${item.id}.bullet.${index}`, bullet, (v) => {
                          const bullets = [...item.bullets];
                          bullets[index] = v;
                          setExperience(item.id, { bullets });
                        }, 'Edit this achievement…', 'quick-bullet')}
                        <button className="quick-x quick-only-control" type="button" aria-label="Remove bullet" onClick={() => removeExperienceBullet(item.id, index)}>×</button>
                      </li>
                    ))}
                  </ul>
                  <button className="quick-add quick-only-control" type="button" onClick={() => addExperienceBullet(item.id)}>＋ Add bullet</button>
                </div>
              ))}
            </section>
          )}

          {r.education.length > 0 && (
            <section className="quick-section">
              <h2>Education</h2>
              {r.education.map((item) => (
                <div className="quick-entry" key={item.id}>
                  <div className="quick-entry-head">
                    <div className="quick-entry-main">
                      {rich(`edu.${item.id}.degree`, item.degree, (v) => setEducation(item.id, { degree: v }), 'Degree', 'quick-entry-title', true)}
                      {rich(`edu.${item.id}.school`, item.school, (v) => setEducation(item.id, { school: v }), 'School / University', 'quick-entry-company', true)}
                      {rich(`edu.${item.id}.location`, item.location, (v) => setEducation(item.id, { location: v }), 'Location', 'quick-entry-location', true)}
                    </div>
                    {rich(`edu.${item.id}.year`, item.year, (v) => setEducation(item.id, { year: v }), 'Year', 'quick-date', true)}
                  </div>
                  {rich(`edu.${item.id}.note`, item.note, (v) => setEducation(item.id, { note: v }), 'Coursework, score, distinction…', 'quick-note')}
                </div>
              ))}
            </section>
          )}

          <section className="quick-section">
            <h2>Skills</h2>
            {rich('skills', r.skills.join(' · '), (v) => mutate((prev) => ({
              ...prev,
              skills: v.split(/[\n,·|]+/).map((part) => part.trim()).filter(Boolean),
            })), 'Add skills separated by commas or dots…', 'quick-skills')}
          </section>

          {r.projects.length > 0 && (
            <section className="quick-section">
              <h2>Projects</h2>
              {r.projects.map((item) => (
                <div className="quick-entry" key={item.id}>
                  <div className="quick-entry-head">
                    {rich(`project.${item.id}.name`, item.name, (v) => setProject(item.id, { name: v }), 'Project name', 'quick-entry-title', true)}
                    {rich(`project.${item.id}.link`, item.link, (v) => setProject(item.id, { link: v }), 'Project link', 'quick-date', true)}
                  </div>
                  {rich(`project.${item.id}.points`, item.points, (v) => setProject(item.id, { points: v }), 'What did you build or achieve?', 'quick-paragraph')}
                </div>
              ))}
            </section>
          )}

          {r.certs.length > 0 && (
            <section className="quick-section">
              <h2>Certifications</h2>
              {r.certs.map((item) => (
                <div className="quick-inline-entry" key={item.id}>
                  {rich(`cert.${item.id}.name`, item.name, (v) => setCert(item.id, { name: v }), 'Certification', 'quick-entry-title', true)}
                  <span>·</span>
                  {rich(`cert.${item.id}.issuer`, item.issuer, (v) => setCert(item.id, { issuer: v }), 'Issuer', 'quick-entry-company', true)}
                  <span>·</span>
                  {rich(`cert.${item.id}.year`, item.year, (v) => setCert(item.id, { year: v }), 'Year', 'quick-date', true)}
                </div>
              ))}
            </section>
          )}

          {r.achievements.length > 0 && (
            <section className="quick-section">
              <h2>Achievements</h2>
              <ul className="quick-bullets">
                {r.achievements.map((item, index) => (
                  <li key={index}>
                    {rich(`achievement.${index}`, item, (v) => mutate((prev) => {
                      const achievements = [...prev.achievements];
                      achievements[index] = v;
                      return { ...prev, achievements };
                    }), 'Achievement…', 'quick-bullet')}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {r.languages.length > 0 && (
            <section className="quick-section">
              <h2>Languages</h2>
              <div className="quick-inline-list">
                {r.languages.map((item) => (
                  <div className="quick-inline-entry" key={item.id}>
                    {rich(`lang.${item.id}.name`, item.name, (v) => setLanguage(item.id, { name: v }), 'Language', 'quick-entry-company', true)}
                    <span>·</span>
                    {rich(`lang.${item.id}.level`, item.level, (v) => setLanguage(item.id, { level: v }), 'Level', 'quick-note', true)}
                  </div>
                ))}
              </div>
            </section>
          )}

          {r.hobbies.length > 0 && (
            <section className="quick-section">
              <h2>Interests</h2>
              {rich('hobbies', r.hobbies.join(' · '), (v) => mutate((prev) => ({
                ...prev,
                hobbies: v.split(/[\n,·|]+/).map((part) => part.trim()).filter(Boolean),
              })), 'Interests…', 'quick-skills')}
            </section>
          )}

          {customBlocks.length > 0 && (
            <section className="quick-section">
              <h2>Additional Information</h2>
              {customBlocks.map((block) => (
                <div className="quick-custom-row" key={block.id}>
                  {rich(`custom.${block.id}`, block.plain, (v) => updateCustom(block.id, v), 'Type any extra line or paragraph…', 'quick-paragraph')}
                  <button className="quick-x quick-only-control" type="button" aria-label="Remove additional text" onClick={() => removeCustom(block.id)}>×</button>
                </div>
              ))}
            </section>
          )}
        </article>
      </div>

      <div className="quick-bottom-actions no-print">
        <button className="btn" onClick={addCustomText}>＋ Add text</button>
        <button className="btn" onClick={openGuided}>Advanced / Guided editor</button>
        <button className="btn primary" onClick={downloadPdf} disabled={downloading}>
          {downloading ? 'Preparing PDF…' : '⬇ Download PDF'}
        </button>
      </div>

      <style>{`
        .quick-editor-root { width: 100%; min-width: 0; }
        .quick-editor-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:12px; }
        .quick-toolbar { position:sticky; top:8px; z-index:40; display:flex; align-items:center; gap:6px; overflow-x:auto; padding:8px; margin:0 0 10px; border:1px solid var(--silver-300); border-radius:12px; background:rgba(255,255,255,.97); box-shadow:0 8px 30px rgba(15,33,72,.10); scrollbar-width:thin; }
        .quick-tool-group { display:flex; align-items:center; gap:3px; flex:0 0 auto; padding-right:5px; border-right:1px solid var(--silver-200); }
        .quick-tool-btn { min-width:35px; height:34px; padding:0 9px; border:1px solid transparent; border-radius:7px; background:#fff; color:var(--navy-900); font-size:13px; cursor:pointer; white-space:nowrap; }
        .quick-tool-btn:hover, .quick-tool-btn:focus-visible { border-color:var(--silver-300); background:var(--navy-50); outline:none; }
        .quick-select-label { flex:0 0 auto; }
        .quick-select-label select { height:34px; max-width:132px; border:1px solid var(--silver-300); border-radius:7px; background:#fff; color:var(--navy-900); padding:0 7px; font-size:12px; }
        .quick-color { width:38px; height:34px; position:relative; display:grid; place-items:center; border:1px solid var(--silver-300); border-radius:7px; background:#fff; flex:0 0 auto; overflow:hidden; font-weight:800; }
        .quick-color input { position:absolute; inset:0; opacity:0; cursor:pointer; }
        .quick-tip { margin-bottom:12px; padding:10px 12px; border:1px solid #bfdbfe; background:#eff6ff; border-radius:10px; color:#1e3a5f; font-size:12.5px; }
        .quick-page-wrap { display:flex; justify-content:center; overflow:visible; padding:6px 0 18px; }
        .sheet.quick-sheet { width:min(100%, 794px) !important; min-height:1123px !important; height:auto !important; box-sizing:border-box !important; margin:0 auto !important; padding:62px 66px !important; background:#fff !important; color:#111827 !important; box-shadow:0 14px 45px rgba(15,33,72,.16) !important; border:1px solid #e5e7eb !important; border-radius:2px !important; overflow:visible !important; font-family:Arial, Helvetica, sans-serif !important; font-size:13px !important; line-height:1.35 !important; display:block !important; }
        .quick-resume-header { padding-bottom:16px; margin-bottom:16px; border-bottom:2px solid #0f2148; }
        .quick-rich { min-height:20px; border-radius:4px; outline:1px solid transparent; transition:background .12s, outline-color .12s; white-space:pre-wrap; word-break:break-word; }
        .quick-rich:hover { background:#f8fafc; outline-color:#e2e8f0; }
        .quick-rich:focus { background:#fffef7; outline:2px solid #93c5fd; outline-offset:2px; }
        .quick-rich:empty::before { content:attr(data-placeholder); color:#94a3b8; font-style:italic; }
        .quick-rich.single { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .quick-name { min-height:34px; font-size:30px; line-height:1.1; font-weight:800; letter-spacing:-.5px; color:#0f2148; }
        .quick-headline { margin-top:4px; min-height:22px; font-size:16px; font-weight:600; color:#334155; }
        .quick-contact-grid { display:flex; flex-wrap:wrap; gap:5px 14px; margin-top:10px; color:#475569; font-size:11.5px; }
        .quick-contact { min-width:80px; max-width:100%; }
        .quick-section { margin:0 0 17px; break-inside:auto; }
        .quick-section > h2 { margin:0 0 7px; padding-bottom:4px; border-bottom:1px solid #cbd5e1; color:#0f2148; font-size:13px; line-height:1.2; letter-spacing:.7px; text-transform:uppercase; font-weight:800; }
        .quick-paragraph { min-height:30px; }
        .quick-entry { margin:0 0 13px; break-inside:avoid; }
        .quick-entry-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
        .quick-entry-main { min-width:0; flex:1; }
        .quick-entry-title { font-weight:800; color:#111827; min-height:19px; }
        .quick-entry-subline { display:flex; flex-wrap:wrap; align-items:center; gap:4px 10px; margin-top:1px; }
        .quick-entry-company { font-weight:650; color:#334155; min-width:70px; }
        .quick-entry-location, .quick-note { color:#64748b; font-size:11.5px; min-width:45px; }
        .quick-entry-location:not(:empty)::before { content:'· '; }
        .quick-dates { display:flex; align-items:center; justify-content:flex-end; gap:4px; flex:0 0 auto; color:#475569; font-size:11px; white-space:nowrap; }
        .quick-date { min-width:40px; text-align:right; color:#475569; font-size:11px; }
        .quick-bullets { margin:6px 0 2px 18px; padding:0; }
        .quick-bullets li { position:relative; padding-right:18px; margin:2px 0; }
        .quick-bullet { min-height:18px; }
        .quick-x { position:absolute; right:-4px; top:0; width:20px; height:20px; padding:0; border:0; border-radius:50%; background:transparent; color:#94a3b8; cursor:pointer; font-size:16px; line-height:20px; }
        .quick-x:hover { color:#b91c1c; background:#fee2e2; }
        .quick-add { margin-top:4px; border:1px dashed #cbd5e1; border-radius:6px; background:#f8fafc; color:#334155; font-size:11px; padding:4px 8px; cursor:pointer; }
        .quick-skills { min-height:26px; }
        .quick-inline-entry { display:flex; flex-wrap:wrap; align-items:center; gap:5px; margin:3px 0; }
        .quick-inline-list { display:flex; flex-wrap:wrap; gap:6px 16px; }
        .quick-custom-row { position:relative; padding-right:24px; margin:5px 0; }
        .quick-custom-row .quick-x { right:0; }
        .quick-bottom-actions { display:flex; justify-content:center; gap:8px; flex-wrap:wrap; margin:0 0 14px; }
        @media (max-width: 700px) {
          .quick-editor-head { gap:10px; }
          .quick-toolbar { top:66px; margin-left:-4px; margin-right:-4px; border-radius:9px; }
          .quick-tool-btn { min-width:38px; height:36px; }
          .sheet.quick-sheet { min-height:0 !important; padding:34px 24px !important; font-size:12.5px !important; box-shadow:0 6px 24px rgba(15,33,72,.12) !important; }
          .quick-name { font-size:25px; }
          .quick-contact-grid { gap:4px 10px; }
          .quick-entry-head { display:block; }
          .quick-dates { justify-content:flex-start; margin-top:3px; }
          .quick-date { text-align:left; }
        }
        @media print {
          @page { size:A4; margin:0; }
          .quick-only-control, .no-print { display:none !important; }
          .sheet.quick-sheet { width:210mm !important; min-height:297mm !important; padding:16mm 17mm !important; margin:0 !important; border:0 !important; box-shadow:none !important; }
          .quick-rich { outline:0 !important; background:transparent !important; }
        }
      `}</style>
    </div>
  );
}
