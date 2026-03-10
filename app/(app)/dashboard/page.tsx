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

type ApprovalItem = {
  id: string;
  project_id: string;
  request_status: "PENDING" | "APPROVED" | "REJECTED";
  created_at?: string | null;
  project?: {
    id?: string | null;
    title?: string | null;
    code?: string | null;
    department?: "VIDEO" | "GRAPHIC" | "ALL" | string | null;
  } | null;
};

type DashboardNotice = {
  id: string;
  title: string;
  content?: string | null;
  notice_type?: string | null;
  is_pinned?: boolean | null;
  created_at?: string | null;
};

type WorkloadItem = {
  id: string;
  name: string;
  department: string;
  count: number;
};

type DashboardPayload = {
  me: MeProfile | null;
  summary: {
    projectCounts: {
      total: number;
      preOrder: number;
      todo: number;
      inProgress: number;
      blocked: number;
      completed: number;
      progressPercent: number;
    };
  };
  sections: {
    approvals: ApprovalItem[];
    notices: DashboardNotice[];
    myIncompleteLatest: Project[];
    queuePreOrder: Project[];
    latestGraphic: Project[];
    latestVideo: Project[];
    workload: WorkloadItem[];
  };
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
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border px-2 py-1 text-xs font-semibold",
        cls
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

function CodeBadge({ code }: { code?: string | null }) {
  if (!code) return null;
  return (
    <span className="inline-flex max-w-full items-center rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[11px] font-semibold text-white/80">
      <span className="truncate">{code}</span>
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
        "min-w-0 overflow-hidden rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)] md:rounded-[28px] md:p-5",
        onClick && "cursor-pointer transition hover:bg-white/[0.07] hover:border-white/15",
        className
      )}
    >
      <div className="mb-4 min-w-0">
        <div className="break-words text-lg font-extrabold tracking-tight text-white md:text-xl">{title}</div>
        {desc ? <div className="mt-1 break-words text-sm leading-6 text-white/45">{desc}</div> : null}
      </div>
      <div className="min-w-0">{children}</div>
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
      className="min-h-[86px] min-w-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:bg-white/10 md:min-h-[116px] md:px-4 md:py-4"
    >
      <div className="text-[10px] font-semibold tracking-[0.18em] text-white/45 md:text-[11px] md:tracking-widest">
        {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold leading-none text-white md:mt-3 md:text-3xl">{value}</div>
      <div className="mt-2 break-words text-[11px] leading-5 text-white/45 md:mt-3 md:text-xs">{hint || "-"}</div>
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
    <div className="min-w-0 space-y-3">
      {items.map((p) => (
        <Link
          key={p.id}
          href={`/projects/${p.id}`}
          className="block min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-black/20 px-4 py-3 transition hover:bg-white/10"
        >
          <div className="flex min-w-0 items-start gap-2">
            <div className="shrink-0">
              <CodeBadge code={getProjectCode(p)} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 break-words text-sm font-semibold leading-6 text-white md:text-base">
                {p.title || "-"}
              </div>
            </div>
          </div>

          {secondLine(p) ? (
            <div className="mt-1 line-clamp-2 break-words text-xs leading-5 text-white/45">
              {secondLine(p)}
            </div>
          ) : null}

          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
            <Pill tone={p.type === "VIDEO" ? "blue" : "amber"}>{p.type || "-"}</Pill>
            <Pill tone={statusTone(p.status)}>{p.status || "-"}</Pill>
            <span className="max-w-full break-words text-xs text-white/40 sm:ml-auto">
              {formatDateTH(p.start_date || p.created_at)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ApprovalMiniList({
  items,
  emptyText,
  onApprove,
  onReject,
  submittingId,
}: {
  items: ApprovalItem[];
  emptyText: string;
  onApprove: (id: string) => void | Promise<void>;
  onReject: (id: string) => void | Promise<void>;
  submittingId?: string | null;
}) {
  if (items.length === 0) {
    return <div className="text-sm text-white/40">{emptyText}</div>;
  }

  return (
    <div className="min-w-0 space-y-3">
      {items.map((item) => {
        const busy = submittingId === item.id;

        return (
          <div
            key={item.id}
            className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
          >
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <Link href="/approvals" className="block min-w-0 transition hover:opacity-90">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="shrink-0">
                      <CodeBadge code={getProjectCode(item.project)} />
                    </div>
                    <div className="min-w-0 line-clamp-2 break-words font-semibold text-white">
                      {item.project?.title || "-"}
                    </div>
                  </div>

                  <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
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
                    <span className="max-w-full break-words text-xs text-white/40 sm:ml-auto">
                      {formatDateTimeTH(item.created_at)}
                    </span>
                  </div>
                </Link>
              </div>

              <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  disabled={busy}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onApprove(item.id);
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-500/10 text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
                  title="Approve"
                >
                  ✓
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onReject(item.id);
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-400/25 bg-red-500/10 text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                  title="Reject"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        );
      })}
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
      <div className="relative h-36 w-36 shrink-0 rounded-full md:h-44 md:w-44" style={style}>
        <div className="absolute inset-[15px] flex items-center justify-center rounded-full border border-white/10 bg-[#090909] md:inset-[18px]">
          <div className="text-center">
            <div className="text-2xl font-extrabold text-white md:text-3xl">{total}</div>
            <div className="mt-1 text-[10px] tracking-widest text-white/45 md:text-xs">TOTAL</div>
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

const NOTICE_LABEL: Record<string, string> = {
  GENERAL: "ทั่วไป",
  LEAVE: "ลาป่วย",
  MEETING: "ประชุม",
  ISSUE: "ปัญหา",
  URGENT: "เร่งด่วน",
};

function NoticeTypePill({ type }: { type?: string | null }) {
  const t = String(type || "GENERAL").toUpperCase();
  const label = NOTICE_LABEL[t] || "ทั่วไป";

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
      {label}
    </span>
  );
}

function DashboardNoticePreview({ items }: { items: DashboardNotice[] }) {
  if (items.length === 0) {
    return <div className="text-sm text-white/40">ยังไม่มีประกาศทีม</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((n) => (
        <Link
          key={n.id}
          href="/team-notices"
          className="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:bg-white/10"
        >
          <div className="flex flex-wrap items-center gap-2">
            <NoticeTypePill type={n.notice_type} />
            {n.is_pinned ? <Pill tone="violet">PINNED</Pill> : null}
            <span className="text-xs text-white/40 sm:ml-auto">{formatDateTimeTH(n.created_at)}</span>
          </div>

          <div className="mt-3 break-words font-semibold text-white">{n.title}</div>
          {n.content ? (
            <div className="mt-2 line-clamp-2 text-sm leading-6 text-white/65">{n.content}</div>
          ) : null}
        </Link>
      ))}

      <div className="flex justify-end">
        <Link
          href="/team-notices"
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          ดูทั้งหมด
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [approvalSubmittingId, setApprovalSubmittingId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error((json && (json.error || json.message)) || "Load dashboard failed");
      }

      setDashboard((json?.data ?? null) as DashboardPayload | null);
    } catch (e: any) {
      setError(e?.message || "Load dashboard failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprovalAction(id: string, action: "approve" | "reject") {
    if (!id) return;

    try {
      setApprovalSubmittingId(id);

      const res = await fetch(`/api/approvals/${id}/${action}`, {
        method: "POST",
      });

      const json = await safeJson(res);

      if (!res.ok) {
        alert((json && (json.error || json.message)) || `${action} failed`);
        return;
      }

      await loadAll();
    } catch (e: any) {
      alert(e?.message || `${action} failed`);
    } finally {
      setApprovalSubmittingId(null);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const me = dashboard?.me ?? null;
  const isLeader = me?.role === "LEADER" || me?.role === "ADMIN";

  const projectCounts = useMemo(
    () =>
      dashboard?.summary.projectCounts ?? {
        total: 0,
        preOrder: 0,
        todo: 0,
        inProgress: 0,
        blocked: 0,
        completed: 0,
        progressPercent: 0,
      },
    [dashboard]
  );

  const approvals = dashboard?.sections.approvals ?? [];
  const notices = dashboard?.sections.notices ?? [];
  const myIncompleteLatest = dashboard?.sections.myIncompleteLatest ?? [];
  const queuePreOrder = dashboard?.sections.queuePreOrder ?? [];
  const latestGraphic = dashboard?.sections.latestGraphic ?? [];
  const latestVideo = dashboard?.sections.latestVideo ?? [];
  const workload = dashboard?.sections.workload ?? [];

  const totalProjectsForDonut =
    projectCounts.total + projectCounts.completed;

  if (loading) {
    return (
      <div className="px-4 py-6 md:px-6 md:py-8 lg:px-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">
          กำลังโหลด Dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6 md:px-6 md:py-8 lg:px-10">
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-6 md:py-8 lg:px-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold tracking-widest text-white/50">WOFFU</div>
          <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Dashboard
          </h1>
        </div>

        <button
          onClick={() => void loadAll()}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          รีเฟรช
        </button>
      </div>

      <div className="mt-4 max-w-xl rounded-2xl border border-white/10 bg-white/5 px-4 py-4 md:px-5">
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
        <div className="grid min-w-0 gap-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-8">
          <div className="flex min-w-0 flex-col items-center">
            <StatusDonut
              total={totalProjectsForDonut}
              counts={{
                preOrder: projectCounts.preOrder,
                todo: projectCounts.todo,
                inProgress: projectCounts.inProgress,
                blocked: projectCounts.blocked,
                completed: projectCounts.completed,
              }}
            />

            <div className="mt-5 grid w-full max-w-[260px] grid-cols-2 gap-2 text-xs text-white/70 md:mt-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-violet-400" />
                PRE_ORDER
              </div>

              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-400" />
                TODO
              </div>

              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-400" />
                IN_PROGRESS
              </div>

              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                BLOCKED
              </div>

              <div className="col-span-2 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-400" />
                COMPLETED
              </div>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-3 md:gap-4">
            <SummaryStat
              label="ALL ACTIVE"
              value={projectCounts.total}
              hint="งานที่ยังไม่ปิด"
              onClick={() => router.push("/projects")}
            />

            <SummaryStat
              label="PRE_ORDER"
              value={projectCounts.preOrder}
              hint="สั่งล่วงหน้า"
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
              hint="กำลังทำ"
              onClick={() => router.push("/my-work")}
            />

            <SummaryStat
              label="BLOCKED"
              value={projectCounts.blocked}
              hint="ติดปัญหา"
              onClick={() => router.push("/blocked")}
            />

            <SummaryStat
              label="DONE %"
              value={projectCounts.progressPercent}
              hint={`${projectCounts.completed} ปิดแล้ว`}
              onClick={() => router.push("/completed")}
            />
          </div>
        </div>
      </DashboardCard>

      <DashboardCard
        title="ประกาศทีม"
        desc="ใช้สำหรับแจ้งลา ประชุม ปัญหา และงานด่วนของทีม"
        className="mt-6 border-[#e5ff78]/10 bg-[radial-gradient(circle_at_top,rgba(229,255,120,0.08),rgba(255,255,255,0.02)_35%,rgba(255,255,255,0.02)_100%)] shadow-[0_0_30px_rgba(229,255,120,0.06)]"
      >
        <DashboardNoticePreview items={notices} />
      </DashboardCard>

      {!isLeader ? (
        <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-2">
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
        </div>
      ) : (
        <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-12">
          <DashboardCard
            title="รออนุมัติ"
            desc="คำขอเปลี่ยนสถานะที่กำลังรอหัวหน้าอนุมัติ"
            className="xl:col-span-12"
          >
            <ApprovalMiniList
              items={approvals}
              emptyText="ไม่มีรายการรออนุมัติ"
              submittingId={approvalSubmittingId}
              onApprove={(id) => handleApprovalAction(id, "approve")}
              onReject={(id) => handleApprovalAction(id, "reject")}
            />
          </DashboardCard>

          <DashboardCard
            title="โปรเจกต์ล่าสุดของกราฟิก"
            desc="5 รายการล่าสุดที่ยังไม่ปิด"
            onClick={() => router.push("/projects")}
            className="xl:col-span-6"
          >
            <ProjectMiniList items={latestGraphic} emptyText="ยังไม่มีโปรเจกต์กราฟิก" />
          </DashboardCard>

          <DashboardCard
            title="โปรเจกต์ล่าสุดของวิดีโอ"
            desc="5 รายการล่าสุดที่ยังไม่ปิด"
            onClick={() => router.push("/projects")}
            className="xl:col-span-6"
          >
            <ProjectMiniList items={latestVideo} emptyText="ยังไม่มีโปรเจกต์วิดีโอ" />
          </DashboardCard>

          <DashboardCard
            title="Workload"
            desc="ดูว่าใครกำลังถือจำนวนงานอยู่เท่าไร (ไม่รวมหัวหน้า)"
            onClick={() => router.push("/members")}
            className="xl:col-span-12"
          >
            <WorkloadBars items={workload} />
          </DashboardCard>
        </div>
      )}
    </div>
  );
}