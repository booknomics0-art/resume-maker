export interface NavigationEventDetail {
  to: string;
  sameRoute: boolean;
}

/**
 * Single navigation entrypoint for the hash app. Besides changing the hash it
 * emits an app-level event, so same-route taps (for example Upload while
 * already on Upload) can still replay the page transition and scroll reset.
 *
 * On phones, blur the active control before a route change so the software
 * keyboard does not resize the next editor screen halfway through mounting.
 */
export function navigate(to: string): void {
  const normalized = to.startsWith('/') ? to : `/${to}`;
  const nextHash = `#${normalized}`;
  const sameRoute = window.location.hash === nextHash;

  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
  document.body.style.overflow = '';
  document.documentElement.style.scrollBehavior = 'auto';
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

  window.dispatchEvent(new CustomEvent<NavigationEventDetail>('craftcv:navigate', {
    detail: { to: normalized, sameRoute },
  }));

  if (!sameRoute) window.location.hash = normalized;

  window.requestAnimationFrame(() => {
    document.documentElement.style.scrollBehavior = '';
  });
}
