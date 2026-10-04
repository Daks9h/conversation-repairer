import { generate } from "../llm.js";

async function runTest() {
  console.log("Testing Gemma connection...");
  try {
    const prompt = "Say hello in Hinglish, one short line.";
    const result = await generate(prompt, { temperature: 0.2, timeoutMs: 90000 });
    console.log("\n--- Gemma Output ---");
    console.log(result);
    console.log("--------------------\n");
  } catch (err) {
    console.error("Test failed:", err.message);
    process.exit(1);
  }
}

runTest();
