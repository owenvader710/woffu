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
  // UI -> DB
  if (s === "COMPLETED") return "DONE";
  if (s === "BLOCKED") return "CANCELLED";
  return s;
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

function UiPopup({
  open,
  title,
  message,
  tone = "success",
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  tone?: "success" | "error" | "info";
  onClose: () => void;
}) {
  if (!open) return null;

  const toneCls =
    tone === "success"
      ? "border-[#e5ff78]/25 bg-[#e5ff78]/10"
      : tone === "error"
      ? "border-red-500/30 bg-red-500/10"
      : "border-white/10 bg-white/5";

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4">
      <div className={cn("w-full max-w-lg rounded-[28px] border p-5 text-white shadow-[0_30px_120px_rgba(0,0,0,0.75)]", toneCls)}>
        <div className="text-lg font-extrabold">{title}</div>
        <div className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{message}</div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

function PendingBadge({ from, to }: { from: Status; to: Status }) {
  // ✅ ออร่า + กระพริบช้าๆ
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

export default function MyWorkPage() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ✅ pending ต่อโปรเจกต์ (แสดงรออนุมัติจาก->ไป)
  const [pendingMap, setPendingMap] = useState<Record<string, PendingInfo>>({});

  // ✅ disable dropdown ตอนกำลังส่งคำขอ
  const [changingId, setChangingId] = useState<string | null>(null);

  // ✅ popup UI
  const [popup, setPopup] = useState<{ open: boolean; title: string; message: string; tone?: "success" | "error" | "info" }>({
    open: false,
    title: "",
    message: "",
    tone: "info",
  });

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

  function looksLikeApprovalMessage(msg?: string) {
    if (!msg) return false;
    // ✅ เผื่อ backend ส่ง message แนวนี้
    return /รอ|อนุมัติ|หัวหน้า|approval|approve/i.test(msg);
  }

  async function changeStatus(id: string, nextUi: Status) {
    // ป้องกันยิงซ้อน
    if (changingId) return;

    const current = items.find((x) => x.id === id);
    const fromUi = current?.status;
    if (!current || !fromUi) return;

    // ✅ ถ้ามี pending อยู่แล้ว อาจไม่ให้กดซ้ำ (กันสับสน)
    if (pendingMap[id]) {
      setPopup({
        open: true,
        tone: "info",
        title: "มีคำขอค้างอยู่",
        message: `โปรเจกต์นี้กำลังรออนุมัติอยู่แล้ว (${pendingMap[id].from} → ${pendingMap[id].to})`,
      });
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
        throw new Error((j && (j.error || j.message)) || "Update failed");
      }

      // ✅ ถ้า backend ส่ง status กลับมา = เปลี่ยนสำเร็จจริง
      const returnedStatus =
        j?.data?.status ?? j?.status ?? j?.project?.status ?? null;

      const msg: string =
        (j && (j.message || j.note || j.info)) ||
        "ส่งคำขอเปลี่ยนสถานะสำเร็จ";

      const needsApproval =
        j?.pending === true ||
        j?.requires_approval === true ||
        looksLikeApprovalMessage(msg);

      if (returnedStatus) {
        // ✅ Applied จริง
        const appliedUi = toUiStatus(returnedStatus);
        setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status: appliedUi } : x)));
        setPendingMap((m) => {
          const mm = { ...m };
          delete mm[id];
          return mm;
        });

        setPopup({
          open: true,
          tone: "success",
          title: "เปลี่ยนสถานะสำเร็จ",
          message: `อัปเดตสถานะเป็น ${appliedUi} แล้ว`,
        });
      } else if (needsApproval) {
        // ✅ เข้ากรณี: ส่งคำขอแล้ว รอหัวหน้าอนุมัติ
        setPendingMap((m) => ({
          ...m,
          [id]: { from: fromUi, to: nextUi, at: Date.now() },
        }));

        // ✅ ไม่เปลี่ยน status pill ทันที เพราะยังไม่อนุมัติ
        setPopup({
          open: true,
          tone: "success",
          title: "ส่งคำขอสำเร็จ",
          message: msg || `ส่งคำขอเปลี่ยนสถานะแล้ว รอหัวหน้าอนุมัติ`,
        });
      } else {
        // ✅ เผื่อ backend ไม่มี status กลับมา แต่จริงๆ applied
        setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status: nextUi } : x)));
        setPopup({
          open: true,
          tone: "success",
          title: "เปลี่ยนสถานะสำเร็จ",
          message: msg,
        });
      }
    } catch (e: any) {
      setPopup({
        open: true,
        tone: "error",
        title: "อัปเดตไม่สำเร็จ",
        message: e?.message || "Update failed",
      });
    } finally {
      setChangingId(null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ count ต่อสถานะ (UI)
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
      <UiPopup
        open={popup.open}
        title={popup.title}
        message={popup.message}
        tone={popup.tone}
        onClose={() => setPopup((p) => ({ ...p, open: false }))}
      />

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
          // ✅ ไม่ให้ dropdown จม: outer = overflow-visible
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
                          rowGlow
                            ? "bg-[#e5ff78]/[0.03] shadow-[inset_0_0_0_1px_rgba(229,255,120,0.12)]"
                            : ""
                        )}
                      >
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

                              {/* ✅ แสดง “รออนุมัติจากไหน->ไปไหน” + aura */}
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

                        <td className="px-6 py-5 text-center text-sm text-white/80">
                          {fmtDeadline(w.due_date)}
                        </td>

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