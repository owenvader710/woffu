"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ToastTone = "neutral" | "success" | "error";

type ToastItem = {
  id: string;
  title?: string;
  message: string;
  tone: ToastTone;
  ttlMs: number;
};

type ToastContextType = {
  toast: (message: string, opts?: { title?: string; tone?: ToastTone; ttlMs?: number }) => void;
  success: (message: string, opts?: { title?: string; ttlMs?: number }) => void;
  error: (message: string, opts?: { title?: string; ttlMs?: number }) => void;
  clear: () => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function toneClasses(tone: ToastTone) {
  if (tone === "success") return "border-green-500/25 bg-green-500/10 text-green-100";
  if (tone === "error") return "border-red-500/25 bg-red-500/10 text-red-100";
  return "border-white/10 bg-white/5 text-white";
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, any>>({});

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback((message: string, opts?: { title?: string; tone?: ToastTone; ttlMs?: number }) => {
    const id = uid();
    const toast: ToastItem = {
      id,
      title: opts?.title,
      message,
      tone: opts?.tone ?? "neutral",
      ttlMs: opts?.ttlMs ?? 2600,
    };
    setItems((prev) => [toast, ...prev].slice(0, 5));
    timers.current[id] = setTimeout(() => remove(id), toast.ttlMs);
  }, [remove]);

  const value = useMemo<ToastContextType>(() => {
    return {
      toast: push,
      success: (m, o) => push(m, { ...(o ?? {}), tone: "success" }),
      error: (m, o) => push(m, { ...(o ?? {}), tone: "error" }),
      clear: () => {
        Object.values(timers.current).forEach((t) => clearTimeout(t));
        timers.current = {};
        setItems([]);
      },
    };
  }, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast UI */}
      <div className="fixed right-4 top-4 z-[9999] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={`overflow-hidden rounded-2xl border p-3 shadow-[0_20px_60px_rgba(0,0,0,0.55)] ${toneClasses(t.tone)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {t.title ? <div className="text-xs font-extrabold text-white/85">{t.title}</div> : null}
                <div className="mt-0.5 text-sm font-semibold text-white/90 break-words">{t.message}</div>
              </div>
              <button
                onClick={() => remove(t.id)}
                className="rounded-xl border border-white/10 bg-black/20 px-2 py-1 text-xs font-bold text-white/70 hover:bg-white/10"
                aria-label="Dismiss toast"
                title="ปิด"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // ป้องกันกรณีลืมห่อ Provider
    return {
      toast: (m: string) => console.log("[toast]", m),
      success: (m: string) => console.log("[toast:success]", m),
      error: (m: string) => console.log("[toast:error]", m),
      clear: () => {},
    };
  }
  return ctx;
}