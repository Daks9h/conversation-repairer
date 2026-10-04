/**
 * Extraction prompt builder following PLAN.md Section 8 exactly.
 */

export function buildExtractPrompt({ chunk, me, friend }) {
  return `You extract relationship memories from a WhatsApp chat excerpt between "${me}" and "${friend}".
The chat may be English, Hindi, Romanized Hindi, or Hinglish, with slang, abbreviations and emojis.

Extract ONLY things useful for future communication. Categories:
important_event, preference, communication_pattern, promise, recurring_issue, meaningful_reference.

Rules:
- Every memory MUST include an exact quote copied from the chat as evidence. If you can't quote it, don't include it.
- A memory must be directly supported by its quote. If the quote only suggests, asks or plans something, do not state it as something that happened.
- Prefer memories useful for resolving future misunderstandings: promises, recurring issues, communication preferences, things a person said bothered them. Skip trivia like food or seat preferences unless repeated.
- Return at most 8 memories per chunk.
- Do not infer emotions or motives. State only what is said or clearly done.
- Write each memory in simple English; keep key Hinglish phrases in the quote as-is.
- Include 3-6 "keywords" (lowercase; include Hinglish and English variants).
- confidence: high = stated directly; medium = repeated pattern; low = weak hint.
- If nothing useful exists, return {"memories": []}.
- Return ONLY valid JSON, no markdown, no commentary.

Schema: {"memories":[{"category":"...","memory":"...","evidence":"exact quote","speaker":"name","keywords":["..."],"confidence":"high|medium|low"}]}

CHAT:
${chunk}`;
}
