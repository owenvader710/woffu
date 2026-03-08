"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EditProjectModal from "../EditProjectModal";

type ProfileMini = {
  id: string;
  display_name: string | null;
  department?: "VIDEO" | "GRAPHIC" | "ALL" | null;
  role?: "LEADER" | "MEMBER" | null;
  avatar_url?: string | null;
};

type MeProfile = {
  id: string;
  role: "LEADER" | "MEMBER";
  is_active: boolean;
  display_name?: string | null;
};

type Project = {
  id: string;
  title: string;

  code?: string | null;
  project_code?: string | null;
  projectCode?: string | null;
  product_code?: string | null;
  productCode?: string | null;
  project_no?: string | null;
  projectNo?: string | null;
  ref?: string | null;

  product_group?: string | null;

  type: "VIDEO" | "GRAPHIC";
  department: "VIDEO" | "GRAPHIC" | "ALL";
  status: "PRE_ORDER" | "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";

  created_at: string;
  start_date: string | null;
  due_date: string | null;

  assignee_id: string | null;
  created_by: string;

  brand: string | null;
  description: string | null;

  video_priority: "2" | "3" | "5" | "SPECIAL" | null;
  video_purpose:
    | "สร้างความต้องการ"
    | "กระตุ้นความสนใจ"
    | "ให้ข้อมูลสินค้า"
    | "สร้างความหน้าเชื่อถือ"
    | "มิติการแข่งขัน"
    | "สปอนเซอร์"
    | null;

  graphic_job_type:
    | "ซัพพอร์ต MKT"
    | "ซัพพอร์ต SALE"
    | "ซัพพอร์ต VIDEO"
    | "ถ่ายภาพนิ่ง"
    | "งานทั่วไป"
    | "Promotion / Campaign"
    | "Special Job"
    | null;

  assignee?: ProfileMini | null;
  creator?: ProfileMini | null;
};

type StatusRequest = {
  id: string;
  project_id: string;
  from_status: string;
  to_status: string;
  request_status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  requested_by: string;
  approved_by: string | null;
  approved_at: string | null;

  requester?: ProfileMini | null;
  approver?: ProfileMini | null;
};

type ProjectLog = {
  id: string;
  project_id: string;
  actor_id: string | null;
  action: string;
  message: string | null;
  meta: any | null;
  created_at: string;

  actor?: ProfileMini | null;
};

type Member = {
  id: string;
  display_name: string | null;
  department: "VIDEO" | "GRAPHIC" | "ALL";
  role: "LEADER" | "MEMBER";
  is_active: boolean;
  phone?: string | null;
  avatar_url?: string | null;
};

function formatDateTH(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "2-digit" });
}

function formatDateTimeTH(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function pillToneStatus(status: Project["status"]) {
  if (status === "PRE_ORDER") return "violet";
  if (status === "COMPLETED") return "green";
  if (status === "BLOCKED") return "red";
  if (status === "IN_PROGRESS") return "blue";
  return "neutral";
}

function parseDescriptionAndAttachment(raw?: string | null) {
  const text = raw || "";
  const match = text.match(/\n*\[แนบไฟล์\]\s*([^\n]+)\n(https?:\/\/\S+)\s*$/);

  if (!match) {
    return {
      cleanDescription: text,
      attachmentName: null as string | null,
      attachmentUrl: null as string | null,
    };
  }

  const cleanDescription = text.replace(match[0], "").trim();

  return {
    cleanDescription,
    attachmentName: match[1]?.trim() || null,
    attachmentUrl: match[2]?.trim() || null,
  };
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "amber" | "red" | "blue" | "lime" | "violet";
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
            : tone === "lime"
              ? "border-[#e5ff78]/30 bg-[#e5ff78]/10 text-[#e5ff78]"
              : tone === "violet"
                ? "border-violet-500/30 bg-violet-500/10 text-violet-200"
                : "border-white/10 bg-white/5 text-white/70";

  return (
    <span className={`inline-flex max-w-full items-center rounded-full border px-2 py-1 text-xs ${cls}`}>
      <span className="truncate">{children}</span>
    </span>
  );
}

function badgeClass(status: StatusRequest["request_status"]) {
  if (status === "APPROVED") return "border-green-500/30 bg-green-500/10 text-green-200";
  if (status === "REJECTED") return "border-red-500/30 bg-red-500/10 text-red-200";
  return "border-amber-500/30 bg-amber-500/10 text-amber-200";
}

function priorityLabel(p?: Project["video_priority"] | null) {
  if (!p) return "-";
  if (p === "SPECIAL") return "SPECIAL";
  return `${p}`;
}

function getProjectCode(p: Project | null) {
  if (!p) return null;
  return (
    p.code ??
    p.project_code ??
    p.projectCode ??
    p.product_code ??
    p.productCode ??
    p.project_no ??
    p.projectNo ??
    p.ref ??
    null
  );
}

function CodeBadge({ code }: { code?: string | null }) {
  if (!code) return null;
  return (
    <span className="inline-flex max-w-full items-center rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs font-semibold text-white/80">
      <span className="truncate">{code}</span>
    </span>
  );
}

export default function ProjectDetailClient({ projectId }: { projectId: string }) {
  const router = useRouter();

  const [me, setMe] = useState<MeProfile | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [people, setPeople] = useState<Member[]>([]);

  const [project, setProject] = useState<Project | null>(null);
  const [requests, setRequests] = useState<StatusRequest[]>([]);
  const [logs, setLogs] = useState<ProjectLog[]>([]);
  const [showAllLogs, setShowAllLogs] = useState(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [showAllHistory, setShowAllHistory] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const [deleting, setDeleting] = useState(false);

  const isLeader = useMemo(() => me?.role === "LEADER" && me?.is_active === true, [me]);

  const peopleMap = useMemo(() => {
    const m = new Map<string, Member>();
    for (const it of people) m.set(it.id, it);
    return m;
  }, [people]);

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [requests]);

  const visibleRequests = useMemo(() => {
    if (showAllHistory) return sortedRequests;
    return sortedRequests.slice(0, 1);
  }, [showAllHistory, sortedRequests]);

  const pending = useMemo(() => sortedRequests.find((x) => x.request_status === "PENDING") ?? null, [sortedRequests]);

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [logs]);

  const visibleLogs = useMemo(() => {
    if (showAllLogs) return sortedLogs;
    return sortedLogs.slice(0, 5);
  }, [showAllLogs, sortedLogs]);

  async function loadMembersIfLeader(nextIsLeader: boolean) {
    if (!nextIsLeader) return;
    try {
      const r = await fetch("/api/members", { cache: "no-store" });
      const j = await safeJson(r);
      if (!r.ok) return;
      const data = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
      setMembers(data.filter((m: Member) => m.is_active !== false));
    } catch {}
  }

  async function loadPeople() {
    try {
      const r = await fetch("/api/members", { cache: "no-store" });
      const j = await safeJson(r);
      if (!r.ok) return setPeople([]);
      const data = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
      setPeople(data.filter((m: Member) => m.is_active !== false));
    } catch {
      setPeople([]);
    }
  }

  async function loadAll() {
    if (!projectId) return;

    setLoading(true);
    setErr("");
    setMsg("");

    try {
      await loadPeople();

      const rMe = await fetch("/api/me-profile", { cache: "no-store" });
      const jMe = await safeJson(rMe);
      const m = (jMe?.data ?? jMe) as MeProfile | null;
      const meObj = rMe.ok && m?.id ? m : null;
      setMe(meObj);

      const leaderNow = meObj?.role === "LEADER" && meObj?.is_active === true;
      await loadMembersIfLeader(leaderNow);

      const r1 = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
      const j1 = await safeJson(r1);

      if (!r1.ok) {
        setProject(null);
        setRequests([]);
        setLogs([]);
        setErr((j1 && (j1.error || j1.message)) || `Load project failed (${r1.status})`);
        return;
      }

      const p: Project | null = j1?.data ?? null;
      setProject(p);

      const r2 = await fetch(`/api/projects/${projectId}/status-requests`, { cache: "no-store" });
      const j2 = await safeJson(r2);
      setRequests(r2.ok && Array.isArray(j2?.data) ? j2.data : []);

      const r3 = await fetch(`/api/projects/${projectId}/logs`, { cache: "no-store" });
      const j3 = await safeJson(r3);
      setLogs(r3.ok && Array.isArray(j3?.data) ? j3.data : []);
    } catch (e: any) {
      setErr(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function deleteProject() {
    setErr("");
    setMsg("");

    if (!isLeader) {
      setErr("เฉพาะหัวหน้าเท่านั้นที่ลบโปรเจกต์ได้");
      return;
    }
    if (!project) return;

    const ok = window.confirm(`ยืนยันลบโปรเจกต์นี้?\n\n"${project.title}"\n\nการลบจะย้อนกลับไม่ได้`);
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      const json = await safeJson(res);

      if (!res.ok) {
        setErr((json && (json.error || json.message)) || `Delete failed (${res.status})`);
        return;
      }

      router.push("/projects");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
      {children}
    </div>
  );

  const GhostBtn = ({
    children,
    onClick,
    disabled,
    danger,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    danger?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border px-3 py-2 text-sm transition disabled:opacity-50 md:px-4 ${
        danger
          ? "border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/15"
          : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );

  if (!projectId) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6 md:py-8 lg:px-10 lg:py-10">
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
          Missing project id (client)
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6 md:py-8 lg:px-10 lg:py-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">กำลังโหลด...</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6 md:py-8 lg:px-10 lg:py-10">
        <div className="mb-4">
          <Link href="/projects" className="text-sm text-white/70 underline underline-offset-4 hover:text-white">
            ← กลับไปหน้าโปรเจกต์
          </Link>
        </div>
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{err}</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6 md:py-8 lg:px-10 lg:py-10">
        <div className="mb-4">
          <Link href="/projects" className="text-sm text-white/70 underline underline-offset-4 hover:text-white">
            ← กลับไปหน้าโปรเจกต์
          </Link>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">ไม่พบโปรเจกต์</div>
      </div>
    );
  }

  const isVideo = project.type === "VIDEO";
  const isGraphic = project.type === "GRAPHIC";

  const assigneeName =
    project.assignee?.display_name ||
    (project.assignee_id ? peopleMap.get(project.assignee_id)?.display_name : null) ||
    "-";

  const creatorName =
    project.creator?.display_name ||
    (project.created_by ? peopleMap.get(project.created_by)?.display_name : null) ||
    "-";

  const code = getProjectCode(project);
  const parsedDescription = parseDescriptionAndAttachment(project.description);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6 md:py-8 lg:px-10 lg:py-10">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Link href="/projects" className="text-sm text-white/70 underline underline-offset-4 hover:text-white">
          ← กลับไปหน้าโปรเจกต์
        </Link>

        <div className="flex flex-wrap gap-2">
          {isLeader && (
            <>
              <GhostBtn onClick={() => setEditOpen(true)} disabled={deleting}>
                แก้ไขโปรเจกต์
              </GhostBtn>
              <GhostBtn onClick={deleteProject} disabled={deleting} danger>
                {deleting ? "กำลังลบ..." : "ลบโปรเจกต์"}
              </GhostBtn>
            </>
          )}
          <GhostBtn onClick={loadAll} disabled={deleting}>
            รีเฟรช
          </GhostBtn>
        </div>
      </div>

      <Card>
        <div className="flex min-w-0 flex-col gap-6">
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-widest text-white/50">PROJECT DETAIL</div>

            <div className="mt-2 flex min-w-0 flex-wrap items-start gap-3">
              <div className="shrink-0">
                <CodeBadge code={code} />
              </div>
              <h1 className="min-w-0 flex-1 break-words text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                {project.title}
              </h1>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Pill tone={project.type === "VIDEO" ? "blue" : "amber"}>{project.type}</Pill>
              {project.brand ? <Pill tone="neutral">{project.brand}</Pill> : <Pill tone="neutral">-</Pill>}
              {project.product_group ? <Pill tone="violet">{`กลุ่ม ${project.product_group}`}</Pill> : null}
              <Pill tone={pillToneStatus(project.status)}>{project.status}</Pill>
              {pending ? <Pill tone="lime">มีคำขอรออนุมัติ</Pill> : null}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-white/70 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-white/40">Created</div>
                <div className="mt-1 break-words text-white/85">{formatDateTimeTH(project.created_at)}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-white/40">Start</div>
                <div className="mt-1 break-words text-white/85">{formatDateTH(project.start_date)}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-white/40">Deadline</div>
                <div className="mt-1 break-words text-white/85">{formatDateTimeTH(project.due_date)}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-white/70 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-white/40">ผู้รับผิดชอบ</div>
                <div className="mt-1 break-words text-white/85">{assigneeName}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-white/40">ผู้สร้างงาน</div>
                <div className="mt-1 break-words text-white/85">{creatorName}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-white/40">กลุ่มสินค้า</div>
                <div className="mt-1 break-words text-white/85">{project.product_group || "-"}</div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5">
              <div className="text-sm font-semibold text-white">รายละเอียดงาน</div>

              {isVideo && (
                <div className="mt-3 grid gap-2 text-sm text-white/75">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-white/45">ความสำคัญ</span>
                    <Pill tone="neutral">{priorityLabel(project.video_priority)}</Pill>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-white/45">รูปแบบงาน</span>
                    <Pill tone="neutral">{project.video_purpose || "-"}</Pill>
                  </div>
                </div>
              )}

              {isGraphic && (
                <div className="mt-3 grid gap-2 text-sm text-white/75">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-white/45">ประเภทงาน</span>
                    <Pill tone="neutral">{project.graphic_job_type || "-"}</Pill>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <div className="text-xs text-white/45">คำอธิบาย</div>
                <div className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/85">
                  {parsedDescription.cleanDescription?.trim() ? parsedDescription.cleanDescription : "-"}
                </div>
              </div>

              {parsedDescription.attachmentUrl ? (
                <div className="mt-4">
                  <div className="text-xs text-white/45">ไฟล์แนบ</div>
                  <a
                    href={parsedDescription.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex max-w-full items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
                  >
                    <span className="truncate">
                      เปิดไฟล์แนบ{parsedDescription.attachmentName ? `: ${parsedDescription.attachmentName}` : ""}
                    </span>
                  </a>
                </div>
              ) : null}
            </div>

            {msg && (
              <div className="mt-4 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200">
                {msg}
              </div>
            )}
            {err && (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {err}
              </div>
            )}

            {pending && (
              <div className="mt-4 rounded-2xl border border-[#e5ff78]/25 bg-[#e5ff78]/10 p-4 text-sm text-[#e5ff78]">
                <div className="break-words">
                  มีคำขอรออนุมัติ: <b className="text-white">{pending.from_status}</b> →{" "}
                  <b className="text-white">{pending.to_status}</b> · โดย{" "}
                  <b className="text-white">{pending.requester?.display_name || "-"}</b> ·{" "}
                  <span className="text-white/70">{formatDateTimeTH(pending.created_at)}</span>
                </div>
                <div className="mt-1 text-xs text-white/60">
                  (หัวหน้าไปที่{" "}
                  <Link className="underline underline-offset-4" href="/approvals">
                    Approvals
                  </Link>
                  )
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="mt-6">
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">ประวัติคำขอเปลี่ยนสถานะ</div>
              <div className="text-xs text-white/50">ทั้งหมด: {requests.length}</div>
            </div>

            {requests.length > 1 && (
              <GhostBtn onClick={() => setShowAllHistory((v) => !v)}>
                {showAllHistory ? "ยุบประวัติ" : `ดูทั้งหมด (${requests.length})`}
              </GhostBtn>
            )}
          </div>

          {sortedRequests.length === 0 ? (
            <div className="mt-4 text-sm text-white/50">ยังไม่มีประวัติคำขอ</div>
          ) : (
            <div className="mt-4 space-y-2">
              {visibleRequests.map((r) => {
                const open = !!expandedIds[r.id];
                return (
                  <div key={r.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="break-words font-semibold text-white">
                          {r.from_status} → {r.to_status}
                        </div>
                        <span className={`rounded-full border px-2 py-1 text-xs ${badgeClass(r.request_status)}`}>
                          {r.request_status}
                        </span>
                      </div>
                      <div className="text-xs text-white/45">{formatDateTimeTH(r.created_at)}</div>
                    </div>

                    <div className="mt-1 break-words text-xs text-white/55">
                      โดย: {r.requester?.display_name || "-"}
                      {r.request_status !== "PENDING" && (
                        <>
                          {" "}
                          · อนุมัติโดย: {r.approver?.display_name || "-"} · {formatDateTimeTH(r.approved_at)}
                        </>
                      )}
                    </div>

                    {showAllHistory && (
                      <button
                        className="mt-2 text-left text-xs text-white/50 underline underline-offset-2 hover:text-white"
                        onClick={() => setExpandedIds((prev) => ({ ...prev, [r.id]: !prev[r.id] }))}
                      >
                        {open ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
                      </button>
                    )}

                    {showAllHistory && open && (
                      <div className="mt-2 break-all text-[11px] text-white/35">
                        request id: {r.id} · project id: {r.project_id}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">Activity Log</div>
              <div className="text-xs text-white/50">ทั้งหมด: {logs.length}</div>
            </div>

            {logs.length > 5 && (
              <GhostBtn onClick={() => setShowAllLogs((v) => !v)}>
                {showAllLogs ? "ยุบ log" : `ดูทั้งหมด (${logs.length})`}
              </GhostBtn>
            )}
          </div>

          {visibleLogs.length === 0 ? (
            <div className="mt-4 text-sm text-white/50">ยังไม่มี log</div>
          ) : (
            <div className="mt-4 space-y-2">
              {visibleLogs.map((l) => (
                <div key={l.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="break-words font-semibold text-white">{l.action}</div>
                    <div className="text-xs text-white/45">{formatDateTimeTH(l.created_at)}</div>
                  </div>
                  <div className="mt-1 break-words text-xs text-white/55">
                    โดย: <span className="font-medium text-white/80">{l.actor?.display_name || l.actor_id || "-"}</span>
                  </div>
                  {l.message && <div className="mt-2 break-words text-sm text-white/85">{l.message}</div>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {isLeader && (
        <EditProjectModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          project={project}
          members={members}
          onSaved={async () => {
            setEditOpen(false);
            await loadAll();
          }}
        />
      )}
    </div>
  );
}