import { retrieveRelevantMemories } from "../../client/src/lib/retrieve.js";
import { repairConversation } from "../routes/repair.js";

console.log("==========================================");
console.log("     PHASE 4: RETRIEVAL & REPAIR TEST     ");
console.log("==========================================\n");

// Stored memories from our Hinglish sample
const mockMemories = [
  {
    id: "m_001",
    category: "communication_pattern",
    memory: "Pooja prefers phone calls over long text messages for important discussions to avoid misunderstandings.",
    evidence: ["Jab bhi koi important discussion ho, call kar liya kar. Mujhe lambi texting se zyada phone calls pasand hain, text pe baatein misunderstand ho jaati hain."],
    speaker: "Pooja",
    keywords: ["communication", "phone calls", "texting", "misunderstandings"],
    confidence: "high"
  },
  {
    id: "m_002",
    category: "recurring_issue",
    memory: "Rohan has a habit of cancelling plans at the last moment, which has happened three times in one month.",
    evidence: ["Tu hamesha last moment pe cancel karta hai, ye teesri baar hua hai iss month!"],
    speaker: "Pooja",
    keywords: ["cancellation", "last moment", "cancel", "plans", "time waste"],
    confidence: "high"
  },
  {
    id: "m_003",
    category: "promise",
    memory: "Rohan promised to fix his schedule and respect Pooja's time to stop last-minute cancellations.",
    evidence: ["I will fix my schedule. Promise to respect your time."],
    speaker: "Rohan",
    keywords: ["promise", "respect time", "schedule", "reliability"],
    confidence: "high"
  },
  {
    id: "m_004",
    category: "meaningful_reference",
    memory: "Pooja and Rohan share a permanent slogan: 'Biryani over everything'.",
    evidence: ["Haha Biryani over everything, as always! Humara permanent slogan hai ye."],
    speaker: "Rohan",
    keywords: ["biryani", "slogan", "inside joke", "food"],
    confidence: "high"
  }
];

// Test Case 1: Cancellation conflict (relevant to m_002 and m_003)
const cancellationConvo = `Rohan: Yaar Pooja so sorry, aaj dinner pe nahi aa paunga. Kuch urgent issue aa gaya.
Pooja: Rohan seriously? Last minute pe bol raha hai wapas?`;

console.log("--- 1. Testing Retrieval: Cancellation Case ---");
const retrievedCase1 = retrieveRelevantMemories(cancellationConvo, mockMemories);
console.log(`Retrieved memories: ${retrievedCase1.length}`);
retrievedCase1.forEach((m) => {
  console.log(`  - [${m.id}] [${m.category}] (Score: ${m.score.toFixed(2)}) ${m.text}`);
  console.log(`    Evidence: "${m.evidence}"`);
});

const foundCancellationMem = retrievedCase1.some((m) => m.id === "m_002");
console.log(`Cancellation memory retrieved: ${foundCancellationMem ? "PASS" : "FAIL"}\n`);

// Test Case 2: Unrelated conversation (should score 0 and return [])
const unrelatedConvo = `Rohan: Hey, laptop ka charger spare hai kya tere paas? USB-C wala?
Pooja: Nahi, mere paas MagSafe hai sirf.`;

console.log("--- 2. Testing Retrieval: Unrelated Case ---");
const retrievedCase2 = retrieveRelevantMemories(unrelatedConvo, mockMemories);
console.log(`Retrieved memories for unrelated convo: ${retrievedCase2.length} (Expected 0)`);
console.log(`Zero memories on unrelated input: ${retrievedCase2.length === 0 ? "PASS" : "FAIL"}\n`);

// Test Case 3: Calling /api/repair on Cancellation Case
console.log("--- 3. Testing LLM Repair on Cancellation Case ---");
const repairInput = {
  conversation: cancellationConvo,
  memories: retrievedCase1,
  me: "Pooja",
  friend: "Rohan"
};

try {
  const result = await repairConversation(repairInput);
  console.log("\nRepair Analysis Result:");
  console.log("Possible Issue:", result.possible_issue);
  console.log("Evidence in Text:", result.evidence_in_text);
  console.log("Relevant Context Cited:", JSON.stringify(result.relevant_context, null, 2));
  console.log("Uncertainty Note:", result.uncertainty);
  console.log("What to Avoid:", result.avoid);
  console.log("Suggestions Count:", result.suggestions.length);
  result.suggestions.forEach((s) => {
    console.log(`  - [${s.style.toUpperCase()}]: "${s.message}"`);
  });

  const validSuggestions = result.suggestions.length === 3;
  const hasUncertainty = Boolean(result.uncertainty);
  console.log(`\nRepair Acceptance Check: ${validSuggestions && hasUncertainty ? "PASS" : "FAIL"}`);
} catch (err) {
  console.error("Repair call failed:", err);
}

console.log("\n==========================================");
console.log("         PHASE 4 TESTING COMPLETE         ");
console.log("==========================================\n");
