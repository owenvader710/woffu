// app/(app)/ClientShell.tsx
"use client";

import React from "react";
import Sidebar from "../components/Sidebar";
import { ToastProvider } from "./components/ToastStack";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-black text-white">
        <Sidebar />
        <main className="min-h-screen flex-1 bg-black">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}