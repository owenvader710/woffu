"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type Toast = { id: string; title?: string; message: string; kind?: "success" | "error" | "info" };

type ToastCtx = {
  push: (t: Omit<Toast, "id">) => void;
  remove: (id: string) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    const toast: Toast = { id, kind: "info", ...t };
    setToasts((prev) => [toast, ...prev]);

    // auto hide
    setTimeout(() => remove(id), 3000);
  }, [remove]);

  const value = useMemo(() => ({ push, remove }), [push, remove]);

  return (
    <Ctx.Provider value={value}>
      {children}

      {/* Stack */}
      <div className="fixed right-4 top-4 z-[9999] flex w-[320px] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="rounded-xl border bg-white p-3 shadow">
            {t.title && <div className="text-sm font-semibold">{t.title}</div>}
            <div className="text-sm text-gray-700">{t.message}</div>
            <button
              className="mt-2 text-xs text-gray-500 underline"
              onClick={() => remove(t.id)}
            >
              ปิด
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}