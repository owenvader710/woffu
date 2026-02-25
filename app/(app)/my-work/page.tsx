"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRealtimeMyWork } from "./useRealtimeMyWork";
// NOTE: ไม่ใช้ StatusButtons (ของ approval) ในหน้านี้

type Status = "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";

type WorkItem = {
  id: string;
  title: string;
  type: "VIDEO" | "GRAPHIC";
  department: "VIDEO" | "GRAPHIC" | "ALL";
  status: Status;
  created_at: string;
  due_date: string | null;

  brand: string | null;
  video_priority: "2" | "3" | "5" | "SPECIAL" | null;
  video_purpose: string | null;
  graphic_job_type: string | null;
};

const STATUSES: Status[] = ["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED"];

function formatDateTH(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "amber" | "red" | "blue";
}) {
  const cls =
    tone === "green"
      ? "border-green-500/30 bg-green-500/10 text-green-200"
      : tone === "amber"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : tone === "red"
      ? "border-red-500/30 bg-red-500/10 text-red-200"
      : tone === "blue"
      ? "border-sky-500/30 bg-sky-500/10 text-sky-200"
      : "border-white/10 bg-white/5 text-white/70";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] ${cls}`}>
      {children}
    </span>
  );
}

function statusTone(s: Status) {
  if (s === "TODO") return "neutral";
  if (s === "IN_PROGRESS") return "blue";
  if (s === "BLOCKED") return "red";
  return "green";
}

export default function MyWorkPage() {
  const { items, loading, error, refresh } = useRealtimeMyWork();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function changeStatus(id: string, status: Status) {
    try {
      setUpdatingId(id);

      await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      refresh();
    } finally {
      setUpdatingId(null);
    }
  }

  function StatusAction({ item }: { item: WorkItem }) {
    const btnBase =
      "rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:opacity-60";

    const tone = (s: Status) =>
      s === "COMPLETED"
        ? "border-green-500/30 bg-green-500/10 text-green-200 hover:bg-green-500/15"
        : s === "BLOCKED"
        ? "border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/15"
        : s === "IN_PROGRESS"
        ? "border-sky-500/30 bg-sky-500/10 text-sky-200 hover:bg-sky-500/15"
        : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10";

    return (
      <div className="flex flex-wrap justify-end gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={updatingId === item.id}
            onClick={() => changeStatus(item.id, s)}
            className={`${btnBase} ${tone(s)} ${item.status === s ? "ring-1 ring-white/20" : ""}`}
            title={`เปลี่ยนเป็น ${s}`}
          >
            {s}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold tracking-widest text-white/50">WOFFU</div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">งานของฉัน</h1>
          <div className="mt-2 text-sm text-white/60">รายการทั้งหมด: {(items as any[]).length}</div>
        </div>

        <button
          onClick={refresh}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          รีเฟรช
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <table className="w-full text-sm text-white/80">
          <thead className="bg-white/5 text-xs text-white/50">
            <tr className="text-left">
              <th className="p-4">งาน</th>
              <th className="p-4">ฝ่าย</th>
              <th className="p-4">สถานะ</th>
              <th className="p-4">Deadline</th>
              <th className="p-4 text-right">จัดการ</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="p-6 text-white/40">
                  กำลังโหลด...
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              (items as WorkItem[]).map((item) => (
                <tr key={item.id} className="border-t border-white/10 hover:bg-white/[0.06]">
                  <td className="p-4">
                    <Link href={`/projects/${item.id}`} className="font-semibold text-white underline underline-offset-4">
                      {item.title}
                    </Link>
                  </td>

                  <td className="p-4">
                    <Pill tone={item.type === "VIDEO" ? "blue" : "amber"}>{item.type}</Pill>
                  </td>

                  <td className="p-4">
                    <Pill tone={statusTone(item.status)}>{item.status}</Pill>
                  </td>

                  <td className="p-4 text-white/60">{formatDateTH(item.due_date)}</td>

                  <td className="p-4 text-right">
                    <StatusAction item={item} />
                  </td>
                </tr>
              ))}

            {!loading && !error && (items as any[]).length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-white/40">
                  ยังไม่มีงาน
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {error ? (
          <div className="border-t border-white/10 p-4 text-sm text-red-200">
            {String(error)}
          </div>
        ) : null}
      </div>
    </div>
  );
}