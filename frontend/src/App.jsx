import React, { useState, useEffect } from "react";
import UploadScreen from "./components/UploadScreen.jsx";
import ProcessingScreen from "./components/ProcessingScreen.jsx";
import MemoryDashboard from "./components/MemoryDashboard.jsx";
import RepairScreen from "./components/RepairScreen.jsx";
import ResultsScreen from "./components/ResultsScreen.jsx";
import { loadMemoriesStore, clearMemoriesStore } from "./lib/memoryStore.js";

import { Loader2 } from "lucide-react";

export default function App() {
  const [screen, setScreen] = useState("loading"); // 'loading' | 'upload' | 'processing' | 'dashboard' | 'repair' | 'results'
  const [jobData, setJobData] = useState(null);
  const [storeData, setStoreData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);

  // On initial mount, check if memories already exist in localStorage
  useEffect(() => {
    const existingStore = loadMemoriesStore();
    if (existingStore && Array.isArray(existingStore.memories) && existingStore.memories.length > 0) {
      setStoreData(existingStore);
      setScreen("dashboard");
    } else {
      setScreen("upload");
    }
  }, []);

  const handleStartProcessing = (data) => {
    setJobData(data);
    setScreen("processing");
  };

  const handleProcessingComplete = (finalStore) => {
    setStoreData(finalStore);
    setScreen("dashboard");
  };

  const handleResetToUpload = () => {
    clearMemoriesStore();
    setStoreData(null);
    setJobData(null);
    setAnalysisData(null);
    setScreen("upload");
  };

  const handleDeleteEverythingWithConfirm = () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete all memories? This will wipe your local browser memory store."
    );
    if (confirmed) {
      handleResetToUpload();
    }
  };

  const handleAnalysisComplete = (data) => {
    setAnalysisData(data);
    setScreen("results");
  };

  if (screen === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/logo.png"
            alt="Conversation Repairer"
            className="w-12 h-12 rounded-xl shadow-xs border border-stone-200/80 object-cover"
          />
          <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
            <Loader2 className="w-4 h-4 animate-spin text-amber-800" strokeWidth={2} />
            <span>Loading Conversation Repairer...</span>
          </div>
        </div>
      </div>
    );
  }

  const memoryCount = storeData?.memories?.length || 0;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 antialiased selection:bg-amber-200 selection:text-stone-900">
      <main className="pb-16">
        {screen === "upload" && (
          <UploadScreen
            onStartProcessing={handleStartProcessing}
            hasStoredMemories={memoryCount > 0}
            storedCount={memoryCount}
            onViewStoredMemories={() => setScreen("dashboard")}
            onDeleteEverything={handleDeleteEverythingWithConfirm}
          />
        )}

        {screen === "processing" && jobData && (
          <ProcessingScreen
            jobData={jobData}
            onComplete={handleProcessingComplete}
            onCancel={handleDeleteEverythingWithConfirm}
          />
        )}

        {screen === "dashboard" && storeData && (
          <MemoryDashboard
            storeData={storeData}
            onReset={handleResetToUpload}
            onNavigateToRepair={() => setScreen("repair")}
            onDeleteEverything={handleDeleteEverythingWithConfirm}
          />
        )}

        {screen === "repair" && (
          <RepairScreen
            storeData={storeData}
            onAnalysisComplete={handleAnalysisComplete}
            onNavigateToDashboard={() => setScreen("dashboard")}
            onDeleteEverything={handleDeleteEverythingWithConfirm}
          />
        )}

        {screen === "results" && analysisData && (
          <ResultsScreen
            analysisData={analysisData}
            onBackToRepair={() => setScreen("repair")}
            onNavigateToDashboard={() => setScreen("dashboard")}
            onDeleteEverything={handleDeleteEverythingWithConfirm}
          />
        )}
      </main>
    </div>
  );
}
