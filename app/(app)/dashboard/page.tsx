"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type MeProfile = {
  id: string;
  display_name?: string | null;
  role?: "LEADER" | "MEMBER" | "ADMIN" | string | null;
  department?: "VIDEO" | "GRAPHIC" | "ALL" | string | null;
  is_active?: boolean | null;
};

type Project = {
  id: string;
  title: string;
  code?: string | null;
  type?: "VIDEO" | "GRAPHIC" | string | null;
  department?: "VIDEO" | "GRAPHIC" | "ALL" | string | null;
  status?: "PRE_ORDER" | "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED" | string | null;
  created_at?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  brand?: string | null;
  video_priority?: string | null;
  video_purpose?: string | null;
  graphic_job_type?: string | null;
  assignee_id?: string | null;
};

type Member = {
  id: string;
  display_name?: string | null;
  department?: "VIDEO" | "GRAPHIC" | "ALL" | string | null;
  role?: "LEADER" | "MEMBER" | "ADMIN" | string | null;
  is_active?: boolean;
};

type ApprovalItem = {
  id: string;
  project_id: string;
  request_status: "PENDING" | "APPROVED" | "REJECTED";
  created_at?: string | null;
  project?: {
    id?: string;
    title?: string | null;
    code?: string | null;
    department?: "VIDEO" | "GRAPHIC" | "ALL" | string | null;
  } | null;
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

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatDateTH(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
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

function getProjectCode(p: Project | ApprovalItem["project"]) {
  return p?.code ?? null;
}

function secondLine(p: Project) {
  const parts = [
    p.brand ? String(p.brand).toUpperCase() : null,
    p.video_purpose ? String(p.video_purpose) : null,
    p.graphic_job_type ? String(p.graphic_job_type) : null,
    p.video_priority ? `PRIORITY: ${String(p.video_priority)}` : null,
  ].filter(Boolean) as string[];

  return parts.length ? parts.join(" · ") : "";
}

function statusTone(status?: string | null) {
  if (status === "PRE_ORDER") return "violet";
  if (status === "TODO") return "neutral";
  if (status === "IN_PROGRESS") return "blue";
  if (status === "BLOCKED") return "red";
  if (status === "COMPLETED") return "green";
  return "neutral";
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "amber" | "red" | "blue" | "violet";
}) {
  const cls =
    tone === "green"
      ? "border-green-500/30 bg-green-500/10 text-green-200"
      : tone === "amber"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
        : tone === "red"
          ? "border-red-500/30 bg-red-500/10 text-red-200"
          : tone === "blue"
            ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
            : tone === "violet"
              ? "border-violet-500/30 bg-violet-500/10 text-violet-200"
              : "border-white/10 bg-white/5 text-white/70";

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold", cls)}>
      {children}
    </span>
  );
}

function CodeBadge({ code }: { code?: string | null }) {
  if (!code) return null;
  return (
    <span className="inline-flex items-center rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[11px] font-semibold text-white/80">
      {code}
    </span>
  );
}

function DashboardCard({
  title,
  desc,
  children,
  onClick,
  className,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <section
      onClick={onClick}
      className={cn(
        "rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]",
        onClick && "cursor-pointer transition hover:bg-white/[0.07] hover:border-white/15",
        className
      )}
    >
      <div className="mb-4">
        <div className="text-xl font-extrabold tracking-tight text-white">{title}</div>
        {desc ? <div className="mt-1 text-sm leading-6 text-white/45">{desc}</div> : null}
      </div>
      {children}
    </section>
  );
}

function SummaryStat({
  label,
  value,
  hint,
  onClick,
}: {
  label: string;
  value: number;
  hint?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[116px] rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-left transition hover:bg-white/10"
    >
      <div className="text-[11px] font-semibold tracking-widest text-white/45">{label}</div>
      <div className="mt-3 text-3xl font-extrabold leading-none text-white">{value}</div>
      <div className="mt-3 text-xs leading-5 text-white/45">{hint || "-"}</div>
    </button>
  );
}

function ProjectMiniList({
  items,
  emptyText,
}: {
  items: Project[];
  emptyText: string;
}) {
  if (items.length === 0) {
    return <div className="text-sm text-white/40">{emptyText}</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((p) => (
        <Link
          key={p.id}
          href={`/projects/${p.id}`}
          className="block rounded-2xl border border-white/10 bg-black/20 px-4 py-3 transition hover:bg-white/10"
        >
          <div className="flex items-center gap-2">
            <CodeBadge code={getProjectCode(p)} />
            <div className="truncate font-semibold text-white">{p.title || "-"}</div>
          </div>

          {secondLine(p) ? (
            <div className="mt-1 truncate text-xs text-white/45">{secondLine(p)}</div>
          ) : null}

          <div className="mt-2 flex items-center gap-2">
            <Pill tone={p.type === "VIDEO" ? "blue" : "amber"}>{p.type || "-"}</Pill>
            <Pill tone={statusTone(p.status)}>{p.status || "-"}</Pill>
            <span className="ml-auto text-xs text-white/40">{formatDateTH(p.start_date || p.created_at)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ApprovalMiniList({
  items,
  emptyText,
}: {
  items: ApprovalItem[];
  emptyText: string;
}) {
  if (items.length === 0) {
    return <div className="text-sm text-white/40">{emptyText}</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Link
          key={item.id}
          href="/approvals"
          className="block rounded-2xl border border-white/10 bg-black/20 px-4 py-3 transition hover:bg-white/10"
        >
          <div className="flex items-center gap-2">
            <CodeBadge code={getProjectCode(item.project)} />
            <div className="truncate font-semibold text-white">{item.project?.title || "-"}</div>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <Pill
              tone={
                item.project?.department === "VIDEO"
                  ? "blue"
                  : item.project?.department === "GRAPHIC"
                    ? "amber"
                    : "neutral"
              }
            >
              {item.project?.department || "-"}
            </Pill>
            <Pill tone="violet">PENDING</Pill>
            <span className="ml-auto text-xs text-white/40">{formatDateTimeTH(item.created_at)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function StatusDonut({
  total,
  counts,
}: {
  total: number;
  counts: {
    preOrder: number;
    todo: number;
    inProgress: number;
    blocked: number;
    completed: number;
  };
}) {
  const safeTotal = Math.max(
    total,
    counts.preOrder + counts.todo + counts.inProgress + counts.blocked + counts.completed,
    1
  );

  const pre = (counts.preOrder / safeTotal) * 100;
  const todo = (counts.todo / safeTotal) * 100;
  const progress = (counts.inProgress / safeTotal) * 100;
  const blocked = (counts.blocked / safeTotal) * 100;

  const s1 = pre;
  const s2 = s1 + todo;
  const s3 = s2 + progress;
  const s4 = s3 + blocked;

  const style = {
    background: `conic-gradient(
      rgb(167 139 250) 0% ${s1}%,
      rgb(148 163 184) ${s1}% ${s2}%,
      rgb(96 165 250) ${s2}% ${s3}%,
      rgb(248 113 113) ${s3}% ${s4}%,
      rgb(74 222 128) ${s4}% 100%
    )`,
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-44 w-44 shrink-0 rounded-full" style={style}>
        <div className="absolute inset-[18px] flex items-center justify-center rounded-full border border-white/10 bg-[#090909]">
          <div className="text-center">
            <div className="text-3xl font-extrabold text-white">{total}</div>
            <div className="mt-1 text-xs tracking-widest text-white/45">TOTAL</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkloadBars({
  items,
}: {
  items: Array<{
    id: string;
    name: string;
    department: string;
    count: number;
  }>;
}) {
  if (items.length === 0) {
    return <div className="text-sm text-white/40">ยังไม่มีข้อมูล workload</div>;
  }

  const maxCount = Math.max(...items.map((x) => x.count), 1);

  return (
    <div className="space-y-3">
      {items.map((w) => {
        const width = `${Math.max((w.count / maxCount) * 100, w.count > 0 ? 8 : 0)}%`;

        return (
          <div
            key={w.id}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold text-white">{w.name}</div>
                <div className="mt-1 text-xs text-white/45">{w.department}</div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-sm font-bold text-white">
                {w.count} งาน
              </div>
            </div>

            <div className="h-2.5 rounded-full bg-white/5">
              <div
                className="h-2.5 rounded-full bg-[linear-gradient(90deg,#e5ff78,#a3e635)]"
                style={{ width }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TeamNoticeBoard() {
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  async function load() {
    const res = await fetch("/api/team-notices");
    const json = await res.json();
    setItems(json?.data ?? []);
  }

  async function send() {
    if (!title.trim()) return;

    await fetch("/api/team-notices", {
      method: "POST",
      body: JSON.stringify({
        title,
        content,
      }),
    });

    setTitle("");
    setContent("");
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-lg font-semibold text-white">ประกาศทีม</div>
        <TeamNoticeBoard />

      <div className="mt-3 space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="หัวข้อประกาศ"
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-white"
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="รายละเอียด"
          className="w-full rounded-lg bg-black/30 px-3 py-2 text-white"
        />

        <button
          onClick={send}
          className="rounded-lg bg-[#e5ff78] px-4 py-2 text-black font-semibold"
        >
          ส่งประกาศ
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((n) => (
          <div
            key={n.id}
            className="rounded-lg border border-white/10 p-3 text-sm"
          >
            <div className="font-semibold text-white">{n.title}</div>
            <div className="text-white/70">{n.content}</div>
          </div>
        ))}
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
                {n.is_pinned ? <Pill tone="violet">PINNED</Pill> : null}
                <span className="ml-auto text-xs text-white/40">{formatDateTimeTH(n.created_at)}</span>
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
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [me, setMe] = useState<MeProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [meRes, projectsRes, membersRes] = await Promise.all([
        fetch("/api/me-profile", { cache: "no-store" }),
        fetch("/api/projects", { cache: "no-store" }),
        fetch("/api/members", { cache: "no-store" }),
      ]);

      const [meJson, projectsJson, membersJson] = await Promise.all([
        safeJson(meRes),
        safeJson(projectsRes),
        safeJson(membersRes),
      ]);

      if (!meRes.ok) throw new Error((meJson && (meJson.error || meJson.message)) || "Load profile failed");
      if (!projectsRes.ok) throw new Error((projectsJson && (projectsJson.error || projectsJson.message)) || "Load projects failed");
      if (!membersRes.ok) throw new Error((membersJson && (membersJson.error || membersJson.message)) || "Load members failed");

      const meData = (meJson?.data ?? meJson ?? null) as MeProfile | null;
      const projectData = Array.isArray(projectsJson?.data)
        ? (projectsJson.data as Project[])
        : Array.isArray(projectsJson)
          ? (projectsJson as Project[])
          : [];
      const memberData = Array.isArray(membersJson?.data)
        ? (membersJson.data as Member[])
        : Array.isArray(membersJson)
          ? (membersJson as Member[])
          : [];

      setMe(meData);
      setProjects(projectData);
      setMembers(memberData.filter((m) => m.is_active !== false));

      const leaderLike = meData?.role === "LEADER" || meData?.role === "ADMIN";

      if (leaderLike) {
        try {
          const approvalsRes = await fetch("/api/approvals", { cache: "no-store" });
          const approvalsJson = await safeJson(approvalsRes);

          if (approvalsRes.ok) {
            const approvalData = Array.isArray(approvalsJson?.data)
              ? (approvalsJson.data as ApprovalItem[])
              : Array.isArray(approvalsJson)
                ? (approvalsJson as ApprovalItem[])
                : approvalsJson?.data?.pending
                  ? (approvalsJson.data.pending as ApprovalItem[])
                  : [];

            setApprovals(approvalData.filter((a) => a.request_status === "PENDING"));
          } else if (approvalsRes.status === 403) {
            setApprovals([]);
          } else {
            throw new Error((approvalsJson && (approvalsJson.error || approvalsJson.message)) || "Load approvals failed");
          }
        } catch {
          setApprovals([]);
        }
      } else {
        setApprovals([]);
      }
    } catch (e: any) {
      setError(e?.message || "Load dashboard failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const isLeader = me?.role === "LEADER" || me?.role === "ADMIN";

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== "COMPLETED"),
    [projects]
  );

  const projectCounts = useMemo(() => {
    const total = activeProjects.length;
    const preOrder = activeProjects.filter((p) => p.status === "PRE_ORDER").length;
    const todo = activeProjects.filter((p) => p.status === "TODO").length;
    const inProgress = activeProjects.filter((p) => p.status === "IN_PROGRESS").length;
    const blocked = activeProjects.filter((p) => p.status === "BLOCKED").length;
    const completed = projects.filter((p) => p.status === "COMPLETED").length;
    const progressPercent = projects.length > 0 ? Math.round((completed / projects.length) * 100) : 0;

    return {
      total,
      preOrder,
      todo,
      inProgress,
      blocked,
      completed,
      progressPercent,
    };
  }, [projects, activeProjects]);

  const myIncompleteLatest = useMemo(() => {
    if (!me?.id) return [];
    return projects
      .filter((p) => p.assignee_id === me.id && p.status !== "COMPLETED" && p.status !== "BLOCKED")
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, isLeader ? 0 : 3);
  }, [projects, me?.id, isLeader]);

  const queuePreOrder = useMemo(() => {
    if (!me?.id) return [];
    return projects
      .filter((p) => p.assignee_id === me.id && p.status === "PRE_ORDER")
      .sort((a, b) => new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime())
      .slice(0, isLeader ? 0 : 5);
  }, [projects, me?.id, isLeader]);

  const latestGraphic = useMemo(() => {
    return projects
      .filter((p) => p.type === "GRAPHIC" && p.status !== "COMPLETED")
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 5);
  }, [projects]);

  const latestVideo = useMemo(() => {
    return projects
      .filter((p) => p.type === "VIDEO" && p.status !== "COMPLETED")
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 5);
  }, [projects]);

  const workload = useMemo(() => {
    return members
      .filter((m) => m.role !== "LEADER" && m.role !== "ADMIN")
      .map((m) => {
        const count = projects.filter(
          (p) => p.assignee_id === m.id && p.status !== "COMPLETED"
        ).length;

        return {
          id: m.id,
          name: m.display_name || m.id,
          department: m.department || "ALL",
          count,
        };
      })
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "th"))
      .slice(0, 8);
  }, [members, projects]);

  if (loading) {
    return (
      <div className="px-6 py-8 lg:px-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">
          กำลังโหลด Dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-8 lg:px-10">
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-semibold tracking-widest text-white/50">WOFFU</div>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">Dashboard</h1>
        </div>

        <button
          onClick={loadAll}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          รีเฟรช
        </button>
      </div>

      <div className="mt-4 max-w-xl rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
        <div className="text-sm font-semibold text-white">{me?.display_name || "-"}</div>
        <div className="mt-1 text-sm text-white/45">
          {isLeader ? "หัวหน้าทีม" : "สมาชิกทีม"} · {me?.department || "-"}
        </div>
      </div>

<DashboardCard
  title="ภาพรวมงาน"
  desc="จำนวนงานทั้งหมด จำนวนของแต่ละสถานะ และเปอร์เซ็นต์งานที่ทำเสร็จแล้ว"
  className="mt-6"
>
  <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">

    {/* donut */}
    <div className="flex flex-col items-center">

      <StatusDonut
        total={projects.length}
        counts={{
          preOrder: projectCounts.preOrder,
          todo: projectCounts.todo,
          inProgress: projectCounts.inProgress,
          blocked: projectCounts.blocked,
          completed: projectCounts.completed,
        }}
      />

      {/* legend */}
      <div className="mt-6 grid grid-cols-2 gap-2 text-xs text-white/70">

        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-violet-400"/>
          PRE_ORDER
        </div>

        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-gray-400"/>
          TODO
        </div>

        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-400"/>
          IN_PROGRESS
        </div>

        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-400"/>
          BLOCKED
        </div>

        <div className="flex items-center gap-2 col-span-2">
          <div className="h-3 w-3 rounded-full bg-green-400"/>
          COMPLETED
        </div>

      </div>
    </div>

    {/* stat cards */}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

      <SummaryStat
        label="ALL ACTIVE"
        value={projectCounts.total}
        hint="งานที่ยังไม่ปิด"
        onClick={() => router.push("/projects")}
      />

      <SummaryStat
        label="PRE_ORDER"
        value={projectCounts.preOrder}
        hint="งานสั่งล่วงหน้า"
        onClick={() => router.push("/projects")}
      />

      <SummaryStat
        label="TODO"
        value={projectCounts.todo}
        hint="งานที่ต้องทำ"
        onClick={() => router.push("/projects")}
      />

      <SummaryStat
        label="IN_PROGRESS"
        value={projectCounts.inProgress}
        hint="งานที่กำลังทำ"
        onClick={() => router.push("/my-work")}
      />

      <SummaryStat
        label="BLOCKED"
        value={projectCounts.blocked}
        hint="งานติดปัญหา"
        onClick={() => router.push("/blocked")}
      />

      <SummaryStat
        label="DONE %"
        value={projectCounts.progressPercent}
        hint={`${projectCounts.completed} งานที่ปิดแล้ว`}
        onClick={() => router.push("/completed")}
      />

    </div>
  </div>
</DashboardCard>

      {!isLeader ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <DashboardCard
            title="โปรเจกต์ล่าสุดของฉัน"
            desc="รายการงานล่าสุดที่ยังไม่ปิด และกดเพื่อไปหน้า my work"
            onClick={() => router.push("/my-work")}
          >
            <ProjectMiniList
              items={myIncompleteLatest}
              emptyText="ยังไม่มีงานล่าสุดในตอนนี้"
            />
          </DashboardCard>

          <DashboardCard
            title="งานรอต่อคิว"
            desc="ดึงจากงานที่มีสถานะ PRE_ORDER ของคุณ"
            onClick={() => router.push("/my-work")}
          >
            <ProjectMiniList
              items={queuePreOrder}
              emptyText="ยังไม่มีงานที่สั่งล่วงหน้า"
            />
          </DashboardCard>

<DashboardCard
  title="ประกาศทีม"
  desc="ใช้สำหรับแจ้งลา ประชุม ปัญหา และงานด่วนของทีม"
  className="xl:col-span-12"
>
  <TeamNoticeBoard isLeader={true} />
</DashboardCard>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-12">
          <DashboardCard
            title="โปรเจกต์ล่าสุดของกราฟิก"
            desc="5 รายการล่าสุดที่ยังไม่ปิด"
            onClick={() => router.push("/projects")}
            className="xl:col-span-6"
          >
            <ProjectMiniList
              items={latestGraphic}
              emptyText="ยังไม่มีโปรเจกต์กราฟิก"
            />
          </DashboardCard>

          <DashboardCard
            title="รออนุมัติ"
            desc="คำขอเปลี่ยนสถานะที่กำลังรอหัวหน้าอนุมัติ"
            onClick={() => router.push("/approvals")}
            className="xl:col-span-6"
          >
            <ApprovalMiniList
              items={approvals.slice(0, 5)}
              emptyText="ไม่มีรายการรออนุมัติ"
            />
          </DashboardCard>

          <DashboardCard
            title="โปรเจกต์ล่าสุดของวิดีโอ"
            desc="5 รายการล่าสุดที่ยังไม่ปิด"
            onClick={() => router.push("/projects")}
            className="xl:col-span-6"
          >
            <ProjectMiniList
              items={latestVideo}
              emptyText="ยังไม่มีโปรเจกต์วิดีโอ"
            />
          </DashboardCard>

          <DashboardCard
            title="Workload"
            desc="ดูว่าใครกำลังถือจำนวนงานอยู่เท่าไร (ไม่รวมหัวหน้า)"
            onClick={() => router.push("/members")}
            className="xl:col-span-6"
          >
            <WorkloadBars items={workload} />
          </DashboardCard>

          <DashboardCard
            title="ประกาศทีม"
            desc="พื้นที่สำหรับประกาศภายในทีม หรือใช้แทนโน้ตกลางได้ในช่วงแรก"
            className="xl:col-span-12"
          >
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-sm leading-7 text-white/50">
              ตอนนี้ยังเป็นกล่อง placeholder อยู่ก่อน
              <br />
              ต่อไปค่อยเชื่อมกับ announcement / team notes / pinned message ได้
            </div>
          </DashboardCard>
        </div>
      )}
    </div>
  );
}