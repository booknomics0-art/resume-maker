# n8n × ResumeMakery — complete integration blueprint

Aapke paas n8n hai aur ChatGPT / Gemini free-tier key hai — dono kaam karenge.
Website se koi bhi API key browser me nahi rakhte; saari keys n8n workflow me rehti hain.

## Architecture

```
Browser (ResumeMakery)
   │  POST { task, section, field, role, text }   header: x-api-key
   ▼
n8n Webhook  ──► Auth check ──► Build prompt (Code)
   ▼
Gemini (HTTP Request, free tier)  OR  OpenAI node (gpt-4o-mini)
   ▼
Clean output (Code) ──► Respond to Webhook { ok, text }
   │
   └──(error branch)──► Error Trigger ──► Respond { ok:false }
```

## 1. Workflow nodes (exact config)

### Node 1 — Webhook
- Method: **POST**, Path: `resume-ai`
- Respond: **Using "Respond to Webhook" node**
- Authentication: **Header Auth** credential → name `x-api-key`, value = koi bhi
  strong random string (e.g. 32+ chars). Same value ResumeMakery → Settings me daalna hai.
- Response Headers: `Access-Control-Allow-Origin: *` (browser CORS ke liye).

### Node 2 — Code ("Build prompt")
Reads `$input.first().json.body`, builds `{ system, user }`. Handles `task: ping`
(return early), `task: summary` (generate) and `task: enhance` (rewrite).
Full script: app ke andar **n8n + AI setup** page par copy-paste ready hai.

### Node 3 — Model (choose one)

**Option A — Gemini free tier (recommended start):**
- HTTP Request node, POST:
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
- Query param `key` = Gemini API key (free: aistudio.google.com → Get API key).
- Body:
```json
{
  "systemInstruction": { "parts": [{ "text": "<system>" }] },
  "contents": [{ "role": "user", "parts": [{ "text": "<user>" }] }],
  "generationConfig": { "temperature": 0.4, "maxOutputTokens": 1024 }
}
```
- Answer path: `candidates[0].content.parts[0].text`.
- Free tier limits (typical): 10–15 RPM / ~1500 requests/day per model — enough
  for launch; rate-limit errors ko error branch handle karta hai.

**Option B — OpenAI node (aapke paas ChatGPT API key hai):**
- OpenAI node → Message a Model → `gpt-4o-mini`
- System message: `{{ $json.system }}`, User: `{{ $json.user }}`
- Output: `message.content`.

### Node 4 — Code ("Clean output")
Strips markdown/chat preamble/em-dashes, removes banned buzzwords, collapses
whitespace. Script in-app guide me hai. (ResumeMakery client par bhi same filter chalta
hai — double safety.)

### Node 5 — Respond to Webhook
```json
{ "ok": true, "text": "{{ $json.cleaned }}" }
```

### Error branch
Har model/clean node ka error output → Error Trigger → Respond to Webhook
`{ "ok": false, "error": "..." }`. App isko friendly message dikhata hai, hang nahi hota.

## 2. Contract (website ↔ n8n)

Request:
```json
POST https://YOUR-N8N/webhook/resume-ai
x-api-key: <key>
{
  "task": "enhance | summary | ping",
  "section": "summary | experience-bullets",
  "field": "IT & Software",
  "role": "Frontend Developer",
  "text": "user ka draft"
}
```
Response: `{ "ok": true, "text": "final text" }`

## 3. Human-written guarantee (sabse important)

System prompt me `HUMAN_WRITING_RULES` embedded hai (src/lib/ai.ts):
- plain words, short sentences, simple past verbs
- **facts/numbers kabhi invent nahi** — sirf rewrite, koi nayi fact nahi
- banned list: spearheaded, leveraged, synergy, passionate, results-driven,
  seasoned professional, proven track record, cutting-edge, seamless, robust,
  delve, empower, harness, unlock, tapestry, testament, thrives, ...
- no em-dashes, no exclamations, no "As a...", no "Seeking an opportunity..."
- temperature 0.4 rakho (0.2–0.5 range) taaki phrasing consistent/sober rahe

Ye rules + n8n cleanup + client humanizer = teen filters, output human lagta hai.

## 4. Go-live checklist

1. n8n me workflow banao, **Activate** karo.
2. **Production URL** copy karo (`/webhook/resume-ai`), test URL nahi (`/webhook-test/...`).
3. ResumeMakery → Settings: URL + x-api-key paste → **Test connection** (pong aana chahiye).
4. Editor me "Improve with AI" buttons test karo.
5. Hosting: n8n ka domain public hona chahiye (n8n Cloud default me hota hai;
   self-hosted par reverse proxy + HTTPS).
6. Ops: n8n Executions tab me har request ka audit trail milta hai; Gemini usage
   AI Studio dashboard me dikhta hai.

## 5. Aage badhane ke ideas (phase 2)

- `task: tailor` — JD text lekar resume ko us job ke keywords se align karna.
- `task: cover_letter` — same webhook, naya task branch.
- Per-user limits: n8n me Redis/Google Sheet se counter rakho, Free tier cap.
- Langfuse ya n8n logs se output quality monitor karo.
