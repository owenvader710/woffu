"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ProfileMini = {
  id: string;
  display_name: string | null;
  department?: "VIDEO" | "GRAPHIC" | "ALL" | null;
  role?: "LEADER" | "MEMBER" | null;
  avatar_url?: string | null;
};

export type Project = {
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

  assignee?: ProfileMini | null;
  creator?: ProfileMini | null;
};

type StatusRequest = {
  id: string;
  project_id: string; // ✅ ถูกต้องคือ project_id (ไม่ใช่ project_id และไม่ใช่ ${projectId})
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

export default function ProjectDetailClient({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [requests, setRequests] = useState<StatusRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [draftStatus, setDraftStatus] = useState<Project["status"]>("TODO");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const pending = useMemo(
    () => requests.find((x) => x.request_status === "PENDING") ?? null,
    [requests]
  );

  async function load() {
    if (!projectId) return;

    setLoading(true);
    setErr("");
    setMsg("");

    try {
      // 1) project
      const r1 = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
      const j1 = await safeJson(r1);

      if (!r1.ok) {
        setProject(null);
        setRequests([]);
        setErr((j1 && (j1.error || j1.message)) || `Load project failed (${r1.status})`);
        return;
      }

      const p: Project | null = j1?.data ?? null;
      setProject(p);
      setDraftStatus(p?.status ?? "TODO");

      // 2) status requests history
      const r2 = await fetch(`/api/projects/${projectId}/status-requests`, { cache: "no-store" });
      const j2 = await safeJson(r2);

      if (r2.ok) setRequests(Array.isArray(j2?.data) ? j2.data : []);
      else setRequests([]); // ไม่บล็อคหน้า
    } catch (e: any) {
      setErr(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function requestChange() {
    setErr("");
    setMsg("");

    if (!project) return;

    if (draftStatus === project.status) {
      setErr("สถานะยังไม่เปลี่ยน");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/request-status`, {
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

      await load();
    } catch (e: any) {
      setErr(e?.message || "Request failed");
    } finally {
      setSubmitting(false);
    }
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
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
          {err}
        </div>
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

  return (
    <div className="p-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/projects" className="text-sm underline">
          ← กลับไปหน้าโปรเจกต์
        </Link>

        <button onClick={load} className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50">
          รีเฟรช
        </button>
      </div>

      <div className="rounded-2xl border p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-2xl font-bold">{project.title}</div>
            <div className="mt-1 text-sm text-gray-600">
              {project.type} · {project.department} · status:{" "}
              <span className="font-semibold">{project.status}</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              created: {formatDateTimeTH(project.created_at)} · start: {formatDateTH(project.start_date)} · due:{" "}
              {formatDateTH(project.due_date)}
            </div>

            <div className="mt-3 text-xs text-gray-500">
              assignee: {project.assignee?.display_name || "-"} · creator: {project.creator?.display_name || "-"}
            </div>

            {pending && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                มีคำขอรออนุมัติ: <b>{pending.from_status}</b> → <b>{pending.to_status}</b> · โดย{" "}
                <b>{pending.requester?.display_name || "-"}</b> · {formatDateTimeTH(pending.created_at)}
                <div className="mt-1 text-xs text-amber-800">
                  (หัวหน้าไปที่ <Link className="underline" href="/approvals">Approvals</Link>)
                </div>
              </div>
            )}

            {msg && (
              <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                {msg}
              </div>
            )}
          </div>

          <div className="w-full md:w-[340px]">
            <div className="text-sm font-semibold">เปลี่ยนสถานะ</div>
            <div className="mt-2 flex gap-2">
              <select
                className="w-full rounded-xl border px-3 py-2 text-sm"
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value as any)}
                disabled={submitting}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                onClick={requestChange}
                disabled={submitting}
                className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
                title="สมาชิก=ส่งคำขอ / หัวหน้า=เปลี่ยนให้ทันที"
              >
                {submitting ? "กำลังส่ง..." : "ส่ง"}
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              ถ้าเป็นหัวหน้า ระบบจะ apply ทันที / ถ้าเป็นสมาชิก ระบบจะส่งคำขอไป Approvals
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border p-6">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">ประวัติคำขอเปลี่ยนสถานะ</div>
          <div className="text-xs text-gray-500">ทั้งหมด: {requests.length}</div>
        </div>

        {requests.length === 0 ? (
          <div className="mt-3 text-sm text-gray-500">ยังไม่มีประวัติคำขอ</div>
        ) : (
          <div className="mt-3 space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="rounded-xl border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <b>{r.from_status}</b> → <b>{r.to_status}</b>{" "}
                    <span className="ml-2 rounded-lg border px-2 py-0.5 text-xs">
                      {r.request_status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">{formatDateTimeTH(r.created_at)}</div>
                </div>

                <div className="mt-1 text-xs text-gray-600">
                  โดย: {r.requester?.display_name || "-"}{" "}
                  {r.request_status !== "PENDING" && (
                    <>
                      · อนุมัติโดย: {r.approver?.display_name || "-"} · {formatDateTimeTH(r.approved_at)}
                    </>
                  )}
                </div>

                <div className="mt-1 text-[11px] text-gray-400">id: {r.id}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
