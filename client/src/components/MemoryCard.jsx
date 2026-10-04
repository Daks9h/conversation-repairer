import React, { useState } from "react";

export default function MemoryCard({ memory, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(memory.memory);

  const handleSave = () => {
    if (!editText.trim()) return;
    onUpdate(memory.id, { memory: editText.trim() });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(memory.memory);
    setIsEditing(false);
  };

  const isLowConfidence = memory.confidence === "low";

  const confidenceBadgeStyles = {
    high: "bg-emerald-50 text-emerald-800 border-emerald-200",
    medium: "bg-amber-50 text-amber-800 border-amber-200",
    low: "bg-stone-100 text-stone-600 border-stone-200"
  };

  const quotes = Array.isArray(memory.evidence)
    ? memory.evidence
    : memory.evidence
    ? [memory.evidence]
    : [];

  return (
    <div
      className={`rounded-xl border p-4.5 transition-all shadow-sm ${
        isLowConfidence
          ? "bg-stone-50/60 border-stone-200 opacity-75"
          : "bg-white border-stone-200/90 hover:border-amber-300"
      }`}
    >
      {/* Top row: Speaker, Confidence Badge, Actions */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {memory.speaker && (
            <span className="text-xs font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md">
              {memory.speaker}
            </span>
          )}
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${
              confidenceBadgeStyles[memory.confidence] || confidenceBadgeStyles.medium
            }`}
          >
            {memory.confidence} confidence
          </span>
          {memory.userEdited && (
            <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-mono">
              edited
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-2.5 py-1 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 border border-stone-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <svg className="w-3.5 h-3.5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(memory.id)}
            className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
            title="Delete this memory"
          >
            <svg className="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Memory Text / Inline Edit */}
      {isEditing ? (
        <div className="space-y-2 mt-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full text-sm text-stone-800 p-2.5 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            rows={3}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1 text-xs text-stone-600 hover:bg-stone-100 rounded-md font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-md font-semibold"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm font-medium text-stone-900 leading-relaxed mb-3">
          {memory.memory}
        </p>
      )}

      {/* Verified Evidence Quotes */}
      {quotes.length > 0 && (
        <div className="space-y-1.5 mt-2 pt-2.5 border-t border-stone-100">
          <div className="text-[11px] font-semibold text-stone-600 uppercase tracking-wider">
            Evidence Quote{quotes.length > 1 ? "s" : ""}
          </div>
          {quotes.map((quote, qIdx) => (
            <div
              key={qIdx}
              className="text-xs text-stone-700 bg-amber-50/70 border-l-2 border-amber-500 px-3 py-1.5 rounded-r-md italic"
            >
              &ldquo;{quote}&rdquo;
            </div>
          ))}
        </div>
      )}

      {/* Keywords (subtle tags) */}
      {memory.keywords && memory.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {memory.keywords.map((kw, kwIdx) => (
            <span
              key={kwIdx}
              className="text-[10px] text-stone-600 bg-stone-100/80 px-1.5 py-0.5 rounded"
            >
              #{kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
