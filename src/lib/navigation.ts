export interface NavigationEventDetail {
  to: string;
  sameRoute: boolean;
}

// Keep the internal event name stable so existing UI motion/listener code keeps
// working across the public brand migration.
export const NAVIGATION_EVENT = 'craftcv:navigate';

export function normalizePath(path: string): string {
  if (!path) return '/';
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  const clean = withSlash.replace(/\/{2,}/g, '/');
  return clean.length > 1 ? clean.replace(/\/$/, '') : clean;
}

/** Convert legacy hash routes (/#/privacy) to clean URLs (/privacy) once. */
export function migrateLegacyHashRoute(): void {
  const hash = window.location.hash;
  if (!hash.startsWith('#/')) return;
  const target = normalizePath(hash.slice(1));
  window.history.replaceState({}, '', `${target}${window.location.search || ''}`);
}

/** Single navigation entrypoint: clean, shareable, crawlable URLs. */
export function navigate(to: string): void {
  const normalized = normalizePath(to);
  const sameRoute = normalizePath(window.location.pathname) === normalized;
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
  document.body.style.overflow = '';
  document.documentElement.style.scrollBehavior = 'auto';
  if (!sameRoute) window.history.pushState({}, '', normalized);
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  window.dispatchEvent(new CustomEvent<NavigationEventDetail>(NAVIGATION_EVENT, {
    detail: { to: normalized, sameRoute },
  }));
  window.requestAnimationFrame(() => { document.documentElement.style.scrollBehavior = ''; });
}
