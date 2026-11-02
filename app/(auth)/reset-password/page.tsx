"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, LockKeyhole } from "lucide-react";

type AccessState = "checking" | "ready" | "expired";

export default function ResetPasswordPage() {
  const [state, setState] = useState<AccessState>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [working, setWorking] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/reset-password", { cache: "no-store", signal: controller.signal })
      .then(res => {
        if (!controller.signal.aborted) setState(res.ok ? "ready" : "expired");
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("expired");
      });
    return () => controller.abort();
  }, []);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working) return;
    setError("");
    if (password.length < 10) {
      setError("กรุณากำหนดรหัสผ่านอย่างน้อย 10 ตัวอักษร");
      return;
    }
    if (password !== confirm) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }

    setWorking(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmPassword: confirm }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401) setState("expired");
        throw new Error(json?.error || "ไม่สามารถตั้งรหัสผ่านใหม่ได้");
      }
      setPassword("");
      setConfirm("");
      setFinished(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "ไม่สามารถตั้งรหัสผ่านใหม่ได้");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0e1011] px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-[24px] border border-white/10 bg-[#191b1d] p-6 shadow-xl sm:p-8">
        <p className="text-xs font-bold tracking-[0.16em] text-[#e5ff78]">WOFFU OS / ACCOUNT</p>

        {finished ? (
          <div role="status">
            <CheckCircle2 size={44} className="mt-6 text-[#e5ff78]" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-bold">ตั้งรหัสผ่านใหม่สำเร็จ</h1>
            <p className="mt-3 text-sm leading-7 text-white/60">กลับไปเข้าสู่ระบบอีกครั้งด้วยรหัสผ่านใหม่ของคุณ</p>
            <Link href="/login" className="woffu-focus-ring mt-6 flex min-h-11 items-center justify-center rounded-xl bg-[#e5ff78] px-4 py-3 text-sm font-bold text-black">
              ไปหน้าเข้าสู่ระบบ
            </Link>
          </div>
        ) : state === "checking" ? (
          <p role="status" className="mt-6 text-sm text-white/65">กำลังตรวจสอบลิงก์รีเซ็ต...</p>
        ) : state === "expired" ? (
          <div>
            <KeyRound size={40} className="mt-6 text-amber-200" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-bold">ลิงก์รีเซ็ตไม่ถูกต้องหรือหมดอายุ</h1>
            <p className="mt-3 text-sm leading-7 text-white/60">กรุณาขอลิงก์ใหม่จากหน้า “ลืมรหัสผ่าน?” แล้วเปิดลิงก์ล่าสุดที่ได้รับ</p>
            <Link href="/forgot-password" className="woffu-focus-ring mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#e5ff78] px-4 py-2 text-sm font-bold text-black">
              ขอรีเซ็ตรหัสผ่านอีกครั้ง
            </Link>
            {error && <p role="alert" className="mt-4 text-sm text-red-200">{error}</p>}
          </div>
        ) : (
          <>
            <LockKeyhole size={38} className="mt-6 text-[#e5ff78]" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-bold">ตั้งรหัสผ่านใหม่</h1>
            <p className="mt-3 text-sm leading-7 text-white/60">
              ใช้รหัสผ่านอย่างน้อย 10 ตัวอักษร แนะนำให้ผสมตัวอักษร ตัวเลข และสัญลักษณ์
            </p>
            <form onSubmit={updatePassword} className="mt-6 space-y-4">
              <div>
                <label htmlFor="new-password" className="mb-2 block text-sm font-semibold">รหัสผ่านใหม่</label>
                <input id="new-password" type="password" autoComplete="new-password"
                  required minLength={10} maxLength={128} className="woffu-input-simple"
                  value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div>
                <label htmlFor="confirm-new-password" className="mb-2 block text-sm font-semibold">ยืนยันรหัสผ่านใหม่</label>
                <input id="confirm-new-password" type="password" autoComplete="new-password"
                  required minLength={10} maxLength={128} className="woffu-input-simple"
                  value={confirm} onChange={e => setConfirm(e.target.value)} />
              </div>
              {error && <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
              <button type="submit" disabled={working}
                className="woffu-focus-ring flex min-h-11 w-full items-center justify-center rounded-xl bg-[#e5ff78] px-4 py-3 text-sm font-bold text-black disabled:opacity-60">
                {working ? "กำลังตั้งรหัสผ่าน..." : "ยืนยันรหัสผ่านใหม่"}
              </button>
            </form>
          </>
        )}
        {!finished && (
          <Link href="/login" className="woffu-focus-ring mt-6 inline-flex items-center gap-2 rounded text-sm font-medium text-white/60 hover:text-white">
            <ArrowLeft size={16} aria-hidden="true" /> กลับไปหน้าเข้าสู่ระบบ
          </Link>
        )}
      </section>
    </main>
  );
}
