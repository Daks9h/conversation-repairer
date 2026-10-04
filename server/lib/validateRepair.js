/**
 * Validation and normalization layer for Gemma conversation repair output.
 * Guarantees schema adherence, trims reply lengths, sanitizes context,
 * provides safe defaults, and softens any claims of certainty about emotions.
 */

const CERTAINTY_PATTERNS = [
  { regex: /\b(she|he)\s+is\s+angry\b/gi, replacement: "$1 might be feeling frustrated" },
  { regex: /\b(is|are)\s+angry\b/gi, replacement: "might be feeling frustrated" },
  { regex: /\b(she|he)\s+is\s+furious\b/gi, replacement: "$1 may be very frustrated" },
  { regex: /\b(is|are)\s+furious\b/gi, replacement: "may be very frustrated" },
  { regex: /\b(she|he)\s+is\s+mad\b/gi, replacement: "$1 might be annoyed" },
  { regex: /\b(is|are)\s+mad\b/gi, replacement: "might be annoyed" },
  { regex: /\b(she|he)\s+is\s+upset\b/gi, replacement: "$1 could be upset" },
  { regex: /\b(is|are)\s+upset\b/gi, replacement: "could be upset" },
  { regex: /\b(she|he)\s+is\s+hurt\b/gi, replacement: "$1 may be feeling hurt" },
  { regex: /\b(is|are)\s+hurt\b/gi, replacement: "may be feeling hurt" },
  { regex: /\b(she|he|they)\s+feels?\b/gi, replacement: "$1 may feel" },
  { regex: /\b(she|he|they)\s+hates?\b/gi, replacement: "$1 seems uncomfortable with" },
  { regex: /\b(hates\s+you)\b/gi, replacement: "is bothered right now" },
  { regex: /\b(she|he)\s+is\s+disappointed\b/gi, replacement: "$1 could be feeling disappointed" },
  { regex: /\b(she|he)\s+is\s+ignoring\s+you\b/gi, replacement: "$1 might not have had time to respond" }
];

/**
 * Strips any leaked thought tags (e.g. <thought>...</thought> or <think>...</think>).
 */
export function stripThoughtTags(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/<thought[\s\S]*?<\/thought>/gi, "")
    .replace(/<think[\s\S]*?<\/think>/gi, "")
    .trim();
}

/**
 * Replaces certainty claims with softened, tentative language.
 */
export function softenCertainty(text) {
  if (typeof text !== "string") return "";
  let softened = stripThoughtTags(text);

  for (const { regex, replacement } of CERTAINTY_PATTERNS) {
    softened = softened.replace(regex, replacement);
  }

  return softened.trim();
}

/**
 * Trims a text string to approximately maxWords, preserving word boundaries.
 */
export function trimToWords(str, maxWords = 60) {
  if (typeof str !== "string") return "";
  const words = str.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return str.trim();
  }
  return words.slice(0, maxWords).join(" ") + "...";
}

/**
 * Validates and normalizes raw parsed repair data from Gemma.
 * 
 * @param {object} rawData - Parsed JSON object from model
 * @param {Array<{id: string}>} [validMemories=[]] - Memories sent in the prompt
 * @returns {object} Guaranteed safe and complete repair response object
 */
export function validateRepair(rawData, validMemories = []) {
  const data = rawData && typeof rawData === "object" ? rawData : {};

  // 1. possible_issue (string, softened)
  let possibleIssue = typeof data.possible_issue === "string" ? data.possible_issue.trim() : "";
  possibleIssue = softenCertainty(possibleIssue);
  if (!possibleIssue) {
    possibleIssue = "Possible miscommunication or unaddressed expectation between both parties.";
  }
  // Ensure it conveys possibility rather than absolute fact
  const hasPossibilityMarker = /\b(possible|possibility|may|might|could|potential|seems?|appears?|unclear)\b/i.test(possibleIssue);
  if (!hasPossibilityMarker) {
    possibleIssue = `Possible issue: ${possibleIssue}`;
  }

  // 2. evidence_in_text (array of strings)
  let evidenceInText = [];
  if (Array.isArray(data.evidence_in_text)) {
    evidenceInText = data.evidence_in_text
      .map((item) => (typeof item === "string" ? stripThoughtTags(item).trim() : ""))
      .filter((item) => item.length > 0);
  }

  // 3. relevant_context (array of { memory_id, why_relevant })
  // STRICT RULE: Drop relevant_context entries whose memory_id was not sent
  const validMemoryIdSet = new Set(
    (validMemories || [])
      .map((m) => (typeof m === "string" ? m : m?.id))
      .filter(Boolean)
  );

  let relevantContext = [];
  if (Array.isArray(data.relevant_context)) {
    relevantContext = data.relevant_context
      .filter((item) => item && typeof item === "object" && validMemoryIdSet.has(item.memory_id))
      .map((item) => ({
        memory_id: String(item.memory_id).trim(),
        why_relevant: softenCertainty(
          typeof item.why_relevant === "string" && item.why_relevant.trim()
            ? item.why_relevant.trim()
            : "Referenced in past relationship context."
        )
      }));
  }

  // 4. uncertainty (string, always required)
  let uncertainty = typeof data.uncertainty === "string" ? softenCertainty(data.uncertainty.trim()) : "";
  if (!uncertainty) {
    uncertainty = "Tone and emotional state cannot be determined with certainty from text messages alone.";
  }

  // 5. avoid (array of strings)
  let avoid = [];
  if (Array.isArray(data.avoid)) {
    avoid = data.avoid
      .map((item) => (typeof item === "string" ? softenCertainty(item.trim()) : ""))
      .filter((item) => item.length > 0);
  }
  if (avoid.length === 0) {
    avoid = [
      "Assuming negative motives without asking directly",
      "Escalating the conflict while emotions are high"
    ];
  }

  // 6. safety_note (string)
  const safetyNote = typeof data.safety_note === "string" ? stripThoughtTags(data.safety_note.trim()) : "";

  // 7. suggestions (exactly 3: soft, casual, direct, strings only, trimmed to ~60 words)
  const defaultSuggestions = {
    soft: "Hey, I wanted to check in gently. Let me know when you have a moment to talk.",
    casual: "Hey, saw your message. Let's catch up when you're free.",
    direct: "Hey, I'd like to talk through this when you have time so we're on the same page."
  };

  const rawSuggestions = data.suggestions;
  const suggestionMap = {};

  if (Array.isArray(rawSuggestions)) {
    for (const item of rawSuggestions) {
      if (item && typeof item === "object" && item.style && item.message) {
        const styleKey = String(item.style).toLowerCase().trim();
        if (["soft", "casual", "direct"].includes(styleKey)) {
          suggestionMap[styleKey] = String(item.message);
        }
      }
    }
  } else if (rawSuggestions && typeof rawSuggestions === "object") {
    for (const styleKey of ["soft", "casual", "direct"]) {
      if (typeof rawSuggestions[styleKey] === "string") {
        suggestionMap[styleKey] = rawSuggestions[styleKey];
      }
    }
  }

  const STYLES = ["soft", "casual", "direct"];
  const finalSuggestions = STYLES.map((style) => {
    let msg = suggestionMap[style] || defaultSuggestions[style];
    msg = softenCertainty(msg);
    msg = trimToWords(msg, 60);
    return {
      style,
      message: msg
    };
  });

  return {
    possible_issue: possibleIssue,
    evidence_in_text: evidenceInText,
    relevant_context: relevantContext,
    uncertainty,
    avoid,
    safety_note: safetyNote,
    suggestions: finalSuggestions
  };
}
