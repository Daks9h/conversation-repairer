import React, { useState } from "react";
import {
  ArrowLeft,
  Trash2,
  Info,
  ShieldAlert,
  HelpCircle,
  AlertOctagon,
  Copy,
  Check
} from "lucide-react";

export default function ResultsScreen({
  analysisData,
  onBackToRepair,
  onNavigateToDashboard,
  onDeleteEverything
}) {
  const { repairResult, retrievedMemories = [] } = analysisData;

  const {
    possible_issue = "",
    evidence_in_text = [],
    relevant_context = [],
    uncertainty = "",
    avoid = [],
    safety_note = "",
    suggestions = []
  } = repairResult || {};

  // Map suggestions to local editable state
  const [editableSuggestions, setEditableSuggestions] = useState(() => {
    const defaultStyles = ["soft", "casual", "direct"];
    return defaultStyles.map((style) => {
      const match = (suggestions || []).find(
        (s) => s?.style?.toLowerCase() === style
      );
      return {
        style,
        message: match?.message || ""
      };
    });
  });

  const [copiedStyle, setCopiedStyle] = useState(null);

  const handleMessageChange = (style, newText) => {
    setEditableSuggestions((prev) =>
      prev.map((item) => (item.style === style ? { ...item, message: newText } : item))
    );
  };

  const handleCopy = (style, message) => {
    navigator.clipboard.writeText(message);
    setCopiedStyle(style);
    setTimeout(() => {
      setCopiedStyle(null);
    }, 2000);
  };

  const styleLabels = {
    soft: { title: "Soft Style", desc: "Warm, gentle & non-confrontational", badge: "Warm" },
    casual: { title: "Casual Style", desc: "Short, natural, real texting", badge: "Everyday" },
    direct: { title: "Direct Style", desc: "Honest, clear, still kind", badge: "Honest" }
  };

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Top Navigation */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-stone-200/90 gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToRepair}
            className="text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Analyze Another</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToDashboard}
            className="text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            Stored Memories
          </button>
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

      {/* How This Works banner */}
      <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200/80 text-xs text-amber-950 flex items-center gap-2.5 shadow-xs">
        <Info className="w-4 h-4 text-amber-700 shrink-0" strokeWidth={1.75} />
        <div>
          <strong className="font-semibold text-amber-950">How this works: </strong>
          <span className="text-amber-900">suggestions are possibilities, not facts about what someone feels.</span>
        </div>
      </div>

      {/* Safety Notice if present */}
      {safety_note && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 space-y-1 shadow-xs">
          <div className="font-semibold flex items-center gap-2 text-xs sm:text-sm">
            <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0" strokeWidth={1.75} />
            <span>Safety Note</span>
          </div>
          <p className="text-xs leading-relaxed">{safety_note}</p>
        </div>
      )}

      {/* Section 1 & 2: Possible Issue & Text Evidence */}
      <div className="bg-white rounded-xl border border-stone-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        <div>
          <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-900 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md">
            Communication Diagnosis
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-stone-900 mt-2 tracking-tight">
            Possible Communication Issue
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed mt-1">
            {possible_issue || "No specific communication breakdown detected."}
          </p>
        </div>

        {evidence_in_text.length > 0 && (
          <div className="space-y-1.5 pt-3 border-t border-stone-100">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Evidence in conversation:
            </span>
            <div className="flex flex-wrap gap-2">
              {evidence_in_text.map((quote, idx) => (
                <span
                  key={idx}
                  className="text-xs text-stone-700 bg-stone-50 border border-stone-200 px-2.5 py-1 rounded-md italic"
                >
                  &ldquo;{quote}&rdquo;
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Section 4: Uncertainty Line (Always visible) */}
        <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/70 text-xs text-amber-950 flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" strokeWidth={1.75} />
          <div>
            <span className="font-semibold">Uncertainty Note: </span>
            <span>
              {uncertainty ||
                "People's emotional states cannot be known with certainty from text alone. These are possibilities, not facts."}
            </span>
          </div>
        </div>
      </div>

      {/* Section 3: Relevant Context (Historical Memory Grounding) */}
      <div className="bg-white rounded-xl border border-stone-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-900 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md">
              Historical Context
            </span>
            <h3 className="text-base sm:text-lg font-bold text-stone-900 mt-1.5 tracking-tight">
              Relevant Relationship Context
            </h3>
          </div>
          <span className="text-xs text-stone-500">
            {relevant_context.length} relevant reference{relevant_context.length === 1 ? "" : "s"}
          </span>
        </div>

        {relevant_context.length === 0 ? (
          <div className="p-4 bg-stone-50 rounded-xl border border-dashed border-stone-200 text-xs text-stone-500 italic">
            No relevant history found
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {relevant_context.map((ctxItem, idx) => {
              const matchedMem = retrievedMemories.find((m) => m.id === ctxItem.memory_id);
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-stone-200/80 bg-stone-50/50 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-900 text-sm">
                      {matchedMem ? matchedMem.text : `Memory [${ctxItem.memory_id}]`}
                    </span>
                    <span className="text-[10px] uppercase font-mono text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                      {ctxItem.memory_id}
                    </span>
                  </div>

                  {matchedMem?.evidence && (
                    <div className="text-stone-600 italic bg-white p-2 rounded-lg border border-stone-200/70">
                      &ldquo;{matchedMem.evidence}&rdquo;
                    </div>
                  )}

                  <div className="text-stone-700 leading-relaxed">
                    <strong className="text-stone-900 font-medium">Why relevant: </strong>
                    {ctxItem.why_relevant}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 5: What to Avoid */}
      {avoid.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200/90 shadow-xs p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-stone-900">
            <AlertOctagon className="w-4 h-4 text-stone-700 shrink-0" strokeWidth={1.75} />
            <h3 className="text-base sm:text-lg font-bold tracking-tight">What to Avoid</h3>
          </div>
          <ul className="space-y-1.5 text-xs text-stone-700">
            {avoid.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-rose-600 font-bold shrink-0">-</span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Section 6: Three Suggestion Cards (Soft, Casual, Direct) */}
      <div className="space-y-4">
        <div>
          <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-900 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md">
            Suggested Replies
          </span>
          <h3 className="text-lg sm:text-xl font-bold text-stone-900 mt-1.5 tracking-tight">
            Choose a Repair Style
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            You can edit any message directly before copying.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {editableSuggestions.map((sug) => {
            const meta = styleLabels[sug.style] || {
              title: sug.style,
              desc: "Response style",
              badge: sug.style
            };
            const isCopied = copiedStyle === sug.style;

            return (
              <div
                key={sug.style}
                className="bg-white rounded-xl border border-stone-200/90 shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-stone-300 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-stone-900">{meta.title}</h4>
                    <span className="text-[10px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
                      {meta.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500">{meta.desc}</p>
                </div>

                <div className="flex-1">
                  <label htmlFor={`sug-${sug.style}`} className="sr-only">
                    Edit {sug.style} message
                  </label>
                  <textarea
                    id={`sug-${sug.style}`}
                    value={sug.message}
                    onChange={(e) => handleMessageChange(sug.style, e.target.value)}
                    rows={4}
                    className="w-full text-xs text-stone-800 p-3 bg-stone-50/70 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 leading-relaxed font-sans"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(sug.style, sug.message)}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                    isCopied
                      ? "bg-emerald-700 text-white"
                      : "bg-amber-700 hover:bg-amber-800 text-white"
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" strokeWidth={2} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
                      <span>Copy {meta.title.split(" ")[0]}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
