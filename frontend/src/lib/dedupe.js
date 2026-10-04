/**
 * Deduplication for extracted relationship memories using token Jaccard similarity.
 */

const CONFIDENCE_WEIGHT = {
  high: 3,
  medium: 2,
  low: 1
};

/**
 * Tokenizes text by lowercasing, stripping punctuation, and splitting on whitespace.
 * 
 * @param {string} text 
 * @returns {Set<string>}
 */
export function tokenize(text) {
  const cleaned = (text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim();

  if (!cleaned) return new Set();
  return new Set(cleaned.split(/\s+/).filter(Boolean));
}

/**
 * Computes Jaccard similarity between two token sets.
 * 
 * @param {Set<string>} setA 
 * @param {Set<string>} setB 
 * @returns {number} Value between 0.0 and 1.0
 */
export function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersectionSize = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionSize++;
    }
  }

  const unionSize = setA.size + setB.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

/**
 * Normalizes evidence into an array of quotes.
 */
function normalizeEvidence(evidence) {
  if (!evidence) return [];
  if (Array.isArray(evidence)) {
    return evidence.map((e) => String(e).trim()).filter(Boolean);
  }
  const str = String(evidence).trim();
  return str ? [str] : [];
}

/**
 * Merges duplicate memories within the same category when Jaccard similarity > 0.6.
 * 
 * Rules:
 * - Same category required for merging
 * - Token Jaccard similarity > 0.6
 * - Keep highest confidence (high > medium > low)
 * - Keep up to 2 unique evidence quotes
 * - Union keywords
 * - Assign IDs: m_001, m_002, ...
 * - Set userEdited: false
 * 
 * @param {Array<object>} rawMemories 
 * @param {number} [threshold=0.6]
 * @returns {Array<object>}
 */
export function dedupeMemories(rawMemories, threshold = 0.6) {
  if (!Array.isArray(rawMemories) || rawMemories.length === 0) {
    return [];
  }

  const clusters = [];

  for (const item of rawMemories) {
    const category = (item.category || "").toLowerCase().trim();
    const memoryText = (item.memory || "").trim();
    const itemTokens = tokenize(memoryText);
    const itemEvidence = normalizeEvidence(item.evidence);
    const itemConfidence = (item.confidence || "medium").toLowerCase();
    const itemKeywords = Array.isArray(item.keywords)
      ? item.keywords.map((k) => String(k).toLowerCase().trim()).filter(Boolean)
      : [];

    let matchedCluster = null;

    for (const cluster of clusters) {
      if (cluster.category !== category) continue;

      const sim = jaccardSimilarity(cluster.tokens, itemTokens);
      if (sim > threshold) {
        matchedCluster = cluster;
        break;
      }
    }

    if (matchedCluster) {
      // Merge: Pick higher confidence
      const currentWeight = CONFIDENCE_WEIGHT[matchedCluster.confidence] || 1;
      const newWeight = CONFIDENCE_WEIGHT[itemConfidence] || 1;
      if (newWeight > currentWeight) {
        matchedCluster.confidence = itemConfidence;
      }

      // Merge: Keep longer / more specific description if significantly more informative
      if (memoryText.length > matchedCluster.memory.length + 10) {
        matchedCluster.memory = memoryText;
        matchedCluster.tokens = itemTokens;
      }

      // Merge: Up to 2 unique evidence quotes
      const combinedEvidence = Array.from(
        new Set([...matchedCluster.evidence, ...itemEvidence])
      ).slice(0, 2);
      matchedCluster.evidence = combinedEvidence;

      // Merge: Union keywords
      const combinedKeywords = Array.from(
        new Set([...matchedCluster.keywords, ...itemKeywords])
      );
      matchedCluster.keywords = combinedKeywords;
    } else {
      clusters.push({
        category,
        memory: memoryText,
        evidence: itemEvidence.slice(0, 2),
        speaker: item.speaker || "",
        keywords: itemKeywords,
        confidence: itemConfidence,
        tokens: itemTokens,
        userEdited: false
      });
    }
  }

  // Assign sequential IDs m_001, m_002, etc. and remove temporary token cache
  return clusters.map((cluster, index) => {
    const id = `m_${String(index + 1).padStart(3, "0")}`;
    const { tokens, ...cleanMemory } = cluster;
    return {
      id,
      ...cleanMemory
    };
  });
}
