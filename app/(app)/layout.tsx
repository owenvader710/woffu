// app/(app)/layout.tsx
import React from "react";
import Sidebar from "../components/Sidebar";
import { ToastProvider } from "@/app/components/ToastStack";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen w-full bg-black text-white">
        <div className="flex min-h-screen w-full">
          <Sidebar />
          <main className="flex-1 min-h-screen w-full bg-black p-8">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}