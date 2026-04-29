import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';

export default function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-[#1a1a1a] border border-gold/40 shadow-2xl p-4 max-w-xs">
      <p className="text-white text-sm font-medium mb-1">Update available</p>
      <p className="text-white/40 text-xs mb-3">A new version of the app is ready.</p>
      <button
        onClick={() => updateServiceWorker(true)}
        className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold/80 text-white py-2 text-xs font-bold uppercase tracking-widest transition-all"
      >
        <RefreshCw size={12} /> Reload & Update
      </button>
    </div>
  );
}
