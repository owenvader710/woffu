"use client";

import React, { useEffect, useMemo, useState } from "react";

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
  department: "VIDEO" | "GRAPHIC" | "ALL";
  start_date: string | null;
  due_date: string | null;
  assignee_id: string | null;

  brand: string | null;
  description: string | null;

  video_priority: "2" | "3" | "5" | "SPECIAL" | null;
  video_purpose: string | null;

  graphic_job_type: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  project: Project;
  members: Member[];
  onSaved: () => void | Promise<void>;
};

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const VIDEO_BRANDS = ["IRONTEC","THE GYM CO","IVADE","AMURO","FLOORBLOCK","WHEY ZONE","FITNOMIC","OVCM","MDBuddy"];
const GRAPHIC_BRANDS = ["IRONTEC","THE GYM CO","IVADE","AMURO","MEGA","ENJOY","JOCKO","EXSER","หมามีกล้าม","DECATHLON","HOMEPRO","CENTRAL","SPINX","บทความ","SHOPEE","FITOUTLET","ALLSHOP","FLOORBLOCK","LAZADA","WHEY ZONE","FITNOMIC","ALL","OVCM","MDBuddy"];

const VIDEO_PRIORITIES = ["2","3","5","SPECIAL"] as const;
const VIDEO_PURPOSES = ["สร้างความต้องการ","กระตุ้นความสนใจ","ให้ข้อมูลสินค้า","สร้างความหน้าเชื่อถือ","มิติการแข่งขัน","สปอนเซอร์"] as const;
const GRAPHIC_JOB_TYPES = ["ซัพพอร์ต MKT","ซัพพอร์ต SALE","ซัพพอร์ต VIDEO","ถ่ายภาพนิ่ง","งานทั่วไป","Promotion / Campaign","Special Job"] as const;

export default function EditProjectModal({ open, onClose, project, members, onSaved }: Props) {
  const [title, setTitle] = useState(project.title);
  const [type, setType] = useState<Project["type"]>(project.type);

  const [brand, setBrand] = useState(project.brand ?? "");
  const [assigneeId, setAssigneeId] = useState(project.assignee_id ?? "");

  const [startDate, setStartDate] = useState(project.start_date ?? "");
  const [dueDate, setDueDate] = useState(project.due_date ?? "");

  const [videoPriority, setVideoPriority] = useState<Project["video_priority"]>(project.video_priority ?? null);
  const [videoPurpose, setVideoPurpose] = useState(project.video_purpose ?? "");

  const [graphicJobType, setGraphicJobType] = useState(project.graphic_job_type ?? "");

  const [description, setDescription] = useState(project.description ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const activeMembers = useMemo(
    () => (members || []).filter((m) => m.is_active !== false),
    [members]
  );

  const brands = useMemo(() => (type === "VIDEO" ? VIDEO_BRANDS : GRAPHIC_BRANDS), [type]);

  useEffect(() => {
    // sync when open/project changes
    if (!open) return;
    setTitle(project.title);
    setType(project.type);
    setBrand(project.brand ?? "");
    setAssigneeId(project.assignee_id ?? "");
    setStartDate(project.start_date ?? "");
    setDueDate(project.due_date ?? "");
    setVideoPriority(project.video_priority ?? null);
    setVideoPurpose(project.video_purpose ?? "");
    setGraphicJobType(project.graphic_job_type ?? "");
    setDescription(project.description ?? "");
    setErr("");
  }, [open, project]);

  if (!open) return null;

  async function submit() {
    setErr("");
    if (!title.trim()) return setErr("กรุณาใส่ชื่อโปรเจกต์");

    setSubmitting(true);
    try {
      const payload: any = {
        title: title.trim(),
        type,
        department: type, // ตามระบบเดิมของนายท่าน (ใช้ type เป็นฝ่าย)
        brand: brand || null,
        assignee_id: assigneeId || null,
        start_date: startDate || null,
        due_date: dueDate || null,
        description: description || null,
      };

      if (type === "VIDEO") {
        payload.video_priority = videoPriority || null;
        payload.video_purpose = videoPurpose || null;
        payload.graphic_job_type = null;
      } else {
        payload.graphic_job_type = graphicJobType || null;
        payload.video_priority = null;
        payload.video_purpose = null;
      }

      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await safeJson(res);
      if (!res.ok) {
        setErr((json && (json.error || json.message)) || `Save failed (${res.status})`);
        return;
      }

      await onSaved();
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">แก้ไขโปรเจกต์</h2>
            <p className="mt-1 text-sm text-gray-500">Edit project details</p>
          </div>
          <button onClick={onClose} className="rounded-xl px-3 py-2 text-sm hover:bg-gray-100">✕</button>
        </div>

        {err && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{err}</div>}

        {/* ฝ่าย + ชื่อ */}
        <div className="mt-5 grid grid-cols-1 gap-4">
          <div>
            <label className="text-sm font-medium">ชื่อโปรเจกต์</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border px-4 py-2 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setType("VIDEO")}
              className={`rounded-xl border px-4 py-2 text-sm ${type === "VIDEO" ? "bg-black text-white" : "hover:bg-gray-50"}`}
            >
              VIDEO
            </button>
            <button
              onClick={() => setType("GRAPHIC")}
              className={`rounded-xl border px-4 py-2 text-sm ${type === "GRAPHIC" ? "bg-black text-white" : "hover:bg-gray-50"}`}
            >
              GRAPHIC
            </button>
          </div>

          {/* brand */}
          <div>
            <label className="text-sm font-medium">แบรนด์</label>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="mt-1 w-full rounded-xl border px-4 py-2 text-sm"
            >
              <option value="">- ไม่ระบุ -</option>
              {brands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* video-only */}
          {type === "VIDEO" && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">ความสำคัญ</label>
                <select
                  value={videoPriority ?? ""}
                  onChange={(e) => setVideoPriority((e.target.value as any) || null)}
                  className="mt-1 w-full rounded-xl border px-4 py-2 text-sm"
                >
                  <option value="">- ไม่ระบุ -</option>
                  {VIDEO_PRIORITIES.map((x) => (
                    <option key={x} value={x}>{x === "SPECIAL" ? "SPECIAL" : `${x} ดาว`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">รูปแบบงาน</label>
                <select
                  value={videoPurpose}
                  onChange={(e) => setVideoPurpose(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-4 py-2 text-sm"
                >
                  <option value="">- ไม่ระบุ -</option>
                  {VIDEO_PURPOSES.map((x) => (
                    <option key={x} value={x}>{x}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* graphic-only */}
          {type === "GRAPHIC" && (
            <div>
              <label className="text-sm font-medium">ประเภทงาน</label>
              <select
                value={graphicJobType}
                onChange={(e) => setGraphicJobType(e.target.value)}
                className="mt-1 w-full rounded-xl border px-4 py-2 text-sm"
              >
                <option value="">- ไม่ระบุ -</option>
                {GRAPHIC_JOB_TYPES.map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
            </div>
          )}

          {/* assignee */}
          <div>
            <label className="text-sm font-medium">ผู้รับงาน (Assignee)</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="mt-1 w-full rounded-xl border px-4 py-2 text-sm"
            >
              <option value="">- ไม่ระบุ -</option>
              {activeMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {(m.display_name || "-") + ` (${m.department})`}
                </option>
              ))}
            </select>
          </div>

          {/* dates */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">เริ่ม</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-xl border px-4 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Deadline</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full rounded-xl border px-4 py-2 text-sm"
              />
            </div>
          </div>

          {/* description */}
          <div>
            <label className="text-sm font-medium">คำอธิบาย</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="mt-1 w-full rounded-xl border px-4 py-2 text-sm"
              placeholder="ใส่รายละเอียดงาน / ลิงก์ / หมายเหตุ"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
            disabled={submitting}
          >
            ยกเลิก
          </button>
          <button
            onClick={submit}
            className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}