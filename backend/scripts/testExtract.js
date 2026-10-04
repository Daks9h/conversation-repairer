import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseWhatsAppChat } from "../../frontend/src/lib/whatsappParser.js";
import { chunkMessages } from "../../frontend/src/lib/chunker.js";
import { extractFromChunk } from "../routes/extract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");

async function runExtractTest() {
  console.log("==========================================");
  console.log("   PHASE 2: CHUNKER & EXTRACTION TEST     ");
  console.log("==========================================\n");

  const startTime = Date.now();

  // 1. Read and parse Hinglish sample
  const samplePath = path.join(rootDir, "samples/hinglish_sample.txt");
  const rawText = fs.readFileSync(samplePath, "utf8");
  const parsed = parseWhatsAppChat(rawText);

  console.log(`Parsed sample chat: ${parsed.stats.count} messages`);
  console.log(`Senders detected: ${parsed.senders.join(", ")}`);

  const me = "Pooja";
  const friend = "Rohan";

  // 2. Chunk messages
  const chunks = chunkMessages(parsed.messages);
  console.log(`Number of chunks: ${chunks.length}`);
  chunks.forEach((c) => {
    console.log(`  - Chunk ${c.chunkIndex + 1}/${c.totalChunks}: ${c.messageCount} messages (~${c.text.length} chars)`);
  });
  console.log("");

  // 3. Process chunks 2 at a time concurrently
  const batchSize = 2;
  const allVerified = [];
  const allDropped = [];
  const allWarnings = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const chunkNumbers = batch.map((c) => c.chunkIndex + 1).join(" & ");
    console.log(`Calling Gemma for Chunk(s) ${chunkNumbers} (concurrent batch)...`);

    const batchResults = await Promise.all(
      batch.map(async (c) => {
        try {
          return await extractFromChunk({
            chunk: c.text,
            me,
            friend
          });
        } catch (err) {
          return {
            memories: [],
            warnings: [`Chunk ${c.chunkIndex + 1} failed: ${err.message}`],
            dropped: []
          };
        }
      })
    );

    batchResults.forEach((res, idx) => {
      const chunkIdx = batch[idx].chunkIndex + 1;
      if (res.memories) {
        res.memories.forEach((m) => allVerified.push({ ...m, chunkNum: chunkIdx }));
      }
      if (res.dropped) {
        res.dropped.forEach((d) => allDropped.push({ ...d, chunkNum: chunkIdx }));
      }
      if (res.warnings) {
        res.warnings.forEach((w) => allWarnings.push(`[Chunk ${chunkIdx}] ${w}`));
      }
    });
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  // 4. Print results
  console.log("\n==========================================");
  console.log(`VERIFIED MEMORIES (${allVerified.length})`);
  console.log("==========================================");
  allVerified.forEach((m, idx) => {
    console.log(`\n#${idx + 1} [${m.category.toUpperCase()}] (Confidence: ${m.confidence}) [From Chunk ${m.chunkNum}]`);
    console.log(`   Memory:   ${m.memory}`);
    console.log(`   Evidence: "${m.evidence}"`);
    console.log(`   Speaker:  ${m.speaker}`);
    console.log(`   Keywords: [${m.keywords.join(", ")}]`);
  });

  console.log("\n==========================================");
  console.log(`DROPPED MEMORIES (${allDropped.length})`);
  console.log("==========================================");
  if (allDropped.length === 0) {
    console.log("None (0 dropped memories).");
  } else {
    allDropped.forEach((d, idx) => {
      console.log(`\n#${idx + 1} Reason: ${d.reason}`);
      if (d.evidence) console.log(`   Evidence quote: "${d.evidence}"`);
      if (d.memory) console.log(`   Attempted memory: ${JSON.stringify(d.memory.memory || d.memory)}`);
    });
  }

  if (allWarnings.length > 0) {
    console.log("\n==========================================");
    console.log(`WARNINGS (${allWarnings.length})`);
    console.log("==========================================");
    allWarnings.forEach((w) => console.log(`  - ${w}`));
  }

  const totalExtracted = allVerified.length + allDropped.length;
  const verifiedPercentage = totalExtracted > 0
    ? ((allVerified.length / totalExtracted) * 100).toFixed(1)
    : "0.0";

  console.log("\n==========================================");
  console.log("SUMMARY & ACCEPTANCE CHECKS");
  console.log("==========================================");
  console.log(`Total Chunks:           ${chunks.length}`);
  console.log(`Total Extracted:        ${totalExtracted}`);
  console.log(`Verified Substrings:    ${allVerified.length} (${verifiedPercentage}%)`);
  console.log(`Dropped (unverified):   ${allDropped.length}`);
  console.log(`Total Time Taken:       ${durationSec}s`);
  console.log(`70%+ Quote Criterion:   ${Number(verifiedPercentage) >= 70 ? "PASS" : "FAIL"}`);
  console.log("==========================================\n");
}

runExtractTest().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
