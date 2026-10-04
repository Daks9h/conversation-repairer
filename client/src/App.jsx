import React, { useState, useEffect } from 'react';

export default function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setHealth(data.status);
        setLoading(false);
      })
      .catch((err) => {
        setHealth('error');
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-amber-50/60 to-orange-50/40">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-stone-200/70 p-8 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-100 text-amber-800 text-xl font-semibold">
          CR
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          Conversation Repairer
        </h1>
        <p className="text-sm text-stone-600">
          Turn your conversation history into useful relationship context.
        </p>

        <div className="pt-4 border-t border-stone-100">
          <div className="text-xs uppercase tracking-wider text-stone-600 font-medium mb-1">
            Server Health Status
          </div>
          {loading ? (
            <span className="text-sm text-stone-500">Checking /api/health...</span>
          ) : health === 'ok' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Server connected: ok
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              Server offline ({health})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
