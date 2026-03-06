import React from "react";
import NotificationCenter from "./components/NotificationCenter";
import Sidebar from "./components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-black text-white">
      
      <Sidebar />

      <div className="flex-1">
        <NotificationCenter />
        {children}
      </div>

    </div>
  );
}