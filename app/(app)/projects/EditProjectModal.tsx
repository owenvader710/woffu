"use client";

import React, { useEffect, useMemo, useState } from "react";

// ✅ CONFIG Constants
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
  project: Project;
  members: Member[];
};

async function safeJson(res: Response) {
  try {
    const t = await res.text();
    return t ? JSON.parse(t) : null;
  } catch { return null; }
}

export default function EditProjectModal({ open, onClose, onSaved, project, members }: Props) {
  // 1. State สำหรับการสลับฝ่าย (ให้แก้ไขได้เหมือนตอนสร้าง)
  const [type, setType] = useState<"VIDEO" | "GRAPHIC">("VIDEO");
  
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

  // 2. กรองข้อมูลตาม Type ที่เลือก (Dynamic)
  const brands = useMemo(() => (type === "VIDEO" ? VIDEO_BRANDS : GRAPHIC_BRANDS), [type]);

  const displayAssignees = useMemo(() => {
    const active = Array.isArray(members) ? members.filter(m => m.is_active !== false) : [];
    const primary = active.filter(m => m.department === type);
    const common = active.filter(m => m.department === "ALL");
    return { primary, common };
  }, [members, type]);

  // 3. Sync ข้อมูลเมื่อเปิด Modal หรือ Project เปลี่ยน
  useEffect(() => {
    if (!open || !project) return;

    setErr("");
    setMsg("");
    
    setType(project.type || "VIDEO");
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

    // ✅ ตรวจสอบ ID หลายรูปแบบ (เผื่อว่า API ส่งมาเป็น .id หรือ ._id)
    const projectId = project?.id; 

    if (!projectId) {
      console.error("Project Object:", project); // ดูใน Console ว่า project หน้าตาเป็นยังไง
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
        title: title.trim(),
        type: type,
        brand: brand || null,
        assignee_id: assigneeId || null,
        start_date: startDate || null,
        due_date: dueDate || null,
        description: description?.trim() || null,
        video_priority: type === "VIDEO" ? videoPriority : null,
        video_purpose: type === "VIDEO" ? videoPurpose : null,
        graphic_job_type: type === "GRAPHIC" ? graphicJobType : null,
      };

      // ✅ ส่งไปที่ /api/projects/[id]
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await safeJson(res);
      
      if (!res.ok) {
        throw new Error(json?.error || json?.message || `Save failed: ${res.status}`);
      }

      setMsg("บันทึกการแก้ไขเรียบร้อย");
      onSaved?.();
      
      // หน่วงเวลาปิดนิดนึงให้คนใช้เห็นว่า "บันทึกแล้ว"
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (e: any) {
      setErr(e.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0b0b] text-white shadow-[0_30px_120px_rgba(0,0,0,0.75)]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <div className="text-lg font-extrabold tracking-tight">แก้ไขงาน</div>
            <div className="mt-1 text-sm text-white/45 text-xs">ID: {project.id}</div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white">✕</button>
        </div>

        <div className="max-h-[75vh] overflow-auto px-6 py-5">
          {err && <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{err}</div>}
          {msg && <div className="mb-4 rounded-xl bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400">{msg}</div>}

          {/* ฝ่าย (สลับได้เหมือนหน้า Create) */}
          <div className="mb-5">
            <div className="mb-2 text-sm font-semibold text-white/80">สลับฝ่าย</div>
            <div className="flex gap-2">
              {["VIDEO", "GRAPHIC"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t as any)}
                  className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                    type === t ? "border-[#e5ff78]/20 bg-[#e5ff78] text-black" : "border-white/10 bg-white/5 text-white/80"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <div className="mb-2 text-sm font-semibold text-white/80">ชื่อโปรเจกต์</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]"
            />
          </div>

          <div className="mb-5">
            <div className="mb-2 text-sm font-semibold text-white/80">แบรนด์</div>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]"
            >
              {brands.map((b) => <option key={b} value={b} className="bg-black">{b}</option>)}
            </select>
          </div>

          <div className="mb-5">
            <div className="mb-2 text-sm font-semibold text-white/80">ผู้รับงาน (Assignee)</div>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]"
            >
              <option value="">- ไม่ระบุ -</option>
              <optgroup label={type}>
                {displayAssignees.primary.map(m => (
                  <option key={m.id} value={m.id} className="bg-black">{m.display_name || m.id}</option>
                ))}
              </optgroup>
              <optgroup label="ADMIN / ALL">
                {displayAssignees.common.map(m => (
                  <option key={m.id} value={m.id} className="bg-black">{m.display_name || m.id}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="mb-5 rounded-[22px] border border-white/10 bg-white/5 p-5">
            <div className="mb-3 text-sm font-extrabold text-[#e5ff78]">ตั้งค่าเพิ่มเติม ({type})</div>
            {type === "VIDEO" ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-sm font-semibold text-white/80">ความสำคัญ</div>
                  <select value={videoPriority} onChange={(e) => setVideoPriority(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none">
                    {VIDEO_PRIORITIES.map(p => <option key={p} value={p} className="bg-black">{p}</option>)}
                  </select>
                </div>
                <div>
                  <div className="mb-2 text-sm font-semibold text-white/80">รูปแบบงาน</div>
                  <select value={videoPurpose} onChange={(e) => setVideoPurpose(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none">
                    {VIDEO_PURPOSES.map(v => <option key={v} value={v} className="bg-black">{v}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-2 text-sm font-semibold text-white/80">ประเภทงานกราฟิก</div>
                <select value={graphicJobType} onChange={(e) => setGraphicJobType(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none">
                  {GRAPHIC_JOB_TYPES.map(g => <option key={g} value={g} className="bg-black">{g}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-semibold text-white/80">เริ่ม</div>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]"/>
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold text-white/80">Deadline</div>
              <input
  type="date"
  value={startDate}
  onChange={(e) => setStartDate(e.target.value)}
  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78] [color-scheme:dark]" 
/>
            </div>
          </div>

          <div className="mb-2">
            <div className="mb-2 text-sm font-semibold text-white/80">คำอธิบาย</div>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="h-28 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-6 py-5">
          <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold">ยกเลิก</button>
          <button type="button" onClick={submit} disabled={submitting} className="rounded-2xl bg-[#e5ff78] px-5 py-2 text-sm font-extrabold text-black hover:opacity-90 disabled:opacity-50">
            {submitting ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}