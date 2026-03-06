import React from "react";
import NotificationCenter from "./components/NotificationCenter";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <NotificationCenter />
      {children}
    </div>
  );
}