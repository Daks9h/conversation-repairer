import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Ensure root .env is loaded
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generates text using Gemma via hosted Google API or local Ollama.
 * 
 * @param {string} prompt - Full user prompt with all instructions.
 * @param {object} options - Generation options.
 * @param {number} [options.temperature=0.2] - Sampling temperature.
 * @param {number} [options.timeoutMs=90000] - Request timeout in milliseconds (default 90s).
 * @returns {Promise<string>} Generated text with thought parts filtered out.
 */
export async function generate(prompt, { temperature = 0.2, timeoutMs = 90000 } = {}) {
  const provider = process.env.LLM_PROVIDER || "hosted";

  if (provider === "ollama") {
    return generateOllama(prompt, { temperature, timeoutMs });
  }

  return generateHosted(prompt, { temperature, timeoutMs });
}

/**
 * Call Google Generative Language API for hosted Gemma.
 */
async function generateHosted(prompt, { temperature, timeoutMs }) {
  const apiKey = process.env.GEMMA_API_KEY;
  const model = process.env.GEMMA_MODEL;

  if (!apiKey) {
    throw new Error("GEMMA_API_KEY is not set in environment.");
  }
  if (!model) {
    throw new Error("GEMMA_MODEL is not set in environment.");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature
    }
  };

  const data = await fetchWithRetry(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }, timeoutMs);

  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new Error("No candidates returned from Gemma model.");
  }

  const parts = candidate.content?.parts || [];

  // Filter out thinking reasoning parts ("thought": true)
  // Join only non-thought text parts. Never leak thought text to the user.
  const textParts = parts
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text);

  return textParts.join("").trim();
}

/**
 * Call local Ollama API for Gemma.
 */
async function generateOllama(prompt, { temperature, timeoutMs }) {
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "gemma3:4b";

  const endpoint = `${ollamaUrl.replace(/\/$/, "")}/api/generate`;

  const payload = {
    model,
    prompt,
    stream: false,
    options: {
      temperature
    }
  };

  const data = await fetchWithRetry(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }, timeoutMs);

  return (data.response || "").trim();
}

/**
 * Fetch wrapper handling:
 * - Timeout via AbortSignal
 * - Backoff 2s then 5s on HTTP 429
 * - One retry on 5xx status codes
 */
async function fetchWithRetry(url, options, timeoutMs) {
  let attempt429 = 0;
  let attempt5xx = 0;

  while (true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle 429 rate limit backoff (2s then 5s)
      if (response.status === 429) {
        if (attempt429 === 0) {
          attempt429++;
          await sleep(2000);
          continue;
        } else if (attempt429 === 1) {
          attempt429++;
          await sleep(5000);
          continue;
        } else {
          throw new Error("LLM API rate limit exceeded (HTTP 429) after retry backoffs.");
        }
      }

      // Handle 5xx server error (one retry)
      if (response.status >= 500 && response.status < 600) {
        if (attempt5xx === 0) {
          attempt5xx++;
          await sleep(1500);
          continue;
        } else {
          const errBody = await response.text().catch(() => "");
          throw new Error(`LLM API server error (${response.status}) after retry: ${errBody}`);
        }
      }

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        throw new Error(`LLM API request failed with status ${response.status}: ${errBody}`);
      }

      return await response.json();
    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === "AbortError") {
        throw new Error(`LLM request timed out after ${timeoutMs}ms.`);
      }
      throw err;
    }
  }
}
