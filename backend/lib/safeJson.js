/**
 * Safe JSON parser for LLM outputs.
 * Strips code fences, isolates the JSON object substring, and parses safely.
 */

/**
 * Parses raw text from model output as JSON.
 * 
 * @param {string} rawText 
 * @returns {{ success: boolean, data: any, error?: string }}
 */
export function safeJsonParse(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return { success: false, data: null, error: "Input is empty or not a string" };
  }

  // 1. Strip markdown code blocks
  let cleaned = rawText.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, "$1").trim();

  // 2. Find outermost JSON object
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return {
      success: false,
      data: null,
      error: "No valid JSON object boundaries found in response"
    };
  }

  const jsonCandidate = cleaned.substring(firstBrace, lastBrace + 1);

  // 3. Attempt parse
  try {
    const parsed = JSON.parse(jsonCandidate);
    return { success: true, data: parsed };
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
}
