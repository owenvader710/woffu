// app/layout.tsx
import "./globals.css";
import React from "react";

export const metadata = {
  title: "WOFFU",
  description: "WOFFU System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}