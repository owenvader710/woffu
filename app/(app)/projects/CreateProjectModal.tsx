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

// แปลง datetime-local -> ISO string
function toISO(value: string) {
  // value: "2026-02-26T12:30"
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function CreateProjectModal({ open, onClose, onCreated, members }: Props) {
  const [type, setType] = useState<"VIDEO" | "GRAPHIC">("VIDEO");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");

  // ✅ กลุ่มสินค้า A-H (ยังไม่ต้องผูก DB ก็ได้)
  const [productGroup, setProductGroup] = useState<string>("");

  const [brand, setBrand] = useState<string>("-");
  const [assigneeId, setAssigneeId] = useState<string>("-");

  // ✅ ใส่เวลาได้
  const [startDT, setStartDT] = useState<string>(""); // datetime-local
  const [dueDT, setDueDT] = useState<string>(""); // datetime-local

  // VIDEO fields
  const [videoPriority, setVideoPriority] = useState<string>("3");
  const [videoPurpose, setVideoPurpose] = useState<string>("สร้างความต้องการ");

  // GRAPHIC fields
  const [graphicJobType, setGraphicJobType] = useState<string>("");

  const [description, setDescription] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const activeMembers = useMemo(
    () => (members || []).filter((m) => m.is_active !== false),
    [members]
  );

  // reset เมื่อเปิด modal
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

  const pillBtn = (active: boolean) =>
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
        code: code.trim() || null, // ✅ ฟิลด์รหัสชื่อ code
        title: title.trim(),
        type,
        department: type, // ให้ตรงกับระบบเดิม
        brand: brand === "-" ? null : brand,
        assignee_id: assigneeId === "-" ? null : assigneeId,
        start_date: toISO(startDT), // ✅ เก็บเวลาได้ (ถ้า DB เป็น timestamptz)
        due_date: toISO(dueDT),     // ✅ เก็บเวลาได้ (ถ้า DB เป็น timestamptz)
        description: description.trim() || null,
      };

      // ✅ กลุ่มสินค้า (ตอนนี้ใส่ใน payload ก่อน แต่ถ้า DB ยังไม่มีคอลัมน์ "product_group" ให้คอมเมนต์ 1 บรรทัดนี้ไว้ก่อน)
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
        {/* header */}
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

        {/* body */}
        <div className="px-8 py-6">
          {/* ✅ ฝ่าย: ปุ่ม 2 ปุ่ม */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-white/60">ฝ่าย</div>
              <div className="mt-2 flex gap-2">
                <button type="button" className={pillBtn(type === "VIDEO")} onClick={() => setType("VIDEO")}>
                  VIDEO
                </button>
                <button type="button" className={pillBtn(type === "GRAPHIC")} onClick={() => setType("GRAPHIC")}>
                  GRAPHIC
                </button>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-white/60">รหัสโปรเจกต์</div>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="เช่น 5x-1234 / 0001 / 22"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78]"
              />
            </div>

            <div className="md:col-span-2">
              <div className="text-xs font-semibold text-white/60">ชื่อโปรเจกต์</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น Ads กระเป๋า..."
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78]"
              />
            </div>

            {/* ✅ กลุ่มสินค้า (A-H) เหนือแบรนด์ */}
            <div>
              <div className="text-xs font-semibold text-white/60">กลุ่มสินค้า</div>
              <select
                value={productGroup}
                onChange={(e) => setProductGroup(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
              >
                <option value="">-</option>
                {["A", "B", "C", "D", "E", "F", "G", "H"].map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs font-semibold text-white/60">แบรนด์</div>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
              >
                <option value="-">-</option>
                {/* ใส่แบรนด์เพิ่มได้ตามระบบเดิม */}
                <option value="IRONTEC">IRONTEC</option>
                <option value="IVADE">IVADE</option>
                <option value="AMURO">AMURO</option>
                <option value="THE GYM CO.">THE GYM CO.</option>
                <option value="OVCM">OVCM</option>
              </select>
            </div>

            <div>
              <div className="text-xs font-semibold text-white/60">ผู้รับผิดชอบ</div>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
              >
                <option value="-">-</option>
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name || m.id}
                  </option>
                ))}
              </select>
            </div>

            {/* ✅ วันสั่งงาน + Deadline ใส่เวลาได้ และอยู่เหนือรายละเอียด */}
            <div>
              <div className="text-xs font-semibold text-white/60">วันสั่งงาน</div>
              <input
                type="datetime-local"
                value={startDT}
                onChange={(e) => setStartDT(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
              />
              <div className="mt-1 text-[11px] text-white/35">เลือกได้ทั้งวัน/เดือน/ปี และเวลา</div>
            </div>

            <div>
              <div className="text-xs font-semibold text-white/60">Deadline</div>
              <input
                type="datetime-local"
                value={dueDT}
                onChange={(e) => setDueDT(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
              />
              <div className="mt-1 text-[11px] text-white/35">เลือกได้ทั้งวัน/เดือน/ปี และเวลา</div>
            </div>

            {/* fields ตาม type */}
            {type === "VIDEO" ? (
              <>
                <div>
                  <div className="text-xs font-semibold text-white/60">ความสำคัญ</div>
                  <select
                    value={videoPriority}
                    onChange={(e) => setVideoPriority(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
                  >
                    <option value="1">1ดาว</option>
                    <option value="2">2ดาว</option>
                    <option value="3">3ดาว</option>
                    <option value="SPECIAL">SPECIAL</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs font-semibold text-white/60">รูปแบบ</div>
                  <select
                    value={videoPurpose}
                    onChange={(e) => setVideoPurpose(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
                  >
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
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78]"
                />
              </div>
            )}

            {/* ✅ รายละเอียดอยู่ล่างสุดตามที่ขอ */}
            <div className="md:col-span-2">
              <div className="text-xs font-semibold text-white/60">รายละเอียด</div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ใส่รายละเอียดงานเพิ่มเติมได้"
                className="mt-2 min-h-[120px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78]"
              />
            </div>
          </div>

          {err ? (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {err}
            </div>
          ) : null}
        </div>

        {/* footer */}
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
              busy && "opacity-60 cursor-not-allowed"
            )}
          >
            {busy ? "กำลังสร้าง..." : "สร้างงาน"}
          </button>
        </div>
      </div>
    </div>
  );
}