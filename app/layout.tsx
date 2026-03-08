// app/layout.tsx
import "./globals.css";
import React from "react";

export const metadata = {
  title: "WOFFU OS",
  description: "WOFFU System",
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