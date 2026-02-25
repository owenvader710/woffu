// app/(app)/projects/EditProjectModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { buildProjectDescription, parseProjectMeta } from "@/utils/projectMeta";

type Member = {
  id: string;
  display_name: string | null;
  department: "VIDEO" | "GRAPHIC" | "ALL";
  role: "LEADER" | "MEMBER";
  is_active: boolean;
};

type Project = {
  id: string;
  title: string;
  type: "VIDEO" | "GRAPHIC";
  brand: string | null;
  description: string | null;
  assignee_id: string | null;
  start_date: string | null;
  due_date: string | null;
  video_priority?: string | null;
  video_purpose?: string | null;
  graphic_job_type?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  project: Project | null;
  members: Member[];
  onSaved?: () => void;
};

function toDatetimeLocal(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

async function safeJson(res: Response) {
  try {
    const t = await res.text();
    return t ? JSON.parse(t) : null;
  } catch {
    return null;
  }
}

export default function EditProjectModal({
  open,
  onClose,
  project,
  members,
  onSaved,
}: Props) {
  const [title, setTitle] = useState("");
  const [productCode, setProductCode] = useState("");
  const [productGroup, setProductGroup] = useState("");
  const [brand, setBrand] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [videoPriority, setVideoPriority] = useState("3ดาว");
  const [videoPurpose, setVideoPurpose] = useState("สร้างความต้องการ");
  const [graphicJobType, setGraphicJobType] = useState("ซัพพอร์ต MKT");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const activeMembers = useMemo(
    () => members.filter((m) => m?.is_active !== false),
    [members]
  );

  useEffect(() => {
    if (!open || !project) return;

    const parsed = parseProjectMeta(project.description);

    setTitle(project.title || "");
    setBrand(project.brand || "");
    setProductCode(parsed.productCode || "");
    setProductGroup(parsed.productGroup || "");
    setDescription(parsed.description || "");
    setAssigneeId(project.assignee_id || "");
    setStartDate(toDatetimeLocal(project.start_date));
    setDueDate(toDatetimeLocal(project.due_date));

    if (project.type === "VIDEO") {
      setVideoPriority(project.video_priority || "3ดาว");
      setVideoPurpose(project.video_purpose || "สร้างความต้องการ");
    } else {
      setGraphicJobType(project.graphic_job_type || "ซัพพอร์ต MKT");
    }
  }, [open, project]);

  if (!open || !project) return null;

  async function handleSave() {
    setErr("");
    setLoading(true);

    try {
      const finalDescription = buildProjectDescription(
        {
          productCode: productCode.trim() || undefined,
          productGroup: productGroup.trim() || undefined,
        },
        description?.trim() || ""
      );

      const payload: any = {
        title: title.trim(),
        brand,
        assignee_id: assigneeId || null,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        description: finalDescription,
      };

      if (project.type === "VIDEO") {
        payload.video_priority = videoPriority;
        payload.video_purpose = videoPurpose;
      } else {
        payload.graphic_job_type = graphicJobType;
      }

      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await safeJson(res);
      if (!res.ok) {
        setErr((json && (json.error || json.message)) || "Update failed");
        return;
      }

      onSaved?.();
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl rounded-[28px] border border-white/10 bg-[#0b0b0b] text-white shadow-[0_30px_120px_rgba(0,0,0,0.75)]">
        <div className="border-b border-white/10 px-6 py-5 text-lg font-extrabold">
          แก้ไขโปรเจกต์
        </div>

        <div className="max-h-[70vh] overflow-auto px-6 py-5 space-y-5">
          {err && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {err}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              placeholder="รหัสสินค้า"
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:border-[#e5ff78]"
            />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ชื่อโปรเจกต์"
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:border-[#e5ff78]"
            />
          </div>

          <select
            value={productGroup}
            onChange={(e) => setProductGroup(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:border-[#e5ff78]"
          >
            <option value="">- กลุ่มสินค้า -</option>
            {Array.from({ length: 8 }).map((_, i) => {
              const v = String.fromCharCode(65 + i);
              return (
                <option key={v} value={v} className="bg-black">
                  {v}
                </option>
              );
            })}
          </select>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="รายละเอียด"
            className="w-full h-24 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:border-[#e5ff78]"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:border-[#e5ff78] [color-scheme:dark]"
            />
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:border-[#e5ff78] [color-scheme:dark]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="rounded-2xl bg-[#e5ff78] px-5 py-2 text-sm font-bold text-black hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}