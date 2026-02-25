// app/(app)/projects/CreateProjectModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { buildProjectDescription } from "@/utils/projectMeta";

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
  onCreated?: () => void;
};

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

async function safeJson(res: Response) {
  try {
    const t = await res.text();
    return t ? JSON.parse(t) : null;
  } catch {
    return null;
  }
}

export default function CreateProjectModal({ open, onClose, onCreated }: Props) {
  const [type, setType] = useState<"VIDEO" | "GRAPHIC">("VIDEO");
  const brands = useMemo(() => (type === "VIDEO" ? VIDEO_BRANDS : GRAPHIC_BRANDS), [type]);

  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState<string>("IRONTEC");

  const [productCode, setProductCode] = useState<string>("");
  const [productGroup, setProductGroup] = useState<string>("");

  const [assigneeId, setAssigneeId] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);

  const [startDate, setStartDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");

  const [videoPriority, setVideoPriority] =
    useState<(typeof VIDEO_PRIORITIES)[number]>("3ดาว");
  const [videoPurpose, setVideoPurpose] =
    useState<(typeof VIDEO_PURPOSES)[number]>("สร้างความต้องการ");
  const [graphicJobType, setGraphicJobType] =
    useState<(typeof GRAPHIC_JOB_TYPES)[number]>("ซัพพอร์ต MKT");

  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const activeMembers = useMemo(
    () => (Array.isArray(members) ? members.filter((m) => m?.is_active !== false) : []),
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

  // ✅ กรองรายชื่อที่จะแสดงใน Dropdown ตามฝ่ายที่เลือก (VIDEO หรือ GRAPHIC)
  const displayAssignees = useMemo(() => {
    const primaryGroup = type === "VIDEO" ? groupedMembers.video : groupedMembers.graphic;
    const allGroup = groupedMembers.all;
    return { primaryGroup, allGroup };
  }, [type, groupedMembers]);

  // โหลดสมาชิก
  useEffect(() => {
    if (!open) return;

    (async () => {
      setErr("");
      try {
        const r = await fetch("/api/members", { cache: "no-store" });
        const j = await safeJson(r);
        const data = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
        setMembers(data);
      } catch {
        setMembers([]);
      }
    })();
  }, [open]);

  // เมื่อเปลี่ยน type (ฝ่าย) ให้ reset brand และ assignee
  useEffect(() => {
    setBrand(brands[0] ?? "IRONTEC");
    setAssigneeId("");
  }, [brands, type]);

  async function submit() {
    setErr("");
    setMsg("");

    const t = title.trim();
    if (!t) return setErr("กรุณาใส่ชื่อโปรเจกต์");

    setSubmitting(true);
    try {
      const startISO = startDate ? new Date(startDate).toISOString() : null;
      const dueISO = dueDate ? new Date(dueDate).toISOString() : null;

      // ✅ buildProjectDescription(meta, description) — ปลอดภัย ไม่ต้องเพิ่มคอลัมน์ DB
      const finalDescription =
        buildProjectDescription(
          {
            productCode: productCode.trim() || undefined,
            productGroup: productGroup.trim() || undefined,
          },
          description?.trim() || ""
        ) || null;

      const payload: any = {
        title: t,
        type,
        department: type,
        brand,
        assignee_id: assigneeId || null,
        start_date: startISO,
        due_date: dueISO,
        description: finalDescription,
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
        setErr((json && (json.error || json.message)) || `Create failed (${res.status})`);
        return;
      }

      setMsg("สร้างโปรเจกต์แล้ว");
      onCreated?.();
      onClose();

      // reset
      setTitle("");
      setProductCode("");
      setProductGroup("");
      setAssigneeId("");
      setStartDate("");
      setDueDate("");
      setDescription("");
      setVideoPriority("3ดาว");
      setVideoPurpose("สร้างความต้องการ");
      setGraphicJobType("ซัพพอร์ต MKT");
    } catch (e: any) {
      setErr(e?.message || "Create failed");
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
            <div className="text-lg font-extrabold tracking-tight">สั่งงานใหม่</div>
            <div className="mt-1 text-sm text-white/45">Create new project</div>
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

        {/* Body */}
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

          {/* Type */}
          <div className="mb-5">
            <div className="mb-2 text-sm font-semibold text-white/80">ฝ่าย</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("VIDEO")}
                className={[
                  "rounded-2xl border px-4 py-2 text-sm font-semibold transition",
                  type === "VIDEO"
                    ? "border-[#e5ff78]/20 bg-[#e5ff78] text-black"
                    : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10",
                ].join(" ")}
              >
                VIDEO
              </button>
              <button
                type="button"
                onClick={() => setType("GRAPHIC")}
                className={[
                  "rounded-2xl border px-4 py-2 text-sm font-semibold transition",
                  type === "GRAPHIC"
                    ? "border-[#e5ff78]/20 bg-[#e5ff78] text-black"
                    : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10",
                ].join(" ")}
              >
                GRAPHIC
              </button>
            </div>
          </div>

          {/* Code + Title */}
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-semibold text-white/80">รหัสสินค้า</div>
              <input
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78]"
                placeholder="เช่น IT-1234"
              />
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold text-white/80">ชื่อโปรเจกต์</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78]"
                placeholder="เช่น ทำคลิปรีวิวลู่วิ่ง"
              />
            </div>
          </div>

          {/* Product Group + Brand */}
          <div className="mb-5">
            <div className="mb-2 text-sm font-semibold text-white/80">กลุ่มสินค้า</div>
            <select
              value={productGroup}
              onChange={(e) => setProductGroup(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
            >
              <option value="">- เลือกกลุ่มสินค้า (A-H) -</option>
              {Array.from({ length: 8 }).map((_, idx) => {
                const v = String.fromCharCode("A".charCodeAt(0) + idx);
                return (
                  <option key={v} value={v} className="bg-black">
                    {v}
                  </option>
                );
              })}
            </select>

            <div className="mt-4 mb-2 text-sm font-semibold text-white/80">แบรนด์ของสินค้า</div>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
            >
              {brands.map((b) => (
                <option key={b} value={b} className="bg-black">
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee */}
          <div className="mb-5">
            <div className="mb-2 text-sm font-semibold text-white/80">ผู้รับงาน (Assignee)</div>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
            >
              <option value="">- ไม่ระบุ -</option>

              {displayAssignees.primaryGroup.length ? (
                <optgroup label={type}>
                  {displayAssignees.primaryGroup.map((m) => (
                    <option key={m.id} value={m.id} className="bg-black">
                      {m.display_name || m.id}
                    </option>
                  ))}
                </optgroup>
              ) : null}

              {displayAssignees.allGroup.length ? (
                <optgroup label="ADMIN / ALL">
                  {displayAssignees.allGroup.map((m) => (
                    <option key={m.id} value={m.id} className="bg-black">
                      {m.display_name || m.id}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>

            {!activeMembers.length ? (
              <div className="mt-2 text-xs text-white/40">* กำลังโหลดรายชื่อสมาชิก...</div>
            ) : null}
          </div>

          {/* Extras */}
          <div className="mb-5 rounded-[22px] border border-white/10 bg-white/5 p-5">
            <div className="mb-3 text-sm font-extrabold text-white/85">ตั้งค่าเพิ่มเติม ({type})</div>

            {type === "VIDEO" ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-sm font-semibold text-white/80">ความสำคัญของงาน</div>
                  <select
                    value={videoPriority}
                    onChange={(e) => setVideoPriority(e.target.value as any)}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
                  >
                    {VIDEO_PRIORITIES.map((p) => (
                      <option key={p} value={p} className="bg-black">
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="mb-2 text-sm font-semibold text-white/80">รูปแบบของงาน</div>
                  <select
                    value={videoPurpose}
                    onChange={(e) => setVideoPurpose(e.target.value as any)}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
                  >
                    {VIDEO_PURPOSES.map((v) => (
                      <option key={v} value={v} className="bg-black">
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-2 text-sm font-semibold text-white/80">ประเภทงาน</div>
                <select
                  value={graphicJobType}
                  onChange={(e) => setGraphicJobType(e.target.value as any)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
                >
                  {GRAPHIC_JOB_TYPES.map((v) => (
                    <option key={v} value={v} className="bg-black">
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-semibold text-white/80">เริ่ม</div>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78] [color-scheme:dark]"
              />
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold text-white/80">Deadline</div>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78] [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Description */}
          <div className="mb-2">
            <div className="mb-2 text-sm font-semibold text-white/80">คำอธิบาย</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-28 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78]"
              placeholder="ใส่รายละเอียดของงาน / ข้อมูลสำคัญ / ลิงก์ ref ฯลฯ"
            />
          </div>
        </div>

        {/* Footer */}
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
            {submitting ? "กำลังสั่งงาน..." : "สั่งงาน"}
          </button>
        </div>
      </div>
    </div>
  );
}