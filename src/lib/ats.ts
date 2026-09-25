/**
 * ATS keyword check — paste a job description, see which of its keywords your
 * resume already covers and which are missing. Runs entirely on the device:
 * no API, no upload.
 *
 * Method (the honest version of what paid tools do):
 *   1. Extract the keywords that matter from the job description — a curated
 *      dictionary of skills, tools and competencies plus properly capitalised
 *      multi-word terms ("AWS Lambda", "Machine Learning").
 *   2. Test each one against the full text of the resume.
 *   3. Report covered vs missing with a coverage score.
 *
 * What it will NOT do: invent matches. If a term is not on the resume, it is
 * reported as missing and the UI says exactly what to do about it.
 */

import type { Resume } from './types';

export interface AtsReport {
  score: number;          // 0–100
  covered: string[];
  missing: string[];
  total: number;
  jdWords: number;
}

/** Curated dictionary — the terms that actually appear in hiring decisions. */
const DICTIONARY = [
  // web / mobile
  'javascript', 'typescript', 'react', 'react native', 'next.js', 'node.js', 'angular', 'vue', 'vuejs',
  'html', 'css', 'sass', 'tailwind', 'redux', 'zustand', 'webpack', 'vite', 'jest', 'cypress', 'playwright',
  'selenium', 'express', 'graphql', 'rest', 'rest api', 'rest apis', 'grpc', 'websocket',
  'android', 'ios', 'swift', 'kotlin', 'flutter', 'dart',
  // backend / data
  'python', 'java', 'golang', 'go ', 'rust', 'c++', 'c#', 'php', 'ruby', 'scala', 'spring boot', 'django', 'flask', 'fastapi',
  'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'sqlite', 'dynamodb', 'cassandra', 'kafka', 'spark',
  'hadoop', 'airflow', 'dbt', 'pandas', 'numpy', 'scikit-learn', 'tensorflow', 'pytorch',
  'etl', 'data pipeline', 'data modeling', 'data warehouse', 'bigquery', 'snowflake', 'redshift',
  // cloud / devops
  'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'terraform', 'ansible', 'ci/cd', 'cicd', 'jenkins',
  'github actions', 'gitlab ci', 'linux', 'bash', 'nginx', 'microservices', 'serverless', 'lambda', 'ec2', 's3',
  'monitoring', 'observability', 'prometheus', 'grafana', 'incident management', 'sre', 'devops',
  // data analytics / science
  'machine learning', 'deep learning', 'nlp', 'computer vision', 'statistics', 'a/b testing', 'ab testing',
  'power bi', 'tableau', 'looker', 'excel', 'google analytics', 'data analysis', 'data science', 'ml ops',
  // product / design / pm
  'product management', 'product owner', 'roadmap', 'agile', 'scrum', 'kanban', 'jira', 'confluence',
  'user research', 'usability', 'figma', 'adobe xd', 'wireframing', 'prototyping', 'design system',
  'ui/ux', 'ui design', 'ux design', 'accessibility', 'wcag', 'seo', 'sem',
  // business / soft skills
  'system design', 'distributed systems', 'stakeholder management', 'communication', 'leadership',
  'team lead', 'team leadership', 'mentoring',
  'project management', 'pmp', 'six sigma', 'budgeting', 'forecasting', 'negotiation', 'presentation',
  'problem solving', 'analytical skills', 'attention to detail', 'time management', 'cross-functional',
  'customer focus', 'client management', 'sales', 'crm', 'salesforce', 'hubspot', 'account management',
  // healthcare / operations / finance
  'patient care', 'epic', 'meditech', 'phlebotomy', 'supply chain', 'logistics', 'inventory',
  'sap', 'oracle erp', 'tally', 'gst', 'audit', 'financial analysis', 'bookkeeping', 'excel',
  // security
  'penetration testing', 'owasp', 'security audit', 'threat modeling', 'vulnerability', 'compliance',
  'hipaa', 'gdpr', 'information security', 'network security',
];

const STOP = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'by', 'at', 'from', 'as', 'is', 'are',
  'be', 'been', 'being', 'will', 'you', 'your', 'our', 'we', 'us', 'they', 'their', 'he', 'she', 'his', 'her',
  'it', 'its', 'this', 'that', 'these', 'those', 'who', 'whom', 'which', 'what', 'when', 'where', 'how',
  'why', 'not', 'no', 'yes', 'if', 'then', 'than', 'so', 'such', 'about', 'into', 'over', 'under', 'between',
  'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off', 'again', 'further', 'once',
  'here', 'there', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'only', 'own',
  'same', 'too', 'very', 'can', 'could', 'should', 'would', 'may', 'might', 'must', 'shall', 'do', 'does',
  'did', 'doing', 'have', 'has', 'had', 'having', 'work', 'working', 'works', 'job', 'role', 'position',
  'team', 'company', 'business', 'candidate', 'applicant', 'experience', 'experienced', 'years', 'year',
  'minimum', 'required', 'requirements', 'responsibilities', 'duties', 'qualifications', 'preferred',
  'plus', 'etc', 'including', 'include', 'includes', 'strong', 'solid', 'good', 'great', 'excellent',
  'proven', 'able', 'ability', 'skills', 'skill', 'knowledge', 'understanding', 'familiarity', 'familiar',
  'proficient', 'proficiency', 'hands-on', 'hands on', 'self-starter', 'detail', 'oriented', 'passionate',
  'dedicated', 'motivated', 'results', 'result', 'driven', 'fast-paced', 'environment', 'collaborative',
  'opportunity', 'opportunities', 'looking', 'seeking', 'join', 'help', 'build', 'building', 'lead', 'leading',
  'manage', 'managing', 'management', 'develop', 'developing', 'development', 'deliver', 'delivering',
  'ensure', 'ensure', 'responsible', 'participate', 'participating', 'contribute', 'contributing',
]);

/** Flatten a resume into one searchable text blob. */
export function resumeToText(r: Resume): string {
  const parts: string[] = [
    r.personal.fullName, r.personal.headline, r.summary, r.bestExperience,
  ];
  for (const e of r.experience) {
    parts.push(e.role, e.company, e.location, e.start, e.end, ...e.bullets);
  }
  for (const e of r.education) parts.push(e.degree, e.school, e.location, e.year, e.note);
  parts.push(...r.skills, ...r.hobbies, ...r.achievements);
  for (const p of r.projects) parts.push(p.name, p.link, p.points);
  for (const c of r.certs) parts.push(c.name, c.issuer, c.year);
  for (const l of r.languages) parts.push(l.name, l.level);
  return parts.join('\n').toLowerCase();
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

function wordBoundaryHit(haystack: string, term: string): boolean {
  const t = norm(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(^|[^a-z0-9+#/.])${t}($|[^a-z0-9+#])`, 'i').test(haystack);
}

/**
 * Pull the keywords that matter out of a job description:
 *  - dictionary terms present in the JD (word-boundary match)
 *  - properly capitalised multi-word terms ("AWS Lambda") that aren't sentence starts
 */
export function extractJdKeywords(jdText: string): string[] {
  const jd = jdText.toLowerCase();
  const found: string[] = [];
  const seen = new Set<string>();
  for (const term of DICTIONARY) {
    const t = norm(term);
    if (t.length < 3 || seen.has(t)) continue;
    if (wordBoundaryHit(jd, t)) { found.push(t); seen.add(t); }
  }
  // capitalised compounds, e.g. "Google Cloud", "Power BI", "Machine Learning"
  const re = /(^|[\s:(,;])((?:[A-Z][a-zA-Z0-9+#./-]+(?:\s+[A-Z][a-zA-Z0-9+#./-]+){0,2}))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(jdText)) !== null) {
    const phrase = m[2];
    const words = phrase.split(/\s+/);
    if (words.length < 1 || words.length > 3) continue;
    const t = norm(phrase);
    if (t.length < 4 || seen.has(t)) continue;
    if (words.some(w => STOP.has(w.toLowerCase()))) continue;
    if (/^\d/.test(phrase)) continue;
    if (words.length === 1 && words[0].length < 3) continue;
    // skip pure company-sounding titles at the start of a sentence: keep only
    // compounds of 2+ words, or single words that are not generic nouns
    if (words.length === 1) {
      if (STOP.has(words[0].toLowerCase())) continue;
    }
    found.push(t);
    seen.add(t);
  }
  return found.slice(0, 120);
}

export function matchKeywords(jdText: string, resumeText: string): AtsReport {
  const keywords = extractJdKeywords(jdText);
  const covered: string[] = [];
  const missing: string[] = [];
  for (const k of keywords) {
    if (wordBoundaryHit(resumeText, k)) covered.push(k);
    else missing.push(k);
  }
  const total = keywords.length;
  const score = total === 0 ? 0 : Math.round((covered.length / total) * 100);
  return { score, covered, missing, total, jdWords: jdText.split(/\s+/).filter(Boolean).length };
}

// ── per-resume persistence ──────────────────────────────────────────────────

const JD_KEY = 'craftcv.jd.v1';

type JdMap = Record<string, string>;

function readMap(): JdMap {
  try {
    const raw = localStorage.getItem(JD_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map && typeof map === 'object' ? (map as JdMap) : {};
  } catch {
    return {};
  }
}

export function loadJd(resumeId: string): string {
  return readMap()[resumeId] ?? '';
}

export function saveJd(resumeId: string, text: string): void {
  try {
    const map = readMap();
    if (text.trim()) map[resumeId] = text.slice(0, 20000);
    else delete map[resumeId];
    const ids = Object.keys(map);
    if (ids.length > 20) {
      for (const old of ids.slice(0, ids.length - 20)) delete map[old];
    }
    localStorage.setItem(JD_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable — the check still works in memory */
  }
}
