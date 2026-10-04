let installed = false;
let timer = 0;

function kickRouteMotion() {
  window.clearTimeout(timer);
  window.requestAnimationFrame(() => {
    const main = document.querySelector('.main') as HTMLElement | null;
    if (!main) return;
    main.classList.remove('craftcv-route-slide');
    // Force a reflow so clicking Upload while already on Upload replays motion.
    void main.offsetWidth;
    main.classList.add('craftcv-route-slide');
    timer = window.setTimeout(() => main.classList.remove('craftcv-route-slide'), 360);
  });
}

export function installRouteMotion() {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  const style = document.createElement('style');
  style.setAttribute('data-craftcv-route-motion', 'true');
  style.textContent = `
    @keyframes craftcvRouteSlideIn {
      from { opacity: .2; transform: translate3d(22px, 0, 0); }
      to { opacity: 1; transform: translate3d(0, 0, 0); }
    }
    .main.craftcv-route-slide {
      animation: craftcvRouteSlideIn .30s cubic-bezier(.22,.8,.22,1) both;
    }
    @media (prefers-reduced-motion: reduce) {
      .main.craftcv-route-slide { animation: none !important; }
    }
  `;
  document.head.appendChild(style);

  window.addEventListener('hashchange', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    kickRouteMotion();
  });

  // Hashchange does not fire when the user taps the same nav item again.
  document.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    const link = target?.closest?.('a[href^="#/"]') as HTMLAnchorElement | null;
    if (!link) return;
    const destination = link.getAttribute('href') || '';
    if (destination === window.location.hash) kickRouteMotion();
  }, true);
}
