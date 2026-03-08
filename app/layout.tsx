// app/layout.tsx
import "./globals.css";
import React from "react";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "WOFFU OS",
  description: "WOFFU System",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-screen w-full overflow-x-hidden bg-black text-white">
        {children}
      </body>
    </html>
  );
}