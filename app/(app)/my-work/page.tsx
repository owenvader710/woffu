"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StatusDropdown, { Status } from "./StatusDropdown";

type WorkItem = {
  id: string;
  title: string | null;
  type?: string | null;

  department: "VIDEO" | "GRAPHIC" | "ALL";
  status: Status;

  created_at?: string | null;
  start_date?: string | null;
  due_date?: string | null;

  assignee_id?: string | null;
  created_by?: string | null;

  brand?: string | null;
  video_priority?: string | null;
  video_purpose?: string | null;
  graphic_job_type?: string | null;
};

async function safeJson(res: Response) {
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function DeptPill({ dept }: { dept: WorkItem["department"] }) {
  const cls =
    dept === "VIDEO"
      ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
      : dept === "GRAPHIC"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : "border-white/10 bg-white/5 text-white/70";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold", cls)}>
      {dept}
    </span>
  );
}

function StatusPill({ s }: { s: Status }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-extrabold text-white/85">
      {s}
    </span>
  );
}

function fmtDeadline(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  // ✅ th-TH + มีเวลา
  const date = d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "2-digit" });
  const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} ${time}`;
}

// ✅ “รหัส” ถ้าไม่มี field จริง ให้ fallback เป็น ID สั้น
function makeCode(w: WorkItem) {
  // ถ้าใน DB มี field อื่นในอนาคต เช่น w.code / w.ref_code ก็ใส่เพิ่มได้
  const t = (w.type || "").toUpperCase().trim();
  const short = (w.id || "").replace(/-/g, "").slice(0, 6).toUpperCase();
  return t ? `${t}-${short}` : short;
}

// ✅ บรรทัดรอง: ใช้ข้อมูลที่มีอยู่จริงจาก API
function secondLine(w: WorkItem) {
  const parts = [
    w.brand ? String(w.brand).toUpperCase() : null,
    w.video_purpose ? String(w.video_purpose) : null,
    w.graphic_job_type ? String(w.graphic_job_type) : null,
    w.video_priority ? `PRIORITY: ${String(w.video_priority)}` : null,
  ].filter(Boolean) as string[];

  return parts.length ? parts.join(" · ") : "";
}

export default function MyWorkPage() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ✅ filter สถานะด้านบนแบบ projects
  const [statusFilter, setStatusFilter] = useState<"ALL" | Status>("ALL");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch("/api/my-work", { cache: "no-store" });
      const j = await safeJson(r);
      if (!r.ok) {
        setItems([]);
        setErr((j && (j.error || j.message)) || `Load failed (${r.status})`);
        return;
      }
      const arr = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
      setItems(arr as WorkItem[]);
    } catch (e: any) {
      setItems([]);
      setErr(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(id: string, next: Status) {
    // optimistic
    const prev = items;
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status: next } : x)));

    try {
      const res = await fetch(`/api/my-work/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const j = await safeJson(res);
      if (!res.ok) throw new Error((j && (j.error || j.message)) || "Update failed");
    } catch {
      // rollback
      setItems(prev);
      alert("Update failed");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const base = items.slice();
    const byStatus = statusFilter === "ALL" ? base : base.filter((x) => x.status === statusFilter);
    return byStatus;
  }, [items, statusFilter]);

  return (
    <div className="w-full bg-black text-white">
      <div className="w-full px-6 py-8 lg:px-10 lg:py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold tracking-widest text-white/50">WOFFU</div>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight">งานของฉัน</h1>
            <div className="mt-2 text-sm text-white/50">รายการทั้งหมด: {filtered.length}</div>
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 disabled:opacity-50"
          >
            รีเฟรช
          </button>
        </div>

        {/* Status Filter (เหมือน Projects) */}
        <div className="mt-6 rounded-[30px] border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {(["ALL", "TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELLED"] as const).map((s) => {
              const active = statusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s as any)}
                  className={cn(
                    "rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                    active
                      ? "border-white/10 bg-white text-black"
                      : "border-white/10 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-[30px] border border-white/10 bg-white/5 p-5 text-sm text-white/60">กำลังโหลด...</div>
        ) : err ? (
          <div className="mt-6 rounded-[30px] border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">{err}</div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[30px] border border-white/10 bg-white/5">
            <div className="w-full overflow-x-auto">
              <table className="min-w-[980px] w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold tracking-widest text-white/45">
                    <th className="px-6 py-4">งาน</th>
                    <th className="px-6 py-4 text-center">ฝ่าย</th>
                    <th className="px-6 py-4 text-center">สถานะ</th>
                    <th className="px-6 py-4 text-center">Deadline</th>
                    <th className="px-6 py-4 text-right">จัดการ</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {filtered.map((w) => (
                    <tr key={w.id} className="hover:bg-white/[0.03]">
                      {/* Title + code + second line */}
                      <td className="px-6 py-5">
                        <div className="flex items-start gap-3">
                          <span className="mt-[2px] inline-flex shrink-0 items-center rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-extrabold text-white/85">
                            {makeCode(w)}
                          </span>

                          <div className="min-w-0">
                            <Link
                              href={`/projects/${w.id}`}
                              className="block truncate text-base font-extrabold text-white hover:underline"
                            >
                              {w.title || "-"}
                            </Link>
                            {secondLine(w) ? (
                              <div className="mt-1 truncate text-xs text-white/45">{secondLine(w)}</div>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-center">
                        <DeptPill dept={w.department} />
                      </td>

                      <td className="px-6 py-5 text-center">
                        <StatusPill s={w.status} />
                      </td>

                      <td className="px-6 py-5 text-center text-sm text-white/80">
                        {fmtDeadline(w.due_date)}
                      </td>

                      <td className="px-6 py-5 text-right">
                        <StatusDropdown
                          value={w.status}
                          onChange={(s) => changeStatus(w.id, s)}
                        />
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-white/50">
                        ไม่พบงานในสถานะนี้
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}