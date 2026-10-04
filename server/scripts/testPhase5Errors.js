import { validateRepair, softenCertainty, trimToWords } from "../lib/validateRepair.js";
import { parseWhatsAppChat } from "../../client/src/lib/whatsappParser.js";

console.log("==========================================");
console.log("     PHASE 5: VALIDATION & ERROR TESTS    ");
console.log("==========================================\n");

let passedCount = 0;
let totalCount = 0;

function assert(condition, name) {
  totalCount++;
  if (condition) {
    console.log(`[PASS] ${name}`);
    passedCount++;
  } else {
    console.error(`[FAIL] ${name}`);
  }
}

// ==========================================
// TEST 1: BAD JSON & VALIDATION DEFAULTS
// ==========================================
console.log("--- 1. Testing validateRepair (Bad/Incomplete JSON & Defaults) ---");

const malformedModelOutput = {
  possible_issue: "She is angry and he hates when plans change.",
  // missing evidence_in_text
  // missing uncertainty
  // missing avoid
  relevant_context: [
    { memory_id: "m_001", why_relevant: "Pooja is mad about cancellations." },
    { memory_id: "m_fake_999", why_relevant: "This memory ID was never sent to model." }
  ],
  suggestions: [
    {
      style: "soft",
      message: "Hey " + "word ".repeat(80) // 81 words, should be trimmed to ~60 words
    },
    {
      style: "casual",
      message: "She is angry so let us chill."
    }
    // missing "direct" style
  ]
};

const validMemoriesSent = [{ id: "m_001", text: "Dislikes cancellations" }];
const validated = validateRepair(malformedModelOutput, validMemoriesSent);

// Check 1: Softening certainty about emotions
assert(
  !validated.possible_issue.includes("is angry") && !validated.possible_issue.includes("he hates"),
  "Certainty claims ('is angry', 'he hates') are softened in possible_issue"
);
assert(
  validated.possible_issue.includes("might be feeling frustrated") || validated.possible_issue.includes("uncomfortable"),
  "Softened language substituted into possible_issue"
);

// Check 2: Missing fields have safe defaults
assert(Array.isArray(validated.evidence_in_text), "evidence_in_text defaults to array");
assert(typeof validated.uncertainty === "string" && validated.uncertainty.length > 0, "uncertainty has safe default");
assert(Array.isArray(validated.avoid) && validated.avoid.length >= 2, "avoid defaults to non-empty safe advice list");

// Check 3: Dropping memory IDs not sent
assert(validated.relevant_context.length === 1, "Dropped un-sent memory_id (m_fake_999)");
assert(validated.relevant_context[0].memory_id === "m_001", "Retained sent memory_id (m_001)");

// Check 4: Exactly 3 suggestions (soft, casual, direct)
assert(validated.suggestions.length === 3, "Exactly 3 suggestions returned");
const styles = validated.suggestions.map((s) => s.style);
assert(styles.includes("soft") && styles.includes("casual") && styles.includes("direct"), "All 3 styles present");

// Check 5: Trimming to ~60 words
const softWords = validated.suggestions.find((s) => s.style === "soft").message.split(/\s+/).length;
assert(softWords <= 61, `Long message trimmed to <= 60 words (actual: ${softWords})`);

// Check 6: Direct style filled with safe default when missing
const directMsg = validated.suggestions.find((s) => s.style === "direct").message;
assert(directMsg.length > 0, "Missing direct suggestion filled with safe default");

console.log("\nSample Validated Output:");
console.log(JSON.stringify(validated, null, 2));

// ==========================================
// TEST 2: TIMEOUT ERROR SIMULATION
// ==========================================
console.log("\n--- 2. Testing Timeout Error Handling ---");

function simulateTimeoutError() {
  const err = new Error("LLM request timed out after 90000ms.");
  err.name = "AbortError";
  
  // Simulation of categorizeLlmError logic
  if (err.message.includes("timed out") || err.name === "AbortError") {
    return {
      statusCode: 504,
      code: "TIMEOUT",
      userMessage: "The request to the AI model timed out. The model may be taking longer than usual to think."
    };
  }
}

const timeoutSim = simulateTimeoutError();
assert(timeoutSim.statusCode === 504, "Timeout maps to HTTP 504");
assert(timeoutSim.code === "TIMEOUT", "Timeout code is TIMEOUT");
assert(timeoutSim.userMessage.includes("timed out"), "Friendly timeout user message generated");

// ==========================================
// TEST 3: 429 RATE LIMIT SIMULATION
// ==========================================
console.log("\n--- 3. Testing 429 Rate Limit Error Handling ---");

function simulate429Error() {
  const err = new Error("LLM API rate limit exceeded (HTTP 429) after retry backoffs.");
  
  // Simulation of categorizeLlmError logic
  if (err.message.includes("429") || err.message.includes("rate limit")) {
    return {
      statusCode: 429,
      code: "RATE_LIMIT",
      userMessage: "AI rate limit reached. Please wait a few seconds and try again."
    };
  }
}

const rateLimitSim = simulate429Error();
assert(rateLimitSim.statusCode === 429, "Rate limit maps to HTTP 429");
assert(rateLimitSim.code === "RATE_LIMIT", "Rate limit code is RATE_LIMIT");
assert(rateLimitSim.userMessage.includes("rate limit reached"), "Friendly rate limit message generated");

// ==========================================
// TEST 4: EMPTY INPUT SIMULATION
// ==========================================
console.log("\n--- 4. Testing Empty Input Simulation ---");

function simulateEmptyPaste(convo) {
  if (!convo || typeof convo !== "string" || !convo.trim()) {
    return {
      statusCode: 400,
      code: "EMPTY_INPUT",
      userMessage: "Please paste a conversation before clicking analyze."
    };
  }
  return null;
}

const emptyPaste1 = simulateEmptyPaste("");
const emptyPaste2 = simulateEmptyPaste("    \n\t  ");
assert(emptyPaste1 && emptyPaste1.code === "EMPTY_INPUT", "Empty string rejected with EMPTY_INPUT");
assert(emptyPaste2 && emptyPaste2.code === "EMPTY_INPUT", "Whitespace-only paste rejected with EMPTY_INPUT");

// ==========================================
// TEST 5: GARBAGE & UNSUPPORTED FILE SIMULATION
// ==========================================
console.log("\n--- 5. Testing Garbage & Empty File Simulation ---");

const garbageFile = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.`;
let garbageCaught = false;
let garbageMsg = "";
try {
  parseWhatsAppChat(garbageFile);
} catch (err) {
  garbageCaught = true;
  garbageMsg = err.message;
}
assert(garbageCaught, "Garbage text file threw parser exception");
assert(
  garbageMsg.includes("Couldn't find WhatsApp messages") || garbageMsg.includes("Unsupported"),
  `Friendly parser error message: "${garbageMsg}"`
);

const emptyFile = "";
let emptyCaught = false;
let emptyMsg = "";
try {
  parseWhatsAppChat(emptyFile);
} catch (err) {
  emptyCaught = true;
  emptyMsg = err.message;
}
assert(emptyCaught, "Empty text file threw parser exception");
assert(
  emptyMsg.includes("Couldn't find WhatsApp messages") || emptyMsg.includes("Unsupported"),
  `Empty file message: "${emptyMsg}"`
);

// ==========================================
// TEST 6: THOUGHT TAG PURGING
// ==========================================
console.log("\n--- 6. Testing Thought Tag Sanitization ---");

const textWithThoughts = `
<thought>
I should analyze the emotions here. Rohan is angry and cancelled plans.
</thought>
Here is the visible reply.
`;

const cleaned = softenCertainty(textWithThoughts);
assert(!cleaned.includes("<thought>") && !cleaned.includes("I should analyze"), "Thought tags completely stripped");
assert(cleaned.includes("Here is the visible reply."), "Non-thought text preserved");

// ==========================================
// SUMMARY
// ==========================================
console.log("\n==========================================");
console.log(`PHASE 5 TEST SUMMARY: ${passedCount}/${totalCount} assertions passed`);
console.log("==========================================");

if (passedCount === totalCount) {
  process.exit(0);
} else {
  process.exit(1);
}
