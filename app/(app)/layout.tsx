"use client";

import React, { useState } from "react";
import NotificationCenter from "./components/NotificationCenter";
import Sidebar from "./components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-black text-white">
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileOpen(false)}
          />

          <div className="absolute left-0 top-0 h-full w-[82%] max-w-[320px] border-r border-white/10 bg-[#0b0b0b]">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Mobile Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/80 px-4 py-3 backdrop-blur lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-xl"
          >
            ☰
          </button>

          <div className="text-sm font-bold tracking-wider">
            WOFFU
          </div>

          <NotificationCenter />
        </div>

        {/* Desktop Notification */}
        <div className="hidden lg:block">
          <NotificationCenter />
        </div>

        <main className="px-4 pt-6 lg:px-0 lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}