/**
 * Local keyword scoring retrieval for relationship memories.
 */

const STOPWORDS = new Set([
  // Hinglish stopwords
  "hai", "ka", "ki", "ko", "to", "toh", "ne", "se", "bhi", "nahi",
  "kya", "me", "mein", "ho", "tha", "thi", "yaar", "ab", "aur", "yeh",
  "woh", "kar", "rahe", "rahi", "raha", "karna", "hain", "pe", "tu", "maine",
  "tere", "mera", "meri", "mere", "tera", "teri", "hum", "tum", "aap", "wapas",
  // Common English stopwords
  "a", "an", "the", "is", "are", "was", "were", "and", "or", "in", "on",
  "at", "for", "with", "about", "by", "of", "it", "this", "that", "i",
  "you", "we", "they", "he", "she", "my", "your", "but", "not", "have",
  "had", "has", "be", "been", "do", "did", "so", "just", "hey", "hello",
  "please", "can", "will", "would", "could", "should", "sirf", "bhai"
]);

const CATEGORY_BOOSTS = {
  recurring_issue: 1.5,
  promise: 1.0,
  preference: 1.0,
  communication_pattern: 0.8,
  important_event: 0.5,
  meaningful_reference: 0.5
};

/**
 * Tokenizes text by stripping message headers, lowercasing, stripping punctuation,
 * and filtering stopwords and person names.
 * 
 * @param {string} text 
 * @param {Set<string>} [namesToIgnore]
 * @returns {Set<string>}
 */
export function tokenizeQuery(text, namesToIgnore = new Set()) {
  if (!text || typeof text !== "string") return new Set();

  // Strip chat sender line headers (e.g. "Rohan: ", "Pooja: ")
  const strippedHeaders = text.replace(/^[A-Za-z0-9_+\s]+:\s*/gm, "");

  const cleaned = strippedHeaders
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim();

  if (!cleaned) return new Set();

  const words = cleaned.split(/\s+/).filter(Boolean);
  const tokenSet = new Set();

  for (const word of words) {
    if (word.length > 1 && !STOPWORDS.has(word) && !namesToIgnore.has(word)) {
      tokenSet.add(word);
    }
  }

  return tokenSet;
}

/**
 * Retrieves the most relevant memories for a pasted conversation.
 * 
 * Rules:
 * - Tokenize pasted conversation (drop Hinglish and English stopwords and sender names)
 * - Exclude low-confidence memories by default
 * - Score = keyword overlap + category boost + small recency bonus
 * - Category boost applied only when there is at least 1 keyword match
 * - If best score is 0, return an empty array []
 * - Return top 8 memories
 * 
 * @param {string} conversationText - The pasted conversation text
 * @param {Array<object>} memories - Stored memories from localStorage
 * @returns {Array<{id: string, text: string, evidence: string, category: string, score: number, rawMemory: object}>}
 */
export function retrieveRelevantMemories(conversationText, memories) {
  if (!conversationText || !Array.isArray(memories) || memories.length === 0) {
    return [];
  }

  // Collect speaker names to ignore so they don't cause false topical matches
  const namesToIgnore = new Set();
  memories.forEach((m) => {
    if (m.speaker) {
      namesToIgnore.add(String(m.speaker).toLowerCase().trim());
    }
  });

  const queryTokens = tokenizeQuery(conversationText, namesToIgnore);
  if (queryTokens.size === 0) {
    return [];
  }

  const scored = [];

  memories.forEach((mem, index) => {
    // Exclude low-confidence memories
    if (mem.confidence === "low") {
      return;
    }

    let overlapScore = 0;

    // Check keywords (weighted higher, topic-specific)
    if (Array.isArray(mem.keywords)) {
      mem.keywords.forEach((kw) => {
        const kwWords = tokenizeQuery(kw, namesToIgnore);
        for (const kwWord of kwWords) {
          if (queryTokens.has(kwWord)) {
            overlapScore += 2.0;
          }
        }
      });
    }

    // Check memory description tokens (excluding speaker names)
    const memTokens = tokenizeQuery(mem.memory, namesToIgnore);
    for (const token of memTokens) {
      if (queryTokens.has(token)) {
        overlapScore += 1.0;
      }
    }

    // Check evidence tokens
    const evidenceText = Array.isArray(mem.evidence)
      ? mem.evidence.join(" ")
      : mem.evidence || "";
    const evidenceTokens = tokenizeQuery(evidenceText, namesToIgnore);
    for (const token of evidenceTokens) {
      if (queryTokens.has(token)) {
        overlapScore += 0.8;
      }
    }

    // If no keyword/text overlap, score remains 0
    if (overlapScore === 0) {
      return;
    }

    // Category boost
    const catBoost = CATEGORY_BOOSTS[mem.category] || 0.0;

    // Small recency bonus (later index in list = slightly newer)
    const recencyBonus = (index / Math.max(memories.length, 1)) * 0.3;

    const totalScore = overlapScore + catBoost + recencyBonus;

    const evidenceStr = Array.isArray(mem.evidence)
      ? mem.evidence[0] || ""
      : mem.evidence || "";

    scored.push({
      id: mem.id,
      text: mem.memory,
      evidence: evidenceStr,
      category: mem.category,
      score: totalScore,
      rawMemory: mem
    });
  });

  if (scored.length === 0) {
    return [];
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Return top 8
  return scored.slice(0, 8);
}
