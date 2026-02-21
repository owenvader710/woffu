"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRealtimeMyWork } from "./useRealtimeMyWork";

type WorkItem = {
  id: string;
  title: string;
  type: "VIDEO" | "GRAPHIC";
  department: "VIDEO" | "GRAPHIC" | "ALL";
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
  created_at: string;
  start_date: string | null;
  due_date: string | null;

  brand: string | null;
  video_priority: "2" | "3" | "5" | "SPECIAL" | null;
  video_purpose: string | null;
  graphic_job_type: string | null;
  graphic_category: string | null;
};

const STATUSES: WorkItem["status"][] = ["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED"];

function formatDateTH(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "2-digit" });
}

function priorityLabel(p?: WorkItem["video_priority"] | null) {
  if (!p) return "-";
  if (p === "SPECIAL") return "SPECIAL";
  return `${p} ดาว`;
}

function compactMeta(p: WorkItem) {
  if (p.type === "VIDEO") {
    const pr = priorityLabel(p.video_priority);
    const purpose = p.video_purpose || "-";
    return `⭐ ${pr} · ${purpose}`;
  }
  const g = p.graphic_job_type || p.graphic_category || "-";
  return `🖼️ ${g}`;
}

export default function MyWorkPage() {
  const { items, loading, error, refresh } = useRealtimeMyWork();

  // ✅ ข้อ 4: filter ฝ่าย + status + ค้นหา
  const [statusFilter, setStatusFilter] = useState<WorkItem["status"] | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "VIDEO" | "GRAPHIC">("ALL");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const base = { ALL: (items as any[]).length, TODO: 0, IN_PROGRESS: 0, BLOCKED: 0, COMPLETED: 0 } as Record<
      WorkItem["status"] | "ALL",
      number
    >;
    for (const p of items as any[]) base[p.status] += 1;
    return base;
  }, [items]);

  const filtered = useMemo(() => {
    let out = (items as WorkItem[]) ?? [];

    if (statusFilter !== "ALL") out = out.filter((x) => x.status === statusFilter);
    if (typeFilter !== "ALL") out = out.filter((x) => x.type === typeFilter);

    const qq = q.trim().toLowerCase();
    if (qq) {
      out = out.filter((p) => {
        const hay = `${p.title ?? ""} ${p.brand ?? ""} ${p.video_purpose ?? ""} ${p.graphic_job_type ?? ""}`.toLowerCase();
        return hay.includes(qq);
      });
    }
    return out;
  }, [items, statusFilter, typeFilter, q]);

  return (
    <div className="p-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">งานของฉัน</h1>
          <p className="mt-1 text-sm text-gray-600">รายการทั้งหมด: {filtered.length}</p>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <button onClick={refresh} className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50">
            รีเฟรช
          </button>
        </div>
      </div>

      {/* ✅ status tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {(["ALL", ...STATUSES] as const).map((s) => {
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-xl border px-3 py-2 text-xs hover:bg-gray-50 ${
                active ? "bg-black text-white hover:bg-black" : ""
              }`}
            >
              {s === "ALL" ? "ทั้งหมด" : s}{" "}
              <span className={active ? "opacity-90" : "text-gray-500"}>({counts[s] ?? 0})</span>
            </button>
          );
        })}
      </div>

      {/* ✅ type filter + search */}
      <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["ALL", "VIDEO", "GRAPHIC"] as const).map((t) => {
            const active = typeFilter === t;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded-xl border px-3 py-2 text-xs hover:bg-gray-50 ${
                  active ? "bg-black text-white hover:bg-black" : ""
                }`}
              >
                {t === "ALL" ? "ทุกฝ่าย" : t}
              </button>
            );
          })}
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหา: ชื่อโปรเจกต์ / แบรนด์ / รูปแบบงาน / ประเภทงาน"
          className="w-full rounded-xl border px-3 py-2 text-sm md:w-[420px]"
        />
      </div>

      {loading && <div className="mt-6 rounded-xl border p-4 text-sm text-gray-600">กำลังโหลด...</div>}

      {!loading && error && (
        <div className="mt-6 rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="mt-6 rounded-xl border p-4 text-sm text-gray-600">ยังไม่มีงานตามเงื่อนไขนี้</div>
      )}

      <div className="mt-6 space-y-4">
        {filtered.map((item) => (
          <div key={item.id} className="rounded-2xl border p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <Link href={`/projects/${item.id}`} className="text-lg font-semibold underline underline-offset-4">
                  {item.title}
                </Link>

                <div className="mt-1 text-sm text-gray-600">
                  {item.type} · {item.department} · <b>{item.status}</b>
                </div>

                <div className="mt-1 text-xs text-gray-500">
                  brand: <span className="font-medium">{item.brand || "-"}</span> · {compactMeta(item)}
                </div>

                <div className="mt-1 text-xs text-gray-500">
                  start: {formatDateTH(item.start_date)} · due: {formatDateTH(item.due_date)}
                </div>
              </div>

              <div className="text-[11px] text-gray-400">id: {item.id}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}