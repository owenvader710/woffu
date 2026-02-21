"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CreateProjectModal from "./CreateProjectModal";
import EditProjectModal from "./[id]/EditProjectModal";

type Project = {
  id: string;
  title: string;
  type: "VIDEO" | "GRAPHIC";
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
  created_at: string;
  start_date: string | null;
  due_date: string | null;

  // extra fields (โชว์ในบรรทัดรอง)
  brand?: string | null;
  video_priority?: string | null; // "2" | "3" | "5" | "SPECIAL"
  video_purpose?: string | null;
  graphic_job_type?: string | null;

  // สำหรับ edit modal
  assignee_id?: string | null;
  description?: string | null;
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

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function formatDateTH(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "2-digit" });
}

const STATUSES: Project["status"][] = ["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED"];

function statusLabel(s: Project["status"] | "ALL") {
  if (s === "ALL") return "ทั้งหมด";
  return s;
}

function secondLine(p: Project) {
  const brand = p.brand ? `แบรนด์: ${p.brand}` : null;

  const videoBits =
    p.type === "VIDEO"
      ? [
          p.video_priority
            ? `ความสำคัญ: ${p.video_priority === "SPECIAL" ? "SPECIAL" : `${p.video_priority}ดาว`}`
            : null,
          p.video_purpose ? `รูปแบบ: ${p.video_purpose}` : null,
        ].filter(Boolean)
      : [];

  const graphicBits =
    p.type === "GRAPHIC"
      ? [p.graphic_job_type ? `ประเภทงาน: ${p.graphic_job_type}` : null].filter(Boolean)
      : [];

  const all = [brand, ...videoBits, ...graphicBits].filter(Boolean);
  return all.length ? all.join(" · ") : "";
}

function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export default function ProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // create modal
  const [open, setOpen] = useState(false);

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);

  // leader check
  const [isLeader, setIsLeader] = useState(false);

  // filter
  const [statusFilter, setStatusFilter] = useState<Project["status"] | "ALL">("ALL");

  async function loadMeProfile() {
    try {
      const res = await fetch("/api/me-profile", { cache: "no-store" });
      const json = await safeJson(res);
      if (!res.ok) return setIsLeader(false);

      const role = json?.data?.role ?? json?.role ?? null;
      const active = json?.data?.is_active ?? json?.is_active ?? null;
      setIsLeader(role === "LEADER" && active === true);
    } catch {
      setIsLeader(false);
    }
  }

  async function loadProjects() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const json = await safeJson(res);

      if (!res.ok) {
        setItems([]);
        setError((json && (json.error || json.message)) || `Load projects failed (${res.status})`);
        return;
      }

      const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      setItems(data);
    } catch (e: any) {
      setItems([]);
      setError(e?.message || "Load projects failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadMembersIfLeader(nextIsLeader: boolean) {
    if (!nextIsLeader) {
      setMembers([]);
      return;
    }

    // ดึง members เพื่อให้ Edit modal เลือก assignee ได้
    const tryUrls = ["/api/members", "/api/profiles"];
    for (const url of tryUrls) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        const json = await safeJson(res);
        if (!res.ok) continue;

        const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : null;
        if (Array.isArray(data)) {
          const actives = data.filter((m: Member) => m.is_active !== false);
          setMembers(actives);
          return;
        }
      } catch {}
    }
    setMembers([]);
  }

  async function refreshAll() {
    await loadMeProfile();
    await loadProjects();
  }

  useEffect(() => {
    (async () => {
      await loadMeProfile();
      await loadProjects();
    })();
  }, []);

  // เมื่อรู้ว่าเป็นหัวหน้าแล้ว ค่อยโหลด members
  useEffect(() => {
    loadMembersIfLeader(isLeader);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLeader]);

  const counts = useMemo(() => {
    const base = { ALL: items.length, TODO: 0, IN_PROGRESS: 0, BLOCKED: 0, COMPLETED: 0 } as Record<
      Project["status"] | "ALL",
      number
    >;
    for (const p of items) base[p.status] += 1;
    return base;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (statusFilter === "ALL") return items;
    return items.filter((p) => p.status === statusFilter);
  }, [items, statusFilter]);

  async function openEditFromRow(projectId: string) {
    // เพื่อให้ได้ field ครบที่สุด (description/assignee_id/ฯลฯ) แนะนำดึงจาก /api/projects/:id
    try {
      const r = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
      const j = await safeJson(r);
      if (!r.ok) {
        alert((j && (j.error || j.message)) || `Load project failed (${r.status})`);
        return;
      }
      const p = (j?.data ?? null) as Project | null;
      if (!p) return alert("ไม่พบข้อมูลโปรเจกต์");
      setEditProject(p);
      setEditOpen(true);
    } catch (e: any) {
      alert(e?.message || "Load project failed");
    }
  }

  async function deleteFromRow(projectId: string, title: string) {
    const ok = confirm(`ลบโปรเจกต์นี้แบบถาวร?\n\n"${title}"\n\n*ลบแล้วกู้คืนไม่ได้`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      const json = await safeJson(res);
      if (!res.ok) {
        alert((json && (json.error || json.message)) || `Delete failed (${res.status})`);
        return;
      }
      await loadProjects();
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    }
  }

  return (
    <div className="p-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">โปรเจกต์ทั้งหมด</h1>
          <p className="mt-1 text-sm text-gray-600">รายการทั้งหมด: {items.length}</p>
        </div>

        <div className="flex gap-2">
          <button onClick={refreshAll} className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50">
            รีเฟรช
          </button>

          {isLeader && (
            <button
              onClick={() => setOpen(true)}
              className="rounded-xl bg-lime-300 px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              + สั่งงานใหม่
            </button>
          )}
        </div>
      </div>

      {/* Tabs filter */}
      <div className="mt-6 flex flex-wrap gap-2">
        {(["ALL", ...STATUSES] as const).map((s) => {
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-xl border px-3 py-2 text-xs hover:bg-gray-50 ${
                active ? "bg-black text-white hover:bg-black" : ""
              }`}
              title={`ดูสถานะ ${statusLabel(s)}`}
            >
              {statusLabel(s)} <span className={active ? "opacity-90" : "text-gray-500"}>({counts[s] ?? 0})</span>
            </button>
          );
        })}
      </div>

      {loading && <div className="mt-6 rounded-xl border p-4 text-sm text-gray-600">กำลังโหลด...</div>}

      {!loading && error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      {!loading && !error && (
        <div className="mt-6 overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="p-4">โปรเจกต์</th>
                <th className="p-4">ฝ่าย</th>
                <th className="p-4">สถานะ</th>
                <th className="p-4">วันที่สั่ง</th>
                <th className="p-4">Deadline</th>

                {/* ✅ คอลัมน์ action เฉพาะหัวหน้า */}
                {isLeader && <th className="p-4 text-right">จัดการ</th>}
              </tr>
            </thead>

            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td className="p-6 text-gray-400" colSpan={isLeader ? 6 : 5}>
                    ไม่มีรายการในสถานะนี้
                  </td>
                </tr>
              ) : (
                filteredItems.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="p-4">
                      <Link className="underline" href={`/projects/${p.id}`}>
                        {p.title}
                      </Link>
                      {secondLine(p) ? <div className="mt-1 text-xs text-gray-500">{secondLine(p)}</div> : null}
                    </td>

                    <td className="p-4">{p.type}</td>
                    <td className="p-4">{p.status}</td>
                    <td className="p-4">{formatDateTH(p.created_at)}</td>
                    <td className="p-4">{formatDateTH(p.due_date)}</td>

                    {/* ✅ ปุ่ม icon ท้ายแถว (เฉพาะหัวหน้า) */}
                    {isLeader && (
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditFromRow(p.id)}
                            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs hover:bg-white"
                            title="แก้ไขโปรเจกต์"
                          >
                            <IconEdit />
                            แก้ไข
                          </button>

                          <button
                            onClick={() => deleteFromRow(p.id, p.title)}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 hover:bg-red-100"
                            title="ลบโปรเจกต์"
                          >
                            <IconTrash />
                            ลบ
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create */}
      <CreateProjectModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={async () => {
          setOpen(false);
          await loadProjects();
        }}
      />

      {/* Edit (เปิดจาก icon ได้ทันที) */}
      {isLeader && editProject && (
        <EditProjectModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          project={editProject as any}
          members={members}
          onSaved={async () => {
            setEditOpen(false);
            setEditProject(null);
            await loadProjects();
          }}
        />
      )}
    </div>
  );
}