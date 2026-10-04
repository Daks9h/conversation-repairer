/**
 * Client API layer for server communication
 */

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
  const response = await fetch("/api/extract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ chunk, me, friend })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Server extraction returned status ${response.status}`);
  }

  return response.json();
}
