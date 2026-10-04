export interface OriginalDocumentRecord {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  capturedAt: number;
  blob: Blob;
}

const DB_NAME = 'craftcv-original-docs-v1';
const STORE = 'documents';
const PENDING_ID = '__pending_resume_upload__';
const PENDING_TTL_MS = 60 * 60 * 1000;

let installed = false;
const memory = new Map<string, OriginalDocumentRecord>();

function canUseIndexedDb() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!canUseIndexedDb()) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Could not open local resume storage'));
  });
}

async function put(record: OriginalDocumentRecord) {
  memory.set(record.id, record);
  if (!canUseIndexedDb()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Could not save original resume'));
      tx.onabort = () => reject(tx.error || new Error('Could not save original resume'));
    });
    db.close();
  } catch {
    // In-memory fallback keeps the current tab safe even in private browsing.
  }
}

async function get(id: string): Promise<OriginalDocumentRecord | null> {
  const cached = memory.get(id);
  if (cached) return cached;
  if (!canUseIndexedDb()) return null;
  try {
    const db = await openDb();
    const value = await new Promise<OriginalDocumentRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve((req.result as OriginalDocumentRecord | undefined) || null);
      req.onerror = () => reject(req.error || new Error('Could not read original resume'));
    });
    db.close();
    if (value) memory.set(id, value);
    return value;
  } catch {
    return null;
  }
}

async function remove(id: string) {
  memory.delete(id);
  if (!canUseIndexedDb()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
    db.close();
  } catch {
    // best effort cleanup only
  }
}

function looksLikeResumeFile(file: File) {
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  return /\.(pdf|docx?|txt|json|jpe?g|png|webp|bmp|gif|avif)$/i.test(name)
    || type === 'application/pdf'
    || type === 'text/plain'
    || type.startsWith('image/')
    || type.includes('wordprocessingml')
    || type === 'application/msword';
}

function resumeUploadInputPresent() {
  const inputs = Array.from(document.querySelectorAll('input[type="file"]')) as HTMLInputElement[];
  return inputs.some((input) => {
    const accept = (input.accept || '').toLowerCase();
    return accept.includes('.pdf') && accept.includes('.docx') && accept.includes('.txt');
  });
}

export async function savePendingOriginal(file: File) {
  if (!looksLikeResumeFile(file)) return;
  const blob = file.slice(0, file.size, file.type || 'application/octet-stream');
  await put({
    id: PENDING_ID,
    name: file.name || 'uploaded-resume',
    type: file.type || blob.type || 'application/octet-stream',
    size: file.size,
    lastModified: file.lastModified || Date.now(),
    capturedAt: Date.now(),
    blob,
  });
}

export async function loadOriginalDocument(id: string): Promise<OriginalDocumentRecord | null> {
  return get(id);
}

/**
 * Move the most recent resume upload into a stable resume-specific key.
 * The parser creates the resume id only after the file has already been read,
 * so capture happens first and claiming happens when the editor opens.
 */
export async function claimPendingOriginal(id: string): Promise<OriginalDocumentRecord | null> {
  const existing = await get(id);
  if (existing) return existing;
  const pending = await get(PENDING_ID);
  if (!pending) return null;
  if (Date.now() - pending.capturedAt > PENDING_TTL_MS) {
    await remove(PENDING_ID);
    return null;
  }
  const claimed = { ...pending, id };
  await put(claimed);
  await remove(PENDING_ID);
  return claimed;
}

/**
 * Preserve the real upload before OCR/parser code touches it. Capture both the
 * file input and drag/drop paths. Requiring the full resume input signature on
 * `change` prevents profile-photo uploads from replacing the source resume.
 */
export function installOriginalUploadCapture() {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  document.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;
    if (!window.location.hash.startsWith('#/import')) return;
    const accept = (input.accept || '').toLowerCase();
    const looksLikeResumeInput = accept.includes('.pdf') && accept.includes('.docx') && accept.includes('.txt');
    if (!looksLikeResumeInput) return;
    const file = input.files?.[0];
    if (!file) return;
    void savePendingOriginal(file);
  }, true);

  // React's importer accepts drag/drop too. Only capture while the actual
  // resume upload input is mounted; once the import review/form is open that
  // input is gone, so dragging a profile photo cannot replace the source file.
  document.addEventListener('drop', (event) => {
    if (!window.location.hash.startsWith('#/import')) return;
    if (!resumeUploadInputPresent()) return;
    const drag = event as DragEvent;
    const file = drag.dataTransfer?.files?.[0];
    if (!file || !looksLikeResumeFile(file)) return;
    void savePendingOriginal(file);
  }, true);
}
