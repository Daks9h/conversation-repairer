import React, { useState } from "react";
import { retrieveRelevantMemories } from "../lib/retrieve.js";
import { repairConversationApi } from "../lib/api.js";
import {
  ArrowLeft,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Loader2,
  ShieldCheck
} from "lucide-react";

const MAX_CHARS = 6000;

export default function RepairScreen({
  storeData,
  onAnalysisComplete,
  onNavigateToDashboard,
  onDeleteEverything
}) {
  const [convoText, setConvoText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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
    <div className="max-w-[1100px] mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Top Navigation Bar */}
      <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between pb-4 border-b border-stone-200/90 gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onNavigateToDashboard}
            className="text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>View Memories ({memories.length})</span>
          </button>
          <span className="text-xs text-stone-500">
            Chat: <strong className="text-stone-800 font-semibold">{me} & {friend}</strong>
          </span>
        </div>

        <button
          type="button"
          onClick={onDeleteEverything}
          className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 hover:border-rose-300 rounded-xl transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          title="Delete all stored memories"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-600" strokeWidth={1.75} />
          <span>Delete Everything</span>
        </button>
      </div>

      {/* Main Form Box */}
      <div className="max-w-3xl mx-auto bg-white rounded-xl border border-stone-200/90 shadow-xs p-5 sm:p-6 space-y-6">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md">
            Conversation Repair
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 mt-2 tracking-tight">
            Paste a difficult conversation
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
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
              className="w-full text-xs sm:text-sm text-stone-800 p-4 bg-stone-50/50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-mono leading-relaxed"
            />
          </div>

          {truncatedNotice && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" strokeWidth={1.75} />
              <span>
                Note: Conversation exceeds 6,000 characters and was automatically truncated to the most recent 6,000 characters.
              </span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div>
                    <div className="font-semibold text-rose-950 text-sm">
                      {error.title}
                    </div>
                    <div className="text-rose-800 mt-0.5 leading-relaxed">
                      {error.message}
                    </div>
                  </div>
                </div>
                {error.code !== "EMPTY_INPUT" && (
                  <button
                    type="button"
                    onClick={() => handleAnalyze()}
                    disabled={loading || !convoText.trim()}
                    className="shrink-0 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-medium text-xs flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Retry</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-stone-500">
              {convoText.length} characters
            </span>

            <button
              type="submit"
              disabled={loading || !convoText.trim()}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs flex items-center gap-2 ${
                loading || !convoText.trim()
                  ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                  : "bg-amber-700 hover:bg-amber-800 text-white cursor-pointer"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                  <span>Analyzing with Gemma...</span>
                </>
              ) : (
                <span>Analyze Conversation</span>
              )}
            </button>
          </div>
        </form>

        {/* Privacy Notice */}
        <div className="rounded-xl bg-amber-50/50 border border-amber-200/70 p-4 space-y-1 text-xs text-stone-700">
          <div className="flex items-center gap-1.5 font-semibold text-amber-950">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" strokeWidth={1.75} />
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
