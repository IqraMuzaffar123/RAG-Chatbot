"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  variant: "success" | "error";
}

interface ToastContextValue {
  showToast: (message: string, variant?: "success" | "error") => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, variant: "success" | "error" = "success") => {
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              borderRadius: 12,
              background: "rgba(15,15,35,0.95)",
              backdropFilter: "blur(12px)",
              border: `1px solid ${toast.variant === "success" ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)"}`,
              boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${toast.variant === "success" ? "rgba(16,185,129,0.1)" : "rgba(244,63,94,0.1)"}`,
              animation: "ad-slideInFromRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              minWidth: 280,
              maxWidth: 400,
            }}
          >
            {toast.variant === "success" ? (
              <CheckCircle2
                className="w-5 h-5 shrink-0"
                style={{ color: "#10b981" }}
              />
            ) : (
              <XCircle
                className="w-5 h-5 shrink-0"
                style={{ color: "#f43f5e" }}
              />
            )}
            <span className="flex-1 text-[14px] text-slate-200">
              {toast.message}
            </span>
            <button
              onClick={() => dismiss(toast.id)}
              className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}
