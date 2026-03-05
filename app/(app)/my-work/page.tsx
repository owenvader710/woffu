"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StatusDropdown, { Status } from "./StatusDropdown";

type PendingReq = {
  id: string;
  from_status: string;
  to_status: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at?: string | null;
};

type WorkItem = {
  id: string;
  code?: string | null;

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

  // ✅ เพิ่ม: pending request จาก API
  pending_request?: PendingReq | null;
};

async function safeJson(res: Response) {
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

/** ✅ เฉพาะหน้า My Work: UI <-> DB mapping */
type DbStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED" | "REVIEW";
function toDbStatus(s: Status): DbStatus {
  // UI -> DB
  if (s === "COMPLETED") return "DONE";
  if (s === "BLOCKED") return "CANCELLED";
  return s as unknown as DbStatus;
}
function toUiStatus(s: any): Status {
  // DB -> UI
  if (s === "DONE") return "COMPLETED";
  if (s === "CANCELLED") return "BLOCKED";
  return s as Status;
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

  const date = d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "2-digit" });
  const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} ${time}`;
}

function makeCode(w: WorkItem) {
  const real = (w.code ?? "").toString().trim();
  if (real) return real;

  const t = (w.type || "").toUpperCase().trim();
  const short = (w.id || "").replace(/-/g, "").slice(0, 6).toUpperCase();
  return t ? `${t}-${short}` : short;
}

function secondLine(w: WorkItem) {
  const parts = [
    w.brand ? String(w.brand).toUpperCase() : null,
    w.video_purpose ? String(w.video_purpose) : null,
    w.graphic_job_type ? String(w.graphic_job_type) : null,
    w.video_priority ? `PRIORITY: ${String(w.video_priority)}` : null,
  ].filter(Boolean) as string[];

  return parts.length ? parts.join(" · ") : "";
}

function uiLabelFromDb(db: string) {
  // แสดงให้ตรง UI
  if (db === "DONE") return "COMPLETED";
  if (db === "CANCELLED") return "BLOCKED";
  return db;
}

export default function MyWorkPage() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ✅ toast มุมขวาล่าง
  const [toast, setToast] = useState<string | null>(null);
  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }

  // ✅ เหลือแค่ 4 สถานะ + ALL
  const FILTERS = ["ALL", "TODO", "IN_PROGRESS", "COMPLETED", "BLOCKED"] as const;
  const [statusFilter, setStatusFilter] = useState<(typeof FILTERS)[number]>("ALL");

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

      // ✅ map DB -> UI (DONE/CANCELLED -> COMPLETED/BLOCKED)
      const normalized = (arr as WorkItem[]).map((x: any) => ({
        ...x,
        status: toUiStatus(x.status),
      }));

      setItems(normalized);
    } catch (e: any) {
      setItems([]);
      setErr(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  // ✅ ส่งคำขอเปลี่ยนสถานะ (ไม่แก้ projects ตรงๆ) -> request-status
  async function requestStatusChange(projectId: string, nextUi: Status) {
    const prev = items;

    const target = items.find((x) => x.id === projectId);
    if (!target) return;

    // ถ้ามี pending อยู่แล้ว ห้ามส่งซ้ำ
    if (target.pending_request?.status === "PENDING") {
      showToast("มีคำขอรออนุมัติอยู่แล้ว");
      return;
    }

    const fromDb = toDbStatus(target.status);
    const toDb = toDbStatus(nextUi);

    // optimistic: ใส่ pending_request ให้เห็นทันที
    setItems((xs) =>
      xs.map((x) =>
        x.id === projectId
          ? {
              ...x,
              pending_request: {
                id: "temp",
                from_status: fromDb,
                to_status: toDb,
                status: "PENDING",
                created_at: new Date().toISOString(),
              },
            }
          : x
      )
    );

    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/request-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_status: toDb }),
      });

      const j = await safeJson(res);

      if (!res.ok) {
        // rollback
        setItems(prev);
        const msg = (j && (j.error || j.message)) || "Update failed";
        showToast(msg);
        return;
      }

      // ถ้า API ส่ง request กลับมา ก็เอามาแทน temp
      const reqRow = j?.request ?? null;
      if (reqRow?.id) {
        setItems((xs) =>
          xs.map((x) =>
            x.id === projectId
              ? {
                  ...x,
                  pending_request: {
                    id: reqRow.id,
                    from_status: reqRow.from_status,
                    to_status: reqRow.to_status,
                    status: reqRow.status,
                    created_at: reqRow.created_at ?? null,
                  },
                }
              : x
          )
        );
      }

      showToast("ส่งคำขอสำเร็จแล้ว");
    } catch (e: any) {
      setItems(prev);
      showToast(e?.message || "Update failed");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: items.length, TODO: 0, IN_PROGRESS: 0, COMPLETED: 0, BLOCKED: 0 };
    for (const x of items) c[x.status] = (c[x.status] || 0) + 1;
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    if (statusFilter === "ALL") return items;
    return items.filter((x) => x.status === statusFilter);
  }, [items, statusFilter]);

  return (
    <div className="w-full bg-black text-white">
      <div className="w-full px-6 py-8 lg:px-10 lg:py-10">
        {/* Toast */}
        {toast ? (
          <div className="fixed bottom-6 right-6 z-[99999]">
            <div className="rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-sm font-semibold text-white shadow-[0_30px_120px_rgba(0,0,0,0.7)]">
              {toast}
            </div>
          </div>
        ) : null}

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

        {/* Status Filter */}
        <div className="mt-6 rounded-[30px] border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((s) => {
              const active = statusFilter === s;
              const label = s === "ALL" ? `ALL (${counts.ALL || 0})` : `${s} (${counts[s] || 0})`;

              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                    active
                      ? "border-white/10 bg-white text-black"
                      : "border-white/10 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {label}
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
          <div className="mt-6 rounded-[30px] border border-white/10 bg-white/5 overflow-visible">
            <div className="w-full overflow-x-auto overflow-y-visible">
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
                  {filtered.map((w) => {
                    const pending = w.pending_request?.status === "PENDING" ? w.pending_request : null;

                    return (
                      <tr key={w.id} className="hover:bg-white/[0.03]">
                        <td className="px-6 py-5">
                          <div className="flex items-start gap-3">
                            <span className="mt-[2px] inline-flex shrink-0 items-center rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-extrabold text-white/85">
                              {makeCode(w)}
                            </span>

                            <div className="min-w-0">
                              <Link href={`/projects/${w.id}`} className="block truncate text-base font-extrabold text-white hover:underline">
                                {w.title || "-"}
                              </Link>

                              {secondLine(w) ? <div className="mt-1 truncate text-xs text-white/45">{secondLine(w)}</div> : null}

                              {/* ✅ รออนุมัติ (คงอยู่หลัง F5 เพราะมาจาก API) */}
                              {pending ? (
                                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-lime-400/20 bg-lime-400/10 px-4 py-1 text-xs font-extrabold text-lime-200">
                                  <span className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_18px_rgba(163,230,53,0.9)]" />
                                  รออนุมัติ: {uiLabelFromDb(pending.from_status)} → {uiLabelFromDb(pending.to_status)}
                                </div>
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

                        <td className="px-6 py-5 text-center text-sm text-white/80">{fmtDeadline(w.due_date)}</td>

                        <td className="px-6 py-5 text-right">
                          <div className={cn(pending ? "opacity-60 pointer-events-none" : "")}>
                            <StatusDropdown value={w.status} onChange={(s) => requestStatusChange(w.id, s)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}

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