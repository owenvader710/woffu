"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, RefreshCw, X } from "lucide-react";

type ApprovalRow = {
  id: string;
  project_id: string;
  from_status: string;
  to_status: string;
  note?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  created_at: string;
  requested_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  project?: { id: string; title: string | null; brand?: string | null; type?: string | null } | null;
  requester?: { id: string; display_name: string | null } | null;
};

async function safeJson(res: Response) {
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "lime" | "green" | "red" | "amber";
}) {
  const cls =
    tone === "lime"
      ? "border-[#e5ff78]/30 bg-[#e5ff78]/15 text-[#e5ff78]"
      : tone === "green"
      ? "border-green-500/30 bg-green-500/10 text-green-200"
      : tone === "red"
      ? "border-red-500/30 bg-red-500/10 text-red-200"
      : tone === "amber"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : "border-white/10 bg-white/5 text-white/75";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-tight ${cls}`}>
      {children}
    </span>
  );
}

function fmtDate(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusTone(status: string) {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING") return "amber" as const;
  if (s === "APPROVED") return "green" as const;
  if (s === "REJECTED") return "red" as const;
  return "neutral" as const;
}

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [actingId, setActingId] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/approvals", { cache: "no-store" });
      const json = await safeJson(res);
      if (!res.ok) throw new Error((json && (json.error || json.message)) || `Load failed (${res.status})`);
      const list = Array.isArray(json?.data) ? (json.data as ApprovalRow[]) : Array.isArray(json) ? (json as ApprovalRow[]) : [];
      setItems(list);
    } catch (e: any) {
      setErr(e?.message || "Load approvals failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filtered = useMemo(() => {
    if (tab === "ALL") return items;
    return items.filter((x) => String(x.status).toUpperCase() === tab);
  }, [items, tab]);

  const counts = useMemo(() => {
    const c = { ALL: items.length, PENDING: 0, APPROVED: 0, REJECTED: 0 };
    for (const it of items) {
      const s = String(it.status).toUpperCase();
      if (s === "PENDING") c.PENDING++;
      else if (s === "APPROVED") c.APPROVED++;
      else if (s === "REJECTED") c.REJECTED++;
    }
    return c;
  }, [items]);

  async function act(id: string, action: "approve" | "reject") {
    if (!id) return;
    setActingId(id);
    setErr("");
    try {
      const res = await fetch(`/api/approvals/${id}/${action}`, { method: "POST" });
      const json = await safeJson(res);
      if (!res.ok) throw new Error((json && (json.error || json.message)) || `${action} failed (${res.status})`);
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || "Action failed");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white px-8 py-10">
      <div className="w-full">
        <header className="mb-10 flex items-end justify-between">
          <div>
            <div className="text-[10px] font-black tracking-[0.3em] text-white/30 uppercase">WOFFU</div>
            <div className="mt-1 text-4xl font-black tracking-tight">
              Approvals <span className="ml-2 text-sm font-normal text-white/20">({counts.ALL})</span>
            </div>
            <div className="mt-1 text-sm text-white/35">คำขอเปลี่ยนสถานะงาน (สำหรับหัวหน้า)</div>
          </div>

          <button
            onClick={loadAll}
            className="rounded-2xl border border-white/10 bg-white/5 p-3 transition-all active:scale-95 hover:bg-white/10"
            title="รีเฟรช"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </header>

        {err ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{err}</div>
        ) : null}

        <div className="mb-6 rounded-[28px] border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <TabPill active={tab === "PENDING"} onClick={() => setTab("PENDING")}>
              PENDING ({counts.PENDING})
            </TabPill>
            <TabPill active={tab === "APPROVED"} onClick={() => setTab("APPROVED")}>
              APPROVED ({counts.APPROVED})
            </TabPill>
            <TabPill active={tab === "REJECTED"} onClick={() => setTab("REJECTED")}>
              REJECTED ({counts.REJECTED})
            </TabPill>
            <TabPill active={tab === "ALL"} onClick={() => setTab("ALL")}>
              ทั้งหมด ({counts.ALL})
            </TabPill>
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0f0f0f]">
          <div className="grid grid-cols-12 gap-4 border-b border-white/10 px-6 py-4 text-[11px] font-bold tracking-widest text-white/45">
            <div className="col-span-5">โปรเจกต์</div>
            <div className="col-span-2">ผู้ขอ</div>
            <div className="col-span-2">เปลี่ยนจาก → เป็น</div>
            <div className="col-span-2">เวลาที่ขอ</div>
            <div className="col-span-1 text-right">จัดการ</div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-white/40 animate-pulse">กำลังโหลด...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-white/35">ยังไม่มีคำขอ</div>
          ) : (
            <div>
              {filtered.map((r) => {
                const projTitle = r.project?.title || r.project_id;
                const requester = r.requester?.display_name || r.requested_by || "-";
                const s = String(r.status).toUpperCase();
                return (
                  <div key={r.id} className="grid grid-cols-12 gap-4 border-b border-white/5 px-6 py-5 last:border-b-0">
                    <div className="col-span-5 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-extrabold text-white">{projTitle}</div>
                        {r.project?.brand ? <Badge tone="neutral">{String(r.project.brand).toUpperCase()}</Badge> : null}
                        {r.project?.type ? <Badge tone="neutral">{String(r.project.type).toUpperCase()}</Badge> : null}
                      </div>
                      {r.note ? <div className="mt-2 line-clamp-2 text-xs text-white/35">{r.note}</div> : null}
                      <div className="mt-2 text-[10px] text-white/25">#{r.id}</div>
                    </div>

                    <div className="col-span-2">
                      <div className="text-sm font-bold text-white/85 truncate">{requester}</div>
                      <div className="mt-2">
                        <Badge tone={statusTone(s)}>{s}</Badge>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <div className="flex flex-col gap-2">
                        <Badge tone="neutral">{String(r.from_status).toUpperCase()}</Badge>
                        <div className="text-[10px] text-white/25">→</div>
                        <Badge tone="lime">{String(r.to_status).toUpperCase()}</Badge>
                      </div>
                    </div>

                    <div className="col-span-2 text-sm text-white/70">{fmtDate(r.created_at)}</div>

                    <div className="col-span-1 flex items-center justify-end gap-2">
                      {s === "PENDING" ? (
  <>
    <button
      onClick={() => act(r.id, "approve")}
      disabled={actingId === r.id}
      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e5ff78]/20 bg-[#e5ff78] text-black hover:opacity-90 disabled:opacity-50"
    >
      <Check size={18} />
    </button>

    <button
      onClick={() => act(r.id, "reject")}
      disabled={actingId === r.id}
      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-red-200 hover:bg-red-500/15 disabled:opacity-50"
    >
      <X size={18} />
    </button>
  </>
) : (
  <div className="text-[10px] text-white/25">—</div>
)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-2xl border border-white/15 bg-white px-4 py-2 text-xs font-extrabold text-black"
          : "rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-xs font-extrabold text-white/80 hover:bg-white/10"
      }
    >
      {children}
    </button>
  );
}