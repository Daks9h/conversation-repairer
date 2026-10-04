import React, { useState } from "react";
import MemoryCard from "./MemoryCard.jsx";
import { updateMemory, deleteMemory, clearMemoriesStore } from "../lib/memoryStore.js";

const CATEGORIES = [
  {
    key: "important_event",
    title: "Important Events",
    description: "Key milestones, trips, and shared life moments",
    icon: "📅"
  },
  {
    key: "preference",
    title: "Preferences",
    description: "Likes, dislikes, routines, and stated personal preferences",
    icon: "⭐"
  },
  {
    key: "communication_pattern",
    title: "Communication Patterns",
    description: "Habits, texting styles, and timing patterns",
    icon: "💬"
  },
  {
    key: "promise",
    title: "Promises",
    description: "Commitments made by either person",
    icon: "🤝"
  },
  {
    key: "recurring_issue",
    title: "Recurring Issues",
    description: "Frequent points of friction, tension, or repeated misunderstandings",
    icon: "⚠️"
  },
  {
    key: "meaningful_reference",
    title: "Meaningful References",
    description: "Inside jokes, shared slogans, nicknames, and memorable phrases",
    icon: "✨"
  }
];

export default function MemoryDashboard({ storeData, onReset, onNavigateToRepair }) {
  const [data, setData] = useState(storeData);

  const meta = data?.meta || {};
  const memories = data?.memories || [];

  const handleUpdate = (id, updates) => {
    updateMemory(id, updates);
    setData((prev) => ({
      ...prev,
      memories: prev.memories.map((m) =>
        m.id === id ? { ...m, ...updates, userEdited: true } : m
      )
    }));
  };

  const handleDelete = (id) => {
    deleteMemory(id);
    setData((prev) => ({
      ...prev,
      memories: prev.memories.filter((m) => m.id !== id)
    }));
  };

  const handleDeleteEverything = () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete all memories? This will wipe your local browser memory store."
    );
    if (confirmed) {
      clearMemoriesStore();
      onReset();
    }
  };

  // Group memories by category
  const groupedMemories = {};
  CATEGORIES.forEach((cat) => {
    groupedMemories[cat.key] = memories.filter((m) => m.category === cat.key);
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header bar */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
              Relationship Context
            </span>
            <span className="text-xs text-stone-600">
              {memories.length} memories extracted
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-stone-900">
            {meta.me && meta.friend
              ? `${meta.me} & ${meta.friend}`
              : "Relationship Memory Dashboard"}
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
            Based on {meta.messageCount || 0} messages • Stored locally in this browser
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onNavigateToRepair}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <span>Repair a Conversation</span>
            <span>&rarr;</span>
          </button>
          <button
            type="button"
            onClick={onDeleteEverything || handleDeleteEverything}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 hover:border-rose-300 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Delete Everything</span>
          </button>
        </div>
      </div>

      {/* Main Categories Section */}
      {memories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3">
          <div className="text-4xl">📭</div>
          <h3 className="text-lg font-bold text-stone-800">No Memories Saved</h3>
          <p className="text-xs text-stone-600 max-w-sm mx-auto">
            You currently have no saved memories in your browser. Upload an exported WhatsApp chat to get started.
          </p>
          <button
            type="button"
            onClick={onReset}
            className="mt-2 inline-flex items-center px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Upload Chat File
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {CATEGORIES.map((cat) => {
            const items = groupedMemories[cat.key] || [];

            return (
              <section key={cat.key} className="space-y-3">
                <div className="flex items-baseline justify-between border-b border-stone-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cat.icon}</span>
                    <h2 className="text-lg font-bold text-stone-900">{cat.title}</h2>
                    <span className="text-xs text-stone-600 font-medium ml-1">
                      ({items.length})
                    </span>
                  </div>
                  <span className="text-xs text-stone-600 hidden sm:inline">
                    {cat.description}
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="bg-stone-50/50 rounded-xl border border-dashed border-stone-200 p-4 text-center text-xs text-stone-600 italic">
                    No {cat.title.toLowerCase()} recorded for this conversation.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map((m) => (
                      <MemoryCard
                        key={m.id}
                        memory={m}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
