# Conversation Repairer + Relationship Context Memory

Build guide for Antigravity / AI coding agents.
Hacktoberfest 2026 DEV Weekend Challenge: Build for a Friend.

Hard deadline: **Oct 5, 2026, 12:25 PM IST**. Target submission: Mon 08:30 IST.
Solo developer, MERN-comfortable, vibe-coding workflow.

---

## 0. INSTRUCTIONS FOR THE CODING AGENT (READ FIRST)

- You are implementing the MVP described in this file. Work **one phase at a time**.
  After each phase: run it, test it against that phase's acceptance criteria, report results
  honestly (including failures), then STOP and wait for the developer to say "continue".
- Do NOT add anything outside this document: no auth, no database, no vector DB, no WhatsApp
  integration, no agents, no fine-tuning, no extra services. If unsure, choose the simpler option
  and say so.
- Stack: React + Vite + Tailwind CSS (client/), Node.js + Express (server/), plain JavaScript,
  ES modules. No TypeScript. Minimal dependencies.
- The server is **stateless**. It stores nothing and never logs chat content.
  All user data lives in browser localStorage.
- The raw chat file is parsed in the browser and never stored. Only extracted memories
  (with short quote evidence) are saved.
- The AI must never claim certainty about anyone's emotions. Use "possible", "might", "could".
  This is a communication assistant, not a therapist and not a mind reader.
- Never invent relationship facts. Every memory needs an exact quote, verified in code against
  the source chunk.
- Never commit `.env`, API keys, or real chat data. Only synthetic samples go in `/samples`.
- Keep UI copy in simple English. Keep code readable with short comments.

### Model and API rules (IMPORTANT)

- The model is **Gemma 4** (open-weight), called through Google's Generative Language API
  (`generativelanguage.googleapis.com`, `generateContent` endpoint) using the key in `GEMMA_API_KEY`.
- Always read the model name from `GEMMA_MODEL` in `.env` (currently `gemma-4-31b-it`;
  fallback `gemma-4-26b-a4b-it`). **Never hardcode a model name.**
- Put ALL instructions inside the user message. Do not use a system prompt or JSON mode.
  Parse JSON yourself.
- The response can contain multiple parts. Parts with `"thought": true` are internal reasoning and
  must be IGNORED. In `llm.js`, take only parts where `thought` is not true and join their text.
  **Never use `parts[0]` directly. Never show thought text to the user.**
- Thinking costs extra tokens and time. If the API documents a way to limit or disable thinking,
  tell the developer. Do not guess parameter names; use documented ones only.
- Request timeout: 90 seconds (thinking makes responses slower).

Example response shape:

```json
{
  "candidates": [{
    "content": { "parts": [
      { "text": "...internal reasoning...", "thought": true },
      { "text": "Hello, kaise ho?" }
    ], "role": "model" },
    "finishReason": "STOP"
  }]
}
```

### Product principle

This is NOT "ChatGPT for relationships". It is a context-aware conversation repair tool.
The differentiator is the pipeline:

```
Exported chat -> Relationship-specific memory (with quotes) -> Relevant context retrieval
-> Gemma -> Context-aware repair
```

---

## 1. Project in one sentence

Upload an exported WhatsApp chat, let Gemma extract evidence-backed relationship memories, then
paste a tense new conversation and get Gemma's analysis plus three repair messages grounded in the
relevant history.

## 2. Feasibility

Feasible if scope stays disciplined. Core technical work is about 10 to 14 hours with AI tools.
The real threats are non-code:

- **Friend availability and consent.** The challenge needs a real friend, real use, real feedback.
  Never fabricate feedback.
- **Third-party privacy.** A chat export includes the person the friend talks to. Public material
  (repo, screenshots, demo) must use synthetic data only.
- **Gemma quality in Hinglish.** Test on day one.
- **Wrapper perception.** The memory dashboard with evidence quotes is the answer.

## 3. MVP definition

| Tier | Items |
|---|---|
| MUST | WhatsApp .txt parser (Android + iOS), chunked Gemma memory extraction with evidence, memory dashboard with edit/delete, paste conversation, keyword retrieval, repair analysis with 3 styles, JSON validation, Delete Everything, privacy notice, deployed link, README, synthetic samples, DEV article |
| SHOULD | Confidence badges, "show evidence" toggle, copy button, English/Hinglish output toggle, extraction progress indicator |
| NICE | Export/import memories as JSON, regenerate one style, dark mode |
| CUT | Auth, MongoDB, embeddings, multi-chat, WhatsApp integration, mobile app, streaming, fine-tuning, agents, analytics |

## 4. Architecture

```
 BROWSER (React + Vite + Tailwind)
 +----------------------------------------------+
 | Upload -> parse .txt (client-side)           |
 | Chunk messages                               |
 | Memory store (localStorage) <- Dashboard     |
 | Keyword retrieval (client-side)              |
 +-----------------+----------------------------+
                   | only text chunks / pasted convo + top memories
                   v
 EXPRESS (stateless, no database, no content logs)
 +----------------------------------------------+
 | POST /api/extract -> prompt + chunk          |
 | POST /api/repair  -> prompt + convo + mems   |
 | safeJson parse / validate / retry            |
 | llm.js: provider switch (hosted | ollama)    |
 +-----------------+----------------------------+
                   v
       Gemma 4 (hosted API, or local Ollama)
```

Honest privacy statement: the raw chat file is parsed in the browser and never uploaded as a file.
Text chunks are sent to the model for analysis. The server stores nothing.
Do NOT claim "data never leaves your device" for the hosted version.

## 5. Technology decisions

- **Hosted vs local:** hosted Gemma for the demo, Ollama as a documented local option.
  One `llm.js` with `LLM_PROVIDER=hosted|ollama`.
- **Models:** `gemma-4-31b-it` first. If slow or rate-limited, `gemma-4-26b-a4b-it`.
  Local Ollama fallback: `gemma3:4b` (known-good; check for a Gemma 4 tag later).
- **Storage:** browser localStorage. No MongoDB (small data, no accounts, honest deletion).
- **Retrieval:** keyword scoring. Gemma generates `keywords` per memory at extraction time.
  Embeddings are V2.
- **Chunking:** about 120 messages per chunk (cap about 5,000 chars), 10-message overlap. Cap the
  MVP at the most recent ~1,500 messages (about 12 chunks) and tell the user. Process 2 chunks
  concurrently. Chats under ~150 messages can be one chunk.

## 6. User flow

```
Upload .txt -> parse (browser) -> show "N messages, date range, senders"
-> user selects which sender is "me" -> chunk -> POST /api/extract per chunk
-> merge + dedupe -> save to localStorage -> Memory Dashboard (edit / delete)
-> Repair tab: paste convo -> local retrieval (top 6-8) -> POST /api/repair
-> validated JSON -> Results: issue, context + evidence, uncertainty, avoid, 3 messages
-> user edits / copies
```

### Screens

| Screen | Contents |
|---|---|
| 1 Upload | Title "Conversation Repairer", tagline "Turn your conversation history into useful context.", file picker, privacy notice, "How to export WhatsApp chat" help |
| 2 Processing | Progress: Parsed messages / Extracting context (chunk x of N) / Organizing memories |
| 3 Memory Dashboard | Sections: Important, Preferences, Communication Patterns, Promises, Recurring Issues, Meaningful References. Each card: text, evidence quote, confidence badge, Edit, Delete. Always-visible "Delete everything" button. |
| 4 Repair | Textarea "Paste a difficult conversation", "Analyze Conversation" button, truncation notice |
| 5 Results | Possible communication issue; Evidence in text; Relevant context (memory + quote + why relevant, or "No relevant history found"); Uncertainty; What to avoid; three cards Soft / Casual / Direct, each editable with Copy |

Design: warm palette, card-based sections, evidence drawer ("Why this context?"). Must not look
like a generic ChatGPT clone.

---

## 7. Implementation phases

Rule for every phase: BUILD, RUN, TEST, VERIFY, then continue.
Do not start the next phase until the acceptance criteria pass.

### Phase 0: Setup and skeleton (45 min)

Goal: both servers run and one Gemma call works.

Build: Vite + React + Tailwind client; Express server with CORS and JSON body limit 1mb;
`.env` loading; `llm.js`; `GET /api/health`; a temporary script that sends
"Say hello in Hinglish" to Gemma and prints the result.

Files: `server/index.js`, `server/llm.js`, `.env.example`, client scaffolding.

```
# .env.example
LLM_PROVIDER=hosted            # hosted | ollama
GEMMA_API_KEY=your_key_here
GEMMA_MODEL=gemma-4-31b-it
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:4b
PORT=8787
```

`llm.js` contract:
`export async function generate(prompt, { temperature = 0.2, timeoutMs = 90000 }) -> string`.
Handles provider switch, timeout, one retry on 5xx, backoff 2s then 5s on HTTP 429, and filters
out `thought` parts (see Section 0).

Acceptance:
- `GET /api/health` returns ok.
- Test script prints a clean Hinglish line from Gemma, with NO reasoning text.

### Phase 1: WhatsApp parser (1.5 h)

**FEATURE:** WhatsApp Chat Parser
- Goal: convert exported WhatsApp .txt into structured messages.
- Files: `client/src/lib/whatsappParser.js`
- Input: raw text of an exported .txt file.
- Processing: detect format per line with regex.
  - Android: `12/03/2026, 21:45 - Name: text`
  - iOS: `[12/03/26, 9:45:12 PM] Name: text`
  - Strip invisible characters (`\u200e`, `\u200f`).
  - Lines not matching a header are continuations of the previous message (multiline).
  - Skip system lines (encryption notice, "X added Y", "changed the subject", lines with a
    timestamp but no "Name:" part).
  - Keep media placeholders as `[media]` (`<Media omitted>`, "image omitted").
  - Support 12h and 24h times, dd/mm and mm/dd.
- Output: `{ messages:[{id,date,time,sender,text}], senders:[], stats:{count,firstDate,lastDate} }`
  or a thrown Error with a readable message.
- Dependencies: none.
- Acceptance:
  - Parses normal messages, multiline messages, both formats.
  - Ignores system lines. Handles media placeholders.
  - Empty or non-WhatsApp file gives: "Couldn't find WhatsApp messages in this file".
  - Verified on `samples/android_sample.txt` and `samples/ios_sample.txt` (synthetic) via a small
    Node test script.

### Phase 2: Chunker + extract endpoint (2 h)

**FEATURE:** Chunker and Memory Extraction
- Goal: Gemma returns valid, verified memory JSON for one chunk.
- Files: `client/src/lib/chunker.js`, `client/src/lib/api.js`, `server/routes/extract.js`,
  `server/prompts/extract.js`, `server/lib/safeJson.js`
- Input: formatted chunk text (lines like `Name: text`), names of ME and FRIEND.
- Processing:
  1. Build the extraction prompt (Section 8). Call `generate()` at temperature 0.2.
  2. `safeJson`: strip code fences, take text between first `{` and last `}`, `JSON.parse`.
     On failure retry once with "Return ONLY valid JSON". If it still fails, return
     `{memories:[]}` plus a warning.
  3. Validate each memory: category in allowed list; `memory` non-empty string; `evidence` string;
     `confidence` in high|medium|low.
  4. **Drop any memory whose evidence is not a substring of the chunk** (normalize whitespace and
     case).
  5. Client: process 2 chunks concurrently, collect warnings.
- Output: `{ memories:[{category,memory,evidence,speaker,keywords,confidence}], warnings:[] }`
- Dependencies: Phase 0, Phase 1.
- Acceptance:
  - On `samples/hinglish_sample.txt` (synthetic, ~120 messages with one clear preference, one
    promise, and a repeated cancellation conflict), at least 70% of memories carry a verified quote.
  - Invalid JSON never crashes the server.
  - A failed chunk is skipped with a warning; other chunks continue.
  - Script prints verified memories AND dropped ones.

### Phase 3: Consolidation, storage, dashboard (2.5 h)

**FEATURE:** Memory Consolidation and Dashboard
- Goal: merge duplicates, persist, and let the user view/edit/delete.
- Files: `client/src/lib/dedupe.js`, `client/src/lib/memoryStore.js`,
  `components/UploadScreen.jsx`, `ProcessingScreen.jsx`, `MemoryDashboard.jsx`, `MemoryCard.jsx`,
  `App.jsx`
- Input: raw memories from all chunks.
- Processing: normalize text (lowercase, strip punctuation). Same category and token Jaccard
  similarity above 0.6 means merge: keep highest confidence, keep up to 2 evidence quotes, union
  keywords. Assign ids `m_001`... Save to localStorage key `cr:memories`. Group by category.
  Inline edit sets `userEdited=true`. Delete removes one. Delete Everything clears localStorage and
  returns to Upload. Low-confidence memories render muted.
- Output: dashboard with six category sections.
- Dependencies: Phase 2.
- Acceptance: six sections render; inline edit works; delete one works; Delete Everything clears
  storage; refresh keeps memories; empty state shown when there are no memories.

### Phase 4: Retrieval + repair endpoint (2.5 h)

**FEATURE:** Retrieval and Context-Aware Repair
- Goal: retrieve relevant memories and have Gemma produce a structured repair analysis.
- Files: `client/src/lib/retrieve.js`, `server/routes/repair.js`, `server/prompts/repair.js`,
  `components/RepairScreen.jsx`, `ResultsScreen.jsx`
- Input: pasted conversation; stored memories; ME and FRIEND names.
- Processing:
  - `retrieve.js`: tokenize (lowercase, strip punctuation, drop stopwords including Hinglish:
    hai, ka, ki, ko, to, toh, ne, se, bhi, nahi, kya, me, mein, ho, tha, thi).
  - Score = keyword overlap (memory.keywords and memory text) + category boost
    (recurring_issue, promise, preference) + small recency bonus.
  - Exclude low-confidence by default. Return top 8. If best score is 0, send zero memories.
  - Truncate pasted text to the last ~6,000 chars and show a notice.
  - Server builds the repair prompt (Section 8) with memories as `{id,text,evidence}`.
    Temperature 0.7 first try, 0.2 on retry.
- Output: validated repair JSON (Section 9).
- Dependencies: Phase 3.
- Acceptance: for the cancellation test case the cancellation memory is retrieved and shown with
  its quote; for the unrelated test case Results shows "No relevant history found" and no invented
  context.

### Phase 5: Output validation and errors (1.5 h)

**FEATURE:** Validation and Error Handling
- Goal: never show broken or unsafe output.
- Files: `server/lib/validateRepair.js`, client toast/error components.
- Processing: require `possible_issue` (string), `evidence_in_text` (array), `relevant_context`
  (array), `uncertainty` (string), `avoid` (array), `suggestions` (exactly 3: soft, casual, direct,
  strings only). Trim messages to about 60 words. Drop `relevant_context` entries whose
  `memory_id` was not sent. Fill missing fields with safe defaults. Scan for certainty phrases
  ("is angry", "she feels", "he hates") and soften or flag. Map errors per the table in Section 8.
- Acceptance: malformed JSON, timeout, 429, empty input and garbage file each produce a friendly
  message with a Retry button, and the app stays usable. Simulate each failure and show results.

**FEATURE FREEZE after Phase 5 (Sun 17:00 IST). No new features after that.**

### Phase 6: UI polish and privacy (1.5 h, after freeze)

- Warm palette, card layout, evidence drawer, loading states, mobile-friendly widths.
- Privacy notice on upload screen; "Delete everything" always visible; text states what is sent to
  the model and what is stored.
- Acceptance: a first-time user can complete the flow without instructions.

### Phase 7: Deploy and README (1.5 h)

- Client and server together on Render/Railway/Fly, or client on Vercel/Netlify and server on
  Render. Env vars set on the host. CORS only for the client origin.
- README with architecture diagram, setup, env vars, hosted vs Ollama instructions, model name,
  screenshots, demo link, privacy section. Do not claim data never leaves the device.
- Test the full flow on the deployed URL in a fresh browser with the synthetic chat.
  If deploy breaks late, record the demo from localhost.

---

## 8. Gemma design

Gemma does three jobs: (1) extract memories from chunks, (2) analyze the pasted conversation using
retrieved memories, (3) write repair messages in the user's own style. Code does parsing,
retrieval, dedupe, and validation.

### Extraction prompt (`server/prompts/extract.js`)

```
You extract relationship memories from a WhatsApp chat excerpt between "{ME}" and "{FRIEND}".
The chat may be English, Hindi, Romanized Hindi, or Hinglish, with slang, abbreviations and emojis.

Extract ONLY things useful for future communication. Categories:
important_event, preference, communication_pattern, promise, recurring_issue, meaningful_reference.

Rules:
- Every memory MUST include an exact quote copied from the chat as evidence. If you can't quote it, don't include it.
- Do not infer emotions or motives. State only what is said or clearly done.
- Write each memory in simple English; keep key Hinglish phrases in the quote as-is.
- Include 3-6 "keywords" (lowercase; include Hinglish and English variants).
- confidence: high = stated directly; medium = repeated pattern; low = weak hint.
- If nothing useful exists, return {"memories": []}.
- Return ONLY valid JSON, no markdown, no commentary.

Schema: {"memories":[{"category":"...","memory":"...","evidence":"exact quote","speaker":"name","keywords":["..."],"confidence":"high|medium|low"}]}

CHAT:
{chunk}
```

### Repair prompt (`server/prompts/repair.js`)

```
You are a communication assistant, not a therapist and not a mind reader.
A user pasted a conversation they are worried about. Help them repair or continue it.

Language: Understand English, Hindi, Romanized Hindi and Hinglish. Write suggestions in the SAME style
as the user's messages. Do NOT use formal/shuddh Hindi. Keep it natural and casual, like real texting.
If the user writes Hinglish, write Hinglish.

Rules:
- Never claim certainty about what someone feels or thinks. Use "might", "could", "possible".
- Separate what is visible in the text (evidence) from your interpretation.
- Use ONLY the provided memories as history. Cite them by id. If none are relevant, say so; do not invent history.
- Do not blame either person. No clinical or diagnostic language.
- If the conversation shows safety concerns (threats, self-harm), set "safety_note" and keep suggestions minimal and kind.
- 3 suggestions: "soft" (warm, gentle), "casual" (short, natural), "direct" (honest, clear, still kind).
- Messages must be sendable as-is, under 60 words each, no placeholders like [name].

Return ONLY valid JSON:
{"possible_issue":"","evidence_in_text":["quote"],"relevant_context":[{"memory_id":"","why_relevant":""}],
 "uncertainty":"","avoid":[""],"safety_note":"","suggestions":[{"style":"soft","message":""},{"style":"casual","message":""},{"style":"direct","message":""}]}

MEMORIES: {list of {id, text, evidence}}
USER IS: {ME}. OTHER PERSON: {FRIEND}.
CONVERSATION: {paste}
```

### Hinglish handling

- Prompts list English / Hindi / Romanized Hindi / Hinglish and say to mirror the user's style and
  avoid formal Hindi.
- Memories are written in simple English; quotes stay in the original language.
- Keywords include Hinglish variants so retrieval works on mixed text (cancel, plan, reply, call,
  kal, late).
- Example: input "Bhai mujhe lag raha hai woh thodi upset hai but idk" should produce casual
  Hinglish suggestions, not formal Hindi or stiff English.
- If quality is poor: add 2 few-shot Hinglish examples to the repair prompt, or use the larger model.

### Hallucination prevention (in code)

- Evidence must be an exact (normalized) substring of the chunk, otherwise drop the memory.
- Repair prompt receives only memory ids + text + evidence; output must reference ids; unknown ids
  are dropped.
- Low-confidence memories are muted in the UI and not sent to repair by default.
- `uncertainty` is mandatory; UI always displays it.
- Temperature about 0.2 for extraction, about 0.7 for repair.

### Error handling table

| Case | Behavior |
|---|---|
| Invalid / unsupported file | Parser error with link to export help |
| Empty chat | "No messages found" |
| Huge chat | Use last ~1,500 messages; tell user |
| AI timeout / unavailable | 90s timeout, 1 retry, then retry button; keep partial extraction progress |
| Malformed JSON | safeJson + one retry; else skip chunk with warning |
| Rate limit (429) | Backoff 2s then 5s; concurrency 2 |
| Hallucination | Evidence substring check; drop unquoted memories |
| Duplicate memories | Jaccard dedupe |
| Irrelevant memories | Score threshold; show "No relevant history found" |
| Very long pasted conversation | Truncate to last ~6,000 chars with notice |
| Sensitive content | Privacy notice before upload; `safety_note` path in repair output |

## 9. Data model

localStorage key `cr:memories`:

```json
{
  "meta": { "me": "Aman", "friend": "Riya", "messageCount": 1480, "importedAt": "2026-10-04T10:00:00Z" },
  "memories": [
    {
      "id": "m_001",
      "category": "recurring_issue",
      "memory": "Riya dislikes last-minute plan cancellations",
      "evidence": ["yaar last moment pe cancel mat kiya kar"],
      "speaker": "Riya",
      "keywords": ["cancel", "plan", "last minute", "cancel mat"],
      "confidence": "high",
      "userEdited": false
    }
  ]
}
```

Raw chat is NOT stored. Say this in the UI.

Validated repair response:

```json
{
  "possible_issue": "...",
  "evidence_in_text": ["..."],
  "relevant_context": [ { "memory_id": "m_001", "why_relevant": "..." } ],
  "uncertainty": "...",
  "avoid": ["..."],
  "safety_note": "",
  "suggestions": [
    { "style": "soft", "message": "..." },
    { "style": "casual", "message": "..." },
    { "style": "direct", "message": "..." }
  ]
}
```

API contracts:
- `POST /api/extract { chunk, me, friend } -> { memories, warnings }`
- `POST /api/repair { conversation, memories:[{id,text,evidence}], me, friend } -> repair JSON`
- Body limit 1mb.

## 10. Folder structure

```
conversation-repairer/
|-- client/
|   `-- src/
|       |-- components/ (UploadScreen, ProcessingScreen, MemoryDashboard, MemoryCard,
|       |                RepairScreen, ResultsScreen)
|       |-- lib/ (whatsappParser, chunker, dedupe, memoryStore, retrieve, api)
|       `-- App.jsx
|-- server/
|   |-- index.js
|   |-- llm.js
|   |-- routes/ (extract.js, repair.js)
|   |-- prompts/ (extract.js, repair.js)
|   `-- lib/ (safeJson.js, validateRepair.js)
|-- samples/ (synthetic chats + expected results)
|-- docs/
|-- PLAN.md
|-- README.md
|-- LICENSE
|-- .gitignore     (.env, node_modules, real-chats/)
`-- .env.example
```

## 11. Test plan

Create all samples as **synthetic** data in `/samples`.

| # | Case | Expected behavior |
|---|---|---|
| 1 | Normal English chat (~80 msgs) | Parses; 3 to 8 memories, all with real quotes |
| 2 | Hinglish chat | Memories in simple English, quotes in Hinglish; repair output in Hinglish |
| 3 | Long chat (1,500+ msgs) | Chunking runs, progress shown, dedupe merges repeats, no crash |
| 4 | Obvious preference ("mujhe calls pasand hain, texting nahi") | One preference memory, high confidence |
| 5 | Promise ("exam ke baad call karunga") | promise memory |
| 6 | Conflict (plans cancelled twice) | recurring_issue memory; retrieved when a new cancellation is pasted |
| 7 | Short cold reply ("k.") with no stated emotion | Says "possible", names uncertainty, NEVER "she is angry" |
| 8 | Pasted conversation unrelated to history | "No relevant history found"; no invented context |
| 9 | Android and iOS formats + a multiline message | Both parse correctly |
| 10 | Garbage .txt | Friendly error |

Manual end-to-end test: upload sample, compare dashboard with the file, delete one memory, paste
case 6, confirm the cancellation memory appears with its quote, copy a message, click Delete
Everything, refresh, confirm empty. During prompt tuning, grep outputs for banned certainty words
("is angry", "she feels", "he hates you").

## 12. Risk register

| Risk | Prob. | Impact | Prevention | Fallback |
|---|---|---|---|---|
| Gemma setup / API access stalls | Med | Critical | Phase 0 in first hour | Switch model or provider; Ollama |
| Thinking parts break parsing | High | High | Filter `thought` parts in llm.js | Strip reasoning before safeJson |
| Rate limits during extraction | High | Med | Concurrency 2, backoff, 12-chunk cap | Use gemma-4-26b-a4b-it; reduce cap |
| Malformed JSON | High | Med | safeJson + retry + validation | Skip chunk with warning |
| Hinglish quality poor | Med | High | Test on day 1; explicit style rules | Few-shot examples |
| WhatsApp format edge cases | High | Med | Test Android + iOS + multiline early | Support only tested formats |
| Memory extraction generic | Med | High | Require quotes; narrow categories | Tighten prompt |
| Retrieval misses | Med | Med | Gemma keywords + category boost | Send top-N by confidence |
| Feels like ChatGPT wrapper | Med | High | Demo dashboard and evidence quotes | Lead article with the pipeline |
| AI invents relationship facts | Med | Critical | Evidence substring check; ids only | Show only verified memories |
| Suggestions generic | Med | High | Require use of context | Add few-shot examples |
| Friend unavailable / no consent | Med-High | Critical | Message them immediately | Be honest in article; never fake |
| Private data leaks into repo/demo | Low | Critical | Synthetic data only; .gitignore | Redact; blur screenshots |
| Open-source AI not clearly shown | Low | Med | State Gemma + open weights + Ollama | n/a |
| Missing tags / article / demo | Med | High | Checklist, finish by Mon 08:00 | Short article is fine |
| Deploy breaks late | Med | High | Deploy a skeleton early | Record demo from localhost |

## 13. Deadline roadmap (IST)

Target submission Mon 08:30. Hard deadline Mon Oct 5, 12:25 PM IST. Adjust to your actual start time.

| When | Work |
|---|---|
| Sat now (30 min) | Message friend (consent, export, Sunday slot). Repo, API key, .env. |
| Sat evening | Phase 0, Phase 1; start Phase 2; synthetic samples |
| Sat night | Phase 2 working on the sample chat; stop at a stable point; sleep |
| Sun 09:00-13:00 | Finish Phase 2; Phase 3 |
| Sun 13:00-16:30 | Phase 4, Phase 5 |
| **Sun 17:00** | **HARD FEATURE FREEZE** |
| Sun 17:00-19:00 | Bug fixes, prompt tuning on test cases 1-10, UI polish, verify delete/privacy |
| Sun 19:00-20:30 | Deploy final; test on deployed URL |
| Sun 20:30-22:00 | Friend session; record honest reaction with permission |
| Sun 22:00-23:00 | Screenshots (synthetic data), README draft, architecture diagram |
| Sleep | Required |
| Mon 06:30-07:30 | Record demo (synthetic data); finish README |
| Mon 07:30-08:30 | DEV article, tags, submit |
| Mon 08:30-12:25 | BUFFER ONLY |

## 14. Demo script (60 to 90 seconds)

1. **0:00** "My friend [first name, with permission] often feels conversations go wrong over small
   misunderstandings, like a cancelled plan or a short reply."
2. **0:10** Upload an exported chat (synthetic in public demo). "It's parsed in the browser. Gemma
   reads it in chunks."
3. **0:25** Show the memory dashboard. Open one memory: "Every memory has an exact quote. If the
   model can't quote it, it's dropped."
4. **0:40** Paste a new tense Hinglish exchange.
5. **0:50** Results: "Possible issue, not a diagnosis." Show relevant context with evidence, the
   uncertainty line, and what to avoid.
6. **1:05** Show soft / casual / direct messages in natural Hinglish. Edit one, copy it.
7. **1:15** "Gemma is open-weight, so this can run fully local with Ollama. That matters for
   conversations this private." Click Delete Everything.

## 15. DEV article structure

Required tags (confirm against the official post): `#devchallenge #weekendchallenge #hf26challenge`.
Use the challenge's submission template if one exists.

| Section | Collect while building |
|---|---|
| Friend / problem | Their own words (with permission), anonymized |
| Why I built it | One honest paragraph |
| What it does | 3 screenshots (synthetic data) |
| Architecture | Diagram from Section 4 |
| How Gemma is used | The three jobs plus one prompt snippet |
| Why open models matter | Local-run option, no lock-in, privacy for intimate data |
| Privacy | What is sent where, what is stored, the delete button; honest about the hosted API |
| Demo | Video / link |
| GitHub | Link |
| What I learned | Real failures: JSON breakage, thinking parts, Hinglish issues, hallucinated quotes caught by validation |
| Future | Embeddings, local-first mode, multiple chats |
| Friend's reaction | REAL quotes only, with permission. If they did not get to try it, say so. |

Friend session plan:
1. Get consent for using their chat and for quoting feedback.
2. Let them use it on their own device, ideally with their real chat. Do not record the session.
3. Ask: "Did the memories feel accurate?" "Would you send any of these messages?" "What felt wrong
   or creepy?"
4. Write notes immediately. Ask what you may publish and how to anonymize it.
5. Negative feedback is fine to include and makes the article more credible.

## 16. Final submission checklist

- [ ] Parser works for Android and iOS exports
- [ ] Extract -> dashboard -> edit/delete works
- [ ] Retrieval returns relevant memories on test cases
- [ ] Repair returns valid structured output with 3 messages
- [ ] Thought parts never shown to the user
- [ ] Hinglish tested; no certainty claims about emotions
- [ ] Errors handled (file, timeout, JSON, 429)
- [ ] Delete Everything works
- [ ] Privacy notice accurate (hosted vs local)
- [ ] Deployed URL works in a fresh browser
- [ ] Public repo, license, no real chats or API keys committed
- [ ] `.env.example`, setup steps, Ollama instructions, model name
- [ ] Synthetic sample chats in `/samples`
- [ ] Architecture diagram + screenshots in README
- [ ] Demo video recorded (synthetic data)
- [ ] Friend tested; permission for feedback recorded
- [ ] DEV article published with the 3 tags and links to repo and demo
- [ ] Submission verified before Mon 08:30

## 17. If I fall behind: emergency cut-down

| Time left (to Mon 12:25) | Cut |
|---|---|
| ~30 h | Language toggle, confidence badges, dark mode, export/import |
| ~20 h | Dedupe via code only; cap chat at 800 messages; single extraction pass |
| ~14 h | Drop iOS format if it fights you; drop inline edit (keep delete only) |
| ~10 h | Replace scoring with "top 8 by confidence" plus keyword filter |
| ~7 h | No new code except bugs. Stop prompt tuning. Deploy what works. |
| ~5 h | Record demo, README, article. Use localhost recording if deploy is broken. |
| ~3 h | Fix / deploy / document / submit only |

## 18. First 5 things to do

1. Message your friend: explain the project, ask for consent and a chat export, book ~30 min on
   Sunday evening.
2. Confirm the challenge rules and submission template (tags, required links).
3. Keep the API key in `.env` only; confirm `.env` is git-ignored.
4. Create the public repo (license, .gitignore) and scaffold client + server.
5. Write two synthetic chats (English and Hinglish, each with a preference, a promise, and a
   cancellation conflict).
