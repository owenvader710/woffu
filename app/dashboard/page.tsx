// app/dashboard/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client";

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
  pendingApprovals: number; // leader only
  myWorkDueSoonCount: number;
  dueSoonWindowDays: number;
};

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function Card({
  title,
  value,
  hint,
  onClick,
  rightBadge,
}: {
  title: string;
  value: React.ReactNode;
  hint?: string;
  onClick?: () => void;
  rightBadge?: React.ReactNode;
}) {
  const clickable = typeof onClick === "function";
  return (
    <div
      onClick={onClick}
      className={[
        "rounded-3xl border p-5 shadow-sm",
        clickable ? "cursor-pointer hover:bg-gray-50" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm text-gray-600">{title}</div>
        {rightBadge ? <div>{rightBadge}</div> : null}
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      {hint ? <div className="mt-2 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}

function Toast({
  open,
  title,
  desc,
  onClose,
  actionLabel,
  onAction,
}: {
  open: boolean;
  title: string;
  desc?: string;
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] w-[360px] max-w-[calc(100vw-40px)]">
      <div className="rounded-2xl border bg-white p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold">{title}</div>
            {desc ? <div className="mt-1 text-xs text-gray-600">{desc}</div> : null}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm hover:bg-gray-100"
            title="ปิด"
          >
            ✕
          </button>
        </div>

        {actionLabel && onAction ? (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                onAction();
                onClose();
              }}
              className="rounded-xl bg-black px-3 py-2 text-xs text-white hover:opacity-90"
            >
              {actionLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // ✅ approvals polling state
  const approvalsRef = useRef<number>(0);
  const [pendingNow, setPendingNow] = useState<number>(0);

  // ✅ toast
  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState("");
  const [toastDesc, setToastDesc] = useState("");

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

  function showToast(title: string, desc?: string) {
    setToastTitle(title);
    setToastDesc(desc || "");
    setToastOpen(true);

    // auto close
    window.setTimeout(() => {
      setToastOpen(false);
    }, 4500);
  }

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

      // ตั้งค่า pending approvals จาก dashboard (leader only)
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
    // ใช้ /api/approvals เพราะเราทำให้ไม่พัง embed แล้ว และ leader-only
    try {
      const res = await fetch("/api/approvals", { cache: "no-store" });
      const json = await safeJson(res);

      if (!res.ok) return;

      const arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
      const nextCount = Array.isArray(arr) ? arr.length : 0;

      const prev = approvalsRef.current;
      approvalsRef.current = nextCount;
      setPendingNow(nextCount);

      // ถ้าเพิ่มขึ้น -> toast
      if (nextCount > prev) {
        const diff = nextCount - prev;
        showToast(
          "มีคำขอรออนุมัติใหม่",
          diff === 1 ? "มีคำขอใหม่ 1 รายการ" : `มีคำขอใหม่ ${diff} รายการ`
        );
      }
    } catch {
      // ignore
    }
  }

  async function logout() {
    try {
      await supabaseBrowser.auth.signOut();
    } catch {
      // ignore
    }
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ เริ่ม polling approvals เฉพาะหัวหน้า
  useEffect(() => {
    if (!isLeader) return;

    // poll ทันที 1 ครั้ง
    pollApprovals();

    const t = window.setInterval(() => {
      pollApprovals();
    }, 15000); // 15 วิ

    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLeader]);

  return (
    <div className="p-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>

          {data?.me ? (
            <div className="mt-2 text-sm text-gray-600">
              <b>{data.me.display_name || data.me.email || "ผู้ใช้งาน"}</b>{" "}
              <span className="text-gray-400">·</span>{" "}
              <span>{data.me.role}</span>{" "}
              <span className="text-gray-400">·</span>{" "}
              <span>{data.me.department}</span>
            </div>
          ) : (
            <div className="mt-2 text-sm text-gray-600">-</div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadDashboard}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={loading}
          >
            รีเฟรช
          </button>

          <button
            onClick={logout}
            className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-6 rounded-xl border p-4 text-sm text-gray-600">กำลังโหลด...</div>
      )}

      {!loading && error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card
              title="โปรเจกต์ทั้งหมด"
              value={data.totalProjects}
              hint="รวมทุกงานในระบบ"
              onClick={() => router.push("/projects")}
            />

            <Card
              title={`งานใกล้เดดไลน์ (${data.dueSoonWindowDays} วัน)`}
              value={data.myWorkDueSoonCount}
              hint="เฉพาะงานที่คุณรับผิดชอบ"
              onClick={() => router.push("/my-work")}
            />

            <Card
              title="รออนุมัติ (Approvals)"
              value={isLeader ? pendingNow : "-"}
              hint={isLeader ? "เฉพาะหัวหน้า (อัปเดตอัตโนมัติ)" : "คุณไม่ใช่หัวหน้า"}
              onClick={() => {
                if (isLeader) router.push("/approvals");
              }}
              rightBadge={
                isLeader && pendingNow > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                    {pendingNow}
                  </span>
                ) : null
              }
            />

            <Card
              title="ไปหน้ารวมงาน"
              value="Projects"
              hint="ดูงานทั้งหมด + สั่งงานใหม่"
              onClick={() => router.push("/projects")}
            />
          </div>

          <div className="mt-8 rounded-3xl border p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold">สถานะงานทั้งหมด</div>
                <div className="mt-1 text-sm text-gray-600">สรุปจำนวนงานแยกตามสถานะ</div>
              </div>

              {isLeader ? (
                <button
                  onClick={() => router.push("/approvals")}
                  className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
                >
                  ไปหน้าอนุมัติ
                </button>
              ) : null}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
              {statusList.map(([key, label]) => (
                <div key={key} className="rounded-2xl border p-4">
                  <div className="text-sm text-gray-600">{label}</div>
                  <div className="mt-2 text-2xl font-bold">{data.byStatus[key]}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            <button
              onClick={() => router.push("/projects")}
              className="rounded-xl bg-lime-300 px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              ไปหน้าโปรเจกต์ทั้งหมด
            </button>

            <button
              onClick={() => router.push("/my-work")}
              className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
            >
              ไปหน้า My Work
            </button>

            {isLeader ? (
              <button
                onClick={() => router.push("/approvals")}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
              >
                ไปหน้า Approvals
              </button>
            ) : null}
          </div>
        </>
      )}

      <Toast
        open={toastOpen}
        title={toastTitle}
        desc={toastDesc}
        onClose={() => setToastOpen(false)}
        actionLabel={isLeader ? "ไปหน้า Approvals" : undefined}
        onAction={
          isLeader
            ? () => {
                router.push("/approvals");
              }
            : undefined
        }
      />
    </div>
  );
}
