import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { checks, root, tmpDir } from './_harness.mjs';

mkdirSync(tmpDir, { recursive: true });
const entry = join(tmpDir, 'job-version-entry.ts');
const outfile = join(tmpDir, 'job-version-bundle.js');
writeFileSync(entry, `
  export { buildJobSpecificCopy } from '../../src/lib/jobVersion';
  export { emptyResume } from '../../src/lib/types';
`);

await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  outfile,
  logLevel: 'error',
});

const mod = await import(pathToFileURL(outfile).href);
const { buildJobSpecificCopy, emptyResume } = mod;
const dashboard = readFileSync(join(root, 'src', 'components', 'Dashboard.tsx'), 'utf8');
const css = readFileSync(join(root, 'src', 'components', 'JobVersion.css'), 'utf8');
const helper = readFileSync(join(root, 'src', 'lib', 'jobVersion.ts'), 'utf8');
const out = [];
const ok = (name, cond) => out.push([name, !!cond]);

const master = emptyResume();
master.id = 'master-1';
master.name = 'Asha Rao — Master Resume';
master.personal.fullName = 'Asha Rao';
master.personal.headline = 'Software Engineer';
master.summary = 'Original master summary must remain unchanged after creating a targeted copy.';
master.skills = ['React', 'TypeScript', 'Node.js'];
const before = JSON.stringify(master);

const copy = buildJobSpecificCopy(master, { company: 'Google', role: 'Frontend Developer' }, 123456, 'copy-1');
ok('job copy is created', !!copy);
ok('master object is never mutated', JSON.stringify(master) === before);
ok('job copy receives a fresh id', copy?.id === 'copy-1' && copy?.id !== master.id);
ok('job copy name identifies role and company', copy?.name === 'Frontend Developer — Google');
ok('target role updates only the copy headline', copy?.personal.headline === 'Frontend Developer' && master.personal.headline === 'Software Engineer');
ok('copy records root master lineage', copy?.application?.sourceResumeId === 'master-1' && copy?.application?.sourceResumeName === master.name);
ok('copy records job target metadata', copy?.application?.company === 'Google' && copy?.application?.role === 'Frontend Developer');
ok('copy keeps original resume content', copy?.summary === master.summary && copy?.skills.join('|') === master.skills.join('|'));

const second = copy ? buildJobSpecificCopy(copy, { company: 'Razorpay', role: 'UI Engineer' }, 456789, 'copy-2') : null;
ok('copy-of-copy still points to original master', second?.application?.sourceResumeId === 'master-1' && second?.application?.sourceResumeName === master.name);
ok('blank company is rejected', buildJobSpecificCopy(master, { company: ' ', role: 'Engineer' }, 1, 'bad-1') === null);
ok('blank role is rejected', buildJobSpecificCopy(master, { company: 'Acme', role: ' ' }, 1, 'bad-2') === null);

ok('dashboard exposes Tailor for job action', dashboard.includes('Tailor for job'));
ok('dashboard explains master stays unchanged', dashboard.includes('Source stays unchanged') && dashboard.includes('without touching your master'));
ok('dashboard collects company role and optional JD', dashboard.includes('job-company') && dashboard.includes('job-role') && dashboard.includes('job-description'));
ok('dashboard navigates to newly created copy', dashboard.includes('navigate(`/editor/${created.id}`)'));
ok('JD uses the existing ATS per-resume storage key', helper.includes("const JD_KEY = 'craftcv.jd.v1'"));
ok('JD is stored against the new copy id', helper.includes("saveJobDescription(saved.id"));
ok('mobile dialog controls keep 44px targets', css.includes('min-height:44px') && css.includes('width:44px;height:44px'));
ok('390px narrow-phone guard exists', css.includes('@media(max-width:390px)'));

process.exit(checks(out) ? 0 : 1);
