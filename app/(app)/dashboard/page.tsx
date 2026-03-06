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
  pendingApprovals: number;
  myWorkDueSoonCount: number;
  dueSoonWindowDays: number;
};

type TeamNotice = {
  id: string;
  title: string;
  content?: string | null;
  notice_type?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  is_pinned?: boolean | null;
  is_active?: boolean | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function formatDateTimeTH(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const date = d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
  const time = d.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} ${time}`;
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
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
        "rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm",
        clickable ? "cursor-pointer hover:bg-white/[0.07]" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm text-white/60">{title}</div>
        {rightBadge ? <div>{rightBadge}</div> : null}
      </div>
      <div className="mt-2 text-3xl font-bold text-white">{value}</div>
      {hint ? <div className="mt-2 text-xs text-white/45">{hint}</div> : null}
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
      <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-white">{title}</div>
            {desc ? <div className="mt-1 text-xs text-white/60">{desc}</div> : null}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-white/70 hover:bg-white/10"
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
              className="rounded-xl bg-white px-3 py-2 text-xs text-black hover:opacity-90"
            >
              {actionLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NoticeTypePill({ type }: { type?: string | null }) {
  const t = type || "GENERAL";

  const cls =
    t === "URGENT"
      ? "border-red-500/30 bg-red-500/10 text-red-200"
      : t === "MEETING"
        ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
        : t === "LEAVE"
          ? "border-violet-500/30 bg-violet-500/10 text-violet-200"
          : t === "ISSUE"
            ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
            : "border-white/10 bg-white/5 text-white/70";

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold", cls)}>
      {t}
    </span>
  );
}

function TeamNoticeBoard({
  isLeader,
}: {
  isLeader: boolean;
}) {
  const [items, setItems] = useState<TeamNotice[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noticeType, setNoticeType] = useState("GENERAL");
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function loadNotices() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/team-notices", { cache: "no-store" });
      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error((json && (json.error || json.message)) || "Load notices failed");
      }

      const rows = Array.isArray(json?.data)
        ? (json.data as TeamNotice[])
        : Array.isArray(json)
          ? (json as TeamNotice[])
          : [];

      setItems(rows);
    } catch (e: any) {
      setError(e?.message || "Load notices failed");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function submitNotice() {
    if (!title.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/team-notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          notice_type: noticeType,
          is_pinned: isLeader ? isPinned : false,
        }),
      });

      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error((json && (json.error || json.message)) || "Create notice failed");
      }

      setTitle("");
      setContent("");
      setNoticeType("GENERAL");
      setIsPinned(false);

      await loadNotices();
    } catch (e: any) {
      setError(e?.message || "Create notice failed");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    loadNotices();
  }, []);

  return (
    <div className="space-y-4">
      {/* รายการประกาศไว้ด้านบน */}
      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/50">
            กำลังโหลดประกาศ...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/40">
            ยังไม่มีประกาศทีม
          </div>
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              className="rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <NoticeTypePill type={n.notice_type} />
                {n.is_pinned ? (
                  <span className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[11px] font-semibold text-violet-200">
                    PINNED
                  </span>
                ) : null}
                <span className="ml-auto text-xs text-white/40">
                  {formatDateTimeTH(n.created_at)}
                </span>
              </div>

              <div className="mt-3 font-semibold text-white">{n.title}</div>

              {n.content ? (
                <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/70">
                  {n.content}
                </div>
              ) : null}

              {n.attachment_url ? (
                <a
                  href={n.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
                >
                  เปิดไฟล์แนบ {n.attachment_name ? `: ${n.attachment_name}` : ""}
                </a>
              ) : null}
            </div>
          ))
        )}
      </div>

      {/* ฟอร์มสร้างไว้ด้านล่าง */}
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="grid gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="หัวข้อประกาศ"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78]"
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="รายละเอียดประกาศ"
            className="h-24 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78]"
          />

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {["GENERAL", "LEAVE", "MEETING", "ISSUE", "URGENT"].map((t) => {
                const active = noticeType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNoticeType(t)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                      active
                        ? "border-white/10 bg-white text-black"
                        : "border-white/10 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              {isLeader ? (
                <label className="flex items-center gap-2 text-xs text-white/70">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                  />
                  ปักหมุด
                </label>
              ) : null}

              <button
                type="button"
                onClick={submitNotice}
                disabled={submitting || !title.trim()}
                className="rounded-xl bg-[#e5ff78] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "กำลังส่ง..." : "ส่งประกาศ"}
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
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

  const approvalsRef = useRef<number>(0);
  const [pendingNow, setPendingNow] = useState<number>(0);

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

      const prev = approvalsRef.current;
      approvalsRef.current = nextCount;
      setPendingNow(nextCount);

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
  }, []);

  useEffect(() => {
    if (!isLeader) return;

    pollApprovals();

    const t = window.setInterval(() => {
      pollApprovals();
    }, 15000);

    return () => window.clearInterval(t);
  }, [isLeader]);

  return (
    <div className="p-10 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>

          {data?.me ? (
            <div className="mt-2 text-sm text-white/60">
              <b>{data.me.display_name || data.me.email || "ผู้ใช้งาน"}</b>{" "}
              <span className="text-white/30">·</span>{" "}
              <span>{data.me.role}</span>{" "}
              <span className="text-white/30">·</span>{" "}
              <span>{data.me.department}</span>
            </div>
          ) : (
            <div className="mt-2 text-sm text-white/60">-</div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadDashboard}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5 disabled:opacity-50"
            disabled={loading}
          >
            รีเฟรช
          </button>

          <button
            onClick={logout}
            className="rounded-xl bg-white px-4 py-2 text-sm text-black hover:opacity-90"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          กำลังโหลด...
        </div>
      )}

      {!loading && error && (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
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

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold">สถานะงานทั้งหมด</div>
                <div className="mt-1 text-sm text-white/60">สรุปจำนวนงานแยกตามสถานะ</div>
              </div>

              {isLeader ? (
                <button
                  onClick={() => router.push("/approvals")}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
                >
                  ไปหน้าอนุมัติ
                </button>
              ) : null}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
              {statusList.map(([key, label]) => (
                <div key={key} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm text-white/60">{label}</div>
                  <div className="mt-2 text-2xl font-bold text-white">{data.byStatus[key]}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            <button
              onClick={() => router.push("/projects")}
              className="rounded-xl bg-lime-300 px-4 py-2 text-sm font-medium text-black hover:opacity-90"
            >
              ไปหน้าโปรเจกต์ทั้งหมด
            </button>

            <button
              onClick={() => router.push("/my-work")}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
            >
              ไปหน้า My Work
            </button>

            {isLeader ? (
              <button
                onClick={() => router.push("/approvals")}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
              >
                ไปหน้า Approvals
              </button>
            ) : null}
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4">
              <div className="text-lg font-bold">ประกาศทีม</div>
              <div className="mt-1 text-sm text-white/60">
                ใช้สำหรับแจ้งลา ประชุม ปัญหา และงานด่วนของทีม
              </div>
            </div>

            <TeamNoticeBoard isLeader={!!isLeader} />
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