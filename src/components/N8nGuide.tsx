import { HUMAN_WRITING_RULES } from '../lib/ai';

export default function N8nGuide() {
  return (
    <div className="guide" style={{ maxWidth: 900 }}>
      <div className="page-head">
        <div>
          <div className="page-title">n8n + AI setup guide</div>
          <div className="page-sub">
            Connect ResumeMakery to your own n8n workflow. Works with the Gemini free tier or your ChatGPT (OpenAI) key.
          </div>
        </div>
      </div>

      <div className="card pad">
        <h3 className="mt0">How it fits together</h3>
        <p>
          ResumeMakery never talks to OpenAI or Google directly. When a user presses
          <b> “✦ Improve with AI”</b>, the app POSTs a small JSON payload to <b>your n8n webhook</b>.
          Your workflow calls the model with a strict human-writing prompt, cleans the output,
          and replies with plain text. Keys stay inside n8n; the website needs no backend.
        </p>
        <div className="node-flow">
          <div className="node-box">ResumeMakery (browser)</div><span className="node-arrow">→</span>
          <div className="node-box">Webhook</div><span className="node-arrow">→</span>
          <div className="node-box">Auth check</div><span className="node-arrow">→</span>
          <div className="node-box">Build prompt</div><span className="node-arrow">→</span>
          <div className="node-box">Gemini / OpenAI</div><span className="node-arrow">→</span>
          <div className="node-box">Clean output</div><span className="node-arrow">→</span>
          <div className="node-box">Respond to Webhook</div>
        </div>
      </div>

      <div className="card pad">
        <h3 className="mt0">Step 1 — Create the workflow</h3>
        <ol>
          <li>In n8n: <b>+ Add workflow</b> → name it <span className="kbd">ResumeMakery Resume AI</span>.</li>
          <li>Add a <b>Webhook</b> node:
            <ul>
              <li>HTTP Method: <b>POST</b></li>
              <li>Path: <span className="kbd">resume-ai</span> (URL becomes <span className="kbd">https://YOUR-N8N/webhook/resume-ai</span>)</li>
              <li>Respond: <b>Using “Respond to Webhook” node</b></li>
              <li>Authentication: <b>Header Auth</b> — create a credential with name <span className="kbd">x-api-key</span> and a long random value. Use the same value in ResumeMakery Settings.</li>
              <li>Response Headers (CORS): add <span className="kbd">Access-Control-Allow-Origin: *</span> so the browser is allowed to call it.</li>
            </ul>
          </li>
          <li>Add a <b>Code</b> node “Build prompt” after the webhook — script below.</li>
          <li>Add the model node (Gemini or OpenAI — Step 2).</li>
          <li>Add a <b>Code</b> node “Clean output” — script below.</li>
          <li>Add a <b>Respond to Webhook</b> node: respond with JSON
            <pre className="code">{`{
  "ok": true,
  "text": "{{ $json.cleaned }}"
}`}</pre>
          </li>
          <li><b>Activate</b> the workflow and copy the <b>production</b> URL (not the /webhook-test/ one) into ResumeMakery → Settings.</li>
        </ol>
      </div>

      <div className="card pad">
        <h3 className="mt0">Step 2 — “Build prompt” Code node</h3>
        <pre className="code">{`const b = $input.first().json.body;

const task = b.task || 'enhance';
if (task === 'ping') {
  return [{ json: { ping: true } }];
}

const system = \`You rewrite resume content.
${HUMAN_WRITING_RULES}\`;

let user;
if (task === 'summary') {
  user = \`Write a 2-3 sentence professional summary for a \${b.role} in \${b.field}.
Facts to use (use only these): \${b.text}\`;
} else {
  user = \`Rewrite this resume \${b.section} for a \${b.role} role in \${b.field}.
Keep every fact and number. Improve clarity and start bullets with simple past verbs.
Text:
\${b.text}\`;
}

return [{ json: { system, user } }];`}</pre>
        <p className="hint">
          Tip: add an <b>IF</b> node before the model that routes <span className="kbd">ping: true</span> straight
          to a Respond node returning <span className="kbd">{'{ "ok": true, "text": "pong" }'}</span>.
        </p>
      </div>

      <div className="card pad">
        <h3 className="mt0">Step 3a — Gemini (free tier) via HTTP Request node</h3>
        <p>Add an <b>HTTP Request</b> node:</p>
        <ul>
          <li>Method: <b>POST</b></li>
          <li>URL: <span className="kbd">https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent</span></li>
          <li>Send Query Parameters → <span className="kbd">key</span> = your Gemini API key (create free at aistudio.google.com)</li>
          <li>Body (JSON):</li>
        </ul>
        <pre className="code">{`{
  "systemInstruction": {
    "parts": [{ "text": "{{ $json.system }}" }]
  },
  "contents": [
    { "role": "user", "parts": [{ "text": "{{ $json.user }}" }] }
  ],
  "generationConfig": { "temperature": 0.4, "maxOutputTokens": 1024 }
}`}</pre>
        <p className="hint">The answer comes back at <span className="kbd">candidates[0].content.parts[0].text</span> — use it in the next node.</p>

        <h3>Step 3b — ChatGPT instead (you have an OpenAI key)</h3>
        <p>Use the <b>OpenAI</b> node (Message a Model): model <span className="kbd">gpt-4o-mini</span>,
          system message = <span className="kbd">{'{{ $json.system }}'}</span>, user message = <span className="kbd">{'{{ $json.user }}'}</span>.
          Output arrives as <span className="kbd">message.content</span>.</p>
      </div>

      <div className="card pad">
        <h3 className="mt0">Step 4 — “Clean output” Code node</h3>
        <pre className="code">{`// works for both Gemini and OpenAI nodes
const raw = $json.candidates?.[0]?.content?.parts?.[0]?.text
  ?? $json.message?.content
  ?? '';

let t = String(raw).replace(/\`\`\`[a-z]*\\n?|\`\`\`/g, '').trim();

// strip chat preamble and markdown
t = t.replace(/^(sure|here (is|are|'s)).*$/gim, '');
t = t.replace(/[*_#>]+/g, '').replace(/—/g, '-');

// banned AI-sounding phrases, just in case
const banned = ['spearheaded','leveraged','synergy','passionate','results-driven',
  'seasoned professional','proven track record','cutting-edge','seamless','robust',
  'delve','empower','harness','unlock','tapestry','testament','thrives'];
for (const w of banned) {
  t = t.replace(new RegExp('\\\\b' + w + '\\\\b', 'gi'), '');
}
t = t.replace(/\\s{2,}/g, ' ').replace(/\\n{3,}/g, '\\n\\n').trim();

return [{ json: { cleaned: t } }];`}</pre>
        <p className="hint">ResumeMakery runs the same cleaning again on the browser side, so output stays human even if a phrase slips through.</p>
      </div>

      <div className="card pad">
        <h3 className="mt0">Step 5 — Error handling &amp; testing</h3>
        <ol>
          <li>On every node after the webhook, set the error output to an <b>Error Trigger → Respond to Webhook</b> branch returning
            <pre className="code">{`{ "ok": false, "error": "AI service unavailable" }`}</pre>
            so the site shows a friendly message instead of hanging.</li>
          <li>In ResumeMakery → Settings paste the production URL + your x-api-key value → <b>Test connection</b>. You should see “pong”.</li>
          <li>Open a resume, write a rough bullet like <i>“worked on website and fixed bugs”</i>, press <b>✦ Improve with AI</b> and check the rewrite keeps your facts.</li>
        </ol>
      </div>

      <div className="card pad">
        <h3 className="mt0">Request / response contract</h3>
        <pre className="code">{`POST https://YOUR-N8N/webhook/resume-ai
Header: x-api-key: <your-key>
Header: Content-Type: application/json

{
  "task": "enhance",            // or "summary", "ping"
  "section": "experience-bullets",
  "field": "IT & Software",
  "role": "Frontend Developer",
  "text": "worked on website and fixed bugs"
}

Response:
{ "ok": true, "text": "Fixed 12 UI bugs and shipped the redesigned site..." }`}</pre>
      </div>

      <div className="notice">
        <b>Keeping it human:</b> the system prompt above bans buzzwords, keeps every number the user typed,
        and forbids inventing facts. Between the prompt, your n8n cleanup node, and ResumeMakery's built-in
        humanizer, AI-generated phrasing gets filtered three times before it reaches the resume.
      </div>
    </div>
  );
}
