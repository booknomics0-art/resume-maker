// AdSense safety boundary.
// Ads, if enabled after account approval and consent setup, may only be shown on
// publisher-content pages. Keep them out of editors, auth, dashboards, imports,
// PDF/download UI and any screen whose primary purpose is navigation/action.
const CONTENT_AD_ROUTES = new Set([
  '/guides',
  '/guides/resume-format-india',
  '/guides/resume-summary-examples',
  '/guides/resume-skills-guide',
  '/guides/fresher-resume-guide',
]);

export function canShowContentAds(pathname: string): boolean {
  const clean = (pathname || '/').split('?')[0].replace(/\/$/, '') || '/';
  return CONTENT_AD_ROUTES.has(clean);
}

export const contentAdRoutes = Object.freeze([...CONTENT_AD_ROUTES]);
