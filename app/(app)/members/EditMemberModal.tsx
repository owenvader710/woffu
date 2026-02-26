"use client";

import React, { useEffect, useMemo, useState } from "react";

type Member = {
  id: string;
  display_name: string | null;
  department: "VIDEO" | "GRAPHIC" | "ALL";
  role: "LEADER" | "MEMBER";
  is_active: boolean;
  phone?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  birth_date?: string | null; // ✅ เพิ่ม
};

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function toDateInputValue(iso?: string | null) {
  if (!iso) return "";
  // รองรับทั้ง "YYYY-MM-DD" และ ISO string
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    // ถ้าเป็นรูปแบบ YYYY-MM-DD อยู่แล้ว
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    return "";
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function EditMemberModal({
  open,
  onClose,
  member,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  member: Member | null;
  onSaved: () => Promise<void> | void;
}) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [department, setDepartment] = useState<Member["department"]>("ALL");
  const [role, setRole] = useState<Member["role"]>("MEMBER");
  const [isActive, setIsActive] = useState(true);
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState(""); // ✅ เพิ่ม (YYYY-MM-DD)

  const canShow = useMemo(() => open && !!member?.id, [open, member]);

  useEffect(() => {
    if (!member) return;
    setErr("");
    setDisplayName(member.display_name ?? "");
    setDepartment(member.department ?? "ALL");
    setRole(member.role ?? "MEMBER");
    setIsActive(member.is_active ?? true);
    setPhone(member.phone ?? "");
    setBirthDate(toDateInputValue(member.birth_date ?? null)); // ✅ เพิ่ม
  }, [member, open]);

  if (!canShow) return null;

  async function save() {
    if (!member?.id) return;

    setSaving(true);
    setErr("");

    try {
      const payload = {
        display_name: displayName.trim() ? displayName.trim() : null,
        department,
        role,
        is_active: isActive,
        phone: phone.trim() ? phone.trim() : null,
        birth_date: birthDate ? birthDate : null, // ✅ เพิ่ม
      };

      const res = await fetch(`/api/members/${member.id}`, {
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
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-black text-white shadow-[0_25px_80px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <div className="text-sm font-semibold tracking-widest text-white/50">MEMBER</div>
            <div className="mt-1 text-xl font-extrabold">แก้ไขสมาชิก</div>
          </div>

          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
            disabled={saving}
          >
            ปิด
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {err ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{err}</div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-semibold text-white/60">ชื่อที่แสดง</div>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]"
                placeholder="ชื่อสมาชิก"
              />
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold text-white/60">เบอร์โทร</div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]"
                placeholder="เช่น 08x-xxx-xxxx"
              />
            </div>

            {/* ✅ เพิ่มวันเดือนปีเกิด */}
            <div>
              <div className="mb-2 text-xs font-semibold text-white/60">วันเดือนปีเกิด</div>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]"
              />
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold text-white/60">ฝ่าย</div>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as any)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]"
              >
                <option value="ALL">ALL</option>
                <option value="VIDEO">VIDEO</option>
                <option value="GRAPHIC">GRAPHIC</option>
              </select>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold text-white/60">Role</div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]"
              >
                <option value="LEADER">LEADER</option>
                <option value="MEMBER">MEMBER</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-5 w-5 accent-[#e5ff78]"
              />
              <label htmlFor="active" className="text-sm text-white/70">
                เปิดใช้งานสมาชิก (is_active)
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-6 py-5">
          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            disabled={saving}
          >
            ยกเลิก
          </button>
          <button
            onClick={save}
            className="rounded-2xl bg-[#e5ff78] px-5 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}