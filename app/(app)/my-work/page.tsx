"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StatusDropdown, { Status } from "./StatusDropdown";

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
};

type PendingInfo = {
  from: Status;
  to: Status;
  at: number;
};

async function safeJson(res: Response) {
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

/** ✅ เฉพาะหน้า My Work: UI <-> DB mapping */
function toDbStatus(s: Status) {
  if (s === "COMPLETED") return "DONE";
  if (s === "BLOCKED") return "CANCELLED";
  return s;
}
function toUiStatus(s: any): Status {
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

function PendingBadge({ from, to }: { from: Status; to: Status }) {
  return (
    <div
      className={cn(
        "mt-2 inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold",
        "border-[#e5ff78]/30 bg-[#e5ff78]/10 text-[#e5ff78]",
        "shadow-[0_0_0_1px_rgba(229,255,120,0.15),0_0_30px_rgba(229,255,120,0.20)]",
        "animate-[pulse_2.6s_ease-in-out_infinite]"
      )}
      title="กำลังรอหัวหน้าอนุมัติ"
    >
      <span className="inline-flex h-2 w-2 rounded-full bg-[#e5ff78] shadow-[0_0_18px_rgba(229,255,120,0.7)]" />
      รออนุมัติ: {from} → {to}
    </div>
  );
}

/** ✅ Toast มุมขวาล่าง (เทา/ดำ + ขาว) */
function Toast({
  open,
  message,
  onClose,
}: {
  open: boolean;
  message: string;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[10000]">
      <div
        className={cn(
          "rounded-2xl border border-white/10 bg-[#0b0b0b]/90 px-5 py-4 text-sm font-semibold text-white",
          "shadow-[0_25px_80px_rgba(0,0,0,0.75)] backdrop-blur"
        )}
      >
        <div className="flex items-center gap-4">
          <div className="whitespace-nowrap">{message}</div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/85 hover:bg-white/10"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyWorkPage() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [pendingMap, setPendingMap] = useState<Record<string, PendingInfo>>({});
  const [changingId, setChangingId] = useState<string | null>(null);

  // ✅ toast state
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("ส่งคำขอสำเร็จแล้ว");
  const toastTimerRef = React.useRef<number | null>(null);

  function showToast(msg = "ส่งคำขอสำเร็จแล้ว") {
    setToastMsg(msg);
    setToastOpen(true);

    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastOpen(false);
      toastTimerRef.current = null;
    }, 2200);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

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

  function looksLikeApprovalMessage(msg?: string) {
    if (!msg) return false;
    return /รอ|อนุมัติ|หัวหน้า|approval|approve|pending/i.test(msg);
  }

  async function changeStatus(id: string, nextUi: Status) {
    if (changingId) return;

    const current = items.find((x) => x.id === id);
    const fromUi = current?.status;
    if (!current || !fromUi) return;

    // ✅ ถ้ามี pending อยู่แล้ว: ไม่ต้องเด้ง popup ยาวๆ แค่ toast ก็พอ
    if (pendingMap[id]) {
      showToast("ส่งคำขอสำเร็จแล้ว");
      return;
    }

    setChangingId(id);

    try {
      const nextDb = toDbStatus(nextUi);

      const res = await fetch(`/api/my-work/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextDb }),
      });

      const j = await safeJson(res);

      if (!res.ok) {
        // ❗ตามที่นายท่านต้องการ: toast แบบเดียว (ไม่ต้องเอาข้อความยาว)
        throw new Error((j && (j.error || j.message)) || "Update failed");
      }

      // ✅ ถ้า backend ส่ง status กลับมา = เปลี่ยนสำเร็จจริง
      const returnedStatus = j?.data?.status ?? j?.status ?? j?.project?.status ?? null;
      const msg: string = (j && (j.message || j.note || j.info)) || "";

      const needsApproval =
        j?.pending === true ||
        j?.requires_approval === true ||
        looksLikeApprovalMessage(msg);

      if (returnedStatus) {
        // Applied จริง
        const appliedUi = toUiStatus(returnedStatus);
        setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status: appliedUi } : x)));
        setPendingMap((m) => {
          const mm = { ...m };
          delete mm[id];
          return mm;
        });

        showToast("ส่งคำขอสำเร็จแล้ว");
      } else if (needsApproval) {
        // ✅ ส่งคำขอแล้ว รออนุมัติ
        setPendingMap((m) => ({
          ...m,
          [id]: { from: fromUi, to: nextUi, at: Date.now() },
        }));

        showToast("ส่งคำขอสำเร็จแล้ว");
      } else {
        // ✅ fallback เผื่อ backend ไม่ส่ง status แต่จริงๆ ok
        setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status: nextUi } : x)));
        showToast("ส่งคำขอสำเร็จแล้ว");
      }
    } catch {
      // ✅ ถ้านายท่านอยากให้ error ก็เป็น toast สั้นๆ เหมือนกัน:
      // showToast("ทำรายการไม่สำเร็จ");
      // แต่ตอนนี้ตามโจทย์ขอแค่ success → เลยไม่โชว์ error toast
      // ถ้าอยากให้โชว์ error toast บอกได้ เดี๋ยวเปิดให้
    } finally {
      setChangingId(null);
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
      <Toast open={toastOpen} message={toastMsg} onClose={() => setToastOpen(false)} />

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
                    const pending = pendingMap[w.id];
                    const rowGlow = !!pending;

                    return (
                      <tr
                        key={w.id}
                        className={cn(
                          "hover:bg-white/[0.03]",
                          rowGlow ? "bg-[#e5ff78]/[0.03] shadow-[inset_0_0_0_1px_rgba(229,255,120,0.12)]" : ""
                        )}
                      >
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

                              {pending ? <PendingBadge from={pending.from} to={pending.to} /> : null}
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
                          <StatusDropdown
                            value={w.status}
                            onChange={(s) => changeStatus(w.id, s)}
                            disabled={changingId === w.id || !!pending}
                          />
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