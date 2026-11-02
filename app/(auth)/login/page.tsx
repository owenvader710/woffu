"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "ไม่สามารถเข้าสู่ระบบได้");
      router.replace("/dashboard");
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "ไม่สามารถเข้าสู่ระบบได้");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0e1011] px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-[24px] border border-white/10 bg-[#191b1d] p-6 shadow-xl sm:p-8">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-white/45">TEAM WORKSPACE</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#e5ff78]">WOFFU OS</h1>
          <p className="mt-3 text-sm text-white/60">เข้าสู่ระบบจัดการงานของทีม</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-white/80">อีเมล</label>
            <div className="relative">
              <Mail size={18} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input id="login-email" type="email" required autoComplete="username"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="woffu-input-simple pl-11" />
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label htmlFor="login-password" className="text-sm font-semibold text-white/80">รหัสผ่าน</label>
              <Link href="/forgot-password"
                className="woffu-focus-ring rounded text-xs font-semibold text-[#e5ff78] hover:underline">
                ลืมรหัสผ่าน?
              </Link>
            </div>
            <div className="relative">
              <LockKeyhole size={18} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input id="login-password" type="password" required autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน" className="woffu-input-simple pl-11" />
            </div>
          </div>

          {err && (
            <div role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{err}</div>
          )}

          <button type="submit" disabled={loading}
            className="woffu-focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#e5ff78] px-4 py-3 text-sm font-bold text-black transition hover:bg-[#daef83] disabled:opacity-60">
            {loading ? "กำลังเข้าสู่ระบบ..." : <>เข้าสู่ระบบ <ArrowRight size={17} aria-hidden="true" /></>}
          </button>
        </form>

        <p className="mt-7 border-t border-white/10 pt-5 text-center text-xs leading-6 text-white/50">
          ยังไม่มีบัญชี? ติดต่อหัวหน้าทีมเพื่อรับลิงก์เชิญสมาชิก
        </p>
      </section>
    </main>
  );
}
