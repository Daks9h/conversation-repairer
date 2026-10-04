import { dedupeMemories, jaccardSimilarity, tokenize } from "../../frontend/src/lib/dedupe.js";

console.log("==========================================");
console.log("     PHASE 3: DEDUPE & LOGIC TESTS        ");
console.log("==========================================\n");

// 1. Jaccard similarity checks
const t1 = tokenize("Pooja and Rohan attended a pottery workshop in Bandra");
const t2 = tokenize("Pooja and Rohan attended pottery workshop in Bandra");
const t3 = tokenize("Rohan frequently cancels plans at the last moment");

const simClose = jaccardSimilarity(t1, t2);
const simDiff = jaccardSimilarity(t1, t3);

console.log(`Similarity between near-duplicates: ${(simClose * 100).toFixed(1)}% (Expected > 60%)`);
console.log(`Similarity between distinct concepts: ${(simDiff * 100).toFixed(1)}% (Expected low)\n`);

// 2. Test Deduplication
const rawTestMemories = [
  {
    category: "important_event",
    memory: "Pooja and Rohan attended pottery workshop in Bandra.",
    evidence: "Clay cup banaya maine! Thoda lopsided hai but cute.",
    speaker: "Pooja",
    keywords: ["pottery", "workshop", "bandra"],
    confidence: "high"
  },
  {
    category: "important_event",
    memory: "Pooja and Rohan attended the pottery workshop in Bandra.",
    evidence: "Kal pottery workshop 3 baje hai, remember?",
    speaker: "Pooja",
    keywords: ["pottery", "workshop", "clay"],
    confidence: "medium"
  },
  {
    category: "preference",
    memory: "Pooja prefers direct phone calls over long texting.",
    evidence: "Mujhe lambi texting se zyada phone calls pasand hain",
    speaker: "Pooja",
    keywords: ["calls", "texting", "preference"],
    confidence: "high"
  },
  {
    category: "recurring_issue",
    memory: "Rohan frequently cancels plans last minute.",
    evidence: "Tu hamesha last moment pe cancel karta hai",
    speaker: "Pooja",
    keywords: ["cancel", "plans", "last moment"],
    confidence: "high"
  }
];

const deduped = dedupeMemories(rawTestMemories);

console.log(`Input memories: ${rawTestMemories.length}`);
console.log(`Deduped memories: ${deduped.length} (Expected 3, as the two pottery memories merge)\n`);

deduped.forEach((m) => {
  console.log(`ID: ${m.id} | [${m.category}] (${m.confidence} confidence)`);
  console.log(`  Memory:   ${m.memory}`);
  console.log(`  Evidence: ${JSON.stringify(m.evidence)} (Quotes count: ${m.evidence.length})`);
  console.log(`  Keywords: [${m.keywords.join(", ")}]`);
  console.log(`  userEdited: ${m.userEdited}\n`);
});

const passedDedupe = deduped.length === 3 && deduped[0].evidence.length === 2 && deduped[0].id === "m_001";
console.log(`Deduplication & merging test: ${passedDedupe ? "PASS" : "FAIL"}`);
console.log("==========================================\n");
