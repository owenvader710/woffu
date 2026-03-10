"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = String(params?.token || "");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/invites/${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const json = await safeJson(res);

        if (!res.ok) {
          setError((json && (json.error || json.message)) || "Invite invalid");
          return;
        }

        setEmail(json?.data?.email || "");
        setRole(json?.data?.role || "");
        setDepartment(json?.data?.department || "");
      } catch (e: any) {
        setError(e?.message || "Invite invalid");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function submit() {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/invites/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          confirmPassword,
        }),
      });

      const json = await safeJson(res);

      if (!res.ok) {
        setError((json && (json.error || json.message)) || "Create account failed");
        return;
      }

      setDone(true);
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (e: any) {
      setError(e?.message || "Create account failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
        <div className="text-xs font-semibold tracking-widest text-white/45">WOFFU</div>
        <h1 className="mt-2 text-3xl font-extrabold">Create your account</h1>

        {loading ? (
          <div className="mt-6 text-white/60">กำลังโหลด...</div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : done ? (
          <div className="mt-6 rounded-2xl border border-lime-400/30 bg-lime-400/10 p-4 text-sm text-lime-200">
            สร้างบัญชีสำเร็จ กำลังพาไปหน้าเข้าสู่ระบบ...
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div>
              <div className="mb-2 text-xs font-semibold text-white/60">Email</div>
              <input
                value={email}
                disabled
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-2 text-xs font-semibold text-white/60">Role</div>
                <input
                  value={role}
                  disabled
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 outline-none"
                />
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold text-white/60">Department</div>
                <input
                  value={department}
                  disabled
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 outline-none"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold text-white/60">Password</div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]"
                placeholder="อย่างน้อย 8 ตัวอักษร"
              />
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold text-white/60">Confirm password</div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]"
                placeholder="ยืนยันรหัสผ่าน"
              />
            </div>

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full rounded-2xl bg-[#e5ff78] px-5 py-3 text-sm font-bold text-black hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}