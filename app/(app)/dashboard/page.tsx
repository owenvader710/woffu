"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

async function safeJson(res: Response) {
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [me, setMe] = useState<any>(null);
  const [stats, setStats] = useState<any>({
    myWorkCount: 0,
    myProjectCount: 0,
    approvalsCount: 0,
  });

  // ✅ badge บน Quick Actions
  const approvalsRef = useRef<number>(0);
  const [pendingNow, setPendingNow] = useState<number>(0);

  // ✅ รายการ pending ไว้โชว์ทางลัดอนุมัติ/ปฏิเสธ
  const [pendingItems, setPendingItems] = useState<any[]>([]);

  const isLeader = String(me?.role || "").toUpperCase() === "LEADER";

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch("/api/dashboard", { cache: "no-store" });
      const j = await safeJson(r);
      if (!r.ok) {
        setErr((j && (j.error || j.message)) || `Load failed (${r.status})`);
        return;
      }
      setMe(j?.me || null);
      setStats(j?.stats || stats);

      // ให้ badge เริ่มต้นตรงกับ server (กันกะพริบ)
      const initial = Number(j?.stats?.approvalsCount || 0);
      approvalsRef.current = initial;
      setPendingNow(initial);
    } catch (e: any) {
      setErr(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  // ✅ poll “pending approvals” ให้หัวหน้า (อ่านให้ถูก: { pending, history })
  async function pollApprovals() {
    try {
      const res = await fetch("/api/approvals", { cache: "no-store" });
      const json = await safeJson(res);
      if (!res.ok) return;

      const pendingOnly = Array.isArray(json?.pending) ? json.pending : [];
      setPendingItems(pendingOnly);

      const nextCount = pendingOnly.length;

      if (approvalsRef.current !== nextCount) {
        approvalsRef.current = nextCount;
        setPendingNow(nextCount);
      }
    } catch {}
  }

  async function approveReq(id: string) {
    const res = await fetch(`/api/approvals/${encodeURIComponent(id)}/approve`, { method: "POST" });
    const j = await safeJson(res);
    if (!res.ok) throw new Error((j && (j.error || j.message)) || "Approve failed");
  }

  async function rejectReq(id: string) {
    const res = await fetch(`/api/approvals/${encodeURIComponent(id)}/reject`, { method: "POST" });
    const j = await safeJson(res);
    if (!res.ok) throw new Error((j && (j.error || j.message)) || "Reject failed");
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLeader) return;

    pollApprovals();
    const t = setInterval(() => pollApprovals(), 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLeader]);

  return (
    <div className="w-full bg-black text-white">
      <div className="w-full px-6 py-8 lg:px-10 lg:py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold tracking-widest text-white/50">WOFFU</div>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Dashboard</h1>
            <div className="mt-2 text-sm text-white/50">
              {me?.name ? `สวัสดี, ${me.name}` : "สวัสดี"}
            </div>
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 disabled:opacity-50"
          >
            รีเฟรช
          </button>
        </div>

        {loading ? (
          <div className="mt-6 rounded-[30px] border border-white/10 bg-white/5 p-5 text-sm text-white/60">
            กำลังโหลด...
          </div>
        ) : err ? (
          <div className="mt-6 rounded-[30px] border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
            {err}
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* QUICK ACTIONS */}
            <div className="rounded-[30px] border border-white/10 bg-white/5 p-6">
              <div className="text-xs font-semibold tracking-widest text-white/50">QUICK ACTIONS</div>

              <div className="mt-4 space-y-3">
                <Link
                  href="/projects"
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-4 hover:bg-white/[0.04]"
                >
                  <div>
                    <div className="text-sm font-extrabold">อัปเดตงาน</div>
                    <div className="text-xs text-white/50">ไปหน้า Projects</div>
                  </div>
                  <div className="text-white/40">›</div>
                </Link>

                <Link
                  href="/my-work"
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-4 hover:bg-white/[0.04]"
                >
                  <div>
                    <div className="text-sm font-extrabold">ไปที่งานของฉัน</div>
                    <div className="text-xs text-white/50">My Work</div>
                  </div>
                  <div className="text-white/40">›</div>
                </Link>

                {isLeader ? (
                  <Link
                    href="/approvals"
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-4 hover:bg-white/[0.04]"
                  >
                    <div>
                      <div className="text-sm font-extrabold">ไปหน้า Approvals</div>
                      <div className="text-xs text-white/50">รออนุมัติ</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold",
                          pendingNow > 0 ? "bg-[#D7FF2F]/90 text-black" : "bg-white/10 text-white/70"
                        )}
                      >
                        {pendingNow}
                      </span>
                      <div className="text-white/40">›</div>
                    </div>
                  </Link>
                ) : null}

                <Link
                  href="/create"
                  className="flex items-center justify-between rounded-2xl bg-[#D7FF2F] p-4 text-black hover:opacity-95"
                >
                  <div>
                    <div className="text-sm font-extrabold">สั่งงานใหม่</div>
                    <div className="text-xs opacity-80">Create Project</div>
                  </div>
                  <div className="opacity-70">›</div>
                </Link>
              </div>
            </div>

            {/* ACTIVITY LOGS (ใส่ทางลัดอนุมัติ/ปฏิเสธให้หัวหน้า) */}
            <div className="rounded-[30px] border border-white/10 bg-white/5 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-xs font-semibold tracking-widest text-white/50">ACTIVITY LOGS</div>

                {isLeader ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5">
                    <div className="text-xs font-semibold text-white/70">Approvals</div>
                    <span
                      className={cn(
                        "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-2 text-xs font-extrabold",
                        pendingNow > 0 ? "bg-[#D7FF2F]/90 text-black" : "bg-white/10 text-white/70"
                      )}
                    >
                      {pendingNow}
                    </span>
                  </div>
                ) : null}
              </div>

              {isLeader && pendingItems.length > 0 ? (
                <div className="space-y-3">
                  {pendingItems.slice(0, 3).map((x: any) => (
                    <div key={x.id} className="rounded-3xl border border-white/10 bg-black/30 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold text-white">
                            {(x?.project?.code ? `${x.project.code} ` : "") + (x?.project?.title || "-")}
                          </div>
                          <div className="mt-1 text-xs text-white/55">
                            ขอเปลี่ยนสถานะ: <span className="font-bold text-white/80">{x.from_status}</span> →{" "}
                            <span className="font-bold text-white/80">{x.to_status}</span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await approveReq(x.id);
                                await pollApprovals();
                              } catch (e: any) {
                                alert(e?.message || "Approve failed");
                              }
                            }}
                            className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-extrabold text-white hover:bg-white/15"
                          >
                            อนุมัติ
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await rejectReq(x.id);
                                await pollApprovals();
                              } catch (e: any) {
                                alert(e?.message || "Reject failed");
                              }
                            }}
                            className="rounded-2xl border border-white/10 bg-transparent px-3 py-2 text-xs font-extrabold text-white/80 hover:bg-white/10 hover:text-white"
                          >
                            ปฏิเสธ
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Link href="/approvals" className="inline-flex text-xs font-semibold text-white/70 hover:text-white">
                    ไปหน้า Approvals →
                  </Link>
                </div>
              ) : (
                <div className="rounded-3xl border border-white/10 bg-black/30 p-6 text-center text-sm text-white/45">
                  ยังไม่มีความเคลื่อนไหวล่าสุด
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}