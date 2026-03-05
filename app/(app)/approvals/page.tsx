"use client";

import React, { useEffect, useMemo, useState } from "react";

type Dept = "VIDEO" | "GRAPHIC" | "ALL";
type ReqStatus = "PENDING" | "APPROVED" | "REJECTED";

type ProjectLite = {
  id: string;
  code?: string | null;
  title?: string | null;
  department?: Dept | null;
  assignee?: { id: string; display_name: string | null; department: Dept | null } | null;
};

type StatusRequest = {
  id: string;
  project_id: string;
  status: ReqStatus;
  from_status: string;
  to_status: string;
  created_at?: string | null; // ✅ ใช้ตัวนี้พอ (processed_at ไม่มี)
  note?: string | null;
  project?: ProjectLite | null;
};

async function safeJson(res: Response) {
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function DeptPill({ dept }: { dept: Dept }) {
  const cls =
    dept === "VIDEO"
      ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
      : dept === "GRAPHIC"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : "border-white/10 bg-white/5 text-white/70";
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-1 text-xs font-extrabold", cls)}>{dept}</span>;
}

function fmtTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const date = d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "2-digit" });
  const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} ${time}`;
}

export default function ApprovalsPage() {
  const [items, setItems] = useState<StatusRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const FILTERS = ["ALL", "VIDEO", "GRAPHIC", "HISTORY"] as const;
  const [tab, setTab] = useState<(typeof FILTERS)[number]>("ALL");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch("/api/approvals", { cache: "no-store" });
      const j = await safeJson(r);

      if (!r.ok) {
        setItems([]);
        setErr((j && (j.error || j.message)) || `Load failed (${r.status})`);
        return;
      }

      const arr = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
      setItems(arr as StatusRequest[]);
    } catch (e: any) {
      setItems([]);
      setErr(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  async function approve(id: string) {
    try {
      const r = await fetch(`/api/approvals/${encodeURIComponent(id)}/approve`, { method: "POST" });
      const j = await safeJson(r);
      if (!r.ok) throw new Error((j && (j.error || j.message)) || "Approve failed");
      await load();
    } catch (e: any) {
      alert(e?.message || "Approve failed");
    }
  }

  async function reject(id: string) {
    try {
      const r = await fetch(`/api/approvals/${encodeURIComponent(id)}/reject`, { method: "POST" });
      const j = await safeJson(r);
      if (!r.ok) throw new Error((j && (j.error || j.message)) || "Reject failed");
      await load();
    } catch (e: any) {
      alert(e?.message || "Reject failed");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = useMemo(() => items.filter((x) => x.status === "PENDING"), [items]);
  const history = useMemo(() => items.filter((x) => x.status !== "PENDING"), [items]);

  const filtered = useMemo(() => {
    if (tab === "HISTORY") return history;
    const base = pending;
    if (tab === "ALL") return base;
    return base.filter((x) => (x.project?.department ?? "ALL") === tab);
  }, [tab, pending, history]);

  const counts = useMemo(() => {
    const c = {
      ALL: pending.length,
      VIDEO: pending.filter((x) => (x.project?.department ?? "ALL") === "VIDEO").length,
      GRAPHIC: pending.filter((x) => (x.project?.department ?? "ALL") === "GRAPHIC").length,
      HISTORY: history.length,
    };
    return c;
  }, [pending, history]);

  return (
    <div className="w-full bg-black text-white">
      <div className="w-full px-6 py-8 lg:px-10 lg:py-10">
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

        <div className="mt-6 rounded-[30px] border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((k) => {
              const active = tab === k;
              const label =
                k === "ALL" ? `ALL (${counts.ALL})` : k === "HISTORY" ? `HISTORY (${counts.HISTORY})` : `${k} (${(counts as any)[k]})`;

              return (
                <button
                  key={k}
                  onClick={() => setTab(k)}
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
          <div className="mt-6 space-y-4">
            {filtered.length === 0 ? (
              <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 text-sm text-white/60">
                {tab === "HISTORY" ? "ยังไม่มีประวัติ" : "ไม่มีคำขอรออนุมัติ"}
              </div>
            ) : null}

            {filtered.map((it) => {
              const code = it.project?.code || "-";
              const title = it.project?.title || "-";
              const dept = (it.project?.department ?? "ALL") as Dept;
              const assigneeName = it.project?.assignee?.display_name || "-";

              return (
                <div
                  key={it.id}
                  className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-extrabold text-white/85">
                          {code}
                        </span>
                        <DeptPill dept={dept} />
                        <span className="text-xs text-white/50">ผู้รับผิดชอบ: {assigneeName}</span>
                      </div>

                      <div className="mt-2 truncate text-lg font-extrabold text-white">{title}</div>

                      <div className="mt-2 text-sm text-white/70">
                        ขอเปลี่ยนสถานะ: <span className="font-extrabold text-white">{it.from_status}</span> →{" "}
                        <span className="font-extrabold text-white">{it.to_status}</span>
                      </div>

                      {/* ✅ ใช้ created_at อย่างเดียว */}
                      <div className="mt-1 text-xs text-white/40">
                        {it.status === "PENDING" ? `ส่งคำขอเมื่อ ${fmtTime(it.created_at)}` : `ทำรายการเมื่อ ${fmtTime(it.created_at)}`}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-2">
                      {it.status === "PENDING" ? (
                        <>
                          <button
                            onClick={() => approve(it.id)}
                            className="rounded-2xl border border-green-500/30 bg-green-500/15 px-4 py-2 text-sm font-extrabold text-green-200 hover:bg-green-500/25"
                          >
                            อนุมัติ
                          </button>

                          <button
                            onClick={() => reject(it.id)}
                            className="rounded-2xl border border-red-500/30 bg-red-500/15 px-4 py-2 text-sm font-extrabold text-red-200 hover:bg-red-500/25"
                          >
                            ปฏิเสธ
                          </button>
                        </>
                      ) : (
                        <span className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm font-extrabold text-white/70">
                          {it.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}