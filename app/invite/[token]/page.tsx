"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, LockKeyhole, UserPlus } from "lucide-react";

type InviteDetails = { email: string; display_name?: string | null; role: string; department: string };
async function safeJson(response: Response) {
  return response.json().catch(() => null);
}

export default function InviteAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [created, setCreated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { token: rawToken } = await params;
      if (cancelled) return;
      setToken(rawToken);
      if (!/^[a-f0-9]{64}$/i.test(rawToken)) {
        setLoadError("ลิงก์คำเชิญไม่ถูกต้อง กรุณาขอลิงก์ใหม่จากหัวหน้าทีม");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/invites/${encodeURIComponent(rawToken)}`, { cache: "no-store" });
        const json = await safeJson(response);
        if (!response.ok || !json?.data?.email) {
          throw new Error("คำเชิญหมดอายุหรือถูกใช้งานแล้ว กรุณาขอลิงก์ใหม่");
        }
        if (!cancelled) setInvite(json.data as InviteDetails);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "ไม่สามารถตรวจสอบคำเชิญได้");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [params]);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invite || submitting || created) return;
    setError("");
    if (password.length < 10 || password.length > 128) {
      setError("รหัสผ่านต้องมี 10–128 ตัวอักษร");
      return;
    }
    if (password !== confirmation) {
      setError("รหัสผ่านและช่องยืนยันไม่ตรงกัน");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/invites/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmPassword: confirmation }),
      });
      const data = await safeJson(response);
      if (!response.ok) {
        throw new Error(data?.error || "สร้างบัญชีไม่สำเร็จ กรุณาลองอีกครั้ง");
      }
      setPassword("");
      setConfirmation("");
      setCreated(true);
    } catch (e) {
      // Keep the form visible so users can correct mistakes without losing
      // their invitation or requesting a fresh link.
      setError(e instanceof Error ? e.message : "สร้างบัญชีไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0e1011] px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-[24px] border border-white/10 bg-[#191b1d] p-6 shadow-xl sm:p-8">
        <p className="text-xs font-bold tracking-[0.16em] text-[#e5ff78]">WOFFU OS / TEAM</p>
        {created ? (
          <div role="status">
            <CheckCircle2 className="mt-6 text-[#e5ff78]" size={43} aria-hidden="true"/>
            <h1 className="mt-4 text-2xl font-bold">สร้างบัญชีสำเร็จแล้ว</h1>
            <p className="mt-3 text-sm leading-7 text-white/60">
              ใช้อีเมลและรหัสผ่านใหม่เพื่อเข้าสู่ระบบจัดการงานของทีม
            </p>
            <Link href="/login" className="woffu-focus-ring mt-6 flex min-h-11 items-center justify-center rounded-xl bg-[#e5ff78] px-4 py-3 text-sm font-bold text-black">
              ไปหน้าเข้าสู่ระบบ
            </Link>
          </div>
        ) : (
          <>
            <UserPlus className="mt-6 text-[#e5ff78]" size={36} aria-hidden="true"/>
            <h1 className="mt-4 text-2xl font-bold">เข้าร่วมทีม WOFFU OS</h1>
            <p className="mt-2 text-sm leading-6 text-white/60">
              ตรวจสอบข้อมูลคำเชิญ แล้วตั้งรหัสผ่านสำหรับบัญชีของคุณ
            </p>
            {loading ? (
              <p className="mt-6 text-sm text-white/60" role="status">กำลังตรวจสอบลิงก์คำเชิญ…</p>
            ) : loadError || !invite ? (
              <p role="alert" className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
                {loadError || "ไม่พบคำเชิญที่ใช้ได้"}
              </p>
            ) : (
              <form onSubmit={createAccount} className="mt-6 space-y-4">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-white/50">ชื่อสมาชิก</p>
                  <p className="mt-1 text-sm font-semibold">{invite.display_name || "ยังไม่ได้กำหนดชื่อ"}</p>
                  <p className="mt-3 text-xs text-white/50">อีเมล</p>
                  <p className="mt-1 break-all text-sm font-semibold">{invite.email}</p>
                  <p className="mt-3 text-xs text-white/50">สิทธิ์ / ฝ่าย</p>
                  <p className="mt-1 text-sm">{invite.role} · {invite.department}</p>
                </div>
                <div>
                  <label htmlFor="invited-password" className="mb-2 block text-sm font-semibold">รหัสผ่านใหม่</label>
                  <input id="invited-password" type="password" autoComplete="new-password"
                    required minLength={10} maxLength={128} value={password}
                    onChange={e=>setPassword(e.target.value)}
                    placeholder="อย่างน้อย 10 ตัวอักษร"
                    className="woffu-input-simple"/>
                </div>
                <div>
                  <label htmlFor="invited-confirm" className="mb-2 block text-sm font-semibold">ยืนยันรหัสผ่าน</label>
                  <input id="invited-confirm" type="password" autoComplete="new-password"
                    required minLength={10} maxLength={128} value={confirmation}
                    onChange={e=>setConfirmation(e.target.value)}
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    className="woffu-input-simple"/>
                </div>
                {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
                <button type="submit" disabled={submitting}
                  className="woffu-focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#e5ff78] px-4 py-3 text-sm font-bold text-black disabled:opacity-50">
                  <LockKeyhole size={17} aria-hidden="true"/>
                  {submitting ? "กำลังสร้างบัญชี…" : "ยืนยันและสร้างบัญชี"}
                </button>
              </form>
            )}
          </>
        )}
        <Link href="/login" className="woffu-focus-ring mt-6 inline-flex rounded text-xs text-white/60 hover:text-[#e5ff78]">
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </section>
    </main>
  );
}
