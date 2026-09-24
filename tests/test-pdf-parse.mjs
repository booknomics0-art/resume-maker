/**
 * Test harness: builds a realistic COMPRESSED (FlateDecode) resume PDF — the
 * kind Word/Canva/Google Docs produce — then runs it through the new
 * extraction + parsing pipeline in Node and prints the parsed result.
 */
import zlib from 'node:zlib';
import fs from 'node:fs';
import { parseResumeFile } from '../src/lib/resumeParser.js';

// ── minimal PDF writer with FlateDecode streams ─────────────────────────────
function buildPdf(lines) {
  // lines: [{ x, y, size, text }]
  let content = 'BT\n';
  let lastSize = null;
  for (const l of lines) {
    if (l.size !== lastSize) {
      content += `/F1 ${l.size} Tf\n`;
      lastSize = l.size;
    }
    const esc = l.text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    content += `1 0 0 1 ${l.x} ${l.y} Tm (${esc}) Tj\n`;
  }
  content += 'ET';
  const compressed = zlib.deflateSync(Buffer.from(content, 'latin1'));

  const objs = [];
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objs[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
  objs[3] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>';
  objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objs[5] = { stream: compressed };

  let out = '%PDF-1.5\n';
  const offsets = [0];
  for (let i = 1; i <= 5; i++) {
    offsets[i] = Buffer.byteLength(out, 'latin1');
    const o = objs[i];
    if (typeof o === 'string') {
      out += `${i} 0 obj\n${o}\nendobj\n`;
    } else {
      out += `${i} 0 obj\n<< /Length ${o.stream.length} /Filter /FlateDecode >>\nstream\n`;
      out = Buffer.concat([Buffer.from(out, 'latin1'), o.stream, Buffer.from('\nendstream\nendobj\n', 'latin1')]).toString('latin1');
    }
  }
  const xrefPos = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) out += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}

// ── a realistic one-page resume layout ──────────────────────────────────────
const R = [];
let y = 750;
const line = (text, { x = 72, size = 10, dy = 14 } = {}) => { R.push({ x, y, size, text }); y -= dy; };
const gap = (n = 10) => { y -= n; };

line('AARAV SHARMA', { x: 200, size: 20, dy: 22 });
line('Frontend Developer', { x: 230, size: 12, dy: 18 });
line('Pune, Maharashtra | +91 98765 43210 | aarav.sharma@gmail.com', { x: 110, dy: 14 });
line('linkedin.com/in/aaravsharma | github.com/aarav-dev', { x: 150 });
gap(8);
line('PROFESSIONAL SUMMARY', { size: 13 });
line('Frontend developer with 3+ years of experience building responsive web', { dy: 13 });
line('applications using React and TypeScript. Passionate about performance', { dy: 13 });
line('and clean UI.', { dy: 16 });
gap(6);
line('WORK EXPERIENCE', { size: 13 });
line('Software Engineer | TCS, Pune', { size: 11, dy: 14 });
line('Jan 2022 - Present', { dy: 14 });
line('- Built 12+ reusable React components used across 4 products', { dy: 12 });
line('- Improved page load time by 38% via code-splitting and caching', { dy: 12 });
line('- Mentored 2 interns on TypeScript best practices', { dy: 16 });
line('Web Developer Intern | Infosys, Bengaluru', { size: 11, dy: 14 });
line('May 2021 - Dec 2021', { dy: 14 });
line('- Developed dashboard UI with React and REST API integration', { dy: 12 });
line('- Fixed 30+ UI bugs and improved accessibility score to 95', { dy: 16 });
gap(6);
line('EDUCATION', { size: 13 });
line('B.Tech Computer Science, Savitribai Phule Pune University', { dy: 14 });
line('2020 - 2024 | CGPA 8.6', { dy: 16 });
gap(6);
line('TECHNICAL SKILLS', { size: 13 });
line('JavaScript, TypeScript, React, Node.js, HTML, CSS, Git, REST APIs, MySQL', { dy: 16 });
gap(6);
line('PROJECTS', { size: 13 });
line('CraftCV Resume Builder - React, Firebase', { size: 11, dy: 13 });
line('- Resume studio with 50 templates and PDF export', { dy: 16 });
gap(6);
line('CERTIFICATIONS', { size: 13 });
line('Meta Front-End Developer - Coursera - 2023', { dy: 16 });
gap(6);
line('ACHIEVEMENTS', { size: 13 });
line('- Winner, Smart India Hackathon 2023 (team of 6)', { dy: 12 });
line('- 500+ rating on LeetCode', { dy: 12 });

const pdf = buildPdf(R);
fs.mkdirSync('/tmp/craftcv-test', { recursive: true });
fs.writeFileSync('/tmp/craftcv-test/sample-resume.pdf', pdf);
console.log(`Built /tmp/craftcv-test/sample-resume.pdf (${pdf.length} bytes, ${R.length} text runs)`);

// ── run the pipeline ────────────────────────────────────────────────────────
const file = fs.readFileSync('/tmp/craftcv-test/sample-resume.pdf');
const f = new File([file], 'sample-resume.pdf', { type: 'application/pdf' });
const result = await parseResumeFile(f, {
  onProgress: p => console.log(`  [${String(Math.round(p.pct)).padStart(3)}%] ${p.stage}`),
});

console.log('\n════════ RESULT ════════');
if (result.error) {
  console.log('ERROR:', result.error);
  process.exit(1);
}
console.log('format:', result.format, '| meta:', JSON.stringify(result.meta));
console.log('\n── extracted text (first 900 chars) ──');
console.log(result.text.slice(0, 900));
console.log('\n── parsed resume ──');
const r = result.resume;
console.log('name:', r.personal.fullName, '| headline:', r.personal.headline);
console.log('email:', r.personal.email, '| phone:', r.personal.phone, '| city:', r.personal.city);
console.log('linkedin:', r.personal.linkedin, '| website:', r.personal.website);
console.log('summary:', r.summary.slice(0, 120));
console.log('skills:', r.skills.join(', '));
for (const e of r.experience) {
  console.log(`JOB: role=${e.role} | company=${e.company} | loc=${e.location} | ${e.start} → ${e.end} (current=${e.current})`);
  e.bullets.forEach(b => console.log('   •', b));
}
for (const ed of r.education) console.log('EDU:', ed.degree, '|', ed.school, '|', ed.year, '|', ed.note);
for (const p of r.projects) console.log('PROJ:', p.name, '|', p.link, '|', p.points.slice(0, 60));
for (const c of r.certs) console.log('CERT:', c.name, '|', c.issuer, '|', c.year);
for (const a of r.achievements) console.log('ACH:', a);

// ── assertions ──────────────────────────────────────────────────────────────
const checks = [
  ['name', r.personal.fullName === 'AARAV SHARMA'],
  ['email', r.personal.email === 'aarav.sharma@gmail.com'],
  ['phone', r.personal.phone.replace(/\D/g, '') === '919876543210' || r.personal.phone.replace(/\D/g, '') === '9876543210'],
  ['city', /pune/i.test(r.personal.city)],
  ['jobs>=2', r.experience.length >= 2],
  ['job1 role', /software engineer/i.test(r.experience[0]?.role || '')],
  ['job1 company', /tcs/i.test(r.experience[0]?.company || '')],
  ['job1 start', /jan 2022/i.test(r.experience[0]?.start || '')],
  ['job1 current', r.experience[0]?.current === true],
  ['job2 role', /web developer/i.test(r.experience[1]?.role || '')],
  ['job2 end', /dec 2021/i.test(r.experience[1]?.end || '')],
  ['education', r.education.length >= 1 && /b\.?tech/i.test(r.education[0]?.degree || '')],
  ['edu school', /pune university/i.test(r.education[0]?.school || '')],
  ['edu year', /2024/.test(r.education[0]?.year || '')],
  ['skills', r.skills.length >= 5 && r.skills.some(s => /react/i.test(s))],
  ['projects', r.projects.length >= 1 && /craftcv/i.test(r.projects[0]?.name || '')],
  ['certs', r.certs.length >= 1 && /meta/i.test(r.certs[0]?.name || '')],
  ['achievements', r.achievements.length >= 2],
  ['no garbage', !/\ufffd|\u0000|%PDF|endobj|FlateDecode/.test(result.text)],
];
let pass = 0;
for (const [name, ok] of checks) { console.log(`${ok ? '✅' : '❌'} ${name}`); if (ok) pass++; }
console.log(`\n${pass}/${checks.length} checks passed`);
process.exit(pass === checks.length ? 0 : 1);
