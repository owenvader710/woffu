// app/(app)/my-work/StatusButtons.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StatusButtons({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function setStatus(status: "PENDING" | "APPROVED" | "REJECTED") {
    try {
      setLoading(status);
      const res = await fetch(`/api/projects/${projectId}/request-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Update failed");
      }
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Update failed");
    } finally {
      setLoading(null);
    }
  }

  const Btn = ({
    label,
    status,
    variant,
  }: {
    label: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    variant: "neutral" | "good" | "bad";
  }) => {
    const base =
      "rounded-xl px-3 py-1.5 text-xs font-semibold border transition disabled:opacity-60";
    const style =
      variant === "good"
        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"
        : variant === "bad"
        ? "border-red-500/30 bg-red-500/15 text-red-100 hover:bg-red-500/25"
        : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10";

    return (
      <button
        className={`${base} ${style}`}
        disabled={!!loading}
        onClick={() => setStatus(status)}
      >
        {loading === status ? "..." : label}
      </button>
    );
  };

  return (
    <div className="flex items-center gap-2">
      <Btn label="Pending" status="PENDING" variant="neutral" />
      <Btn label="Approve" status="APPROVED" variant="good" />
      <Btn label="Reject" status="REJECTED" variant="bad" />
    </div>
  );
}