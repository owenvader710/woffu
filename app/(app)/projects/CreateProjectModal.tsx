// app/(app)/projects/CreateProjectModal.tsx
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
  onCreated: () => Promise<void> | void;
  members: Member[];
};

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function toISO(value: string) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

const INPUT =
  "mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78]";
const SELECT =
  "mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]";

export default function CreateProjectModal({ open, onClose, onCreated, members }: Props) {
  const [type, setType] = useState<"VIDEO" | "GRAPHIC">("VIDEO");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");

  const [productGroup, setProductGroup] = useState<string>(""); // A-H
  const [brand, setBrand] = useState<string>("-");
  const [assigneeId, setAssigneeId] = useState<string>("-");

  const [startDT, setStartDT] = useState<string>(""); // datetime-local
  const [dueDT, setDueDT] = useState<string>(""); // datetime-local

  const [videoPriority, setVideoPriority] = useState<string>("3");
  const [videoPurpose, setVideoPurpose] = useState<string>("สร้างความต้องการ");
  const [graphicJobType, setGraphicJobType] = useState<string>("");

  const [description, setDescription] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const activeMembers = useMemo(
    () => (members || []).filter((m) => m.is_active !== false),
    [members]
  );

  useEffect(() => {
    if (!open) return;
    setErr("");
    setBusy(false);
    setType("VIDEO");
    setCode("");
    setTitle("");
    setProductGroup("");
    setBrand("-");
    setAssigneeId("-");
    setStartDT("");
    setDueDT("");
    setVideoPriority("3");
    setVideoPurpose("สร้างความต้องการ");
    setGraphicJobType("");
    setDescription("");
  }, [open]);

  if (!open) return null;

  const tabBtn = (active: boolean) =>
    cx(
      "rounded-xl border px-4 py-2 text-sm font-semibold transition",
      active
        ? "border-[#e5ff78]/20 bg-[#e5ff78] text-black"
        : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
    );

  async function submit() {
    setErr("");

    if (!title.trim()) {
      setErr("กรุณาใส่ชื่อโปรเจกต์");
      return;
    }

    setBusy(true);
    try {
      const payload: any = {
        code: code.trim() || null,
        title: title.trim(),
        type,
        department: type,
        brand: brand === "-" ? null : brand,
        assignee_id: assigneeId === "-" ? null : assigneeId,
        start_date: toISO(startDT),
        due_date: toISO(dueDT),
        description: description.trim() || null,
      };

      // ถ้า DB ยังไม่มีคอลัมน์นี้ ให้คอมเมนต์บรรทัดนี้
      payload.product_group = productGroup || null;

      if (type === "VIDEO") {
        payload.video_priority = videoPriority || null;
        payload.video_purpose = videoPurpose || null;
        payload.graphic_job_type = null;
      } else {
        payload.graphic_job_type = graphicJobType || null;
        payload.video_priority = null;
        payload.video_purpose = null;
      }

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (!res.ok) {
        setErr((json && (json.error || json.message)) || `สร้างงานไม่สำเร็จ (${res.status})`);
        setBusy(false);
        return;
      }

      await onCreated?.();
      onClose();
    } catch (e: any) {
      setErr(e?.message || "สร้างงานไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 px-8 py-6">
          <div>
            <div className="text-lg font-extrabold text-white">สร้างงานใหม่</div>
            <div className="mt-1 text-sm text-white/50">กรอกข้อมูลงาน แล้วกดสร้าง</div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            ปิด
          </button>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* 1) ฝ่าย (buttons) */}
            <div>
              <div className="text-xs font-semibold text-white/60">ฝ่าย</div>
              <div className="mt-2 flex gap-2">
                <button type="button" className={tabBtn(type === "VIDEO")} onClick={() => setType("VIDEO")}>
                  VIDEO
                </button>
                <button type="button" className={tabBtn(type === "GRAPHIC")} onClick={() => setType("GRAPHIC")}>
                  GRAPHIC
                </button>
              </div>
            </div>

            {/* 1) รหัสโปรเจกต์ */}
            <div>
              <div className="text-xs font-semibold text-white/60">รหัสโปรเจกต์</div>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="เช่น 5x-1234 / 0001 / 22"
                className={INPUT}
              />
            </div>

            {/* 2) ชื่อโปรเจกต์ (เต็มแถว) */}
            <div className="md:col-span-2">
              <div className="text-xs font-semibold text-white/60">ชื่อโปรเจกต์</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น Ads กระเป๋า..."
                className={INPUT}
              />
            </div>

            {/* 3) แบรนด์ */}
            <div>
              <div className="text-xs font-semibold text-white/60">แบรนด์</div>
              <select value={brand} onChange={(e) => setBrand(e.target.value)} className={SELECT}>
                <option value="-">-</option>
                <option value="IRONTEC">IRONTEC</option>
                <option value="IVADE">IVADE</option>
                <option value="AMURO">AMURO</option>
                <option value="THE GYM CO.">THE GYM CO.</option>
                <option value="OVCM">OVCM</option>
              </select>
            </div>

            {/* 3) กลุ่มสินค้า A-H */}
            <div>
              <div className="text-xs font-semibold text-white/60">กลุ่มสินค้า</div>
              <select value={productGroup} onChange={(e) => setProductGroup(e.target.value)} className={SELECT}>
                <option value="">-</option>
                {["A", "B", "C", "D", "E", "F", "G", "H"].map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>

            {/* 4) ความสำคัญ / รูปแบบ (VIDEO) หรือ ประเภทงาน (GRAPHIC) */}
            {type === "VIDEO" ? (
              <>
                <div>
                  <div className="text-xs font-semibold text-white/60">ความสำคัญ</div>
                  <select value={videoPriority} onChange={(e) => setVideoPriority(e.target.value)} className={SELECT}>
                    <option value="1">1ดาว</option>
                    <option value="2">2ดาว</option>
                    <option value="3">3ดาว</option>
                    <option value="SPECIAL">SPECIAL</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs font-semibold text-white/60">รูปแบบ</div>
                  <select value={videoPurpose} onChange={(e) => setVideoPurpose(e.target.value)} className={SELECT}>
                    <option value="สร้างความต้องการ">สร้างความต้องการ</option>
                    <option value="สร้างความน่าเชื่อถือ">สร้างความน่าเชื่อถือ</option>
                    <option value="รีวิว/ใช้งานจริง">รีวิว/ใช้งานจริง</option>
                    <option value="โปรโมชั่น">โปรโมชั่น</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="md:col-span-2">
                <div className="text-xs font-semibold text-white/60">ประเภทงานกราฟิก</div>
                <input
                  value={graphicJobType}
                  onChange={(e) => setGraphicJobType(e.target.value)}
                  placeholder="เช่น Thumbnail / Poster / Banner"
                  className={INPUT}
                />
              </div>
            )}

            {/* 5) ผู้รับผิดชอบ (เต็มแถว) */}
            <div className="md:col-span-2">
              <div className="text-xs font-semibold text-white/60">ผู้รับผิดชอบ</div>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={SELECT}>
                <option value="-">-</option>
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name || m.id}
                  </option>
                ))}
              </select>
            </div>

            {/* 6) วันสั่งงาน / Deadline (ใส่เวลาได้) */}
            <div>
              <div className="text-xs font-semibold text-white/60">วันสั่งงาน</div>
              <input type="datetime-local" value={startDT} onChange={(e) => setStartDT(e.target.value)} className={INPUT} />
              <div className="mt-1 text-[11px] text-white/35">เลือกได้ทั้งวัน/เดือน/ปี และเวลา</div>
            </div>

            <div>
              <div className="text-xs font-semibold text-white/60">Deadline</div>
              <input type="datetime-local" value={dueDT} onChange={(e) => setDueDT(e.target.value)} className={INPUT} />
              <div className="mt-1 text-[11px] text-white/35">เลือกได้ทั้งวัน/เดือน/ปี และเวลา</div>
            </div>

            {/* 7) รายละเอียด (ล่างสุด) */}
            <div className="md:col-span-2">
              <div className="text-xs font-semibold text-white/60">รายละเอียด</div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ใส่รายละเอียดงานเพิ่มเติมได้"
                className="mt-2 min-h-[140px] w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78]"
              />
            </div>
          </div>

          {err ? (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {err}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-white/10 px-8 py-5">
          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            ยกเลิก
          </button>
          <button
            disabled={busy}
            onClick={submit}
            className={cx(
              "rounded-2xl bg-[#e5ff78] px-6 py-2 text-sm font-semibold text-black hover:opacity-90",
              busy && "cursor-not-allowed opacity-60"
            )}
          >
            {busy ? "กำลังสร้าง..." : "สร้างงาน"}
          </button>
        </div>
      </div>
    </div>
  );
}