import type { NavigationEventDetail } from './navigation';

let installed = false;
let timer = 0;
let lastKick = 0;

function kickRouteMotion() {
  const now = Date.now();
  // navigate() followed by hashchange can happen in the same frame. Coalesce
  // those into one clean animation instead of flashing twice.
  if (now - lastKick < 80) return;
  lastKick = now;
  window.clearTimeout(timer);
  window.requestAnimationFrame(() => {
    const main = document.querySelector('.main') as HTMLElement | null;
    if (!main) return;
    main.classList.remove('craftcv-route-slide');
    void main.offsetWidth;
    main.classList.add('craftcv-route-slide');
    timer = window.setTimeout(() => main.classList.remove('craftcv-route-slide'), 460);
  });
}

function resetWorkspaceScroll() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const main = document.querySelector('.main') as HTMLElement | null;
  if (main && main.scrollTop > 0) main.scrollTo({ top: 0, behavior: 'smooth' });
}

export function installRouteMotion() {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  const style = document.createElement('style');
  style.setAttribute('data-craftcv-route-motion', 'true');
  style.textContent = `
    @keyframes craftcvRouteSlideIn {
      0% { opacity: .34; transform: translate3d(48px, 0, 0); }
      62% { opacity: 1; transform: translate3d(-3px, 0, 0); }
      100% { opacity: 1; transform: translate3d(0, 0, 0); }
    }
    .main.craftcv-route-slide {
      animation: craftcvRouteSlideIn .42s cubic-bezier(.22,.8,.22,1) both;
      will-change: transform, opacity;
    }
    @media (max-width: 760px) {
      @keyframes craftcvRouteSlideIn {
        0% { opacity: .45; transform: translate3d(28px, 0, 0); }
        100% { opacity: 1; transform: translate3d(0, 0, 0); }
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .main.craftcv-route-slide { animation: none !important; }
    }
  `;
  document.head.appendChild(style);

  window.addEventListener('craftcv:navigate', (event) => {
    const detail = (event as CustomEvent<NavigationEventDetail>).detail;
    resetWorkspaceScroll();
    // This is the important path for clicking Upload while already on Upload:
    // hashchange will not fire, but navigate() always emits this event.
    if (detail?.sameRoute) kickRouteMotion();
  });

  window.addEventListener('hashchange', () => {
    resetWorkspaceScroll();
    kickRouteMotion();
  });
}
