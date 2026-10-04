import React, { useState, useEffect } from "react";
import UploadScreen from "./components/UploadScreen.jsx";
import ProcessingScreen from "./components/ProcessingScreen.jsx";
import MemoryDashboard from "./components/MemoryDashboard.jsx";
import { loadMemoriesStore } from "./lib/memoryStore.js";

export default function App() {
  const [screen, setScreen] = useState("loading"); // 'loading' | 'upload' | 'processing' | 'dashboard'
  const [jobData, setJobData] = useState(null);
  const [storeData, setStoreData] = useState(null);

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
    setStoreData(null);
    setJobData(null);
    setScreen("upload");
  };

  if (screen === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-sm font-medium text-stone-500 animate-pulse">
          Loading Conversation Repairer...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 antialiased selection:bg-amber-200 selection:text-stone-900">
      <main className="pb-16">
        {screen === "upload" && (
          <UploadScreen onStartProcessing={handleStartProcessing} />
        )}

        {screen === "processing" && jobData && (
          <ProcessingScreen
            jobData={jobData}
            onComplete={handleProcessingComplete}
            onCancel={handleResetToUpload}
          />
        )}

        {screen === "dashboard" && storeData && (
          <MemoryDashboard
            storeData={storeData}
            onReset={handleResetToUpload}
          />
        )}
      </main>
    </div>
  );
}
