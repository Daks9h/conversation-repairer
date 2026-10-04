import React, { useEffect, useState, useRef } from "react";
import { chunkMessages } from "../lib/chunker.js";
import { extractMemories } from "../lib/api.js";
import { dedupeMemories } from "../lib/dedupe.js";
import { saveMemoriesStore } from "../lib/memoryStore.js";
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ArrowRight
} from "lucide-react";

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
    <div className="max-w-[1100px] mx-auto px-4 sm:px-8 py-8 sm:py-16 text-center">
      <div className="max-w-xl mx-auto bg-white rounded-xl border border-stone-200/90 shadow-xs p-5 sm:p-6 space-y-6">
        {/* Status Icon */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-100 text-amber-900 mx-auto">
          {isProcessing ? (
            <Loader2 className="w-6 h-6 animate-spin text-amber-800" strokeWidth={2} />
          ) : allFailed ? (
            <AlertTriangle className="w-6 h-6 text-rose-600" strokeWidth={1.75} />
          ) : (
            <CheckCircle2 className="w-6 h-6 text-amber-800" strokeWidth={1.75} />
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">
            {isProcessing
              ? "Analyzing Relationship Context"
              : allFailed
              ? "Extraction Encountered an Error"
              : "Extraction Finished with Notes"}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            {isProcessing
              ? "Gemma is reading chat chunks and verifying memory evidence..."
              : allFailed
              ? "Could not extract memories from the chat chunks."
              : `Extracted ${extractedMemories.length} relationship memories.`}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-stone-600">
            <span>{statusMessage}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-300 ease-out ${
                allFailed ? "bg-rose-500" : hasPartial ? "bg-amber-600" : "bg-amber-700"
              }`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Warnings / Failures Notice */}
        {warnings.length > 0 && (
          <div className="p-4 bg-rose-50 border border-rose-200/80 rounded-xl text-xs text-rose-900 text-left space-y-2">
            <div className="font-semibold flex items-center gap-1.5 text-rose-950">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" strokeWidth={1.75} />
              <span>Notice ({warnings.length}):</span>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
              {warnings.map((w, idx) => (
                <div key={idx} className="text-rose-800 leading-snug">
                  - {w}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions for All Failed */}
        {allFailed && (
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleRetryAll}
              className="px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Retry Extraction</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              Back to Upload
            </button>
          </div>
        )}

        {/* Actions for Partial Progress (Keep partial progress) */}
        {hasPartial && (
          <div className="pt-2 space-y-3">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 text-left">
              <strong>Partial Progress Saved:</strong> You have {extractedMemories.length} verified memories from successful chunks. You can proceed with these or retry the failed chunk(s).
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleProceedWithPartial}
                className="px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Proceed with {extractedMemories.length} Memories</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={handleRetryFailed}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Retry Failed Chunks ({failedChunkIndices.length})</span>
              </button>
            </div>
          </div>
        )}

        <div className="text-xs text-stone-500 pt-2 border-t border-stone-100">
          Raw chat text is never stored. Only verified quotes are saved locally.
        </div>
      </div>
    </div>
  );
}
