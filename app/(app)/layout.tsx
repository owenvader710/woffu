// app/(app)/layout.tsx
import React from "react";
import ClientShell from "./ClientShell";

export const dynamic = "force-dynamic";

// ✅ ทุกหน้าหลัง login ใช้ shell เดียวกัน (มี Sidebar + Toast + spacing)
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <ClientShell>{children}</ClientShell>;
}