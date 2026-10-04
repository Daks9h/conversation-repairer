import React, { useEffect, useState, useRef } from "react";
import { chunkMessages } from "../lib/chunker.js";
import { extractMemories } from "../lib/api.js";
import { dedupeMemories } from "../lib/dedupe.js";
import { saveMemoriesStore } from "../lib/memoryStore.js";

export default function ProcessingScreen({ jobData, onComplete, onCancel }) {
  const { messages, me, friend } = jobData;

  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(1);
  const [statusMessage, setStatusMessage] = useState("Preparing chunks...");
  const [warnings, setWarnings] = useState([]);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    async function processAllChunks() {
      const chunks = chunkMessages(messages);
      setTotalChunks(chunks.length);

      const allRawMemories = [];
      const collectedWarnings = [];
      const batchSize = 1;

      for (let i = 0; i < chunks.length; i += batchSize) {
        const chunkObj = chunks[i];
        const chunkNum = i + 1;

        setStatusMessage(
          `Extracting context (chunk ${chunkNum} of ${chunks.length})...`
        );
        setCurrentChunk(chunkNum);

        try {
          const res = await extractMemories({
            chunk: chunkObj.text,
            me,
            friend
          });
          if (res.memories && Array.isArray(res.memories)) {
            allRawMemories.push(...res.memories);
          }
          if (res.warnings && Array.isArray(res.warnings)) {
            collectedWarnings.push(...res.warnings);
          }
        } catch (err) {
          collectedWarnings.push(`Chunk ${chunkNum} extraction failed: ${err.message}`);
        }
      }

      // If no memories were extracted and warnings occurred, stop and show error
      if (allRawMemories.length === 0 && collectedWarnings.length > 0) {
        setStatusMessage("Extraction failed");
        setWarnings(collectedWarnings);
        return;
      }

      setStatusMessage("Consolidating and organizing memories...");
      setWarnings(collectedWarnings);

      // Deduplicate using token Jaccard similarity and assign m_001 IDs
      const dedupedMemories = dedupeMemories(allRawMemories);

      const storePayload = {
        meta: {
          me,
          friend,
          messageCount: messages.length,
          importedAt: new Date().toISOString()
        },
        memories: dedupedMemories
      };

      // Save to localStorage
      saveMemoriesStore(storePayload);

      // Small delay for smooth transition
      setTimeout(() => {
        onComplete(storePayload, collectedWarnings);
      }, 500);
    }

    processAllChunks().catch((err) => {
      console.error("Pipeline failure:", err);
      setWarnings((prev) => [...prev, `Unexpected pipeline error: ${err.message}`]);
    });
  }, [messages, me, friend, onComplete]);

  const progressPercent = totalChunks > 0 ? Math.round((currentChunk / totalChunks) * 100) : 0;

  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 space-y-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 text-amber-900 animate-pulse mb-2">
          <svg
            className="w-7 h-7 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
        </div>

        <div>
          <h2 className="text-xl font-bold text-stone-900">
            Analyzing Relationship Context
          </h2>
          <p className="text-sm text-stone-600 mt-1">
            Gemma is reading chat chunks and verifying memory evidence...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-stone-600">
            <span>{statusMessage}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-amber-600 h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 text-left space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-rose-800">
              <span>⚠️ Extraction Issues ({warnings.length}):</span>
            </div>
            {warnings.map((w, idx) => (
              <div key={idx} className="text-rose-700">
                • {w}
              </div>
            ))}
          </div>
        )}

        {statusMessage === "Extraction failed" && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              Back to Upload
            </button>
          </div>
        )}

        <div className="text-xs text-stone-600 pt-2 border-t border-stone-100">
          Raw chat text is never stored. Only verified quotes are saved locally.
        </div>
      </div>
    </div>
  );
}
