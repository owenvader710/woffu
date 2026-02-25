// app/(app)/ClientShell.tsx
"use client";

import React from "react";
import Link from "next/link";
import LogoutButton from "../components/LogoutButton";
import Sidebar from "./components/Sidebar";

export default function ClientShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail: string | null;
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex-1 min-w-0">
          {/* Topbar */}
          <header className="sticky top-0 z-10 border-b border-white/10 bg-black/60 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
              <Link href="/dashboard" className="text-white/90 font-semibold">
                WOFFU
              </Link>

              <div className="flex items-center gap-3">
                {userEmail ? <span className="text-sm text-white/60">{userEmail}</span> : null}
                <LogoutButton />
              </div>
            </div>
          </header>

          {/* Page container (แก้ชิดขอบให้ด้วย) */}
          <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}