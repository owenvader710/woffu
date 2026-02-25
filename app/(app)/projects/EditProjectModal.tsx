// app/(app)/projects/EditProjectModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

const VIDEO_BRANDS = [
  "IRONTEC",
  "THE GYM CO",
  "IVADE",
  "AMURO",
  "FLOORBLOCK",
  "WHEY ZONE",
  "FITNOMIC",
  "OVCM",
  "MDBuddy",
] as const;

const GRAPHIC_BRANDS = [
  "IRONTEC",
  "THE GYM CO",
  "IVADE",
  "AMURO",
  "MEGA",
  "ENJOY",
  "JOCKO",
  "EXSER",
  "หมามีกล้าม",
  "DECATHLON",
  "HOMEPRO",
  "CENTRAL",
  "SPINX",
  "บทความ",
  "SHOPEE",
  "FITOUTLET",
  "ALLSHOP",
  "FLOORBLOCK",
  "LAZADA",
  "WHEY ZONE",
  "FITNOMIC",
  "ALL",
  "OVCM",
  "MDBuddy",
] as const;

const VIDEO_PRIORITIES = ["2ดาว", "3ดาว", "5ดาว", "SPECIAL"] as const;

const VIDEO_PURPOSES = [
  "สร้างความต้องการ",
  "กระตุ้นความสนใจ",
  "ให้ข้อมูลสินค้า",
  "สร้างความหน้าเชื่อถือ",
  "มิติการแข่งขัน",
  "สปอนเซอร์",
] as const;

const GRAPHIC_JOB_TYPES = [
  "ซัพพอร์ต MKT",
  "ซัพพอร์ต SALE",
  "ซัพพอร์ต VIDEO",
  "ถ่ายภาพนิ่ง",
  "งานทั่วไป",
  "Promotion / Campaign",
  "Special Job",
] as const;

type Project = {
  id: string;
  code?: string | null;
  title: string;
  type: "VIDEO" | "GRAPHIC";
  status: string;
  brand?: string | null;
  assignee_id?: string | null;
  description?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  video_priority?: string | null;
  video_purpose?: string | null;
  graphic_job_type?: string | null;
};

type Member = {
  id: string;
  display_name: string | null;
  department: "VIDEO" | "GRAPHIC" | "ALL";
  is_active: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  project: Project | null; // ✅ allow null
  members: Member[];
};

async function safeJson(res: Response) {
  try {
    const t = await res.text();
    return t ? JSON.parse(t) : null;
  } catch {
    return null;
  }
}

export default function EditProjectModal({ open, onClose, onSaved, project, members }: Props) {
  const [type, setType] = useState<"VIDEO" | "GRAPHIC">("VIDEO");

  // ✅ NEW
  const [code, setCode] = useState("");

  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");

  const [videoPriority, setVideoPriority] = useState("");
  const [videoPurpose, setVideoPurpose] = useState("");
  const [graphicJobType, setGraphicJobType] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const brands = useMemo(() => (type === "VIDEO" ? VIDEO_BRANDS : GRAPHIC_BRANDS), [type]);

  const displayAssignees = useMemo(() => {
    const active = Array.isArray(members) ? members.filter((m) => m.is_active !== false) : [];
    const primary = active.filter((m) => m.department === type);
    const common = active.filter((m) => m.department === "ALL");
    return { primary, common };
  }, [members, type]);

  useEffect(() => {
    if (!open || !project) return;

    setErr("");
    setMsg("");

    setType(project.type || "VIDEO");
    setCode(project.code || ""); // ✅

    setTitle(project.title || "");
    setBrand(project.brand || "");
    setAssigneeId(project.assignee_id || "");
    setStartDate(project.start_date ? project.start_date.split("T")[0] : "");
    setDueDate(project.due_date ? project.due_date.split("T")[0] : "");
    setDescription(project.description || "");
    setVideoPriority(project.video_priority || "3ดาว");
    setVideoPurpose(project.video_purpose || "สร้างความต้องการ");
    setGraphicJobType(project.graphic_job_type || "ซัพพอร์ต MKT");
  }, [open, project]);

  async function submit() {
    setErr("");
    setMsg("");

    if (!project?.id) {
      setErr("ไม่พบรหัสโปรเจกต์ (ID is missing)");
      return;
    }

    if (!title.trim()) {
      setErr("กรุณาใส่ชื่อโปรเจกต์");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        // ✅ NEW
        code: code.trim() || null,

        title: title.trim(),
        type,
        brand: brand || null,
        assignee_id: assigneeId || null,
        start_date: startDate || null,
        due_date: dueDate || null,
        description: description?.trim() || null,
        video_priority: type === "VIDEO" ? videoPriority : null,
        video_purpose: type === "VIDEO" ? videoPurpose : null,
        graphic_job_type: type === "GRAPHIC" ? graphicJobType : null,
      };

      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await safeJson(res);
      if (!res.ok) throw new Error(json?.error || json?.message || `Save failed: ${res.status}`);

      setMsg("บันทึกการแก้ไขเรียบร้อย");
      onSaved?.();
      setTimeout(() => onClose(), 700);
    } catch (e: any) {
      setErr(e.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;
  if (!project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0b0b] text-white shadow-[0_30px_120px_rgba(0,0,0,0.75)]">
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <div className="text-lg font-extrabold tracking-tight">แก้ไขงาน</div>
            <div className="text-sm text-white/50">แก้ไขข้อมูล แล้วกดบันทึก</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 hover:bg-white/10"
          >
            ปิด
          </button>
        </div>

        <div className="px-6 py-6">
          {err ? (
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {err}
            </div>
          ) : null}
          {msg ? (
            <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {msg}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-white/70">ฝ่าย</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-white/20"
              >
                <option value="VIDEO">VIDEO</option>
                <option value="GRAPHIC">GRAPHIC</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">รหัสโปรเจกต์</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-white/20"
                placeholder="เช่น 5x-1234 / 0001"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm text-white/70">ชื่อโปรเจกต์</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-white/20"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-white/70">แบรนด์</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-white/20"
              >
                <option value="">-</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">ผู้รับผิดชอบ</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-white/20"
              >
                <option value="">-</option>
                {displayAssignees.primary.length ? (
                  <optgroup label={type}>
                    {displayAssignees.primary.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.display_name || m.id}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {displayAssignees.common.length ? (
                  <optgroup label="ALL">
                    {displayAssignees.common.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.display_name || m.id}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-white/70">วันสั่งงาน</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-white/70">Deadline</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-white/20"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {type === "VIDEO" ? (
              <>
                <div>
                  <label className="mb-2 block text-sm text-white/70">ความสำคัญ</label>
                  <select
                    value={videoPriority}
                    onChange={(e) => setVideoPriority(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-white/20"
                  >
                    {VIDEO_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-white/70">รูปแบบ</label>
                  <select
                    value={videoPurpose}
                    onChange={(e) => setVideoPurpose(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-white/20"
                  >
                    {VIDEO_PURPOSES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <div>
                <label className="mb-2 block text-sm text-white/70">ประเภทงานกราฟิก</label>
                <select
                  value={graphicJobType}
                  onChange={(e) => setGraphicJobType(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-white/20"
                >
                  {GRAPHIC_JOB_TYPES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm text-white/70">รายละเอียด</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-white/20"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/70 hover:bg-white/10"
              disabled={submitting}
            >
              ยกเลิก
            </button>
            <button
              onClick={submit}
              className="rounded-2xl bg-[#e5ff78] px-5 py-3 text-sm font-semibold text-black hover:brightness-95 disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}