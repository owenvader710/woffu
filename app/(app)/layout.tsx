// app/(app)/layout.tsx
import React from "react";
import Sidebar from "./components/Sidebar";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full px-6 py-6 md:px-10 md:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}