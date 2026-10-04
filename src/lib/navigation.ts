export interface NavigationEventDetail {
  to: string;
  sameRoute: boolean;
}

/**
 * Single navigation entrypoint for the hash app. Besides changing the hash it
 * emits an app-level event, so same-route taps (for example Upload while
 * already on Upload) can still replay the page transition and scroll reset.
 */
export function navigate(to: string): void {
  const normalized = to.startsWith('/') ? to : `/${to}`;
  const nextHash = `#${normalized}`;
  const sameRoute = window.location.hash === nextHash;
  window.dispatchEvent(new CustomEvent<NavigationEventDetail>('craftcv:navigate', {
    detail: { to: normalized, sameRoute },
  }));
  if (!sameRoute) window.location.hash = normalized;
}
