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
  const [failedChunkIndices, setFailedChunkIndices] = useState([]);
  const [extractedMemories, setExtractedMemories] = useState([]);
  const [isProcessing, setIsProcessing] = useState(true);
  const [allFailed, setAllFailed] = useState(false);
  const [hasPartial, setHasPartial] = useState(false);

  const chunksRef = useRef([]);
  const extractedRef = useRef([]);
  const warningsRef = useRef([]);
  const failedRef = useRef([]);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (hasMountedRef.current) return;
    hasMountedRef.current = true;

    const chunks = chunkMessages(messages);
    chunksRef.current = chunks;
    setTotalChunks(chunks.length);

    runExtraction(chunks.map((_, idx) => idx));
  }, [messages]);

  async function runExtraction(indicesToProcess) {
    setIsProcessing(true);
    setAllFailed(false);
    setHasPartial(false);

    const chunks = chunksRef.current;
    const currentFailed = [];

    for (let step = 0; step < indicesToProcess.length; step++) {
      const chunkIdx = indicesToProcess[step];
      const chunkObj = chunks[chunkIdx];
      const chunkNum = chunkIdx + 1;

      setCurrentChunk(chunkNum);
      setStatusMessage(`Extracting context (chunk ${chunkNum} of ${chunks.length})...`);

      try {
        const res = await extractMemories({
          chunk: chunkObj.text,
          me,
          friend
        });

        if (res.memories && Array.isArray(res.memories)) {
          extractedRef.current.push(...res.memories);
          setExtractedMemories([...extractedRef.current]);
        }

        if (res.warnings && Array.isArray(res.warnings)) {
          warningsRef.current.push(...res.warnings);
          setWarnings([...warningsRef.current]);
        }
      } catch (err) {
        console.error(`Chunk ${chunkNum} error:`, err);
        currentFailed.push(chunkIdx);

        let friendlyReason = err.message || "Extraction failed";
        if (err.code === "TIMEOUT") {
          friendlyReason = "Request timed out while analyzing messages";
        } else if (err.code === "RATE_LIMIT" || err.status === 429) {
          friendlyReason = "API rate limit reached; waiting to retry";
        } else if (err.code === "AI_UNAVAILABLE") {
          friendlyReason = "AI service temporarily unavailable";
        }

        const warnMsg = `Chunk ${chunkNum}: ${friendlyReason}`;
        warningsRef.current.push(warnMsg);
        setWarnings([...warningsRef.current]);
      }
    }

    failedRef.current = currentFailed;
    setFailedChunkIndices(currentFailed);
    setIsProcessing(false);

    // Case 1: Everything succeeded (0 failures)
    if (currentFailed.length === 0 && extractedRef.current.length > 0) {
      finalizeAndSave(extractedRef.current, warningsRef.current);
      return;
    }

    // Case 2: Partial progress (some memories extracted, but some chunks failed)
    if (extractedRef.current.length > 0 && currentFailed.length > 0) {
      setStatusMessage(`Completed with ${extractedRef.current.length} memories, but ${currentFailed.length} chunk(s) failed.`);
      setHasPartial(true);
      return;
    }

    // Case 3: All chunks failed
    if (extractedRef.current.length === 0) {
      setStatusMessage("Extraction failed");
      setAllFailed(true);
    }
  }

  function handleRetryFailed() {
    const toRetry = [...failedRef.current];
    if (toRetry.length === 0) return;
    runExtraction(toRetry);
  }

  function handleRetryAll() {
    extractedRef.current = [];
    warningsRef.current = [];
    failedRef.current = [];
    setExtractedMemories([]);
    setWarnings([]);
    setFailedChunkIndices([]);
    const allIndices = chunksRef.current.map((_, idx) => idx);
    runExtraction(allIndices);
  }

  function finalizeAndSave(rawMemories, collectedWarnings) {
    setStatusMessage("Consolidating and organizing memories...");
    const dedupedMemories = dedupeMemories(rawMemories);

    const storePayload = {
      meta: {
        me,
        friend,
        messageCount: messages.length,
        importedAt: new Date().toISOString()
      },
      memories: dedupedMemories
    };

    saveMemoriesStore(storePayload);

    setTimeout(() => {
      onComplete(storePayload, collectedWarnings);
    }, 400);
  }

  function handleProceedWithPartial() {
    finalizeAndSave(extractedRef.current, warningsRef.current);
  }

  const progressPercent = totalChunks > 0 ? Math.round((currentChunk / totalChunks) * 100) : 0;

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 space-y-6">
        {/* Spinner or Alert Icon */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 text-amber-900 mb-2">
          {isProcessing ? (
            <svg className="w-7 h-7 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          ) : allFailed ? (
            <span className="text-2xl">⚠️</span>
          ) : (
            <span className="text-2xl">⚡</span>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold text-stone-900">
            {isProcessing
              ? "Analyzing Relationship Context"
              : allFailed
              ? "Extraction Encountered an Error"
              : "Extraction Finished with Notes"}
          </h2>
          <p className="text-sm text-stone-600 mt-1">
            {isProcessing
              ? "Gemma is reading chat chunks and verifying memory evidence..."
              : allFailed
              ? "Could not extract memories from the chat chunks."
              : `Extracted ${extractedMemories.length} relationship memories.`}
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
              className={`h-2.5 rounded-full transition-all duration-300 ease-out ${
                allFailed ? "bg-rose-500" : hasPartial ? "bg-amber-500" : "bg-amber-600"
              }`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Warnings / Failures Notice */}
        {warnings.length > 0 && (
          <div className="p-4 bg-rose-50/80 rounded-xl border border-rose-200 text-xs text-rose-900 text-left space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-rose-900">
              <span>⚠️ Notice ({warnings.length}):</span>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
              {warnings.map((w, idx) => (
                <div key={idx} className="text-rose-800 leading-snug">
                  • {w}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions for All Failed */}
        {allFailed && (
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleRetryAll}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Retry Extraction</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Back to Upload
            </button>
          </div>
        )}

        {/* Actions for Partial Progress (Keep partial progress) */}
        {hasPartial && (
          <div className="pt-2 space-y-2.5">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 text-left">
              <strong>Partial Progress Saved:</strong> You have {extractedMemories.length} verified memories from successful chunks. You can proceed with these or retry the failed chunk(s).
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleProceedWithPartial}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
              >
                Proceed with {extractedMemories.length} Memories &rarr;
              </button>
              <button
                type="button"
                onClick={handleRetryFailed}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Retry Failed Chunks ({failedChunkIndices.length})</span>
              </button>
            </div>
          </div>
        )}

        <div className="text-xs text-stone-600 pt-2 border-t border-stone-100">
          Raw chat text is never stored. Only verified quotes are saved locally.
        </div>
      </div>
    </div>
  );
}
