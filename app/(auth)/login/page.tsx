"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [msg, setMsg] = useState<string>("");

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");

    const e2 = email.trim();
    if (!e2) return setErr("กรุณาใส่อีเมล");
    if (!password) return setErr("กรุณาใส่รหัสผ่าน");

    setLoading(true);
    try {
      const { error } = await supabaseBrowser.auth.signInWithPassword({
        email: e2,
        password,
      });

      if (error) {
        setErr(error.message);
        return;
      }

      setMsg("เข้าสู่ระบบสำเร็จ");
      router.replace("/dashboard");
      router.refresh();
    } catch (ex: any) {
      setErr(ex?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-10">
      <div className="mx-auto w-full max-w-md rounded-2xl border p-6">
        <h1 className="text-2xl font-bold">เข้าสู่ระบบ</h1>
        <p className="mt-1 text-sm text-gray-600">WOFFU</p>

        {msg && (
          <div className="mt-4 rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-800">
            {msg}
          </div>
        )}

        {err && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {err}
          </div>
        )}

        <form className="mt-5 space-y-3" onSubmit={onLogin}>
          <div>
            <label className="text-sm font-medium">อีเมล</label>
            <input
              className="mt-1 w-full rounded-xl border px-4 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-sm font-medium">รหัสผ่าน</label>
            <input
              className="mt-1 w-full rounded-xl border px-4 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  );
}
