let installed = false;
let timers: number[] = [];

function isMobileImport() {
  return (window.location.pathname === '/import' || window.location.hash.startsWith('#/import')) && window.matchMedia('(max-width: 900px)').matches;
}

function surfaceImportError() {
  if (!isMobileImport()) return;
  const error = document.querySelector('.editor-root .notice.err') as HTMLElement | null;
  if (!error) return;

  const editTab = Array.from(document.querySelectorAll('.editor-mobile-tabs button'))
    .find((node) => (node.textContent || '').toLowerCase().includes('edit fields')) as HTMLButtonElement | undefined;
  if (editTab && editTab.getAttribute('aria-selected') !== 'true') editTab.click();

  window.requestAnimationFrame(() => {
    error.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

/**
 * Mobile-only UX guard for the import Preview → Save path.
 * Validation belongs to React's importer; this only makes those validation
 * errors visible when the form pane is hidden behind the Preview tab.
 */
export function installMobileImportSaveGuard() {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  document.addEventListener('click', (event) => {
    if (!isMobileImport()) return;
    const target = event.target as Element | null;
    const button = target?.closest?.('button') as HTMLButtonElement | null;
    if (!button) return;
    const text = (button.textContent || '').toLowerCase();
    if (!text.includes('save') || !text.includes('open in editor')) return;

    timers.forEach((id) => window.clearTimeout(id));
    timers = [
      window.setTimeout(surfaceImportError, 0),
      window.setTimeout(surfaceImportError, 80),
      window.setTimeout(surfaceImportError, 220),
    ];
  }, true);
}
