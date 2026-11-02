"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck, Send } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [expiredLink, setExpiredLink] = useState(false);

  useEffect(() => {
    setExpiredLink(new URLSearchParams(window.location.search).get("error") === "invalid_link");
  }, []);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setError("");
    setSending(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || "ไม่สามารถส่งคำขอได้ กรุณาลองใหม่");
      }
      setSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "ไม่สามารถส่งคำขอได้");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0e1011] px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-[24px] border border-white/10 bg-[#191b1d] p-6 shadow-xl sm:p-8">
        <p className="text-xs font-bold tracking-[0.16em] text-[#e5ff78]">WOFFU OS / ACCOUNT</p>
        {sent ? (
          <div role="status">
            <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e5ff78]/10">
              <MailCheck size={27} className="text-[#e5ff78]" aria-hidden="true" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">ตรวจสอบอีเมลของคุณ</h1>
            <p className="mt-3 text-sm leading-7 text-white/60">
              หากอีเมลนี้มีบัญชีในระบบ คุณจะได้รับลิงก์สำหรับตั้งรหัสผ่านใหม่
              กรุณาตรวจทั้งกล่องจดหมายและจดหมายขยะ
            </p>
            <p className="mt-3 text-xs leading-6 text-white/45">
              หากไม่ได้รับอีเมล อาจเกิดจากข้อจำกัดการส่งอีเมลของบริการฟรี
              ให้ติดต่อหัวหน้าทีมเพื่อขอความช่วยเหลือ
            </p>
          </div>
        ) : (
          <>
            <h1 className="mt-4 text-2xl font-bold">ลืมรหัสผ่าน?</h1>
            <p className="mt-3 text-sm leading-7 text-white/60">
              กรอกอีเมลที่ใช้เข้าระบบ WOFFU OS เพื่อรับลิงก์ตั้งรหัสผ่านใหม่
            </p>
            {expiredLink && (
              <p role="alert" className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">
                ลิงก์ก่อนหน้าไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่
              </p>
            )}
            <form className="mt-6 space-y-4" onSubmit={requestReset}>
              <div>
                <label className="mb-2 block text-sm font-semibold" htmlFor="recovery-email">อีเมลบัญชีของคุณ</label>
                <input id="recovery-email" type="email" required autoComplete="email"
                  className="woffu-input-simple" placeholder="name@company.com"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              {error && <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
              <button type="submit" disabled={sending}
                className="woffu-focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#e5ff78] px-4 py-3 text-sm font-bold text-black disabled:opacity-60">
                <Send size={16} aria-hidden="true" /> {sending ? "กำลังส่งคำขอ..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
              </button>
            </form>
          </>
        )}
        <Link href="/login" className="woffu-focus-ring mt-6 inline-flex items-center gap-2 rounded text-sm font-medium text-white/65 hover:text-[#e5ff78]">
          <ArrowLeft size={16} aria-hidden="true" /> กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </section>
    </main>
  );
}
