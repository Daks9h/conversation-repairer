import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseWhatsAppChat } from "../src/lib/whatsappParser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");

function runParserTests() {
  console.log("=========================================");
  console.log("   PHASE 1: WHATSAPP PARSER TEST SUITE   ");
  console.log("=========================================\n");

  // 1. Android sample test
  console.log("--- 1. Testing Android Sample (samples/android_sample.txt) ---");
  const androidPath = path.join(rootDir, "samples/android_sample.txt");
  const androidRaw = fs.readFileSync(androidPath, "utf8");
  try {
    const androidResult = parseWhatsAppChat(androidRaw);
    console.log(`Message count: ${androidResult.stats.count}`);
    console.log(`Senders: [${androidResult.senders.join(", ")}]`);
    console.log(`Date range: ${androidResult.stats.firstDate} to ${androidResult.stats.lastDate}`);
    console.log("\nFirst 5 messages:");
    androidResult.messages.slice(0, 5).forEach((m, idx) => {
      console.log(`  [${idx + 1}] (${m.date} ${m.time}) ${m.sender}: ${JSON.stringify(m.text)}`);
    });

    // Check specific acceptance criteria
    const hasMedia = androidResult.messages.some((m) => m.text.includes("[media]"));
    const hasMultiline = androidResult.messages.some((m) => m.text.includes("\n"));
    console.log(`\nAcceptance checks:`);
    console.log(`  - Media replaced with [media]: ${hasMedia ? "PASS" : "FAIL"}`);
    console.log(`  - Multiline preserved: ${hasMultiline ? "PASS" : "FAIL"}`);
    console.log(`  - System lines excluded: ${!androidResult.senders.includes("Rohan changed the subject") ? "PASS" : "FAIL"}`);
  } catch (err) {
    console.error("Android parsing FAILED:", err.message);
  }

  // 2. iOS sample test
  console.log("\n--- 2. Testing iOS Sample (samples/ios_sample.txt) ---");
  const iosPath = path.join(rootDir, "samples/ios_sample.txt");
  const iosRaw = fs.readFileSync(iosPath, "utf8");
  try {
    const iosResult = parseWhatsAppChat(iosRaw);
    console.log(`Message count: ${iosResult.stats.count}`);
    console.log(`Senders: [${iosResult.senders.join(", ")}]`);
    console.log(`Date range: ${iosResult.stats.firstDate} to ${iosResult.stats.lastDate}`);
    console.log("\nFirst 5 messages:");
    iosResult.messages.slice(0, 5).forEach((m, idx) => {
      console.log(`  [${idx + 1}] (${m.date} ${m.time}) ${m.sender}: ${JSON.stringify(m.text)}`);
    });

    const hasMedia = iosResult.messages.some((m) => m.text.includes("[media]"));
    const hasMultiline = iosResult.messages.some((m) => m.text.includes("\n"));
    console.log(`\nAcceptance checks:`);
    console.log(`  - Media replaced with [media]: ${hasMedia ? "PASS" : "FAIL"}`);
    console.log(`  - Multiline preserved: ${hasMultiline ? "PASS" : "FAIL"}`);
    console.log(`  - System lines excluded: ${!iosResult.senders.includes("Kabir added Vikram") ? "PASS" : "FAIL"}`);
  } catch (err) {
    console.error("iOS parsing FAILED:", err.message);
  }

  // 3. Error handling tests
  console.log("\n--- 3. Testing Error Handling ---");

  // Test 3a: Empty string
  try {
    parseWhatsAppChat("");
    console.log("Empty string test: FAIL (did not throw)");
  } catch (err) {
    console.log(`Empty string error: "${err.message}" -> PASS`);
  }

  // Test 3b: Garbage text
  const garbage = "This is just a random text document.\nThere are no timestamps here.\nNothing to parse!";
  try {
    parseWhatsAppChat(garbage);
    console.log("Garbage file test: FAIL (did not throw)");
  } catch (err) {
    console.log(`Garbage text error: "${err.message}" -> PASS`);
  }

  // Test 3c: File with only system lines
  const onlySystem = `10/03/2026, 18:30 - Messages and calls are end-to-end encrypted. No one outside of this chat can read.
10/03/2026, 18:31 - Rohan created group "Trip"
10/03/2026, 18:32 - Rohan changed the group icon`;
  try {
    parseWhatsAppChat(onlySystem);
    console.log("Only system lines test: FAIL (did not throw)");
  } catch (err) {
    console.log(`Only system lines error: "${err.message}" -> PASS`);
  }

  console.log("\n=========================================");
  console.log("        PHASE 1 TESTING COMPLETE         ");
  console.log("=========================================\n");
}

runParserTests();
