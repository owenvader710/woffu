// app/(app)/projects/EditProjectModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Project = {
  id: string;
  title: string;
  type: "VIDEO" | "GRAPHIC";
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
  brand?: string | null;

  assignee_id?: string | null;
  description?: string | null;

  start_date?: string | null;
  due_date?: string | null;

  video_priority?: string | null;
  video_purpose?: string | null;
  graphic_job_type?: string | null;

  department?: "VIDEO" | "GRAPHIC" | "ALL";
};

type Member = {
  id: string;
  display_name: string | null;
  department: "VIDEO" | "GRAPHIC" | "ALL";
  role: "LEADER" | "MEMBER";
  is_active: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  project: Project;
  members: Member[];
};

async function safeJson(res: Response) {
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

function InputLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-sm font-semibold text-white/80">{children}</div>;
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 text-xs text-white/40">{children}</div>;
}

// ✅ helper: กัน "undefined" / "" ให้กลายเป็น null
function normalizeUuid(v: unknown) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s || s === "undefined" || s === "null") return null;
  return s;
}

export default function EditProjectModal({ open, onClose, onSaved, project, members }: Props) {
  // ✅ Hooks ต้องอยู่บนสุดเสมอ
  const activeMembers = useMemo(
    () => (Array.isArray(members) ? members.filter((m) => m?.is_active !== false && !!m?.id) : []),
    [members]
  );

  const groupedMembers = useMemo(() => {
    const video: Member[] = [];
    const graphic: Member[] = [];
    const all: Member[] = [];

    for (const m of activeMembers) {
      if (m.department === "VIDEO") video.push(m);
      else if (m.department === "GRAPHIC") graphic.push(m);
      else all.push(m);
    }

    const sortByName = (a: Member, b: Member) =>
      String(a.display_name || a.id).localeCompare(String(b.display_name || b.id));

    return {
      video: video.sort(sortByName),
      graphic: graphic.sort(sortByName),
      all: all.sort(sortByName),
    };
  }, [activeMembers]);

  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState<string>("");

  const [assigneeId, setAssigneeId] = useState<string>(""); // เก็บเป็น string แต่จะ normalize ก่อนส่ง
  const [startDate, setStartDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  const [videoPriority, setVideoPriority] = useState<string>("");
  const [videoPurpose, setVideoPurpose] = useState<string>("");
  const [graphicJobType, setGraphicJobType] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // ✅ sync state เมื่อเปิด modal / เปลี่ยน project
  useEffect(() => {
    if (!open) return;

    setErr("");
    setMsg("");

    setTitle(project?.title ?? "");
    setBrand(project?.brand ?? "");

    // ✅ ห้าม String(undefined) -> "undefined"
    setAssigneeId(project?.assignee_id ?? "");

    setStartDate(project?.start_date ? String(project.start_date).slice(0, 10) : "");
    setDueDate(project?.due_date ? String(project.due_date).slice(0, 10) : "");
    setDescription(project?.description ?? "");

    setVideoPriority(project?.video_priority ?? "");
    setVideoPurpose(project?.video_purpose ?? "");
    setGraphicJobType(project?.graphic_job_type ?? "");
  }, [open, project]);

  async function submit() {
    setErr("");
    setMsg("");

    const projectId = normalizeUuid(project?.id);
    if (!projectId) {
      setErr("ไม่พบ project.id (id เป็นค่าว่าง/undefined) — กรุณารีเฟรชหน้าแล้วลองใหม่");
      return;
    }

    const t = title.trim();
    if (!t) {
      setErr("กรุณาใส่ชื่อโปรเจกต์");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        title: t,
        brand: brand?.trim() ? brand.trim() : null,

        // ✅ จุดสำคัญ: กัน "undefined" ให้เป็น null
        assignee_id: normalizeUuid(assigneeId),

        start_date: startDate || null,
        due_date: dueDate || null,
        description: description?.trim() || null,
      };

      if (project.type === "VIDEO") {
        payload.video_priority = videoPriority?.trim() ? videoPriority.trim() : null;
        payload.video_purpose = videoPurpose?.trim() ? videoPurpose.trim() : null;
        payload.graphic_job_type = null;
      } else {
        payload.graphic_job_type = graphicJobType?.trim() ? graphicJobType.trim() : null;
        payload.video_priority = null;
        payload.video_purpose = null;
      }

      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await safeJson(res);
      if (!res.ok) {
        setErr((json && (json.error || json.message)) || `Save failed (${res.status})`);
        return;
      }

      setMsg("บันทึกแล้ว");
      onSaved?.();
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0b0b] text-white shadow-[0_30px_120px_rgba(0,0,0,0.75)]">
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <div className="text-lg font-extrabold tracking-tight">แก้ไขงาน</div>
            <div className="mt-1 text-sm text-white/45">Edit project details</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
            title="ปิด"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[75vh] overflow-auto px-6 py-5">
          {err ? (
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {err}
            </div>
          ) : null}

          {msg ? (
            <div className="mb-4 rounded-2xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">
              {msg}
            </div>
          ) : null}

          <div className="mb-5 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
              {project.type}
            </span>
            <span className="text-xs text-white/40">#{project?.id ?? "-"}</span>
          </div>

          <div className="mb-5">
            <InputLabel>ชื่อโปรเจกต์</InputLabel>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78]"
            />
          </div>

          <div className="mb-5">
            <InputLabel>แบรนด์ของสินค้า</InputLabel>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78]"
            />
          </div>

          <div className="mb-5">
            <InputLabel>ผู้รับงาน (Assignee)</InputLabel>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
            >
              <option value="">- ไม่ระบุ -</option>

              {groupedMembers.video.length ? (
                <optgroup label="VIDEO">
                  {groupedMembers.video.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.display_name || m.id}
                    </option>
                  ))}
                </optgroup>
              ) : null}

              {groupedMembers.graphic.length ? (
                <optgroup label="GRAPHIC">
                  {groupedMembers.graphic.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.display_name || m.id}
                    </option>
                  ))}
                </optgroup>
              ) : null}

              {groupedMembers.all.length ? (
                <optgroup label="ALL">
                  {groupedMembers.all.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.display_name || m.id}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </div>

          <div className="mb-5 rounded-[22px] border border-white/10 bg-white/5 p-5">
            <div className="mb-3 text-sm font-extrabold text-white/85">ตั้งค่าเพิ่มเติม ({project.type})</div>

            {project.type === "VIDEO" ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <InputLabel>ความสำคัญของงาน</InputLabel>
                  <input
                    value={videoPriority}
                    onChange={(e) => setVideoPriority(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
                  />
                </div>
                <div>
                  <InputLabel>รูปแบบของงาน</InputLabel>
                  <input
                    value={videoPurpose}
                    onChange={(e) => setVideoPurpose(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
                  />
                </div>
              </div>
            ) : (
              <div>
                <InputLabel>ประเภทงาน</InputLabel>
                <input
                  value={graphicJobType}
                  onChange={(e) => setGraphicJobType(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
                />
              </div>
            )}
          </div>

          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <InputLabel>เริ่ม</InputLabel>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
              />
              <FieldHint>* ไอคอนปฏิทินขึ้นตาม browser/OS บางเครื่องไม่โชว์ไอคอนแต่คลิกได้</FieldHint>
            </div>

            <div>
              <InputLabel>Deadline</InputLabel>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
              />
            </div>
          </div>

          <div className="mb-2">
            <InputLabel>คำอธิบาย</InputLabel>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-28 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="rounded-2xl border border-[#e5ff78]/20 bg-[#e5ff78] px-5 py-2 text-sm font-extrabold text-black hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}