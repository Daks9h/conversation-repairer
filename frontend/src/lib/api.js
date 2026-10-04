/**
 * Client API layer for server communication
 */

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code || "API_ERROR";
    this.details = details || null;
  }
}

/**
 * Calls /api/extract with a chunk of formatted conversation text.
 * 
 * @param {object} params
 * @param {string} params.chunk - Formatted chunk text (e.g. "Name: message")
 * @param {string} params.me - User's name
 * @param {string} params.friend - Friend's name
 * @returns {Promise<{memories: Array, warnings: Array, dropped: Array}>}
 */
export async function extractMemories({ chunk, me, friend }) {
  let response;
  try {
    response = await fetch("/api/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ chunk, me, friend })
    });
  } catch (netErr) {
    throw new ApiError(
      "Unable to reach the server. Please check your network connection.",
      0,
      "AI_UNAVAILABLE"
    );
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new ApiError(
      errData.error || `Server extraction returned status ${response.status}`,
      response.status,
      errData.code || (response.status === 429 ? "RATE_LIMIT" : response.status === 504 ? "TIMEOUT" : "SERVER_ERROR"),
      errData.details
    );
  }

  return response.json();
}

/**
 * Calls /api/repair with the pasted conversation and retrieved memories.
 * 
 * @param {object} params
 * @param {string} params.conversation - Pasted tense conversation
 * @param {Array<{id: string, text: string, evidence: string}>} params.memories - Retrieved memories
 * @param {string} params.me - User's name
 * @param {string} params.friend - Friend's name
 * @returns {Promise<object>}
 */
export async function repairConversationApi({ conversation, memories, me, friend }) {
  let response;
  try {
    response = await fetch("/api/repair", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ conversation, memories, me, friend })
    });
  } catch (netErr) {
    throw new ApiError(
      "Unable to reach the server. Please check your network connection.",
      0,
      "AI_UNAVAILABLE"
    );
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new ApiError(
      errData.error || `Server repair returned status ${response.status}`,
      response.status,
      errData.code || (response.status === 429 ? "RATE_LIMIT" : response.status === 504 ? "TIMEOUT" : "SERVER_ERROR"),
      errData.details
    );
  }

  return response.json();
}
