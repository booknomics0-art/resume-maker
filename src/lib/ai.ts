// AI writing help — routed through the user's own n8n webhook.
// The app never calls OpenAI/Gemini directly; n8n holds the API keys.

import type { Resume } from './types';

export interface AiSettings {
  webhookUrl: string;
  apiKey: string;
  enabled: boolean;
}

const KEY = 'craftcv.ai.v1';

export function loadAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { webhookUrl: '', apiKey: '', enabled: false };
}

export function saveAiSettings(s: AiSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export interface AiRequest {
  task: 'ping' | 'enhance' | 'summary';
  section?: string;
  field?: string;
  role?: string;
  text?: string;
  tone?: string;
}

export interface AiResponse {
  ok: boolean;
  text?: string;
  error?: string;
}

export async function callAi(req: AiRequest): Promise<AiResponse> {
  const s = loadAiSettings();
  if (!s.webhookUrl) return { ok: false, error: 'Set your n8n webhook URL in Settings first.' };
  try {
    const res = await fetch(s.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(s.apiKey ? { 'x-api-key': s.apiKey } : {}),
      },
      body: JSON.stringify(req),
    });
    if (!res.ok) return { ok: false, error: `Webhook returned ${res.status}` };
    const data = (await res.json()) as AiResponse;
    if (data.ok && data.text) data.text = humanize(data.text);
    return data;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

// ---------------------------------------------------------------------------
// Humanizer: strips the phrases that make text smell AI-generated.
// Runs on everything coming back from the webhook, and is also applied to the
// user's own draft if they press "Clean up phrasing".
// ---------------------------------------------------------------------------

const REPLACE: Array<[RegExp, string]> = [
  [/\bspearheaded\b/gi, 'led'],
  [/\bleverag(e|ed|ing)\b/gi, 'used'],
  [/\brobust\b/gi, 'reliable'],
  [/\bseamless(ly)?\b/gi, 'smooth'],
  [/\bcutting[- ]edge\b/gi, 'modern'],
  [/\bsynerg(y|ies|ize)\b/gi, 'teamwork'],
  [/\bresults[- ]driven\b/gi, ''],
  [/\bdynamic\b/gi, ''],
  [/\bseasoned professional\b/gi, 'experienced professional'],
  [/\bpassionate about\b/gi, 'interested in'],
  [/\bproven track record of\b/gi, 'history of'],
  [/\bthink(ing)? outside the box\b/gi, 'finding workarounds'],
  [/\bgo[- ]getter\b/gi, 'self-starter'],
  [/\bteam player\b/gi, 'collaborator'],
  [/\bdelve(d)? into\b/gi, 'looked into'],
  [/\bunlock(ing)?\b/gi, 'opening up'],
  [/\bempower(ing|s)?\b/gi, 'helping'],
  [/\bharness(ing|es)?\b/gi, 'using'],
  [/\bnavigating\b/gi, 'handling'],
  [/\bestablished\b/gi, 'set up'],
  [/\bpivotal role\b/gi, 'key part'],
  [/\bparadigm\b/gi, 'model'],
  [/\bstakeholders\b/gi, 'teams'],
  [/\bin today'?s fast[- ]paced world,?\s*/gi, ''],
  [/\bit'?s important to note that\s*/gi, ''],
  [/\bin conclusion,?\s*/gi, ''],
  [/\bfurthermore,?\s*/gi, 'Also, '],
  [/\bmoreover,?\s*/gi, 'Also, '],
  [/\badditionally,?\s*/gi, 'Also, '],
  [/\bin order to\b/gi, 'to'],
  [/\butilize(d|s)?\b/gi, 'use'],
  [/\b—/g, '-'],
];

const REMOVE_LINES = [/^(as an ai|sure|here('| i)?s? (is|are|an?))\b.*$/gim];

export const BANNED_WORDS = [
  'spearheaded', 'leveraged', 'synergy', 'passionate', 'results-driven', 'dynamic',
  'seasoned professional', 'proven track record', 'go-getter', 'team player',
  'cutting-edge', 'seamless', 'robust', 'delve', 'empower', 'harness', 'unlock',
  'tapestry', 'landscape', 'testament', 'fueled by', 'thrives', 'embark',
];

export function humanize(input: string): string {
  let t = input.replace(/```[a-z]*\n?|```/g, '').trim();
  for (const re of REMOVE_LINES) t = t.replace(re, '');
  for (const [re, sub] of REPLACE) t = t.replace(re, sub);
  t = t
    .replace(/,\s*,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s*[-•]\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,},/g, ',')
    .trim();
  return t;
}

// The rules we also send to n8n so the model writes human text from the start.
export const HUMAN_WRITING_RULES = `
RULES FOR WRITING (non-negotiable):
1. Write like a competent human describing their own work, not a brochure.
2. Plain words. Short sentences. One idea per line for bullets.
3. Start bullets with simple past verbs: built, led, fixed, shipped, reduced, trained, closed.
4. Keep every number and fact given in the input. Never invent numbers, titles, dates, or tools.
5. Banned words and phrases: ${BANNED_WORDS.join(', ')}.
6. No em dashes, no emojis, no exclamation marks, no rhetorical questions.
7. No first person "I" inside bullets; in the summary, "I" is allowed at most once.
8. Do not start with "As a...", "With a proven...", or "Results-driven...".
9. No summary sentences like "Seeking an opportunity to contribute...".
10. Return ONLY the final text. No headings, no quotes, no markdown, no explanations.
`.trim();

// ---------------------------------------------------------------------------
// Offline helpers — the AI buttons stay useful with no webhook configured.
// They never invent facts: everything is tidy-up of the user's own text, or a
// draft assembled strictly from what the resume already contains.
// ---------------------------------------------------------------------------

/** Tidy the user's own lines: strip "Responsible for", capitalise, punctuate. */
export function localPolish(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      let t = humanize(line.trim());
      if (!t) return '';
      t = t.replace(/^responsible for\s+/i, '').replace(/^worked on\s+/i, '').replace(/^tasked with\s+/i, '');
      t = t.charAt(0).toUpperCase() + t.slice(1);
      if (t.length > 12 && !/[.!?]$/.test(t)) t += '.';
      return t;
    })
    .filter(Boolean)
    .join('\n');
}

function yearsAcross(r: Resume): number | null {
  const years = r.experience
    .map((e) => e.start.match(/(\d{4})/)?.[1])
    .filter((y): y is string => !!y)
    .map(Number)
    .filter((y) => y > 1950 && y <= new Date().getFullYear());
  if (years.length === 0) return null;
  const span = new Date().getFullYear() - Math.min(...years);
  return span >= 1 ? Math.min(span, 40) : null;
}

/**
 * A summary drafted only from facts already on the resume (role, years,
 * skills, one quantified bullet). Returns '' when there is not enough on the
 * record to say anything honest — the caller then asks the user to fill more.
 */
export function localSummaryDraft(r: Resume): string {
  const headline = r.personal.headline.trim();
  const skills = r.skills.filter(Boolean).slice(0, 4);
  if (!headline || skills.length === 0) return '';

  const skillList = skills.length === 1 ? skills[0]
    : `${skills.slice(0, -1).join(', ')} and ${skills[skills.length - 1]}`;
  const quant = r.experience
    .flatMap((e) => e.bullets)
    .map((b) => b.trim())
    .find((b) => /\d/.test(b) && b.length > 20);

  const sentences: string[] = [];
  const years = yearsAcross(r);
  if (r.fresher || !years) {
    sentences.push(`${headline} with hands-on work in ${skillList}.`);
  } else {
    sentences.push(`${headline} with ${years}+ years across ${skillList}.`);
  }
  if (quant) {
    const q = quant.charAt(0).toLowerCase() + quant.slice(1);
    sentences.push(`Recent work: ${q.endsWith('.') ? q : `${q}.`}`);
  }
  sentences.push(`Looking for a ${headline} role where these skills deliver from day one.`);
  return humanize(sentences.join(' '));
}
