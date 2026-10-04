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
    if (e) e.preventDefault();
    const raw = convoText.trim();
    if (!raw) {
      setError({
        code: "EMPTY_INPUT",
        title: "Empty Conversation",
        message: "Please paste a conversation before clicking analyze."
      });
      return;
    }

    setError(null);
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
      let code = err.code || "AI_ERROR";
      let title = "Analysis Failed";
      let message = err.message || "An unexpected error occurred while analyzing the conversation.";

      if (code === "TIMEOUT" || err.status === 504) {
        title = "Request Timed Out";
        message = "Gemma took longer than expected to analyze this conversation. The server may be busy.";
      } else if (code === "RATE_LIMIT" || err.status === 429) {
        title = "Rate Limit Reached";
        message = "The AI service is experiencing high traffic. Please wait a few seconds and click Retry.";
      } else if (code === "BAD_JSON" || err.status === 502) {
        title = "Invalid Response Format";
        message = "The AI model returned an unparseable response after retry. Clicking Retry will ask the model again.";
      } else if (code === "AI_UNAVAILABLE" || err.status === 503) {
        title = "AI Service Unavailable";
        message = "Could not connect to the AI model. Please verify your internet connection or API settings.";
      }

      setError({ code, title, message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-stone-200 gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onNavigateToDashboard}
            className="text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
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
          className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 hover:border-rose-300 rounded-xl transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          title="Delete all stored memories"
        >
          <svg className="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>Delete Everything</span>
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
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-rose-950 flex items-center gap-1.5 text-sm">
                    <span>⚠️</span>
                    <span>{error.title}</span>
                  </div>
                  <div className="text-rose-800 mt-1 leading-relaxed">
                    {error.message}
                  </div>
                </div>
                {error.code !== "EMPTY_INPUT" && (
                  <button
                    type="button"
                    onClick={() => handleAnalyze()}
                    disabled={loading || !convoText.trim()}
                    className="shrink-0 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-semibold flex items-center gap-1 transition-colors shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Retry</span>
                  </button>
                )}
              </div>
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

        {/* Privacy Notice */}
        <div className="rounded-xl bg-amber-50/50 border border-amber-200/80 p-4 space-y-1 text-xs text-stone-700">
          <div className="flex items-center gap-1.5 font-bold text-amber-950">
            <svg
              className="w-4 h-4 text-amber-700 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>Privacy Notice</span>
          </div>
          <p className="leading-relaxed">
            Chat text is sent to a hosted Gemma model for analysis, the server stores nothing, memories are saved only in this browser.
          </p>
        </div>
      </div>
    </div>
  );
}
