import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => remove(id), 5000);
  }, [remove]);

  const toast = {
    success: (msg) => add('success', msg),
    error: (msg) => add('error', msg),
    info: (msg) => add('info', msg),
    warning: (msg) => add('warning', msg),
  };

  const icons = {
    success: <CheckCircle2 size={20} className="text-green-600" />,
    error: <XCircle size={20} className="text-red-600" />,
    warning: <AlertCircle size={20} className="text-yellow-600" />,
    info: <Info size={20} className="text-blue-600" />,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-3 p-4 rounded-lg shadow-lg animate-slide-up bg-white dark:bg-darkbg-card"
            style={{ border: '1px solid var(--border)' }}
          >
            {icons[t.type]}
            <p className="text-sm flex-1" style={{ color: 'var(--text)' }}>{t.message}</p>
            <button onClick={() => remove(t.id)} className="text-muted hover:opacity-70">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
