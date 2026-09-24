/**
 * Import draft — the bridge that makes "extract → auto-fill the form → edit →
 * see it in the resume" work as one continuous session.
 *
 * After parsing, the structured resume lives here (sessionStorage + in-memory
 * pub/sub). The import screen's form writes to it on every keystroke and the
 * live A4 preview reads from it, so the two can never drift apart. If the user
 * opens the editor for the same resume before saving, the editor picks the
 * draft up instead of showing an empty page.
 */

import type { Resume } from './types';
import type { ParseMeta, SupportedFormat } from './resumeParser';

const KEY = 'craftcv.import.draft.v1';

export interface ImportDraft {
  /** The resume being built. Its id becomes the saved resume's id. */
  resume: Resume;
  fileName: string;
  fileSize: number;
  format: SupportedFormat;
  meta: ParseMeta | null;
  rawText: string;
  updatedAt: number;
}

type Listener = (draft: ImportDraft | null) => void;

let cache: ImportDraft | null = null;
let loaded = false;
const listeners = new Set<Listener>();

function read(): ImportDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ImportDraft;
    if (!parsed || typeof parsed !== 'object' || !parsed.resume) return null;
    return parsed;
  } catch {
    return null;
  }
}

function write(draft: ImportDraft | null) {
  cache = draft;
  loaded = true;
  try {
    if (draft) sessionStorage.setItem(KEY, JSON.stringify(draft));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* private mode / quota — in-memory copy still works for this tab */
  }
  for (const fn of listeners) fn(draft);
}

export function loadImportDraft(): ImportDraft | null {
  if (!loaded) {
    cache = read();
    loaded = true;
  }
  return cache;
}

/** Autosaves the draft. Cheap enough to call on every keystroke. */
export function saveImportDraft(draft: Omit<ImportDraft, 'updatedAt'> & { updatedAt?: number }) {
  write({ ...draft, updatedAt: Date.now() });
}

/** Patch just the resume half of the draft (the common case while typing). */
export function updateDraftResume(resume: Resume) {
  const current = loadImportDraft();
  if (!current) return;
  write({ ...current, resume, updatedAt: Date.now() });
}

export function clearImportDraft() {
  write(null);
}

export function subscribeImportDraft(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * The resume an editor instance should open with: the live import draft when it
 * is the same resume (so nothing typed on the import screen is ever lost).
 */
export function draftResumeFor(id: string): Resume | null {
  const draft = loadImportDraft();
  if (!draft) return null;
  if (draft.resume.id === id) return draft.resume;
  return null;
}

export function isDraftResume(id: string): boolean {
  const draft = loadImportDraft();
  return !!draft && draft.resume.id === id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Where a resume came from — kept after saving so the editor can say
// "imported from scanned-resume.pdf · OCR 86%" instead of showing nothing.
// ─────────────────────────────────────────────────────────────────────────────

const INFO_KEY = 'craftcv.import.info.v1';

export interface ImportInfo {
  fileName: string;
  format: SupportedFormat;
  meta: ParseMeta | null;
  at: number;
}

type InfoMap = Record<string, ImportInfo>;

function readInfo(): InfoMap {
  try {
    return JSON.parse(sessionStorage.getItem(INFO_KEY) || '{}') as InfoMap;
  } catch {
    return {};
  }
}

export function rememberImportInfo(id: string, info: Omit<ImportInfo, 'at'>) {
  try {
    const map = readInfo();
    map[id] = { ...info, at: Date.now() };
    const ids = Object.keys(map);
    // keep the map tiny — only the most recent few imports matter
    if (ids.length > 12) {
      for (const old of ids.sort((a, b) => map[a].at - map[b].at).slice(0, ids.length - 12)) delete map[old];
    }
    sessionStorage.setItem(INFO_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable — the banner is optional */
  }
}

export function importInfoFor(id: string): ImportInfo | null {
  return readInfo()[id] || null;
}

export function forgetImportInfo(id: string) {
  try {
    const map = readInfo();
    delete map[id];
    sessionStorage.setItem(INFO_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}
