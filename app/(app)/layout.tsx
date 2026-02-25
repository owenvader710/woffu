// app/(app)/layout.tsx
import React from "react";
import Sidebar from "./components/Sidebar";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex">
        <Sidebar />

        <div className="flex-1">
          {/* top spacing + container */}
          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}