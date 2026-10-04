import React, { useState } from "react";
import MemoryCard from "./MemoryCard.jsx";
import { updateMemory, deleteMemory, clearMemoriesStore } from "../lib/memoryStore.js";
import {
  Calendar,
  Star,
  MessageSquare,
  Handshake,
  AlertTriangle,
  Sparkles,
  Inbox,
  Trash2,
  ArrowRight
} from "lucide-react";

const CATEGORIES = [
  {
    key: "important_event",
    title: "Important Events",
    description: "Key milestones, trips, and shared life moments",
    Icon: Calendar
  },
  {
    key: "preference",
    title: "Preferences",
    description: "Likes, dislikes, routines, and stated personal preferences",
    Icon: Star
  },
  {
    key: "communication_pattern",
    title: "Communication Patterns",
    description: "Habits, texting styles, and timing patterns",
    Icon: MessageSquare
  },
  {
    key: "promise",
    title: "Promises",
    description: "Commitments made by either person",
    Icon: Handshake
  },
  {
    key: "recurring_issue",
    title: "Recurring Issues",
    description: "Frequent points of friction, tension, or repeated misunderstandings",
    Icon: AlertTriangle
  },
  {
    key: "meaningful_reference",
    title: "Meaningful References",
    description: "Inside jokes, shared slogans, nicknames, and memorable phrases",
    Icon: Sparkles
  }
];

export default function MemoryDashboard({
  storeData,
  onReset,
  onNavigateToRepair,
  onDeleteEverything
}) {
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
    <div className="max-w-[1100px] mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Header card with proper 20-24px padding */}
      <div className="bg-white rounded-xl border border-stone-200/90 shadow-xs p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-1.5">
            <span className="text-xs uppercase tracking-wider font-semibold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/60">
              Relationship Context
            </span>
            <span className="text-xs text-stone-500">
              {memories.length} memories extracted
            </span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            {meta.me && meta.friend
              ? `${meta.me} & ${meta.friend}`
              : "Relationship Memory Dashboard"}
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Based on {meta.messageCount || 0} messages - Stored locally in this browser
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onNavigateToRepair}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 active:bg-amber-900 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>Repair a Conversation</span>
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={onDeleteEverything || handleDeleteEverything}
            className="px-3.5 py-2.5 rounded-xl text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 hover:border-rose-300 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            title="Delete all stored memories"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" strokeWidth={1.75} />
            <span>Delete Everything</span>
          </button>
        </div>
      </div>

      {/* Main Categories Sections */}
      {memories.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200/90 p-8 sm:p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-500 mx-auto flex items-center justify-center">
            <Inbox className="w-6 h-6 text-stone-400" strokeWidth={1.75} />
          </div>
          <h3 className="text-lg font-bold text-stone-800">No Memories Saved</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            You currently have no saved memories in your browser. Upload an exported WhatsApp chat to get started.
          </p>
          <button
            type="button"
            onClick={onReset}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Upload a Chat
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {CATEGORIES.map((cat) => {
            const catMemories = groupedMemories[cat.key] || [];
            if (catMemories.length === 0) return null;

            const IconComponent = cat.Icon;

            return (
              <section key={cat.key} className="space-y-3.5">
                {/* Section heading with icon, count, and description */}
                <div className="pb-1 border-b border-stone-200/70">
                  <div className="flex items-center gap-2">
                    <IconComponent className="w-4 h-4 text-amber-700" strokeWidth={1.75} />
                    <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                      {cat.title}
                    </h2>
                    <span className="text-xs font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                      {catMemories.length}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    {cat.description}
                  </p>
                </div>

                {/* Responsive Grid: 1 col on mobile, 2 col on desktop, 16px gap */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {catMemories.map((memory) => (
                    <MemoryCard
                      key={memory.id}
                      memory={memory}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
