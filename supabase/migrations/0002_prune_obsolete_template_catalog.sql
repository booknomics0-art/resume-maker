-- Purge obsolete template-catalog rows from earlier catalogs.
-- The live renderer uses src/lib/templates.ts; retain only these 50 current IDs.
-- Run this migration against the existing Supabase project to remove stale public catalog entries.
delete from public.template_catalog
where id not in (
  'ats-sterling', 'ats-ink', 'it-sidebar', 'it-masthead', 'data-bars',
  'data-grid', 'corp-boardroom', 'corp-tint', 'sales-panelband', 'sales-band',
  'care-sidebar', 'edu-chalk', 'creative-spine', 'lead-serif', 'fresher-portrait',
  'ats-ledger', 'ats-numbered', 'ats-grid', 'it-timeline', 'it-soft',
  'it-monogram', 'data-spine', 'data-banner', 'data-soft', 'corp-classic',
  'corp-metro', 'corp-portrait', 'sales-masthead', 'sales-timeline', 'sales-studio',
  'care-compact', 'care-spine', 'care-panelband', 'care-monogram', 'edu-minimal',
  'edu-editorial', 'edu-banner', 'edu-soft', 'creative-masthead', 'creative-classic',
  'creative-tint', 'creative-panelband', 'lead-metro', 'lead-ledger', 'lead-portrait',
  'lead-split', 'fresher-timeline', 'fresher-studio', 'fresher-spine', 'fresher-bars'
);
