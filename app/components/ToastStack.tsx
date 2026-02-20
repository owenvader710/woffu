"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastKind = "success" | "error" | "info";

type ToastItem = {
  id: string;
  kind: ToastKind;
  title?: string;
  message: string;
  ttlMs: number;
};

type ToastCtx = {
  push: (t: { kind: ToastKind; message: string; title?: string; ttlMs?: number }) => void;
  clear: () => void;
};

const Ctx = createContext<ToastCtx | null>(null);

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (t: { kind: ToastKind; message: string; title?: string; ttlMs?: number }) => {
      const id = uid();
      const ttlMs = t.ttlMs ?? (t.kind === "error" ? 3500 : 2500);

      const item: ToastItem = {
        id,
        kind: t.kind,
        title: t.title,
        message: t.message,
        ttlMs,
      };

      setItems((prev) => [item, ...prev].slice(0, 5));

      window.setTimeout(() => remove(id), ttlMs);
    },
    [remove]
  );

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => ({ push, clear }), [push, clear]);

  return (
    <Ctx.Provider value={value}>
      {children}

      {/* Toast Stack */}
      <div className="fixed right-4 bottom-4 z-[100] flex w-[320px] flex-col-reverse gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={[
              "rounded-2xl border p-3 shadow-sm backdrop-blur bg-white/95",
              t.kind === "success"
                ? "border-green-200"
                : t.kind === "error"
                ? "border-red-200"
                : "border-gray-200",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {t.title && <div className="text-sm font-semibold">{t.title}</div>}
                <div
                  className={[
                    "text-sm",
                    t.kind === "success"
                      ? "text-green-800"
                      : t.kind === "error"
                      ? "text-red-800"
                      : "text-gray-800",
                  ].join(" ")}
                >
                  {t.message}
                </div>
              </div>

              <button
                onClick={() => remove(t.id)}
                className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                aria-label="close"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return ctx;
}
