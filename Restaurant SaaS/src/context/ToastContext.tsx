import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface ToastItem {
  id: number;
  message: string;
  type: 'error' | 'success';
}

interface ToastContextValue {
  toast: (message: string, type?: 'error' | 'success') => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

let _id = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    const id = ++_id;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9998] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 text-sm font-mono max-w-sm shadow-2xl border pointer-events-auto animate-in slide-in-from-right-4 ${
              t.type === 'error'
                ? 'bg-[#1a0a0a] border-red-500/40 text-red-300'
                : 'bg-[#0a1a0a] border-green-500/40 text-green-300'
            }`}
          >
            {t.type === 'error'
              ? <XCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
              : <CheckCircle size={15} className="text-green-400 shrink-0 mt-0.5" />
            }
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
