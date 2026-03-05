"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Dept = "VIDEO" | "GRAPHIC" | "ALL";

type ApprovalItem = {
  id: string;
  project_id: string;
  requested_by: string;
  from_status: string;
  to_status: string;
  request_status: "PENDING" | "APPROVED" | "REJECTED" | string;
  created_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
  reason?: string | null;
  project?: {
    id: string;
    code?: string | null;
    title?: string | null;
    department?: Dept;
    status?: string;
    due_date?: string | null;
  };
};

async function safeJson(res: Response) {
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "2-digit" });
  const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} ${time}`;
}

export default function ApprovalsPage() {
  const [pending, setPending] = useState<ApprovalItem[]>([]);
  const [history, setHistory] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const TABS = ["ALL", "VIDEO", "GRAPHIC", "HISTORY"] as const;
  const [tab, setTab] = useState<(typeof TABS)[number]>("ALL");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/approvals", { cache: "no-store" });
      const j = await safeJson(res);
      if (!res.ok) {
        setPending([]);
        setHistory([]);
        setErr((j && (j.error || j.message)) || `Load failed (${res.status})`);
        return;
      }

      setPending(Array.isArray(j?.pending) ? j.pending : []);
      setHistory(Array.isArray(j?.history) ? j.history : []);
    } catch (e: any) {
      setPending([]);
      setHistory([]);
      setErr(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  async function approve(id: string) {
    const res = await fetch(`/api/approvals/${encodeURIComponent(id)}/approve`, { method: "POST" });
    const j = await safeJson(res);
    if (!res.ok) throw new Error((j && (j.error || j.message)) || "Approve failed");
  }

  async function reject(id: string) {
    const res = await fetch(`/api/approvals/${encodeURIComponent(id)}/reject`, { method: "POST" });
    const j = await safeJson(res);
    if (!res.ok) throw new Error((j && (j.error || j.message)) || "Reject failed");
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingFiltered = useMemo(() => {
    const arr = pending.slice();
    if (tab === "VIDEO") return arr.filter((x) => x?.project?.department === "VIDEO");
    if (tab === "GRAPHIC") return arr.filter((x) => x?.project?.department === "GRAPHIC");
    return arr;
  }, [pending, tab]);

  const counts = useMemo(() => {
    const c = { ALL: pending.length, VIDEO: 0, GRAPHIC: 0, HISTORY: history.length };
    for (const x of pending) {
      if (x?.project?.department === "VIDEO") c.VIDEO++;
      if (x?.project?.department === "GRAPHIC") c.GRAPHIC++;
    }
    return c;
  }, [pending, history.length]);

  return (
    <div className="w-full bg-black text-white">
      <div className="w-full px-6 py-8 lg:px-10 lg:py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold tracking-widest text-white/50">WOFFU</div>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Approvals</h1>
            <div className="mt-2 text-sm text-white/50">Pending: {pending.length}</div>
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 disabled:opacity-50"
          >
            รีเฟรช
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-6 rounded-[30px] border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((t) => {
              const active = tab === t;
              const label = t === "HISTORY" ? `HISTORY (${counts.HISTORY})` : `${t} (${(counts as any)[t] ?? 0})`;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
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
        ) : tab === "HISTORY" ? (
          <div className="mt-6 space-y-3">
            {history.length === 0 ? (
              <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 text-sm text-white/55">ยังไม่มีประวัติ</div>
            ) : (
              history.map((x) => (
                <div key={x.id} className="rounded-[30px] border border-white/10 bg-white/5 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-extrabold">
                        <Link href={`/projects/${x.project_id}`} className="hover:underline">
                          {(x?.project?.code ? `${x.project.code} ` : "") + (x?.project?.title || "-")}
                        </Link>
                      </div>
                      <div className="mt-1 text-xs text-white/55">
                        {x.from_status} → {x.to_status} · {String(x.request_status)} · {fmtDateTime(x.resolved_at || x.created_at)}
                      </div>
                    </div>

                    <div className="shrink-0 text-xs font-extrabold text-white/70">{String(x.request_status)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {pendingFiltered.length === 0 ? (
              <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 text-sm text-white/55">ไม่มีคำขอรออนุมัติ</div>
            ) : (
              pendingFiltered.map((x) => (
                <div key={x.id} className="rounded-[30px] border border-white/10 bg-white/5 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-base font-extrabold">
                        <Link href={`/projects/${x.project_id}`} className="hover:underline">
                          {(x?.project?.code ? `${x.project.code} ` : "") + (x?.project?.title || "-")}
                        </Link>
                      </div>
                      <div className="mt-1 text-xs text-white/55">
                        ขอเปลี่ยนสถานะ: <span className="font-bold text-white/80">{x.from_status}</span> →{" "}
                        <span className="font-bold text-white/80">{x.to_status}</span>
                        {x?.project?.department ? ` · ${x.project.department}` : ""}
                        {x?.project?.due_date ? ` · Deadline: ${fmtDateTime(x.project.due_date)}` : ""}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={async () => {
                          try {
                            await approve(x.id);
                            await load();
                          } catch (e: any) {
                            alert(e?.message || "Approve failed");
                          }
                        }}
                        className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-extrabold text-white hover:bg-white/15"
                      >
                        อนุมัติ
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await reject(x.id);
                            await load();
                          } catch (e: any) {
                            alert(e?.message || "Reject failed");
                          }
                        }}
                        className="rounded-2xl border border-white/10 bg-transparent px-4 py-2 text-xs font-extrabold text-white/80 hover:bg-white/10 hover:text-white"
                      >
                        ปฏิเสธ
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}