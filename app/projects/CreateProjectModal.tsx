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
  onCreated?: () => void; // ให้หน้า /projects รีโหลด list ได้
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

export default function CreateProjectModal({ open, onClose, onCreated }: Props) {
  const [type, setType] = useState<"VIDEO" | "GRAPHIC">("VIDEO");

  const brands = useMemo(() => (type === "VIDEO" ? VIDEO_BRANDS : GRAPHIC_BRANDS), [type]);

  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState<string>("IRONTEC");

  const [assigneeId, setAssigneeId] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);

  const [startDate, setStartDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");

  // VIDEO extras
  const [videoPriority, setVideoPriority] = useState<(typeof VIDEO_PRIORITIES)[number]>("3ดาว");
  const [videoPurpose, setVideoPurpose] = useState<(typeof VIDEO_PURPOSES)[number]>("สร้างความต้องการ");

  // GRAPHIC extras
  const [graphicJobType, setGraphicJobType] = useState<(typeof GRAPHIC_JOB_TYPES)[number]>("ซัพพอร์ต MKT");

  // description (all)
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // โหลดสมาชิกมาใส่ dropdown assignee
  useEffect(() => {
    if (!open) return;

    (async () => {
      setErr("");
      try {
        const r = await fetch("/api/members", { cache: "no-store" });
        const j = await safeJson(r);
        const data = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
        setMembers(data);
      } catch (e: any) {
        setMembers([]);
      }
    })();
  }, [open]);

  // reset brand ให้สอดคล้องกับ type
  useEffect(() => {
    setBrand(brands[0] ?? "IRONTEC");
  }, [brands]);

  async function submit() {
    setErr("");
    setMsg("");

    const t = title.trim();
    if (!t) {
      setErr("กรุณาใส่ชื่อโปรเจกต์");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        title: t,
        type,
        department: type, // กัน Invalid type/department
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

      // reset ฟอร์ม
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-[640px] rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b p-5">
          <div>
            <div className="text-lg font-semibold">สั่งงานใหม่</div>
            <div className="text-sm text-gray-500">Create new project</div>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100">
            ✕
          </button>
        </div>

        <div className="max-h-[75vh] overflow-auto p-5">
          {err && (
            <div className="mb-4 rounded-xl border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
              {err}
            </div>
          )}
          {msg && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              {msg}
            </div>
          )}

          {/* type buttons */}
          <div className="mb-4">
            <div className="mb-2 text-sm font-medium">ฝ่าย</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("VIDEO")}
                className={`rounded-xl border px-4 py-2 text-sm ${
                  type === "VIDEO" ? "bg-black text-white" : "bg-white"
                }`}
              >
                VIDEO
              </button>
              <button
                type="button"
                onClick={() => setType("GRAPHIC")}
                className={`rounded-xl border px-4 py-2 text-sm ${
                  type === "GRAPHIC" ? "bg-black text-white" : "bg-white"
                }`}
              >
                GRAPHIC
              </button>
            </div>
          </div>

          {/* title */}
          <div className="mb-4">
            <div className="mb-2 text-sm font-medium">ชื่อโปรเจกต์</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
              placeholder="เช่น ทำคลิปรีวิวลู่วิ่ง"
            />
          </div>

          {/* brand */}
          <div className="mb-4">
            <div className="mb-2 text-sm font-medium">แบรนด์ของสินค้า</div>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
            >
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* assignee */}
          <div className="mb-4">
            <div className="mb-2 text-sm font-medium">ผู้รับงาน (Assignee)</div>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm"
            >
              <option value="">- ไม่ระบุ -</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name || m.id}
                </option>
              ))}
            </select>
          </div>

          {/* extras */}
          <div className="mb-4 rounded-2xl border p-4">
            <div className="mb-3 text-sm font-semibold">ตั้งค่าเพิ่มเติม ({type})</div>

            {type === "VIDEO" ? (
              <>
                <div className="mb-3">
                  <div className="mb-2 text-sm font-medium">ความสำคัญของงาน</div>
                  <div className="flex flex-wrap gap-2">
                    {VIDEO_PRIORITIES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setVideoPriority(p)}
                        className={`rounded-xl border px-4 py-2 text-sm ${
                          videoPriority === p ? "bg-black text-white" : "bg-white"
                        }`}
                      >
                        {p === "2ดาว" ? "2 ★" : p === "3ดาว" ? "3 ★" : p === "5ดาว" ? "5 ★" : "SPECIAL"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium">รูปแบบของงาน</div>
                  <select
                    value={videoPurpose}
                    onChange={(e) => setVideoPurpose(e.target.value as any)}
                    className="w-full rounded-xl border px-4 py-3 text-sm"
                  >
                    {VIDEO_PURPOSES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <div>
                <div className="mb-2 text-sm font-medium">ประเภทงาน</div>
                <select
                  value={graphicJobType}
                  onChange={(e) => setGraphicJobType(e.target.value as any)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                >
                  {GRAPHIC_JOB_TYPES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* dates */}
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-medium">เริ่ม</div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
              />
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">Deadline</div>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm"
              />
            </div>
          </div>

          {/* description */}
          <div className="mb-2">
            <div className="mb-2 text-sm font-medium">คำอธิบาย</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-28 w-full resize-none rounded-xl border px-4 py-3 text-sm"
              placeholder="ใส่รายละเอียดของงาน / ข้อมูลสำคัญ / ลิงก์ ref ฯลฯ"
            />
            <div className="mt-2 text-xs text-gray-500">
              * หน้า list จะไม่โชว์คำอธิบายทั้งหมด (โชว์ตอนเข้าไปดูรายละเอียดโปรเจกต์)
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t p-5">
          <button onClick={onClose} className="rounded-xl border px-4 py-2 text-sm">
            ยกเลิก
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="rounded-xl bg-black px-5 py-2 text-sm text-white disabled:opacity-50"
          >
            {submitting ? "กำลังสั่งงาน..." : "สั่งงาน"}
          </button>
        </div>
      </div>
    </div>
  );
}