/**
 * Chunker for WhatsApp Messages
 * Splits messages into overlapping chunks respecting message count and character caps.
 */

const DEFAULT_TARGET_CHUNK_SIZE = 120;
const DEFAULT_MAX_CHARS = 5000;
const DEFAULT_OVERLAP = 10;
const MAX_MESSAGES_CAP = 1500;

/**
 * Formats a list of messages into "Sender: text" lines.
 * 
 * @param {Array<{sender: string, text: string}>} messages 
 * @returns {string}
 */
export function formatChunkText(messages) {
  return messages.map((m) => `${m.sender}: ${m.text}`).join("\n");
}

/**
 * Splits an array of parsed WhatsApp messages into chunks for model analysis.
 * 
 * Rules:
 * - Cap at most recent ~1,500 messages
 * - About 120 messages per chunk
 * - Cap at about 5,000 characters per chunk
 * - 10-message overlap between consecutive chunks
 * - Small chats (under ~150 messages with low char count) can be one chunk
 * 
 * @param {Array<{id: string, date: string, time: string, sender: string, text: string}>} messages
 * @param {object} [options]
 * @param {number} [options.targetChunkSize=120]
 * @param {number} [options.maxChars=5000]
 * @param {number} [options.overlap=10]
 * @param {number} [options.maxMessagesCap=1500]
 * @returns {Array<{chunkIndex: number, totalChunks: number, startIndex: number, endIndex: number, messageCount: number, text: string, messages: Array}>}
 */
export function chunkMessages(messages, options = {}) {
  const {
    targetChunkSize = DEFAULT_TARGET_CHUNK_SIZE,
    maxChars = DEFAULT_MAX_CHARS,
    overlap = DEFAULT_OVERLAP,
    maxMessagesCap = MAX_MESSAGES_CAP
  } = options;

  if (!messages || messages.length === 0) {
    return [];
  }

  // Cap at the most recent maxMessagesCap messages
  const recent = messages.length > maxMessagesCap
    ? messages.slice(-maxMessagesCap)
    : messages;

  // Check if small enough to be a single chunk without exceeding character limits
  const totalFormattedLength = recent.reduce(
    (sum, m) => sum + m.sender.length + m.text.length + 3,
    0
  );

  if (recent.length <= 150 && totalFormattedLength <= maxChars) {
    const chunkText = formatChunkText(recent);
    return [
      {
        chunkIndex: 0,
        totalChunks: 1,
        startIndex: 0,
        endIndex: recent.length,
        messageCount: recent.length,
        text: chunkText,
        messages: recent
      }
    ];
  }

  const chunks = [];
  let start = 0;

  while (start < recent.length) {
    let end = start;
    let accumulatedChars = 0;

    while (end < recent.length && (end - start) < targetChunkSize) {
      const lineLen = recent[end].sender.length + recent[end].text.length + 3;
      // Cap at ~5000 characters, but ensure at least 25 messages per chunk if not at end
      if (accumulatedChars + lineLen > maxChars && (end - start) >= 25) {
        break;
      }
      accumulatedChars += lineLen;
      end++;
    }

    if (end === start) {
      end = Math.min(start + 1, recent.length);
    }

    const chunkMsgs = recent.slice(start, end);
    chunks.push({
      chunkIndex: chunks.length,
      startIndex: start,
      endIndex: end,
      messageCount: chunkMsgs.length,
      text: formatChunkText(chunkMsgs),
      messages: chunkMsgs
    });

    if (end >= recent.length) {
      break;
    }

    // Step forward with overlap
    const nextStart = end - overlap;
    start = nextStart > start ? nextStart : end;
  }

  // Update totalChunks on all chunk items
  chunks.forEach((c) => {
    c.totalChunks = chunks.length;
  });

  return chunks;
}
