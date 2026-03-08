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

const PRODUCT_GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

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
  product_group?: (typeof PRODUCT_GROUPS)[number] | string | null;
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
  project: Project | null;
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

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
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

export default function EditProjectModal({ open, onClose, onSaved, project, members }: Props) {
  const [type, setType] = useState<"VIDEO" | "GRAPHIC">("VIDEO");

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [productGroup, setProductGroup] = useState<(typeof PRODUCT_GROUPS)[number] | "">("");
  const [brand, setBrand] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");

  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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

    const parsed = parseDescriptionAndAttachment(project.description);

    setErr("");
    setMsg("");

    setType(project.type || "VIDEO");
    setCode(project.code || "");
    setTitle(project.title || "");
    setProductGroup((project.product_group as (typeof PRODUCT_GROUPS)[number]) || "");
    setBrand(project.brand || "");
    setAssigneeId(project.assignee_id || "");
    setStartDate(toDateTimeLocalValue(project.start_date));
    setDueDate(toDateTimeLocalValue(project.due_date));
    setDescription(parsed.cleanDescription || "");
    setAttachmentName(parsed.attachmentName);
    setAttachmentUrl(parsed.attachmentUrl);
    setVideoPriority(project.video_priority || "3ดาว");
    setVideoPurpose(project.video_purpose || "สร้างความต้องการ");
    setGraphicJobType(project.graphic_job_type || "ซัพพอร์ต MKT");
  }, [open, project]);

  useEffect(() => {
    if (brand && !brands.includes(brand as any)) {
      setBrand("");
    }
  }, [type, brand, brands]);

  async function uploadFile(file: File) {
    setUploading(true);
    setErr("");

    try {
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("ไฟล์มีขนาดเกิน 5MB");
      }

      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/projects/upload", {
        method: "POST",
        body: form,
      });

      const json = await safeJson(res);
      if (!res.ok) {
        throw new Error((json && (json.error || json.message)) || "Upload failed");
      }

      setAttachmentUrl(json?.data?.url || null);
      setAttachmentName(json?.data?.name || null);
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

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
      const finalDescription = [
        description.trim() || "",
        attachmentUrl ? `\n\n[แนบไฟล์] ${attachmentName || "file"}\n${attachmentUrl}` : "",
      ]
        .join("")
        .trim();

      const payload: any = {
        code: code.trim() || null,
        title: title.trim(),
        type,
        department: type,
        product_group: productGroup || null,
        brand: brand || null,
        assignee_id: assigneeId || null,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        description: finalDescription || null,
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-3 md:flex md:items-center md:justify-center md:p-4">
      <div className="mx-auto mt-0 flex min-h-[calc(100vh-24px)] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0b0b] text-white shadow-[0_30px_120px_rgba(0,0,0,0.75)] md:min-h-0 md:max-h-[92vh]">
        <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-white/10 bg-[#0b0b0b] px-4 py-4 sm:flex-row sm:items-start sm:justify-between md:px-6 md:py-5">
          <div className="min-w-0">
            <div className="text-lg font-extrabold tracking-tight">แก้ไขงาน</div>
            <div className="text-sm text-white/50">แก้ไขข้อมูล แล้วกดบันทึก</div>
          </div>
          <button
            onClick={onClose}
            className="w-fit rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 hover:bg-white/10"
          >
            ปิด
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <div className="text-xs font-semibold text-white/60">ฝ่าย</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType("VIDEO")}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    type === "VIDEO"
                      ? "bg-[#e5ff78] text-black"
                      : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  VIDEO
                </button>
                <button
                  type="button"
                  onClick={() => setType("GRAPHIC")}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    type === "GRAPHIC"
                      ? "bg-[#e5ff78] text-black"
                      : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  GRAPHIC
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-semibold text-white/60">รหัสโปรเจกต์</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]"
                placeholder="เช่น 5x-1234 / 0001"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-xs font-semibold text-white/60">ชื่อโปรเจกต์</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold text-white/60">กลุ่มสินค้า</label>
              <select
                value={productGroup}
                onChange={(e) => setProductGroup(e.target.value as any)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]"
              >
                <option value="">-</option>
                {PRODUCT_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-white/60">แบรนด์</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]"
              >
                <option value="">-</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-xs font-semibold text-white/60">ผู้รับผิดชอบ</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]"
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

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold text-white/60">วันสั่งงาน</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#e5ff78] [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-white/60">Deadline</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#e5ff78] [color-scheme:dark]"
              />
            </div>
          </div>

          {type === "VIDEO" ? (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold text-white/60">ความสำคัญ</label>
                <select
                  value={videoPriority}
                  onChange={(e) => setVideoPriority(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]"
                >
                  {VIDEO_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-white/60">รูปแบบ</label>
                <select
                  value={videoPurpose}
                  onChange={(e) => setVideoPurpose(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]"
                >
                  {VIDEO_PURPOSES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <label className="mb-2 block text-xs font-semibold text-white/60">ประเภทงานกราฟิก</label>
              <select
                value={graphicJobType}
                onChange={(e) => setGraphicJobType(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]"
              >
                {GRAPHIC_JOB_TYPES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-4">
            <label className="mb-2 block text-xs font-semibold text-white/60">รายละเอียด</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]"
            />

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex w-full cursor-pointer items-center gap-2 text-xs text-white/70 sm:w-auto">
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadFile(file);
                  }}
                />
                <span className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center hover:bg-white/10 sm:w-auto">
                  {uploading ? "กำลังอัปโหลด..." : "แนบรูปหรือไฟล์ (ไม่เกิน 5MB)"}
                </span>
              </label>
            </div>

            {attachmentName ? (
              <div className="mt-3 break-words rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80">
                แนบแล้ว: {attachmentName}
              </div>
            ) : null}
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-white/10 bg-[#0b0b0b] px-4 py-4 md:px-6">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              onClick={onClose}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/70 hover:bg-white/10 sm:w-auto"
              disabled={submitting}
            >
              ยกเลิก
            </button>
            <button
              onClick={submit}
              className="w-full rounded-2xl bg-[#e5ff78] px-5 py-3 text-sm font-semibold text-black hover:brightness-95 disabled:opacity-60 sm:w-auto"
              disabled={submitting || uploading}
            >
              {submitting ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}