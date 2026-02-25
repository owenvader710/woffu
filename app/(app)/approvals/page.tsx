"use client";

import React, { useEffect, useMemo, useState } from "react";
import { RefreshCw, Check, X } from "lucide-react";

type ApprovalRow = {
  id: string;
  project_id: string;
  from_status: string;
  to_status: string;
  request_status: string; // คอลัมน์จริงใน DB คือ request_status
  created_at: string;
  requested_by: string | null;
  note: string | null;
  project?: {
    id: string;
    title: string | null;
    brand?: string | null;
    department?: string | null;
  } | null;
  requester?: { id: string; display_name: string | null } | null;
};

async function safeJson(res: Response) {
  const t = await res.text();
  try {
    return t ? JSON.parse(t) : null;
  } catch {
    return { error: t };
  }
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "lime";
}) {
  const cls =
    tone === "lime"
      ? "border-[#e5ff78]/30 bg-[#e5ff78]/15 text-[#e5ff78]"
      : "border-white/10 bg-white/5 text-white/75";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-tight ${cls}`}>
      {children}
    </span>
  );
}

type Tab = "ALL" | "VIDEO" | "GRAPHIC";

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<Tab>("ALL");

  async function loadAll() {
    setLoading(true);
    setErr(""); // ล้าง Error เก่าเมื่อโหลดใหม่
    try {
      const res = await fetch("/api/approvals", { cache: "no-store" });
      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || "Failed to fetch");

      // ดึงข้อมูลจาก json.data.pending ตามโครงสร้าง API เดิม
      const pending = json?.data?.pending;
      setItems(Array.isArray(pending) ? pending : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const video = useMemo(
    () => items.filter((x) => String(x.project?.department || "").toUpperCase() === "VIDEO"),
    [items]
  );

  const graphic = useMemo(
    () => items.filter((x) => String(x.project?.department || "").toUpperCase() === "GRAPHIC"),
    [items]
  );

  const shown = tab === "ALL" ? items : tab === "VIDEO" ? video : graphic;

  async function act(item: ApprovalRow, action: "approve" | "reject") {
    // 🛡️ แก้ปัญหา "Request is not pending": เช็คสถานะก่อนส่ง (Case-insensitive)
    if (String(item.request_status).toUpperCase() !== "PENDING") {
      setErr(`คำขอนี้ถูกจัดการไปแล้ว (สถานะปัจจุบัน: ${item.request_status})`);
      return;
    }

    setErr(""); // ล้าง Error ก่อนเริ่มทำงาน
    try {
      const res = await fetch(`/api/approvals/${item.id}/${action}`, {
        method: "POST",
      });
      const json = await safeJson(res);
      
      if (!res.ok) {
        throw new Error(json?.error || "การจัดการคำขอล้มเหลว");
      }
      
      // เมื่อสำเร็จ ให้โหลดข้อมูลใหม่
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || "เกิดข้อผิดพลาดในการส่งข้อมูล");
    }
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "ALL", label: "ALL", count: items.length },
    { key: "VIDEO", label: "VIDEO", count: video.length },
    { key: "GRAPHIC", label: "GRAPHIC", count: graphic.length },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto w-full">

        <header className="flex justify-between items-end mb-10">
          <div>
            <p className="text-[10px] font-black tracking-[0.3em] text-white/30 uppercase">WOFFU</p>
            <h1 className="text-4xl font-black mt-1">
              Approvals <span className="text-sm font-normal text-white/20 ml-2">({items.length})</span>
            </h1>
          </div>
          <button onClick={loadAll} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </header>

        {err && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200 animate-in fade-in slide-in-from-top-1">
            {err}
          </div>
        )}

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl">
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={
                  tab === t.key
                    ? "rounded-full border border-white/20 bg-white px-4 py-2 text-[12px] font-black text-black whitespace-nowrap"
                    : "rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[12px] font-black text-white/80 hover:bg-white/10 whitespace-nowrap"
                }
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-[28px] border border-white/10">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-[11px] text-white/35 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4">โปรเจกต์</th>
                  <th className="px-5 py-4">ผู้ขอ</th>
                  <th className="px-5 py-4">การเปลี่ยนแปลง</th>
                  <th className="px-5 py-4">เวลาที่ขอ</th>
                  <th className="px-5 py-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-20 text-center text-white/40">
                      <div className="flex flex-col items-center gap-3">
                        <RefreshCw className="animate-spin text-white/20" size={32} />
                        <span className="text-xs font-bold tracking-widest">LOADING...</span>
                      </div>
                    </td>
                  </tr>
                ) : shown.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-20 text-center text-white/20 font-medium">
                      ไม่มีคำขอที่รอดำเนินการ
                    </td>
                  </tr>
                ) : (
                  shown.map((r) => (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-5 py-5">
                        <div className="font-extrabold text-white group-hover:text-[#e5ff78] transition-colors">
                          {r.project?.title || "Unknown Project"}
                        </div>
                        <div className="mt-1.5 flex gap-2">
                          {r.project?.department && <Badge>{r.project.department}</Badge>}
                          {r.project?.brand && <Badge>{r.project.brand}</Badge>}
                        </div>
                      </td>
                      <td className="px-5 py-5 text-sm font-medium text-white/70">
                        {r.requester?.display_name || r.requested_by || "-"}
                      </td>
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-2">
                          <Badge>{r.from_status}</Badge>
                          <span className="text-white/20">→</span>
                          <Badge tone="lime">{r.to_status}</Badge>
                        </div>
                      </td>
                      <td className="px-5 py-5 text-[11px] font-bold text-white/30">
                        {fmtDate(r.created_at)}
                      </td>
                      <td className="px-5 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => act(r, "approve")}
                            className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2 text-[12px] font-black text-green-400 hover:bg-green-500/20 active:scale-95 transition-all"
                          >
                            <Check size={14} /> APPROVE
                          </button>
                          <button
                            onClick={() => act(r, "reject")}
                            className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-[12px] font-black text-red-400 hover:bg-red-500/20 active:scale-95 transition-all"
                          >
                            <X size={14} /> REJECT
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="h-20" />
      </div>
    </div>
  );
}