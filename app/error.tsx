// app/error.tsx
"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 22, marginBottom: 10 }}>Application error</h1>
      <p style={{ opacity: 0.8, marginBottom: 12 }}>
        {error.message || "Server-side exception occurred."}
      </p>
      {error.digest ? (
        <p style={{ opacity: 0.6, marginBottom: 16 }}>Digest: {error.digest}</p>
      ) : null}
      <button
        onClick={() => reset()}
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #ddd",
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </main>
  );
}