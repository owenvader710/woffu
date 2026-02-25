// app/dashboard/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Status = "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";

type DashboardData = {
  me: {
    id: string;
    display_name: string | null;
    role: "LEADER" | "MEMBER";
    department: "VIDEO" | "GRAPHIC" | "ALL";
    email: string | null;
  };
  totalProjects: number;
  byStatus: Record<Status, number>;
  pendingApprovals: number;
  myWorkDueSoonCount: number;
  dueSoonWindowDays: number;
};

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function StatCard({
  title,
  value,
  icon,
  onClick,
  highlight,
}: {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  highlight?: boolean;
}) {
  const clickable = typeof onClick === "function";
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-[26px] border p-5 text-left transition",
        "border-white/10 bg-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]",
        clickable ? "hover:bg-white/10" : "",
        highlight ? "bg-gradient-to-b from-white/10 to-white/[0.03]" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/30">
            <span className="text-[#e5ff78]">{icon ?? "•"}</span>
          </div>
          <div className="text-xs font-semibold tracking-widest text-white/50">{title}</div>
        </div>

        <div className="text-3xl font-extrabold tracking-tight text-white">{value}</div>
      </div>
    </button>
  );
}

function ActionBtn({
  label,
  sub,
  onClick,
  primary,
}: {
  label: string;
  sub?: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-2xl border px-4 py-3 text-left transition",
        primary
          ? "border-[#e5ff78]/20 bg-[#e5ff78] text-black hover:opacity-90"
          : "border-white/10 bg-white/5 text-white/85 hover:bg-white/10",
      ].join(" ")}
    >
      <div className="text-sm font-semibold">{label}</div>
      {sub ? <div className="mt-0.5 text-xs opacity-70">{sub}</div> : null}
    </button>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const approvalsRef = useRef<number>(0);
  const [pendingNow, setPendingNow] = useState<number>(0);

  const isLeader = data?.me?.role === "LEADER";

  const statusList = useMemo(
    () =>
      ([
        ["TODO", "งานใหม่ (TODO)"],
        ["IN_PROGRESS", "กำลังทำ (IN_PROGRESS)"],
        ["BLOCKED", "ติดปัญหา (BLOCKED)"],
        ["COMPLETED", "เสร็จแล้ว (COMPLETED)"],
      ] as const),
    []
  );

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      const json = await safeJson(res);

      if (!res.ok) {
        setData(null);
        setError((json && (json.error || json.message)) || `Load dashboard failed (${res.status})`);
        return;
      }

      setData(json);
      const initialPending = Number(json?.pendingApprovals || 0);
      approvalsRef.current = initialPending;
      setPendingNow(initialPending);
    } catch (e: any) {
      setData(null);
      setError(e?.message || "Load dashboard failed");
    } finally {
      setLoading(false);
    }
  }

  async function pollApprovals() {
    try {
      const res = await fetch("/api/approvals", { cache: "no-store" });
      const json = await safeJson(res);
      if (!res.ok) return;

      const arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
      const nextCount = Array.isArray(arr) ? arr.length : 0;

      approvalsRef.current = nextCount;
      setPendingNow(nextCount);
    } catch {}
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLeader) return;
    pollApprovals();
    const t = window.setInterval(pollApprovals, 15000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLeader]);

  return (
    <div className="min-h-screen w-full bg-black text-white">
    <div className="w-full px-6 py-8 lg:px-10 lg:py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-semibold tracking-widest text-white/50">WOFFU</div>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">Dashboard</h1>

            {data?.me ? (
              <div className="mt-2 text-sm text-white/60">
                <span className="font-semibold text-white">{data.me.display_name || data.me.email || "ผู้ใช้งาน"}</span>{" "}
                <span className="text-white/30">·</span> <span>{data.me.role}</span>{" "}
                <span className="text-white/30">·</span> <span>{data.me.department}</span>
              </div>
            ) : (
              <div className="mt-2 text-sm text-white/60">-</div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadDashboard}
              disabled={loading}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 disabled:opacity-50"
            >
              รีเฟรช
            </button>
          </div>
        </div>

        {loading && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">กำลังโหลด...</div>
        )}

        {!loading && error && (
          <div className="mt-6 rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">{error}</div>
        )}

        {!loading && !error && data && (
          <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
            {/* Left */}
            <div className="xl:col-span-8">
              {/* Top cards row */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatCard
                  title="โปรเจกต์ทั้งหมด"
                  value={data.totalProjects}
                  icon="▦"
                  onClick={() => router.push("/projects")}
                />
                <StatCard
                  title={`งานใกล้เดดไลน์ (${data.dueSoonWindowDays} วัน)`}
                  value={data.myWorkDueSoonCount}
                  icon="◷"
                  onClick={() => router.push("/my-work")}
                />
                <StatCard title="ความคืบหน้าวันนี้" value="0%" icon="◎" highlight />
              </div>

              {/* Status cards */}
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                {statusList.map(([key, label]) => (
                  <StatCard
                    key={key}
                    title={label}
                    value={data.byStatus[key]}
                    icon="●"
                    onClick={() => {
                      if (key === "COMPLETED") router.push("/completed");
                      else if (key === "BLOCKED") router.push("/blocked");
                      else router.push("/projects");
                    }}
                  />
                ))}
              </div>

              {/* Big panel */}
              <div className="mt-6 rounded-[36px] border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.03] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold tracking-widest text-white/50">PERFORMANCE</div>
                    <div className="mt-1 text-xl font-extrabold text-white">Performance Analytics Chart</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70">
                    Coming soon
                  </div>
                </div>

                <div className="mt-6 h-[260px] rounded-3xl border border-white/10 bg-black/40" />
              </div>
            </div>

            {/* Right */}
            <div className="space-y-6 xl:col-span-4">
              <div className="rounded-[36px] border border-white/10 bg-white/5 p-6">
                <div className="text-sm font-semibold tracking-widest text-white/50">QUICK ACTIONS</div>
                <div className="mt-4 space-y-3">
                  <ActionBtn label="อัปเดตงาน" sub="ไปหน้า Projects" onClick={() => router.push("/projects")} />
                  <ActionBtn label="ไปที่งานของฉัน" sub="My Work" onClick={() => router.push("/my-work")} />
                  {isLeader ? (
                    <ActionBtn label="สั่งงานใหม่" sub="Create Project" primary onClick={() => router.push("/projects")} />
                  ) : null}
                </div>
              </div>

              <div className="rounded-[36px] border border-white/10 bg-white/5 p-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold tracking-widest text-white/50">ACTIVITY LOGS</div>

                  {isLeader ? (
                    <button
                      onClick={() => router.push("/approvals")}
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
                    >
                      Approvals{" "}
                      <span className="ml-1 inline-flex rounded-full bg-[#e5ff78] px-2 py-0.5 text-[10px] font-extrabold text-black">
                        {pendingNow}
                      </span>
                    </button>
                  ) : null}
                </div>

                <div className="mt-6 rounded-3xl border border-white/10 bg-black/30 p-6 text-center text-sm text-white/45">
                  ยังไม่มีความเคลื่อนไหวล่าสุด
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}