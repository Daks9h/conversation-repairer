import express from "express";
import { generate } from "../llm.js";
import { buildRepairPrompt } from "../prompts/repair.js";
import { safeJsonParse } from "../lib/safeJson.js";

const router = express.Router();

/**
 * Core repair logic.
 */
export async function repairConversation({ conversation, memories = [], me, friend }) {
  if (!conversation || typeof conversation !== "string" || !conversation.trim()) {
    throw new Error("Missing or empty 'conversation' parameter");
  }
  if (!me || !friend) {
    throw new Error("Both 'me' and 'friend' parameters are required");
  }

  const prompt = buildRepairPrompt({ conversation, memories, me, friend });

  // First attempt at temperature 0.7
  let responseText = await generate(prompt, { temperature: 0.7 });
  let parseResult = safeJsonParse(responseText);

  // If initial JSON parsing fails, retry once at temperature 0.2
  if (!parseResult.success) {
    const retryPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON matching the schema, with no markdown code blocks or surrounding text.`;
    responseText = await generate(retryPrompt, { temperature: 0.2 });
    parseResult = safeJsonParse(responseText);
  }

  if (!parseResult.success) {
    throw new Error("Failed to parse valid repair response from model: " + parseResult.error);
  }

  const data = parseResult.data || {};

  // Valid memory IDs filter: drop any relevant_context item whose memory_id was not in the prompt
  const validMemoryIds = new Set((memories || []).map((m) => m.id));
  const rawContext = Array.isArray(data.relevant_context) ? data.relevant_context : [];
  const filteredContext = rawContext.filter(
    (item) => item && item.memory_id && validMemoryIds.has(item.memory_id)
  );

  // Ensure default structure
  return {
    possible_issue: typeof data.possible_issue === "string" ? data.possible_issue : "",
    evidence_in_text: Array.isArray(data.evidence_in_text) ? data.evidence_in_text : [],
    relevant_context: filteredContext,
    uncertainty: typeof data.uncertainty === "string" ? data.uncertainty : "",
    avoid: Array.isArray(data.avoid) ? data.avoid : [],
    safety_note: typeof data.safety_note === "string" ? data.safety_note : "",
    suggestions: Array.isArray(data.suggestions) ? data.suggestions : []
  };
}

/**
 * POST /api/repair
 */
router.post("/", async (req, res) => {
  const { conversation, memories, me, friend } = req.body;

  try {
    const result = await repairConversation({ conversation, memories, me, friend });
    return res.json(result);
  } catch (err) {
    const status = err.message.includes("Missing") ? 400 : 500;
    return res.status(status).json({
      error: err.message
    });
  }
});

export default router;
