import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { checks, root, tmpDir } from './_harness.mjs';

mkdirSync(tmpDir, { recursive: true });
const entry = join(tmpDir, 'fresher-mode-entry.ts');
const outfile = join(tmpDir, 'fresher-mode-bundle.js');
writeFileSync(entry, `
  export { createFresherResume, buildFresherReadiness } from '../../src/lib/fresherMode';
`);

await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  outfile,
  logLevel: 'error',
  define: { 'import.meta.env': '{}' },
});

const mod = await import(pathToFileURL(outfile).href);
const { createFresherResume, buildFresherReadiness } = mod;
const dashboard = readFileSync(join(root, 'src', 'components', 'Dashboard.tsx'), 'utf8');
const gallery = readFileSync(join(root, 'src', 'components', 'TemplateGallery.tsx'), 'utf8');
const css = readFileSync(join(root, 'src', 'components', 'FresherMode.css'), 'utf8');
const helper = readFileSync(join(root, 'src', 'lib', 'fresherMode.ts'), 'utf8');
const out = [];
const ok = (name, cond) => out.push([name, !!cond]);

const fresh = createFresherResume();
ok('one-click resume starts in fresher mode', fresh.fresher === true);
ok('one-click resume starts with a fresher template', fresh.templateId === 'fresher-timeline');
ok('one-click resume never invents work experience', Array.isArray(fresh.experience) && fresh.experience.length === 0);
ok('one-click resume has a clear master name', fresh.name === 'Fresher master resume');

fresh.personal.headline = 'Data Analyst';
fresh.personal.email = 'asha@example.com';
fresh.personal.phone = '+91 98765 43210';
fresh.personal.city = 'Delhi';
fresh.personal.linkedin = 'linkedin.com/in/asha';
fresh.education = [{ id: 'edu-1', degree: 'B.Tech Computer Science', school: 'Example Institute', location: 'Delhi', year: '2026', note: 'CGPA 8.4/10' }];
fresh.skills = ['Excel', 'SQL', 'Python', 'Power BI', 'Statistics'];
fresh.projects = [{ id: 'p-1', name: 'Sales Dashboard', link: '', points: 'Built a Power BI dashboard from 10,000 anonymized rows and documented the analysis.' }];

const ready = buildFresherReadiness(fresh);
ok('fresher can reach 100 readiness with zero formal jobs', ready.score === 100 && fresh.experience.length === 0);
ok('all six fresher signals pass', ready.passed === ready.total && ready.total === 6);
ok('ready fresher is directed to job tailoring next', ready.nextStep === null && ready.nextAction.includes('Tailor'));

const noProject = { ...fresh, projects: [] };
const projectGap = buildFresherReadiness(noProject);
ok('missing project proof reduces readiness', projectGap.score === 75);
ok('missing project proof points to Extras', projectGap.nextStep === 'extras' && projectGap.nextAction.includes('project'));

ok('readiness helper never scores formal work experience', !helper.includes("id: 'experience'") && !helper.includes('experience.length'));
ok('dashboard exposes one-click Fresher resume action', dashboard.includes('🎓 Fresher resume') && dashboard.includes('newFresherResume'));
ok('dashboard shows fresher readiness badge', dashboard.includes('Fresher Mode · {fresher.score}% ready'));
ok('dashboard explains that fake work history is not required', dashboard.includes('instead of forcing fake work experience'));
ok('existing Tailor for job flow remains available', dashboard.includes('🎯 Tailor for job') && dashboard.includes('createJobSpecificResume'));
ok('template gallery boosts fresher category', gallery.includes("r.fresher && t.category === 'fresher'"));
ok('template gallery offers a Fresher picks filter', gallery.includes('🎓 Fresher picks'));
ok('template gallery explains fresher-first design behavior', gallery.includes('entry-level designs are shown first'));
ok('mobile Fresher CTA keeps a 44px target', css.includes('min-height:44px'));
ok('narrow-phone Fresher guard exists', css.includes('@media(max-width:390px)'));

process.exit(checks(out) ? 0 : 1);
