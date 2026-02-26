// app/(app)/projects/CreateProjectModal.tsx
"use client";

import React, { useMemo, useState } from "react";

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
  onCreated: () => void | Promise<void>;
  members: Member[];
};

const BRANDS = ["IRONTEC", "IVADE", "AMURO", "THE GYM CO.", "OVCM"] as const;

const PRODUCT_GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

const VIDEO_PRIORITIES = ["5ดาว", "4ดาว", "3ดาว", "2ดาว", "1ดาว", "SPECIAL"] as const;

const VIDEO_PURPOSES = [
  "สร้างความต้องการ",
  "กระตุ้นความสนใจ",
  "ให้ข้อมูลสินค้า",
  "สร้างความน่าเชื่อถือ",
  "มิติการแข่งขัน",
  "Sponsor",
] as const;

const GRAPHIC_JOB_TYPES = [
  "Support MKT",
  "Support Sale",
  "Support VIDEO",
  "ถ่ายภาพนิ่ง",
  "งานทั่วไป",
  "Promotion / Campaign",
  "งานพิเศษ",
  "Ai Photo",
] as const;

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export default function CreateProjectModal({ open, onClose, onCreated, members }: Props) {
  const [type, setType] = useState<"VIDEO" | "GRAPHIC">("VIDEO");

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");

  // ✅ เพิ่ม "กลุ่มสินค้า" กลับมา (A-H)
  const [productGroup, setProductGroup] = useState<(typeof PRODUCT_GROUPS)[number] | "">("");

  const [brand, setBrand] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");

  const [startDate, setStartDate] = useState<string>(""); // datetime-local
  const [dueDate, setDueDate] = useState<string>(""); // datetime-local

  const [videoPriority, setVideoPriority] = useState<(typeof VIDEO_PRIORITIES)[number]>("3ดาว");
  const [videoPurpose, setVideoPurpose] = useState<(typeof VIDEO_PURPOSES)[number]>("สร้างความต้องการ");

  const [graphicJobType, setGraphicJobType] = useState<(typeof GRAPHIC_JOB_TYPES)[number]>("Support MKT");

  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const activeMembers = useMemo(
    () => (Array.isArray(members) ? members : []).filter((m) => m.is_active !== false),
    [members]
  );

  // ✅ แสดงผู้รับผิดชอบเฉพาะฝ่ายที่เลือก (VIDEO -> เฉพาะ VIDEO, GRAPHIC -> เฉพาะ GRAPHIC)
  const assigneeOptions = useMemo(() => {
    const list = activeMembers.filter((m) => m.department === type);
    return list.sort((a, b) => (a.display_name || "").localeCompare(b.display_name || "", "th"));
  }, [activeMembers, type]);

  function resetForm() {
    setType("VIDEO");
    setCode("");
    setTitle("");
    setProductGroup("");
    setBrand("");
    setAssigneeId("");
    setStartDate("");
    setDueDate("");
    setVideoPriority("3ดาว");
    setVideoPurpose("สร้างความต้องการ");
    setGraphicJobType("Support MKT");
    setDescription("");
    setError("");
  }

  if (!open) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("กรุณากรอกชื่อโปรเจกต์");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        type,
        department: type,
        status: "TODO",
        title: title.trim(),
        code: code.trim() || null,

        // ✅ ส่งกลุ่มสินค้าไปด้วย (ชื่อฟิลด์: product_group)
        // ถ้าตารางคุณใช้ชื่ออื่น เปลี่ยน key นี้เป็นชื่อคอลัมน์จริงได้เลย
        product_group: productGroup || null,

        brand: brand || null,
        assignee_id: assigneeId || null,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        description: description.trim() || null,
      };

      if (type === "VIDEO") {
        payload.video_priority = videoPriority;
        payload.video_purpose = videoPurpose;
        payload.graphic_job_type = null;
      } else {
        payload.graphic_job_type = graphicJobType;
        payload.video_priority = null;
        payload.video_purpose = null;
      }

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await safeJson(res);
      if (!res.ok) {
        setError((json && (json.error || json.message)) || `Create failed (${res.status})`);
        return;
      }

      await onCreated?.();
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 bg-black px-6 py-5">
          <div>
            <div className="text-lg font-extrabold text-white">สร้างงานใหม่</div>
            <div className="mt-1 text-sm text-white/50">กรอกข้อมูลงาน แล้วกดสร้าง</div>
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            ปิด
          </button>
        </div>

        {/* Body */}
        <form onSubmit={onSubmit} className="px-6 py-6">
          {/* Row 1: type + code */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <div className="text-xs font-semibold text-white/60">ฝ่าย</div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setType("VIDEO")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
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
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
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
              <label className="text-xs font-semibold text-white/60">รหัสโปรเจกต์ (code)</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="เช่น 5x-1234 / 0001 / 22"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78]"
              />
            </div>
          </div>

          {/* Row 2: title */}
          <div className="mt-4">
            <label className="text-xs font-semibold text-white/60">ชื่อโปรเจกต์</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น Ads กระเป๋า..."
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78]"
            />
          </div>

          {/* Row 3: product_group + brand */}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-white/60">กลุ่มสินค้า</label>
              <select
                value={productGroup}
                onChange={(e) => setProductGroup(e.target.value as any)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
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
              <label className="text-xs font-semibold text-white/60">แบรนด์</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
              >
                <option value="">-</option>
                {BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: assignee */}
          <div className="mt-4">
            <label className="text-xs font-semibold text-white/60">ผู้รับผิดชอบ</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
            >
              <option value="">-</option>
              {assigneeOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name || m.id}
                </option>
              ))}
            </select>
          </div>

          {/* Row 5: dates */}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-white/60">วันสั่งงาน</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78] [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-white/60">Deadline</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78] [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Row 6: type-specific fields */}
          {type === "VIDEO" ? (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-white/60">ความสำคัญ</label>
                <select
                  value={videoPriority}
                  onChange={(e) => setVideoPriority(e.target.value as any)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
                >
                  {VIDEO_PRIORITIES.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-white/60">รูปแบบ</label>
                <select
                  value={videoPurpose}
                  onChange={(e) => setVideoPurpose(e.target.value as any)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
                >
                  {VIDEO_PURPOSES.map((x, idx) => (
                    <option key={x} value={x}>
                      {idx}. {x}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <label className="text-xs font-semibold text-white/60">ประเภทงาน (Graphic)</label>
              <select
                value={graphicJobType}
                onChange={(e) => setGraphicJobType(e.target.value as any)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
              >
                {GRAPHIC_JOB_TYPES.map((x, idx) => (
                  <option key={x} value={x}>
                    {idx + 1}. {x}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Details */}
          <div className="mt-4">
            <label className="text-xs font-semibold text-white/60">รายละเอียด</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ใส่รายละเอียดงานเพิ่มเติมได้"
              className="mt-2 h-32 w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78]"
            />
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {/* Footer */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 hover:bg-white/10"
              disabled={submitting}
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              className="rounded-2xl bg-[#e5ff78] px-6 py-3 text-sm font-extrabold text-black hover:opacity-90 disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? "กำลังสร้าง..." : "สร้างงาน"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}