import React, { useState } from "react";
import { retrieveRelevantMemories } from "../lib/retrieve.js";
import { repairConversationApi } from "../lib/api.js";

const MAX_CHARS = 6000;

export default function RepairScreen({
  storeData,
  onAnalysisComplete,
  onNavigateToDashboard,
  onDeleteEverything
}) {
  const [convoText, setConvoText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [truncatedNotice, setTruncatedNotice] = useState(false);

  const meta = storeData?.meta || {};
  const memories = storeData?.memories || [];
  const me = meta.me || "Me";
  const friend = meta.friend || "Friend";

  const handleTextChange = (e) => {
    const val = e.target.value;
    setConvoText(val);
    if (val.length > MAX_CHARS) {
      setTruncatedNotice(true);
    } else {
      setTruncatedNotice(false);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    const raw = convoText.trim();
    if (!raw) return;

    setError("");
    setLoading(true);

    try {
      // 1. Truncate to last ~6000 chars if exceeded
      let processText = raw;
      if (processText.length > MAX_CHARS) {
        processText = processText.slice(-MAX_CHARS);
        setTruncatedNotice(true);
      }

      // 2. Client-side keyword retrieval of relevant memories
      const retrieved = retrieveRelevantMemories(processText, memories);

      // 3. Call server repair API
      const result = await repairConversationApi({
        conversation: processText,
        memories: retrieved,
        me,
        friend
      });

      onAnalysisComplete({
        repairResult: result,
        pastedConversation: processText,
        retrievedMemories: retrieved
      });
    } catch (err) {
      console.error("Repair analysis error:", err);
      setError(err.message || "Failed to analyze conversation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateToDashboard}
            className="text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <span>&larr;</span>
            <span>View Memories ({memories.length})</span>
          </button>
          <span className="text-xs text-stone-600">
            Chat: <strong className="text-stone-800">{me} & {friend}</strong>
          </span>
        </div>

        <button
          type="button"
          onClick={onDeleteEverything}
          className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
        >
          Delete Everything
        </button>
      </div>

      {/* Main Form */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
            Conversation Repair
          </span>
          <h1 className="text-2xl font-extrabold text-stone-900 mt-2">
            Paste a difficult conversation
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Gemma will cross-reference your relationship history to diagnose the misunderstanding and suggest 3 style-matched replies.
          </p>
        </div>

        <form onSubmit={handleAnalyze} className="space-y-4">
          <div>
            <label htmlFor="convo-input" className="sr-only">
              Paste conversation
            </label>
            <textarea
              id="convo-input"
              value={convoText}
              onChange={handleTextChange}
              disabled={loading}
              placeholder="Paste recent tense messages here...&#10;&#10;Example:&#10;Rohan: Yaar sorry aaj late ho jaunga, thoda scene tight hai.&#10;Pooja: K."
              rows={8}
              className="w-full text-sm text-stone-800 p-4 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono leading-relaxed"
            />
          </div>

          {truncatedNotice && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
              <span>⚠️</span>
              <span>
                Note: Conversation exceeds 6,000 characters and was automatically truncated to the most recent 6,000 characters.
              </span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-stone-600">
              {convoText.length} characters
            </span>

            <button
              type="submit"
              disabled={loading || !convoText.trim()}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 ${
                loading || !convoText.trim()
                  ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                  : "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              }`}
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  <span>Analyzing with Gemma...</span>
                </>
              ) : (
                <span>Analyze Conversation</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
