"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
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

  type: "VIDEO" | "GRAPHIC";
  department: "VIDEO" | "GRAPHIC" | "ALL";
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";

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

const STATUSES: Project["status"][] = ["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED"];

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

function badgeClass(status: StatusRequest["request_status"]) {
  if (status === "APPROVED") return "border-green-200 bg-green-50 text-green-700";
  if (status === "REJECTED") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function priorityLabel(p?: Project["video_priority"] | null) {
  if (!p) return "-";
  if (p === "SPECIAL") return "SPECIAL";
  return `${p} ดาว`;
}

export default function ProjectDetailClient({ projectId }: { projectId?: string }) {
  const router = useRouter();

  // ✅ fallback: ถ้า prop ไม่มี ให้ดึงจาก URL params
  const params = useParams() as Record<string, string | string[] | undefined>;
  const pid = useMemo(() => {
    const raw =
      projectId ??
      (typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : undefined) ??
      (typeof params?.projectId === "string"
        ? params.projectId
        : Array.isArray(params?.projectId)
        ? params.projectId[0]
        : undefined);

    return raw ? String(raw) : "";
  }, [projectId, params]);

  // ✅ me / leader
  const [me, setMe] = useState<MeProfile | null>(null);

  // ✅ edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);

  const [project, setProject] = useState<Project | null>(null);
  const [requests, setRequests] = useState<StatusRequest[]>([]);
  const [logs, setLogs] = useState<ProjectLog[]>([]);
  const [showAllLogs, setShowAllLogs] = useState(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [draftStatus, setDraftStatus] = useState<Project["status"]>("TODO");
  const [submitting, setSubmitting] = useState(false);

  const [showAllHistory, setShowAllHistory] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // ✅ delete
  const [deleting, setDeleting] = useState(false);

  const isLeader = useMemo(() => me?.role === "LEADER" && me?.is_active === true, [me]);

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
    } catch {
      // ignore
    }
  }

  async function loadAll() {
    if (!pid) return;

    setLoading(true);
    setErr("");
    setMsg("");

    try {
      // 0) me first
      const rMe = await fetch("/api/me-profile", { cache: "no-store" });
      const jMe = await safeJson(rMe);
      const m = (jMe?.data ?? jMe) as MeProfile | null;
      const meObj = rMe.ok && m?.id ? m : null;
      setMe(meObj);

      const leaderNow = meObj?.role === "LEADER" && meObj?.is_active === true;
      await loadMembersIfLeader(leaderNow);

      // 1) project
      const r1 = await fetch(`/api/projects/${pid}`, { cache: "no-store" });
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
      setDraftStatus(p?.status ?? "TODO");

      // 2) status requests
      const r2 = await fetch(`/api/projects/${pid}/status-requests`, { cache: "no-store" });
      const j2 = await safeJson(r2);
      setRequests(r2.ok && Array.isArray(j2?.data) ? j2.data : []);

      // 3) logs
      const r3 = await fetch(`/api/projects/${pid}/logs`, { cache: "no-store" });
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
  }, [pid]);

  async function requestChange() {
    setErr("");
    setMsg("");

    if (!pid) return setErr("Missing project id (client)");
    if (!project) return;
    if (draftStatus === project.status) return setErr("สถานะยังไม่เปลี่ยน");

    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${pid}/request-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from_status: project.status, to_status: draftStatus }),
      });

      const json = await safeJson(res);
      if (!res.ok) {
        setErr((json && (json.error || json.message)) || `Request failed (${res.status})`);
        return;
      }

      const mode = json?.mode || "OK";
      setMsg(mode === "APPLIED" ? "หัวหน้า: เปลี่ยนสถานะให้แล้ว" : "ส่งคำขอเปลี่ยนสถานะแล้ว (รอหัวหน้าอนุมัติ)");
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

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
      const res = await fetch(`/api/projects/${pid}`, { method: "DELETE" });
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

  if (!pid) {
    return (
      <div className="p-10">
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
          Missing project id (client)
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-10 text-sm text-gray-600">กำลังโหลด...</div>;

  if (err) {
    return (
      <div className="p-10">
        <div className="mb-4">
          <Link href="/projects" className="text-sm underline">
            ← กลับไปหน้าโปรเจกต์
          </Link>
        </div>
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">{err}</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-10">
        <div className="mb-4">
          <Link href="/projects" className="text-sm underline">
            ← กลับไปหน้าโปรเจกต์
          </Link>
        </div>
        <div className="rounded-xl border p-4 text-sm text-gray-600">ไม่พบโปรเจกต์</div>
      </div>
    );
  }

  const isVideo = project.type === "VIDEO";
  const isGraphic = project.type === "GRAPHIC";

  return (
    <div className="p-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/projects" className="text-sm underline">
          ← กลับไปหน้าโปรเจกต์
        </Link>

        <div className="flex gap-2">
          {isLeader && (
            <>
              <button
                onClick={() => setEditOpen(true)}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
                disabled={deleting}
              >
                แก้ไขโปรเจกต์
              </button>

              <button
                onClick={deleteProject}
                className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50"
                disabled={deleting}
                title="ลบโปรเจกต์ (เฉพาะหัวหน้า)"
              >
                {deleting ? "กำลังลบ..." : "ลบโปรเจกต์"}
              </button>
            </>
          )}

          <button onClick={loadAll} className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50" disabled={deleting}>
            รีเฟรช
          </button>
        </div>
      </div>

      <div className="rounded-2xl border p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="text-2xl font-bold">{project.title}</div>

            <div className="mt-1 text-sm text-gray-600">
              ฝ่าย: <span className="font-semibold">{project.type}</span> · แบรนด์:{" "}
              <span className="font-semibold">{project.brand || "-"}</span> · status:{" "}
              <span className="font-semibold">{project.status}</span>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              created: {formatDateTimeTH(project.created_at)} · start: {formatDateTH(project.start_date)} · due:{" "}
              {formatDateTH(project.due_date)}
            </div>

            <div className="mt-3 text-xs text-gray-500">
              assignee: {project.assignee?.display_name || "-"} · creator: {project.creator?.display_name || "-"}
            </div>

            <div className="mt-4 rounded-xl border bg-gray-50 p-4 text-sm">
              <div className="font-semibold">รายละเอียดงาน</div>

              {isVideo && (
                <div className="mt-2 grid gap-2 text-sm">
                  <div>
                    ความสำคัญ: <span className="font-semibold">{priorityLabel(project.video_priority)}</span>
                  </div>
                  <div>
                    รูปแบบงาน: <span className="font-semibold">{project.video_purpose || "-"}</span>
                  </div>
                </div>
              )}

              {isGraphic && (
                <div className="mt-2 grid gap-2 text-sm">
                  <div>
                    ประเภทงาน: <span className="font-semibold">{project.graphic_job_type || "-"}</span>
                  </div>
                </div>
              )}

              <div className="mt-3">
                <div className="text-xs text-gray-600">คำอธิบาย</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                  {project.description?.trim() ? project.description : "-"}
                </div>
              </div>
            </div>

            {pending && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                มีคำขอรออนุมัติ: <b>{pending.from_status}</b> → <b>{pending.to_status}</b> · โดย{" "}
                <b>{pending.requester?.display_name || "-"}</b> · {formatDateTimeTH(pending.created_at)}
                <div className="mt-1 text-xs text-amber-800">
                  (หัวหน้าไปที่{" "}
                  <Link className="underline" href="/approvals">
                    Approvals
                  </Link>
                  )
                </div>
              </div>
            )}

            {msg && (
              <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{msg}</div>
            )}

            {err && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</div>
            )}
          </div>

          <div className="w-full md:w-[340px]">
            <div className="text-sm font-semibold">เปลี่ยนสถานะ</div>
            <div className="mt-2 flex gap-2">
              <select
                className="w-full rounded-xl border px-3 py-2 text-sm"
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value as any)}
                disabled={submitting || deleting}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                onClick={requestChange}
                disabled={submitting || deleting}
                className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "กำลังส่ง..." : "ส่ง"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">ประวัติคำขอเปลี่ยนสถานะ</div>
            <div className="text-xs text-gray-500">ทั้งหมด: {requests.length}</div>
          </div>

          {requests.length > 1 && (
            <button
              onClick={() => setShowAllHistory((v) => !v)}
              className="rounded-xl border px-3 py-2 text-xs hover:bg-gray-50"
            >
              {showAllHistory ? "ยุบประวัติ" : `ดูทั้งหมด (${requests.length})`}
            </button>
          )}
        </div>

        {sortedRequests.length === 0 ? (
          <div className="mt-3 text-sm text-gray-500">ยังไม่มีประวัติคำขอ</div>
        ) : (
          <div className="mt-4 space-y-2">
            {visibleRequests.map((r) => {
              const open = !!expandedIds[r.id];
              return (
                <div key={r.id} className="rounded-xl border p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold">
                        {r.from_status} → {r.to_status}
                      </div>
                      <span className={`rounded-lg border px-2 py-0.5 text-xs ${badgeClass(r.request_status)}`}>
                        {r.request_status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">{formatDateTimeTH(r.created_at)}</div>
                  </div>

                  <div className="mt-1 text-xs text-gray-600">
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
                      className="mt-2 text-xs text-gray-500 underline underline-offset-2"
                      onClick={() => setExpandedIds((prev) => ({ ...prev, [r.id]: !prev[r.id] }))}
                    >
                      {open ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
                    </button>
                  )}

                  {showAllHistory && open && (
                    <div className="mt-2 text-[11px] text-gray-400">
                      request id: {r.id} · project id: {r.project_id}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Activity Log</div>
            <div className="text-xs text-gray-500">ทั้งหมด: {logs.length}</div>
          </div>

          {logs.length > 5 && (
            <button
              onClick={() => setShowAllLogs((v) => !v)}
              className="rounded-xl border px-3 py-2 text-xs hover:bg-gray-50"
            >
              {showAllLogs ? "ยุบ log" : `ดูทั้งหมด (${logs.length})`}
            </button>
          )}
        </div>

        {visibleLogs.length === 0 ? (
          <div className="mt-3 text-sm text-gray-500">ยังไม่มี log</div>
        ) : (
          <div className="mt-4 space-y-2">
            {visibleLogs.map((l) => (
              <div key={l.id} className="rounded-xl border p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold">{l.action}</div>
                  <div className="text-xs text-gray-500">{formatDateTimeTH(l.created_at)}</div>
                </div>
                <div className="mt-1 text-xs text-gray-700">
                  โดย: <span className="font-medium">{l.actor?.display_name || l.actor_id || "-"}</span>
                </div>
                {l.message && <div className="mt-2 text-sm text-gray-900">{l.message}</div>}
              </div>
            ))}
          </div>
        )}
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