"use client";

import React, { useEffect, useMemo, useState } from "react";

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
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-sm font-semibold text-white/80">{children}</div>;
}

function InputBase(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white",
        "placeholder:text-white/30 outline-none focus:border-[#e5ff78] focus:ring-2 focus:ring-[#e5ff78]/15",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function SelectBase(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        "w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none",
        "focus:border-[#e5ff78] focus:ring-2 focus:ring-[#e5ff78]/15",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function TextareaBase(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        "w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white",
        "placeholder:text-white/30 outline-none focus:border-[#e5ff78] focus:ring-2 focus:ring-[#e5ff78]/15",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

export default function CreateProjectModal({ open, onClose, onCreated }: Props) {
  // ✅ Hooks ต้องอยู่ top-level เสมอ (ห้ามมี hook หลัง if(!open) return null)
  const [type, setType] = useState<"VIDEO" | "GRAPHIC">("VIDEO");

  const brands = useMemo(() => (type === "VIDEO" ? VIDEO_BRANDS : GRAPHIC_BRANDS), [type]);

  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState<string>("IRONTEC");

  const [assigneeId, setAssigneeId] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);

  const [startDate, setStartDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");

  const [videoPriority, setVideoPriority] = useState<(typeof VIDEO_PRIORITIES)[number]>("3ดาว");
  const [videoPurpose, setVideoPurpose] = useState<(typeof VIDEO_PURPOSES)[number]>("สร้างความต้องการ");

  const [graphicJobType, setGraphicJobType] = useState<(typeof GRAPHIC_JOB_TYPES)[number]>("ซัพพอร์ต MKT");

  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // ✅ reset brand ให้สัมพันธ์กับ type
  useEffect(() => {
    setBrand(brands[0] ?? "IRONTEC");
  }, [brands]);

  // ✅ โหลดสมาชิกตอนเปิด modal
  useEffect(() => {
    if (!open) return;

    (async () => {
      setErr("");
      setMsg("");
      try {
        const r = await fetch("/api/members", { cache: "no-store" });
        const j = await safeJson(r);
        const data = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
        setMembers((data as Member[]).filter((m) => m.is_active !== false));
      } catch {
        setMembers([]);
      }
    })();
  }, [open]);

  // ✅ แยกสมาชิกตามฝ่าย + ให้เลือกตาม type (แต่ ALL แสดงได้ทั้งสอง)
  const memberOptions = useMemo(() => {
    const list = members.filter((m) => m.is_active !== false);
    const video = list.filter((m) => m.department === "VIDEO" || m.department === "ALL");
    const graphic = list.filter((m) => m.department === "GRAPHIC" || m.department === "ALL");

    // เวลาเลือก VIDEO -> ให้ขึ้นกลุ่ม VIDEO ก่อน, GRAPHIC ซ่อนไปเลย (กันเลือกผิด)
    if (type === "VIDEO") return { video, graphic: [] as Member[] };
    return { video: [] as Member[], graphic };
  }, [members, type]);

  async function submit() {
    setErr("");
    setMsg("");

    const t = title.trim();
    if (!t) return setErr("กรุณาใส่ชื่อโปรเจกต์");

    setSubmitting(true);
    try {
      const payload: any = {
        title: t,
        type,
        department: type,
        brand,
        assignee_id: assigneeId || null,
        start_date: startDate || null,
        due_date: dueDate || null,
        description: description?.trim() || null,
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
      <div className="w-full max-w-3xl rounded-[28px] border border-white/10 bg-[#0b0b0b] text-white shadow-[0_30px_120px_rgba(0,0,0,0.7)]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 p-5">
          <div>
            <div className="text-lg font-extrabold tracking-tight">สั่งงานใหม่</div>
            <div className="mt-0.5 text-sm text-white/50">Create new project</div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 hover:bg-white/10"
            title="ปิด"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[75vh] overflow-auto p-5">
          {err && (
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {err}
            </div>
          )}
          {msg && (
            <div className="mb-4 rounded-2xl border border-[#e5ff78]/25 bg-[#e5ff78]/10 p-3 text-sm text-[#e5ff78]">
              {msg}
            </div>
          )}

          {/* type */}
          <div className="mb-5">
            <FieldLabel>ฝ่าย</FieldLabel>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("VIDEO")}
                className={[
                  "rounded-2xl border px-4 py-2 text-sm font-semibold transition",
                  type === "VIDEO"
                    ? "border-[#e5ff78]/30 bg-[#e5ff78] text-black"
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
                    ? "border-[#e5ff78]/30 bg-[#e5ff78] text-black"
                    : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10",
                ].join(" ")}
              >
                GRAPHIC
              </button>
            </div>
          </div>

          {/* title */}
          <div className="mb-5">
            <FieldLabel>ชื่อโปรเจกต์</FieldLabel>
            <InputBase value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น ทำคลิปรีวิวลู่วิ่ง" />
          </div>

          {/* brand */}
          <div className="mb-5">
            <FieldLabel>แบรนด์ของสินค้า</FieldLabel>
            <SelectBase value={brand} onChange={(e) => setBrand(e.target.value)}>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </SelectBase>
          </div>

          {/* assignee */}
          <div className="mb-5">
            <FieldLabel>ผู้รับงาน (Assignee)</FieldLabel>
            <SelectBase value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">- ไม่ระบุ -</option>

              {type === "VIDEO" ? (
                <optgroup label="VIDEO">
                  {memberOptions.video.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.display_name || m.id}
                    </option>
                  ))}
                </optgroup>
              ) : (
                <optgroup label="GRAPHIC">
                  {memberOptions.graphic.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.display_name || m.id}
                    </option>
                  ))}
                </optgroup>
              )}
            </SelectBase>
            <div className="mt-2 text-xs text-white/40">* จะแสดงเฉพาะสมาชิกฝ่ายที่เลือก (รวม ALL)</div>
          </div>

          {/* extras */}
          <div className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 text-sm font-extrabold tracking-tight">ตั้งค่าเพิ่มเติม ({type})</div>

            {type === "VIDEO" ? (
              <>
                <div className="mb-4">
                  <FieldLabel>ความสำคัญของงาน</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {VIDEO_PRIORITIES.map((p) => {
                      const active = videoPriority === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setVideoPriority(p)}
                          className={[
                            "rounded-2xl border px-4 py-2 text-sm font-semibold transition",
                            active
                              ? "border-[#e5ff78]/30 bg-[#e5ff78] text-black"
                              : "border-white/10 bg-black/20 text-white/80 hover:bg-white/10",
                          ].join(" ")}
                        >
                          {p === "2ดาว" ? "2 ★" : p === "3ดาว" ? "3 ★" : p === "5ดาว" ? "5 ★" : "SPECIAL"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <FieldLabel>รูปแบบของงาน</FieldLabel>
                  <SelectBase value={videoPurpose} onChange={(e) => setVideoPurpose(e.target.value as any)}>
                    {VIDEO_PURPOSES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </SelectBase>
                </div>
              </>
            ) : (
              <div>
                <FieldLabel>ประเภทงาน</FieldLabel>
                <SelectBase value={graphicJobType} onChange={(e) => setGraphicJobType(e.target.value as any)}>
                  {GRAPHIC_JOB_TYPES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </SelectBase>
              </div>
            )}
          </div>

          {/* dates */}
          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <FieldLabel>เริ่ม</FieldLabel>
              <InputBase type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div>
              <FieldLabel>Deadline</FieldLabel>
              <InputBase type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          {/* description */}
          <div className="mb-2">
            <FieldLabel>คำอธิบาย</FieldLabel>
            <TextareaBase
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-28"
              placeholder="ใส่รายละเอียดของงาน / ข้อมูลสำคัญ / ลิงก์ ref ฯลฯ"
            />
            <div className="mt-2 text-xs text-white/40">
              * หน้า list จะไม่โชว์คำอธิบายทั้งหมด (โชว์ตอนเข้าไปดูรายละเอียดโปรเจกต์)
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-white/10 p-5">
          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
          >
            ยกเลิก
          </button>

          <button
            onClick={submit}
            disabled={submitting}
            className="rounded-2xl bg-[#e5ff78] px-5 py-2 text-sm font-extrabold text-black disabled:opacity-50"
          >
            {submitting ? "กำลังสั่งงาน..." : "สั่งงาน"}
          </button>
        </div>
      </div>
    </div>
  );
}