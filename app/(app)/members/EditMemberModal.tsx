"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

type Member = {
  id: string;
  display_name: string | null;
  department: string;
  role: string;
  is_active: boolean;
  phone?: string | null;
  email?: string | null;
  birth_date?: string | null; // ✅ เพิ่ม
};

async function safeJson(res: Response) {
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

function badId(id?: string | null) {
  return !id || id === "undefined" || id === "null";
}

function toDateInputValue(iso?: string | null) {
  if (!iso) return "";
  // รองรับทั้ง "YYYY-MM-DD" และ ISO string
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function EditMemberModal({
  open,
  member,
  onClose,
  onSaved,
}: {
  open: boolean;
  member: Member | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [department, setDepartment] = useState<"VIDEO" | "GRAPHIC" | "ALL">("ALL");
  const [role, setRole] = useState<"LEADER" | "MEMBER">("MEMBER");
  const [isActive, setIsActive] = useState(true);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [birthDate, setBirthDate] = useState(""); // ✅ เพิ่ม (YYYY-MM-DD)

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const memberId = member?.id ?? "";

  useEffect(() => {
    if (!open) return;
    setErr("");

    setDisplayName(member?.display_name ?? "");
    setDepartment((String(member?.department || "ALL").toUpperCase() as any) || "ALL");
    setRole((String(member?.role || "MEMBER").toUpperCase() as any) || "MEMBER");
    setIsActive(member?.is_active !== false);
    setPhone(member?.phone ?? "");
    setEmail(member?.email ?? "");

    setBirthDate(toDateInputValue(member?.birth_date ?? null)); // ✅ เพิ่ม
  }, [open, member]);

  const canSave = useMemo(() => !submitting, [submitting]);

  async function submit() {
    setErr("");

    if (badId(memberId)) {
      setErr("Invalid member id");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        display_name: displayName.trim() || null,
        department,
        role,
        is_active: isActive,
        phone: phone.trim() || null,
        email: email.trim() || null,
        birth_date: birthDate ? birthDate : null, // ✅ เพิ่ม
      };

      const res = await fetch(`/api/members/${encodeURIComponent(memberId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await safeJson(res);
      if (!res.ok) throw new Error((json && (json.error || json.message)) || `Save failed (${res.status})`);

      onSaved();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0b0b] text-white shadow-[0_30px_120px_rgba(0,0,0,0.75)]">
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <div className="text-lg font-extrabold tracking-tight">แก้ไขสมาชิก</div>
            <div className="mt-1 text-sm text-white/45">{member?.display_name || memberId}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
            title="ปิด"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5">
          {err ? (
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {err}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <div className="mb-2 text-xs font-bold tracking-widest text-white/45 uppercase">ชื่อ</div>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#e5ff78]"
                placeholder="ชื่อที่แสดง"
              />
            </div>

            <div>
              <div className="mb-2 text-xs font-bold tracking-widest text-white/45 uppercase">ฝ่าย</div>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as any)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
              >
                <option value="VIDEO">VIDEO</option>
                <option value="GRAPHIC">GRAPHIC</option>
                <option value="ALL">ALL</option>
              </select>
            </div>

            <div>
              <div className="mb-2 text-xs font-bold tracking-widest text-white/45 uppercase">ตำแหน่ง</div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
              >
                <option value="LEADER">LEADER</option>
                <option value="MEMBER">MEMBER</option>
              </select>
            </div>

            <div>
              <div className="mb-2 text-xs font-bold tracking-widest text-white/45 uppercase">Tel.</div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bgblack/30 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#e5ff78]"
                placeholder="เบอร์โทร"
              />
            </div>

            <div>
              <div className="mb-2 text-xs font-bold tracking-widest text-white/45 uppercase">E-mail</div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#e5ff78]"
                placeholder="อีเมล"
              />
            </div>

            {/* ✅ เพิ่มวันเกิด (ใส่แบบเดิม ไม่แตะสไตล์อื่น) */}
            <div className="md:col-span-2">
              <div className="mb-2 text-xs font-bold tracking-widest text-white/45 uppercase">Birth date</div>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-[#e5ff78]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm text-white/80">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                ACTIVE
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={submit}
              className="rounded-2xl border border-[#e5ff78]/20 bg-[#e5ff78] px-5 py-2 text-sm font-extrabold text-black hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}