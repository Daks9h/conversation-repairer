import express from "express";
import { generate } from "../llm.js";
import { buildRepairPrompt } from "../prompts/repair.js";
import { safeJsonParse } from "../lib/safeJson.js";
import { validateRepair } from "../lib/validateRepair.js";

const router = express.Router();

/**
 * Core repair logic with parsing, retry, and validation.
 */
export async function repairConversation({ conversation, memories = [], me, friend }) {
  if (!conversation || typeof conversation !== "string" || !conversation.trim()) {
    const err = new Error("Missing or empty 'conversation' parameter");
    err.code = "EMPTY_INPUT";
    err.statusCode = 400;
    throw err;
  }
  if (!me || !friend) {
    const err = new Error("Both 'me' and 'friend' parameters are required");
    err.code = "MISSING_PARAMS";
    err.statusCode = 400;
    throw err;
  }

  const prompt = buildRepairPrompt({ conversation, memories, me, friend });

  // First attempt at temperature 0.7
  let responseText;
  try {
    responseText = await generate(prompt, { temperature: 0.7 });
  } catch (err) {
    categorizeLlmError(err);
    throw err;
  }

  let parseResult = safeJsonParse(responseText);

  // If initial JSON parsing fails, retry once at temperature 0.2
  if (!parseResult.success) {
    const retryPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON matching the schema, with no markdown code blocks or surrounding text.`;
    try {
      responseText = await generate(retryPrompt, { temperature: 0.2 });
      parseResult = safeJsonParse(responseText);
    } catch (err) {
      categorizeLlmError(err);
      throw err;
    }
  }

  if (!parseResult.success) {
    const err = new Error("Failed to parse valid repair response from AI model after retry.");
    err.code = "BAD_JSON";
    err.statusCode = 502;
    err.details = parseResult.error;
    throw err;
  }

  // Validate, drop invalid context IDs, soften certainty claims, apply safe defaults, trim messages
  return validateRepair(parseResult.data, memories);
}

function categorizeLlmError(err) {
  const msg = err.message || "";
  if (msg.includes("timed out") || err.name === "AbortError") {
    err.code = "TIMEOUT";
    err.statusCode = 504;
    err.userMessage = "The request to the AI model timed out. The model may be taking longer than usual to think.";
  } else if (msg.includes("429") || msg.includes("rate limit")) {
    err.code = "RATE_LIMIT";
    err.statusCode = 429;
    err.userMessage = "AI rate limit reached. Please wait a few seconds and try again.";
  } else if (msg.includes("API key") || msg.includes("500") || msg.includes("503") || msg.includes("unavailable") || msg.includes("ECONNREFUSED")) {
    err.code = "AI_UNAVAILABLE";
    err.statusCode = 503;
    err.userMessage = "The AI service is temporarily unavailable. Please check your connection or API key.";
  } else {
    err.code = "AI_ERROR";
    err.statusCode = 500;
    err.userMessage = msg || "An error occurred while communicating with the AI service.";
  }
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
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      error: err.userMessage || err.message,
      code: err.code || "SERVER_ERROR",
      details: err.details || null
    });
  }
});

export default router;
