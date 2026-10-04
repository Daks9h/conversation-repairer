/**
 * WhatsApp Chat Parser
 * Parses exported .txt chat logs from Android and iOS into structured messages.
 */

// Matches Android header: "12/03/2026, 21:45 - " or "12/03/2026, 9:45 pm - "
const ANDROID_HEADER_REGEX = /^(\d{1,4}[-/.]\d{1,2}[-/.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[aApP][mM])?)\s*-\s*(.*)$/;

// Matches iOS header: "[12/03/26, 9:45:12 PM] " or "[12/03/2026, 21:45:12] "
const IOS_HEADER_REGEX = /^\[(\d{1,4}[-/.]\d{1,2}[-/.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[aApP][mM])?)\]\s*(?:-\s*)?(.*)$/;

// Matches Sender: Message inside the remainder of a header line
const SENDER_MESSAGE_REGEX = /^(.*?):\s*([\s\S]*)$/;

// Media placeholder patterns to normalize to [media]
const MEDIA_REGEX = /<Media omitted>|<media omitted>|image omitted|video omitted|audio omitted|document omitted|sticker omitted|gif omitted|contact card omitted|<attached:\s*[^>]+>/gi;

// Known system message markers
const SYSTEM_MARKERS = [
  "messages and calls are end-to-end encrypted",
  "created group",
  "created this group",
  "added",
  "removed",
  "left",
  "changed the subject",
  "changed the group",
  "changed this group's",
  "security code changed",
  "you deleted this message",
  "this message was deleted"
];

/**
 * Parses raw WhatsApp exported text into structured messages.
 * 
 * @param {string} rawText - The raw string from the exported .txt file.
 * @returns {{ messages: Array<{id: string, date: string, time: string, sender: string, text: string}>, senders: string[], stats: {count: number, firstDate: string, lastDate: string} }}
 * @throws {Error} If no valid WhatsApp messages are found.
 */
export function parseWhatsAppChat(rawText) {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("Couldn't find WhatsApp messages in this file");
  }

  // Strip invisible unicode markers and normalize spaces
  // \u200e (LRM), \u200f (RLM), \u202a-\u202e (bidi marks), \ufeff (BOM), \u202f/\u00a0 (non-breaking spaces)
  const normalized = rawText
    .replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, "")
    .replace(/[\u202f\u00a0]/g, " ");

  const lines = normalized.split(/\r?\n/);
  const messages = [];
  const senderSet = new Set();

  let currentMessage = null;
  let lastWasSystem = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line && !currentMessage) continue;

    // Try matching Android or iOS headers
    const androidMatch = line.match(ANDROID_HEADER_REGEX);
    const iosMatch = line.match(IOS_HEADER_REGEX);
    const match = androidMatch || iosMatch;

    if (match) {
      const [, date, time, rest] = match;
      const senderMatch = rest.match(SENDER_MESSAGE_REGEX);

      if (senderMatch) {
        const potentialSender = senderMatch[1].trim();
        const content = senderMatch[2];

        // Check if the potential sender is actually a system notification
        const lowerSender = potentialSender.toLowerCase();
        const isSystem = SYSTEM_MARKERS.some((marker) => lowerSender.includes(marker));

        if (isSystem) {
          currentMessage = null;
          lastWasSystem = true;
          continue;
        }

        // Valid new message header
        const cleanContent = normalizeMedia(content);
        currentMessage = {
          id: `m_${messages.length + 1}`,
          date: date.trim(),
          time: time.trim(),
          sender: potentialSender,
          text: cleanContent
        };
        messages.push(currentMessage);
        senderSet.add(potentialSender);
        lastWasSystem = false;
      } else {
        // Line matched timestamp header but has no "Sender: text" (system line)
        currentMessage = null;
        lastWasSystem = true;
      }
    } else {
      // Continuation of previous line (multiline message)
      if (currentMessage && !lastWasSystem) {
        currentMessage.text += `\n${normalizeMedia(line)}`;
      }
      // If lastWasSystem is true, ignore continuation lines of system message
    }
  }

  if (messages.length === 0) {
    throw new Error("Couldn't find WhatsApp messages in this file");
  }

  return {
    messages,
    senders: Array.from(senderSet),
    stats: {
      count: messages.length,
      firstDate: messages[0].date,
      lastDate: messages[messages.length - 1].date
    }
  };
}

/**
 * Replace media omitted placeholders with standard [media] token.
 */
function normalizeMedia(text) {
  return text.replace(MEDIA_REGEX, "[media]");
}
