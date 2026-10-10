import type { Resume } from './types';

const GUEST_DOWNLOAD_KEY = 'resumemakery.guest.first-download-used.v1';
const GUEST_DRAFT_KEY = 'resumemakery.guest.draft.v1';
const GUEST_AUTH_PENDING_KEY = 'resumemakery.guest.auth-pending.v1';

export function guestDownloadUsed(): boolean {
  try { return localStorage.getItem(GUEST_DOWNLOAD_KEY) === '1'; } catch { return false; }
}

export function markGuestDownloadUsed(): void {
  try { localStorage.setItem(GUEST_DOWNLOAD_KEY, '1'); } catch { /* storage can be unavailable in private mode */ }
}

/** Guest drafts are intentionally session-only: refresh-safe, but not permanent account storage. */
export function saveGuestDraft(resume: Resume): void {
  try { sessionStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(resume)); } catch { /* best effort only */ }
}

export function loadGuestDraft(): Resume | null {
  try {
    const raw = sessionStorage.getItem(GUEST_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Resume;
    return parsed && typeof parsed === 'object' && typeof parsed.id === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function clearGuestDraft(): void {
  try { sessionStorage.removeItem(GUEST_DRAFT_KEY); } catch { /* ignore */ }
}

export function markGuestAuthPending(): void {
  try { sessionStorage.setItem(GUEST_AUTH_PENDING_KEY, '1'); } catch { /* ignore */ }
}

export function guestAuthPending(): boolean {
  try { return sessionStorage.getItem(GUEST_AUTH_PENDING_KEY) === '1'; } catch { return false; }
}

export function clearGuestAuthPending(): void {
  try { sessionStorage.removeItem(GUEST_AUTH_PENDING_KEY); } catch { /* ignore */ }
}
