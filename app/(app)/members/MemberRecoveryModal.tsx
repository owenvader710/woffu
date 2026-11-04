"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck, Copy, X } from "lucide-react";

type MemberInfo = { id: string; display_name: string | null; email: string | null };
type Props = { member: MemberInfo; onClose: () => void };

export default function MemberRecoveryModal({ member, onClose }: Props) {
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  async function createRecoveryLink() {
    if (!verified || busy || link) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/members/${encodeURIComponent(member.id)}/recovery-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identityVerified: true }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || typeof json?.recoveryLink !== "string") {
        throw new Error(json?.error || "ไม่สามารถสร้างลิงก์กู้คืนได้");
      }
      setLink(json.recoveryLink);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ไม่สามารถสร้างลิงก์กู้คืนได้");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("คัดลอกไม่สำเร็จ กรุณาเลือกลิงก์ในช่องแล้วคัดลอกด้วยตนเอง");
    }
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 px-4 py-8 text-white"
      role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="member-recovery-heading"
        className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#1a1c1e] p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[#e5ff78]">
              <KeyRound size={19} aria-hidden="true"/>
              <span className="text-xs font-bold tracking-widest">ACCOUNT RECOVERY</span>
            </div>
            <h2 id="member-recovery-heading" className="mt-3 text-xl font-bold">
              ช่วยสมาชิกตั้งรหัสผ่านใหม่
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิดหน้าต่างกู้คืนบัญชี"
            className="woffu-focus-ring rounded-lg border border-white/15 p-2 text-white/65 hover:bg-white/10">
            <X size={18} aria-hidden="true"/>
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-sm font-semibold">{member.display_name || "สมาชิกทีม"}</div>
          <div className="mt-1 break-all text-xs text-white/60">{member.email || "ไม่มีอีเมล"}</div>
        </div>

        {!link ? (
          <>
            <p className="mt-4 text-sm leading-6 text-white/70">
              ใช้เมื่อสมาชิกไม่สามารถรับอีเมลรีเซ็ตได้ ตรวจสอบตัวตนจากช่องทางภายในทีม
              ก่อนออกลิงก์ให้สมาชิก ลิงก์นี้สามารถใช้ตั้งรหัสผ่านใหม่ได้ จึงต้องเก็บเป็นความลับ
            </p>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">
              <input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[#e5ff78]"/>
              <span>ฉันได้ยืนยันตัวตนกับเจ้าของบัญชีผ่านช่องทางที่เชื่อถือได้แล้ว</span>
            </label>
            <button type="button" onClick={() => void createRecoveryLink()}
              disabled={!verified || busy}
              className="woffu-focus-ring mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#e5ff78] px-4 py-3 text-sm font-bold text-black disabled:opacity-40">
              <ShieldCheck size={18} aria-hidden="true"/>
              {busy ? "กำลังสร้างลิงก์..." : "สร้างลิงก์กู้คืนแบบครั้งเดียว"}
            </button>
          </>
        ) : (
          <div role="status" className="mt-5 rounded-xl border border-[#e5ff78]/30 bg-[#e5ff78]/10 p-4">
            <div className="text-sm font-bold text-[#e5ff78]">สร้างลิงก์กู้คืนแล้ว</div>
            <p className="mt-2 text-xs leading-5 text-white/70">
              ส่งให้สมาชิกผ่านแชตส่วนตัวที่ยืนยันตัวตนแล้ว ห้ามส่งในกลุ่มหรือเก็บไว้ในบันทึกสาธารณะ
              ลิงก์หมดอายุตามการตั้งค่า Supabase และใช้ได้ครั้งเดียว
            </p>
            <label className="mt-3 block text-xs text-white/70" htmlFor="one-time-recovery-url">ลิงก์สำหรับสมาชิก</label>
            <input id="one-time-recovery-url" value={link} readOnly onFocus={e=>e.target.select()}
              className="woffu-input-simple mt-2 text-xs"/>
            <button type="button" onClick={() => void copyLink()}
              className="woffu-focus-ring mt-3 flex min-h-10 items-center gap-2 rounded-lg bg-[#e5ff78] px-4 py-2 text-sm font-semibold text-black">
              <Copy size={16} aria-hidden="true"/>{copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
            </button>
          </div>
        )}
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        <p className="mt-4 text-xs text-white/40">การออกลิงก์จะบันทึกการแจ้งเตือนในบัญชีสมาชิก และไม่เปิดเผยรหัสผ่านเดิม</p>
      </section>
    </div>
  );
}
