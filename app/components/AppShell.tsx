"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // ไม่โชว์ sidebar หน้า login
  const noShell = pathname?.startsWith("/login");
  if (noShell) return <>{children}</>;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex">
        <Sidebar />
        <main className="min-h-screen flex-1 bg-white text-black">{children}</main>
      </div>
    </div>
  );
}