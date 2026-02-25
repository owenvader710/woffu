// app/(app)/projects/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CreateProjectModal from "./CreateProjectModal";
import EditProjectModal from "./EditProjectModal";

type Project = {
  id: string;
  title: string;

  // ✅ รองรับหลายชื่อคอลัมน์รหัส (เผื่อ DB ไม่ได้ใช้ชื่อ code)
  code?: string | null;
  project_code?: string | null;
  projectCode?: string | null;
  product_code?: string | null;
  productCode?: string | null;
  project_no?: string | null;
  projectNo?: string | null;
  ref?: string | null;

  type: "VIDEO" | "GRAPHIC";
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
  created_at: string;
  start_date: string | null;
  due_date: string | null;

  brand?: string | null;
  video_priority?: string | null;
  video_purpose?: string | null;
  graphic_job_type?: string | null;

  assignee_id?: string | null;
  description?: string | null;
  department?: "VIDEO" | "GRAPHIC" | "ALL";
};

type Member = {
  id: string;
  display_name: string | null;
  department: "VIDEO" | "GRAPHIC" | "ALL";
  role: "LEADER" | "MEMBER";
  is_active: boolean;
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

// ✅ Deadline ต้องมีเวลา
function formatDateTimeTH(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  const date = d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "2-digit" });
  const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

// ✅ ดึง “รหัสโปรเจกต์” แบบรองรับหลายชื่อคอลัมน์
function getProjectCode(p: Project) {
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

// ✅ บรรทัดรอง: โชว์เนื้อหาเหมือนเดิม แต่ "ไม่โชว์หัวข้อ"
function secondLine(p: Project) {
  const brand = p.brand ? `${p.brand}` : null;

  const videoBits =
    p.type === "VIDEO"
      ? [
          p.video_priority
            ? `${p.video_priority === "SPECIAL" ? "SPECIAL" : `${p.video_priority}ดาว`}`
            : null,
          p.video_purpose ? `${p.video_purpose}` : null,
        ].filter(Boolean)
      : [];

  const graphicBits =
    p.type === "GRAPHIC" ? [p.graphic_job_type ? `${p.graphic_job_type}` : null].filter(Boolean) : [];

  const all = [brand, ...videoBits, ...graphicBits].filter(Boolean);
  return all.length ? all.join(" · ") : "";
}

function statusTone(status: Project["status"]) {
  if (status === "TODO") return "neutral";
  if (status === "IN_PROGRESS") return "blue";
  if (status === "BLOCKED") return "red";
  if (status === "COMPLETED") return "green";
  return "neutral";
}

// ✅ ค้นหาได้ถึงชื่อผู้รับผิดชอบด้วย
function matchQuery(p: Project, q: string, assigneeName?: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;

  const hay = `${getProjectCode(p) ?? ""} ${p.title ?? ""} ${p.brand ?? ""} ${p.video_priority ?? ""} ${
    p.video_purpose ?? ""
  } ${p.graphic_job_type ?? ""} ${assigneeName ?? ""}`.toLowerCase();

  return hay.includes(needle);
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "amber" | "red" | "blue";
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
      : "border-white/10 bg-white/5 text-white/70";

  return <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${cls}`}>{children}</span>;
}

function CodeBadge({ code }: { code?: string | null }) {
  if (!code) return null;
  return (
    <span className="inline-flex items-center rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs font-semibold text-white/80">
      {code}
    </span>
  );
}

export default function ProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [isLeader, setIsLeader] = useState(false);

  // filters
  const [statusFilter, setStatusFilter] = useState<"ALL" | "TODO" | "IN_PROGRESS">("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "VIDEO" | "GRAPHIC">("ALL");
  const [q, setQ] = useState("");

  const memberMap = useMemo(() => {
    const m = new Map<string, Member>();
    for (const it of members) m.set(it.id, it);
    return m;
  }, [members]);

  async function loadMe() {
    try {
      const r = await fetch("/api/me-profile", { cache: "no-store" });
      const j = await safeJson(r);
      const me = j?.data ?? j;
      setIsLeader(me?.role === "LEADER" && me?.is_active === true);
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

      const raw = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];

      const normalized = raw
        .map((p: any) => ({
          ...p,
          id: p?.id ?? p?.project_id ?? p?.projectId ?? p?.uuid ?? null,
        }))
        .filter((p: any) => !!p.id);

      setItems(normalized);
    } catch (e: any) {
      setItems([]);
      setError(e?.message || "Load projects failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadMembers() {
    try {
      const res = await fetch("/api/members", { cache: "no-store" });
      const json = await safeJson(res);
      if (!res.ok) return setMembers([]);
      const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      setMembers(data.filter((m: Member) => m.is_active !== false));
    } catch {
      setMembers([]);
    }
  }

  useEffect(() => {
    (async () => {
      await loadMe();
      await Promise.all([loadProjects(), loadMembers()]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ baseList: ตัด COMPLETED/BLOCKED ออกเสมอในหน้า /projects + filter ฝ่าย + search
  const baseList = useMemo(() => {
    let list = items;

    // หน้า /projects ไม่โชว์ COMPLETED/BLOCKED
    list = list.filter((p) => p.status !== "COMPLETED" && p.status !== "BLOCKED");

    if (typeFilter !== "ALL") list = list.filter((p) => p.type === typeFilter);

    if (q.trim()) {
      list = list.filter((p) => {
        const assigneeName = p.assignee_id ? memberMap.get(p.assignee_id)?.display_name ?? "" : "";
        return matchQuery(p, q, assigneeName || "");
      });
    }

    return list;
  }, [items, typeFilter, q, memberMap]);

  const counts = useMemo(() => {
    const base = { ALL: baseList.length, TODO: 0, IN_PROGRESS: 0 } as Record<"ALL" | "TODO" | "IN_PROGRESS", number>;
    for (const p of baseList) {
      if (p.status === "TODO") base.TODO += 1;
      if (p.status === "IN_PROGRESS") base.IN_PROGRESS += 1;
    }
    return base;
  }, [baseList]);

  const filteredItems = useMemo(() => {
    let list = baseList;
    if (statusFilter !== "ALL") list = list.filter((p) => p.status === statusFilter);
    return list;
  }, [baseList, statusFilter]);

  async function onDelete(p: Project) {
    if (!isLeader) return;
    if (!p?.id) {
      alert("Invalid project id");
      return;
    }

    const ok = window.confirm(`ลบโปรเจกต์นี้จริงไหม?\n\n${p.title}`);
    if (!ok) return;

    const prev = items;
    setItems((x) => x.filter((it) => it.id !== p.id));

    try {
      const res = await fetch(`/api/projects/${p.id}`, { method: "DELETE" });
      const json = await safeJson(res);
      if (!res.ok) {
        setItems(prev);
        alert((json && (json.error || json.message)) || `Delete failed (${res.status})`);
        return;
      }
    } catch (e: any) {
      setItems(prev);
      alert(e?.message || "Delete failed");
    }
  }

  function onEdit(p: Project) {
    if (!isLeader) return;
    if (!p?.id) {
      alert("Invalid project id");
      return;
    }
    setEditingProject(p);
    setEditOpen(true);
  }

  const IconBtn = ({
    title,
    onClick,
    children,
    variant = "default",
  }: {
    title: string;
    onClick: () => void;
    children: React.ReactNode;
    variant?: "default" | "edit" | "danger";
  }) => {
    const cls =
      variant === "edit"
        ? "border-[#e5ff78]/20 bg-[#e5ff78] text-black hover:opacity-90"
        : variant === "danger"
        ? "border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/15"
        : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10";

    return (
      <button
        type="button"
        title={title}
        onClick={onClick}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${cls}`}
      >
        {children}
      </button>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-semibold tracking-widest text-white/50">WOFFU</div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">Projects</h1>
          <div className="mt-2 text-sm text-white/60">ทั้งหมด: {filteredItems.length}</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              loadMe();
              loadProjects();
              loadMembers();
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            รีเฟรช
          </button>

          {isLeader && (
            <button
              onClick={() => setCreateOpen(true)}
              className="rounded-xl bg-[#e5ff78] px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
            >
              + สั่งงานใหม่
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap gap-2">
          {(["ALL", "TODO", "IN_PROGRESS"] as const).map((s) => {
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? "border-white/10 bg-white text-black"
                    : "border-white/10 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {s === "ALL" ? "ทั้งหมด" : s}{" "}
                <span className={active ? "opacity-80" : "text-white/40"}>({counts[s] ?? 0})</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["ALL", "VIDEO", "GRAPHIC"] as const).map((t) => {
              const active = typeFilter === t;
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? "border-white/10 bg-white text-black"
                      : "border-white/10 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {t === "ALL" ? "ทุกฝ่าย" : t}
                </button>
              );
            })}
          </div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหา: รหัสโปรเจกต์ / ชื่อโปรเจกต์ / ผู้รับผิดชอบ / แบรนด์ / รูปแบบงาน / ประเภทงาน"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78] md:w-[520px]"
          />
        </div>
      </div>

      {loading && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">กำลังโหลด...</div>
      )}

      {!loading && error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
      )}

      {!loading && !error && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <table className="w-full text-sm text-white/80">
            <thead className="bg-white/5 text-xs text-white/50">
              <tr className="text-left">
                <th className="p-4">โปรเจกต์</th>
                <th className="p-4">ฝ่าย</th>
                <th className="p-4">ผู้รับผิดชอบ</th>
                <th className="p-4">สถานะ</th>
                <th className="p-4">วันที่สั่ง</th>
                <th className="p-4">Deadline</th>
                <th className="p-4 text-right">จัดการ</th>
              </tr>
            </thead>

            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td className="p-6 text-white/40" colSpan={7}>
                    ไม่มีรายการตามเงื่อนไขนี้
                  </td>
                </tr>
              ) : (
                filteredItems.map((p) => {
                  const assigneeName = p.assignee_id ? memberMap.get(p.assignee_id)?.display_name ?? "-" : "-";
                  const code = getProjectCode(p);

                  return (
                    <tr key={p.id} className="border-t border-white/10 hover:bg-white/[0.06]">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {/* ✅ รหัสโปรเจกต์หน้าชื่อ */}
                          <CodeBadge code={code} />

                          <Link className="font-semibold text-white underline underline-offset-4" href={`/projects/${p.id}`}>
                            {p.title}
                          </Link>

                          {p.brand ? <Pill tone="neutral">{p.brand}</Pill> : null}
                        </div>

                        {/* ✅ โชว์เนื้อหาเหมือนเดิม แต่ไม่โชว์หัวข้อ */}
                        {secondLine(p) ? <div className="mt-1 text-xs text-white/45">{secondLine(p)}</div> : null}
                      </td>

                      <td className="p-4">
                        <Pill tone={p.type === "VIDEO" ? "blue" : "amber"}>{p.type}</Pill>
                      </td>

                      <td className="p-4">
                        <span className="text-white/80">{assigneeName || "-"}</span>
                      </td>

                      <td className="p-4">
                        <Pill tone={statusTone(p.status) as any}>{p.status}</Pill>
                      </td>

                      <td className="p-4 text-white/60">{formatDateTH(p.created_at)}</td>
                      <td className="p-4 text-white/60">{formatDateTimeTH(p.due_date)}</td>

                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          {isLeader ? (
                            <>
                              <IconBtn title="แก้ไข" variant="edit" onClick={() => onEdit(p)}>
                                ✏️
                              </IconBtn>
                              <IconBtn title="ลบ" variant="danger" onClick={() => onDelete(p)}>
                                🗑️
                              </IconBtn>
                            </>
                          ) : (
                            <span className="text-xs text-white/30">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async () => {
          setCreateOpen(false);
          await loadProjects();
        }}
      />

      {isLeader && editingProject && (
        <EditProjectModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          project={editingProject as any}
          members={members as any}
          onSaved={async () => {
            setEditOpen(false);
            setEditingProject(null);
            await loadProjects();
          }}
        />
      )}
    </div>
  );
}