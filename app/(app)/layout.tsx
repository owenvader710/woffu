"use client";

import React, { useState } from "react";
import NotificationCenter from "./components/NotificationCenter";
import Sidebar from "./components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-black text-white">
      {/* Desktop Sidebar */}
      <div className="hidden shrink-0 lg:block">
        <Sidebar />
      </div>

      {/* Mobile Drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            aria-label="close menu overlay"
            className="absolute inset-0 bg-black/72 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />

          <div className="absolute left-0 top-0 h-full w-[84%] max-w-[340px] overflow-hidden border-r border-white/10 bg-[#0b0b0b] shadow-[0_0_80px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <div>
                <div className="text-[11px] font-semibold tracking-[0.24em] text-white/35">
                  WOFFU
                </div>
                <div className="mt-1 text-sm font-bold text-white">เมนู</div>
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg text-white/75"
              >
                ✕
              </button>
            </div>

            <div className="h-[calc(100%-73px)] overflow-y-auto overflow-x-hidden">
              <Sidebar />
            </div>
          </div>
        </div>
      ) : null}

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {/* Mobile Header */}
        <header className="fixed inset-x-0 top-0 z-[60] border-b border-white/10 bg-black/90 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl text-white/85"
              aria-label="open menu"
            >
              ☰
            </button>

            <div className="min-w-0 flex-1 text-center">
              <div className="truncate text-[11px] font-semibold tracking-[0.24em] text-white/35">
                WOFFU
              </div>
              <div className="truncate text-sm font-extrabold text-white">
                Production Workflow
              </div>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center">
              <NotificationCenter />
            </div>
          </div>
        </header>

        {/* Desktop Notification */}
        <div className="hidden lg:block">
          <NotificationCenter />
        </div>

        <main className="min-w-0 overflow-x-hidden px-4 pb-8 pt-[84px] md:px-6 lg:px-0 lg:pb-0 lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}