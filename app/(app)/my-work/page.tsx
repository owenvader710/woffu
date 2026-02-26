"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { useRealtimeMyWork } from "./useRealtimeMyWork";

type Status = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";
type StatusFilter = "ALL" | Status;

type WorkItem = {
  id: string;
  title: string;
  department: "VIDEO" | "GRAPHIC";
  status: Status;
  deadline?: string | null;
  created_at?: string;
  requester_name?: string | null;
  assignee_name?: string | null;
};

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatThaiDate(d?: string | null) {
  if (!d) return "-";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

/** ✅ Dropdown แบบ “ลอย” ไม่โดน overflow ตัด (ใช้ portal) */
function StatusDropdown({
  value,
  onChange,
  disabled,
}: {
  value: Status;
  onChange: (next: Status) => Promise<void> | void;
  disabled?: boolean;
}) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const items: Array<{ key: Status; label: string }> = [
    { key: "PENDING", label: "PENDING" },
    { key: "IN_PROGRESS", label: "IN_PROGRESS" },
    { key: "COMPLETED", label: "COMPLETED" },
    { key: "BLOCKED", label: "BLOCKED" },
  ];

  function calcPos() {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + 8,
      left: r.right, // anchor right
      width: r.width,
    });
  }

  useEffect(() => {
    if (!open) return;
    calcPos();

    const onScrollOrResize = () => calcPos();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const badgeCls =
    value === "IN_PROGRESS"
      ? "border-blue-500/30 bg-blue-500/15 text-blue-100"
      : value === "COMPLETED"
      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-100"
      : value === "BLOCKED"
      ? "border-red-500/30 bg-red-500/15 text-red-100"
      : "border-white/10 bg-white/5 text-white/80";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center justify-between gap-2 rounded-2xl border px-4 py-2 text-xs font-extrabold shadow-[0_20px_60px_rgba(0,0,0,0.35)]",
          badgeCls,
          disabled ? "opacity-60 pointer-events-none" : "hover:opacity-95"
        )}
      >
        <span>{value}</span>
        <ChevronDown size={14} className={cn(open ? "rotate-180 transition" : "transition")} />
      </button>

      {open && pos
        ? createPortal(
            <>
              {/* backdrop (คลิกนอกเพื่อปิด) */}
              <div
                className="fixed inset-0 z-[90]"
                onClick={() => setOpen(false)}
                aria-hidden="true"
              />

              {/* menu */}
              <div
                className="fixed z-[100] w-[260px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b] shadow-[0_30px_120px_rgba(0,0,0,0.75)]"
                style={{
                  top: pos.top,
                  left: pos.left,
                  transform: "translateX(-100%)",
                }}
              >
                <div className="px-4 py-3 text-xs font-semibold tracking-widest text-white/45">
                  Change status
                </div>

                <div className="border-t border-white/10" />

                <div className="py-2">
                  {items.map((it) => {
                    const active = it.key === value;
                    return (
                      <button
                        key={it.key}
                        type="button"
                        className={cn(
                          "w-full px-4 py-2.5 text-left text-sm",
                          active ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5"
                        )}
                        onClick={async () => {
                          setOpen(false);
                          await onChange(it.key);
                        }}
                      >
                        {it.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>,
            document.body
          )
        : null}
    </>
  );
}

export default function MyWorkPage() {
  const { items, loading, error, refresh } = useRealtimeMyWork() as {
    items: WorkItem[];
    loading: boolean;
    error: string | null;
    refresh: () => void;
  };

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      ALL: 0,
      PENDING: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      BLOCKED: 0,
    };
    for (const it of items || []) {
      c.ALL += 1;
      c[it.status] += 1;
    }
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const arr = items || [];
    if (statusFilter === "ALL") return arr;
    return arr.filter((x) => x.status === statusFilter);
  }, [items, statusFilter]);

  async function changeStatus(id: string, next: Status) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/my-work/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Update failed");
      }
      refresh();
    } catch (e: any) {
      alert(e?.message || "Update failed");
    } finally {
      setUpdatingId(null);
    }
  }

  const StatusTab = ({
    label,
    value,
  }: {
    label: string;
    value: StatusFilter;
  }) => {
    const active = statusFilter === value;
    return (
      <button
        type="button"
        onClick={() => setStatusFilter(value)}
        className={cn(
          "rounded-2xl border px-4 py-2 text-xs font-extrabold transition",
          active
            ? "border-white/10 bg-white text-black"
            : "border-white/10 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
        )}
      >
        {label} <span className={cn(active ? "text-black/70" : "text-white/40")}>({counts[value] || 0})</span>
      </button>
    );
  };

  return (
    <div className="w-full bg-black text-white">
      <div className="w-full px-6 py-8 lg:px-10 lg:py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold tracking-widest text-white/50">WOFFU</div>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">งานของฉัน</h1>
            <div className="mt-2 text-sm text-white/50">รายการทั้งหมด: {filtered.length}</div>
          </div>

          <button
            onClick={refresh}
            disabled={loading}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 disabled:opacity-50"
          >
            รีเฟรช
          </button>
        </div>

        {/* ✅ Status filter แบบเดียวกับหน้า Projects */}
        <div className="mt-6 rounded-[30px] border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusTab label="ALL" value="ALL" />
            <StatusTab label="PENDING" value="PENDING" />
            <StatusTab label="IN_PROGRESS" value="IN_PROGRESS" />
            <StatusTab label="COMPLETED" value="COMPLETED" />
            <StatusTab label="BLOCKED" value="BLOCKED" />
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-[30px] border border-white/10 bg-white/5 p-5 text-sm text-white/60">
            กำลังโหลด...
          </div>
        ) : error ? (
          <div className="mt-6 rounded-[30px] border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
            {error}
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-[28px] border border-white/10 bg-white/5">
            <table className="min-w-[980px] w-full text-sm">
              <thead className="text-white/60">
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-left font-semibold">งาน</th>
                  <th className="px-6 py-4 text-left font-semibold">ฝ่าย</th>
                  <th className="px-6 py-4 text-left font-semibold">สถานะ</th>
                  <th className="px-6 py-4 text-left font-semibold">Deadline</th>
                  <th className="px-6 py-4 text-right font-semibold">จัดการ</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-white/50" colSpan={5}>
                      ไม่พบรายการ
                    </td>
                  </tr>
                ) : (
                  filtered.map((it) => (
                    <tr key={it.id} className="border-b border-white/5 last:border-b-0">
                      <td className="px-6 py-5">
                        <Link
                          href={`/projects/${it.id}`}
                          className="font-extrabold text-white hover:underline"
                        >
                          {it.title}
                        </Link>
                        <div className="mt-1 text-xs text-white/35">
                          {it.requester_name ? `ผู้ขอ: ${it.requester_name}` : null}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold",
                            it.department === "VIDEO"
                              ? "border-blue-500/30 bg-blue-500/10 text-blue-100"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-100"
                          )}
                        >
                          {it.department}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-extrabold text-white/85">
                          {it.status}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-white/85">
                        {formatThaiDate(it.deadline || null)}
                      </td>

                      <td className="px-6 py-5 text-right">
                        {/* ✅ Dropdown แบบรูปที่ 3 */}
                        <StatusDropdown
                          value={it.status}
                          disabled={updatingId === it.id}
                          onChange={(next) => changeStatus(it.id, next)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}