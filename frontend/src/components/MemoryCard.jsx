import React, { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";

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

  const keywords = Array.isArray(memory.keywords) ? memory.keywords : [];

  return (
    <div
      className={`bg-white rounded-xl border border-stone-200/90 shadow-xs p-5 sm:p-6 flex flex-col justify-between transition-all ${
        isLowConfidence ? "opacity-70" : "hover:border-stone-300"
      }`}
    >
      <div className="space-y-3.5">
        {/* Header row: speaker & confidence on left, ghost actions on right */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {memory.speaker && (
              <span className="text-xs font-semibold text-stone-700 bg-stone-100 px-2.5 py-0.5 rounded-md">
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
              <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded font-mono">
                edited
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-2 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Edit memory text"
              >
                <Pencil className="w-3.5 h-3.5 text-stone-500" strokeWidth={1.75} />
                <span>Edit</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(memory.id)}
              className="px-2 py-1 text-xs font-medium text-rose-700 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title="Delete this memory"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" strokeWidth={1.75} />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Main Body: 16px, medium weight, comfortable line height */}
        {isEditing ? (
          <div className="space-y-2 pt-1">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full text-base font-medium text-stone-800 p-3 bg-stone-50 border border-amber-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 leading-relaxed"
              rows={3}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg font-medium transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-xs transition-colors flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Save</span>
              </button>
            </div>
          </div>
        ) : (
          <p className="text-base font-medium text-stone-900 leading-relaxed">
            {memory.memory}
          </p>
        )}

        {/* Evidence Quote Block with left border accent */}
        {quotes.length > 0 && (
          <div className="border-l-2 border-amber-600 pl-3.5 py-1.5 bg-stone-50/70 rounded-r-lg space-y-1">
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
              Evidence
            </span>
            {quotes.map((q, idx) => (
              <p key={idx} className="text-xs sm:text-sm text-stone-600 italic leading-relaxed">
                &ldquo;{q}&rdquo;
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Tags / Keywords as small muted pills at bottom */}
      {keywords.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-stone-100">
          {keywords.map((kw, idx) => (
            <span
              key={idx}
              className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md"
            >
              #{kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
