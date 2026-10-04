import express from "express";
import { generate } from "../llm.js";
import { buildExtractPrompt } from "../prompts/extract.js";
import { safeJsonParse } from "../lib/safeJson.js";

const router = express.Router();

const ALLOWED_CATEGORIES = new Set([
  "important_event",
  "preference",
  "communication_pattern",
  "promise",
  "recurring_issue",
  "meaningful_reference"
]);

const ALLOWED_CONFIDENCE = new Set(["high", "medium", "low"]);

/**
 * Normalizes text for substring checking by stripping invisible characters,
 * collapsing whitespace, and lowercasing.
 */
export function normalizeForCheck(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, "")
    .replace(/[\r\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks if the evidence quote exists as a substring in the chunk.
 * Handles slight punctuation variance (e.g. trailing quotes/periods added by LLM).
 */
export function verifyEvidenceSubstring(chunk, evidence) {
  if (!chunk || !evidence) return false;

  const normalizedChunk = normalizeForCheck(chunk);
  const normalizedEvidence = normalizeForCheck(evidence);

  if (normalizedChunk.includes(normalizedEvidence)) {
    return true;
  }

  // Fallback: strip leading and trailing punctuation from the evidence quote
  const strippedEvidence = normalizedEvidence.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  if (strippedEvidence.length > 5 && normalizedChunk.includes(strippedEvidence)) {
    return true;
  }

  return false;
}

/**
 * Core extraction logic for a single chunk.
 * Can be called directly or via the POST /api/extract HTTP route.
 */
export async function extractFromChunk({ chunk, me, friend }) {
  if (!chunk || typeof chunk !== "string" || !chunk.trim()) {
    throw new Error("Missing or empty 'chunk' parameter");
  }
  if (!me || !friend) {
    throw new Error("Both 'me' and 'friend' parameters are required");
  }

  const warnings = [];
  const dropped = [];
  const verifiedMemories = [];

  const prompt = buildExtractPrompt({ chunk, me, friend });

  // Step 1: Initial model call
  let responseText = await generate(prompt, { temperature: 0.2 });
  let parseResult = safeJsonParse(responseText);

  // Step 2: Retry once if JSON parsing failed
  if (!parseResult.success) {
    warnings.push(`Initial JSON parse failed (${parseResult.error}). Retrying once...`);
    const retryPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON matching the schema, with no markdown code fences or surrounding text.`;
    responseText = await generate(retryPrompt, { temperature: 0.2 });
    parseResult = safeJsonParse(responseText);
  }

  if (!parseResult.success) {
    warnings.push(`JSON parsing failed after retry: ${parseResult.error}`);
    return { memories: [], warnings, dropped };
  }

  const rawMemories = parseResult.data.memories;
  if (!Array.isArray(rawMemories)) {
    warnings.push("Model returned JSON without a valid 'memories' array");
    return { memories: [], warnings, dropped };
  }

  // Step 3: Validate each extracted memory
  for (const item of rawMemories) {
    if (!item || typeof item !== "object") {
      dropped.push({ memory: item, reason: "Memory entry is not an object" });
      continue;
    }

    const category = (item.category || "").toLowerCase().trim();
    if (!ALLOWED_CATEGORIES.has(category)) {
      dropped.push({
        memory: item,
        reason: `Category '${item.category}' is not in allowed list`
      });
      continue;
    }

    const memoryText = typeof item.memory === "string" ? item.memory.trim() : "";
    if (!memoryText) {
      dropped.push({ memory: item, reason: "Memory text is empty" });
      continue;
    }

    const evidence = typeof item.evidence === "string" ? item.evidence.trim() : "";
    if (!evidence) {
      dropped.push({ memory: item, reason: "Missing evidence quote" });
      continue;
    }

    // Step 4: Strict evidence substring verification against source chunk
    const hasQuote = verifyEvidenceSubstring(chunk, evidence);
    if (!hasQuote) {
      dropped.push({
        memory: item,
        reason: "Evidence quote is not a verified substring of the chat chunk",
        evidence
      });
      continue;
    }

    // Step 5: Clean and structure verified memory
    const confidence = ALLOWED_CONFIDENCE.has(item.confidence) ? item.confidence : "medium";
    const keywords = Array.isArray(item.keywords)
      ? item.keywords.map((k) => String(k).toLowerCase().trim()).filter(Boolean)
      : [];

    verifiedMemories.push({
      category,
      memory: memoryText,
      evidence,
      speaker: item.speaker ? String(item.speaker).trim() : friend,
      keywords,
      confidence
    });
  }

  return {
    memories: verifiedMemories,
    warnings,
    dropped
  };
}

/**
 * POST /api/extract
 */
router.post("/", async (req, res) => {
  const { chunk, me, friend } = req.body;
  try {
    const result = await extractFromChunk({ chunk, me, friend });
    return res.json(result);
  } catch (err) {
    const msg = err.message || "";
    let status = 500;
    let code = "AI_ERROR";
    let userMessage = msg;

    if (msg.includes("Missing") || msg.includes("required")) {
      status = 400;
      code = "EMPTY_INPUT";
    } else if (msg.includes("timed out") || err.name === "AbortError") {
      status = 504;
      code = "TIMEOUT";
      userMessage = "Extraction request timed out while communicating with the AI model.";
    } else if (msg.includes("429") || msg.includes("rate limit")) {
      status = 429;
      code = "RATE_LIMIT";
      userMessage = "AI rate limit reached during extraction. Please wait a moment.";
    } else if (msg.includes("API key") || msg.includes("500") || msg.includes("503") || msg.includes("unavailable") || msg.includes("ECONNREFUSED")) {
      status = 503;
      code = "AI_UNAVAILABLE";
      userMessage = "AI service is currently unavailable or returning an error.";
    }

    return res.status(status).json({
      error: userMessage,
      code,
      memories: [],
      warnings: [userMessage],
      dropped: []
    });
  }
});

export default router;
