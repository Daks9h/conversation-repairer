import React, { useState } from "react";
import { parseWhatsAppChat } from "../lib/whatsappParser.js";

export default function UploadScreen({
  onStartProcessing,
  hasStoredMemories,
  storedCount = 0,
  onViewStoredMemories,
  onDeleteEverything
}) {
  const [parsedData, setParsedData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [selectedMe, setSelectedMe] = useState("");
  const [selectedFriend, setSelectedFriend] = useState("");
  const [parseError, setParseError] = useState("");
  const [showExportHelp, setShowExportHelp] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError("");
    setParsedData(null);
    setSelectedMe("");
    setSelectedFriend("");
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        const result = parseWhatsAppChat(text);
        setParsedData(result);
      } catch (err) {
        setParseError(err.message || "Failed to parse WhatsApp export file.");
      }
    };
    reader.onerror = () => {
      setParseError("Could not read file from disk.");
    };
    reader.readAsText(file);
  };

  const handleSelectMe = (sender) => {
    setSelectedMe(sender);
    if (parsedData?.senders) {
      const other = parsedData.senders.find((s) => s !== sender);
      if (other) {
        setSelectedFriend(other);
      }
    }
  };

  const handleStart = () => {
    if (!parsedData || !selectedMe) return;
    const friend = selectedFriend || parsedData.senders.find((s) => s !== selectedMe) || "Friend";
    onStartProcessing({
      messages: parsedData.messages,
      stats: parsedData.stats,
      me: selectedMe,
      friend
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      {/* Existing Memories Banner if stored */}
      {hasStoredMemories && (
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="text-amber-800 font-bold text-lg">💡</span>
            <div className="text-xs text-stone-700">
              You have <strong className="text-stone-900 font-bold">{storedCount} relationship memories</strong> saved in this browser.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onViewStoredMemories}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
            >
              View Memories ({storedCount})
            </button>
            <button
              type="button"
              onClick={onDeleteEverything}
              className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-xl transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
              title="Delete all stored memories"
            >
              <svg className="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete Everything</span>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center pt-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 text-amber-900 font-bold text-2xl mb-3 shadow-sm border border-amber-200/60">
          CR
        </div>
        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight sm:text-4xl">
          Conversation Repairer
        </h1>
        <p className="mt-2 text-sm sm:text-base text-stone-600 max-w-lg mx-auto">
          Turn your conversation history into evidence-backed relationship context to resolve misunderstandings.
        </p>
      </div>

      {/* Upload Box */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-5 sm:p-8 space-y-6">
        {!parsedData ? (
          <div>
            <label
              htmlFor="chat-upload"
              className="flex flex-col items-center justify-center border-2 border-dashed border-stone-300 rounded-xl p-8 hover:border-amber-500 hover:bg-amber-50/40 transition-colors cursor-pointer group"
            >
              <svg
                className="w-10 h-10 text-stone-400 group-hover:text-amber-600 transition-colors mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span className="text-sm font-semibold text-stone-800 group-hover:text-amber-800 text-center">
                Click to select exported WhatsApp chat (.txt)
              </span>
              <span className="text-xs text-stone-500 mt-1 text-center">
                Works with Android and iPhone exports (without media)
              </span>
              <input
                id="chat-upload"
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="sr-only"
              />
            </label>

            {parseError && (
              <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="text-lg">⚠️</span>
                  <div>
                    <div className="font-bold text-rose-950">Unable to parse file</div>
                    <div className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                      {parseError.includes("empty") || parseError.includes("No WhatsApp messages")
                        ? "The selected file is empty or contains no message lines. Please select an exported chat file with message history."
                        : "The selected file doesn't match WhatsApp's export format. Please make sure you selected an unedited exported chat (.txt) without media."}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <label
                    htmlFor="chat-upload"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Retry / Choose File Again</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setParseError("")}
                    className="text-xs text-rose-700 hover:text-rose-900 underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Parsed Summary & Sender Selection */
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                  File Loaded
                </span>
                <h3 className="text-lg font-bold text-stone-900">{fileName}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setParsedData(null);
                  setSelectedMe("");
                  setSelectedFriend("");
                  setFileName("");
                }}
                className="text-xs font-medium text-stone-600 hover:text-rose-600 transition-colors underline"
              >
                Choose another file
              </button>
            </div>

            {/* Chat Stats */}
            <div className="grid grid-cols-2 gap-4 bg-amber-50/60 rounded-xl p-4 border border-amber-100 text-stone-800">
              <div>
                <div className="text-xs text-stone-600 font-medium">Messages Found</div>
                <div className="text-xl font-bold text-stone-900">
                  {parsedData.stats.count}
                </div>
              </div>
              <div>
                <div className="text-xs text-stone-600 font-medium">Date Range</div>
                <div className="text-sm font-semibold text-stone-900 mt-1">
                  {parsedData.stats.firstDate} – {parsedData.stats.lastDate}
                </div>
              </div>
            </div>

            {/* Sender Selection */}
            <div>
              <label className="block text-sm font-bold text-stone-800 mb-2">
                Which of these is you?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {parsedData.senders.map((sender) => {
                  const isSelected = selectedMe === sender;
                  return (
                    <button
                      key={sender}
                      type="button"
                      onClick={() => handleSelectMe(sender)}
                      className={`p-3.5 rounded-xl border text-left font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "border-amber-600 bg-amber-50/80 text-amber-950 ring-2 ring-amber-500/20 shadow-sm"
                          : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50"
                      }`}
                    >
                      <div className="text-sm font-bold">{sender}</div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        {isSelected ? "This is you (Me)" : "Click to select"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedMe && (
              <div className="text-xs text-stone-600">
                Analyzing relationship between{" "}
                <span className="font-semibold text-stone-800">{selectedMe}</span> and{" "}
                <span className="font-semibold text-stone-800">{selectedFriend}</span>.
              </div>
            )}

            {/* Start Button */}
            <button
              type="button"
              disabled={!selectedMe}
              onClick={handleStart}
              className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm transition-all shadow-sm ${
                selectedMe
                  ? "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                  : "bg-stone-200 text-stone-400 cursor-not-allowed"
              }`}
            >
              Start Analysis & Extract Memories
            </button>
          </div>
        )}

        {/* Privacy Notice */}
        <div className="rounded-xl bg-amber-50/50 border border-amber-200/80 p-4 space-y-1.5 text-xs text-stone-700">
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

        {/* Help Accordion */}
        <div className="pt-2 border-t border-stone-100">
          <button
            type="button"
            onClick={() => setShowExportHelp(!showExportHelp)}
            className="flex items-center justify-between w-full text-left text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors py-1 cursor-pointer"
          >
            <span>How to export a WhatsApp chat</span>
            <span className="text-stone-400">{showExportHelp ? "▲" : "▼"}</span>
          </button>

          {showExportHelp && (
            <div className="mt-3 space-y-2 text-xs text-stone-600 bg-stone-50/70 p-3.5 rounded-lg border border-stone-200">
              <div>
                <strong className="text-stone-800">Android:</strong> Open the chat &rarr; tap the three dots (&vellip;) in the top-right &rarr; <em>More</em> &rarr; <em>Export chat</em> &rarr; select <strong>Without media</strong>.
              </div>
              <div>
                <strong className="text-stone-800">iPhone:</strong> Open the chat &rarr; tap the contact name at the top &rarr; scroll down to <em>Export Chat</em> &rarr; select <strong>Attach No Media</strong>.
              </div>
              <div className="text-[11px] text-stone-500 pt-1">
                Both exported formats (.txt) are supported.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
