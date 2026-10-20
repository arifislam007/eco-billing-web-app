import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { cx } from "./ui";

type Toast = { id: number; message: string; tone: "good" | "critical" };

const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

/** Short confirmation messages ("Deposit added") that fade out on their own. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show = useCallback(
    (message: string, tone: Toast["tone"] = "good") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-2), { id, message, tone }]);
      setTimeout(() => dismiss(id), 3200);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        className="no-print fixed z-[60] inset-x-0 bottom-20 lg:bottom-6 flex flex-col items-center gap-2 px-4 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              "animate-fade-in pointer-events-auto flex items-center gap-2.5 bg-ink text-surface rounded-xl pl-3.5 pr-2 py-2.5 text-sm shadow-[var(--shadow-lg)] max-w-sm"
            )}
          >
            {t.tone === "good" ? (
              <CheckCircle2 size={16} className="text-good shrink-0" />
            ) : (
              <AlertTriangle size={16} className="text-critical shrink-0" />
            )}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100 p-1" aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
