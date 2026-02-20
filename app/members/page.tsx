"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/utils/supabase/client";
import AvatarCropModal from "./AvatarCropModal";

type Member = {
  id: string;
  display_name: string | null;
  department: "VIDEO" | "GRAPHIC" | "ALL";
  role: "LEADER" | "MEMBER";
  is_active: boolean;
  phone: string | null;
  avatar_url: string | null;
};

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export default function MembersPage() {
  const [me, setMe] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const [msg, setMsg] = useState<string>("");
  const [err, setErr] = useState<string>("");

  // Avatar crop modal
  const [cropOpen, setCropOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // invite
  const [inviteEmail, setInviteEmail] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    setLoading(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/members", { cache: "no-store" });
      const json = await safeJson(res);

      if (!res.ok) {
        setErr((json && (json.error || json.message)) || `Load members failed (${res.status})`);
        setMembers([]);
        setMe(null);
        return;
      }

      const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      setMembers(data);

      // ✅ กัน supabaseBrowser undefined / auth ไม่มี
      const sb: any = supabaseBrowser as any;
      if (!sb?.auth?.getUser) {
        setMe(null);
        setErr("Supabase client ฝั่ง browser ไม่พร้อม (supabaseBrowser.auth.getUser ไม่เจอ) — เช็ค utils/supabase/client.ts");
        return;
      }

      const { data: u } = await sb.auth.getUser();
      const uid = u?.user?.id;

      if (uid) setMe(data.find((m: Member) => m.id === uid) ?? null);
      else setMe(null);
    } catch (e: any) {
      setErr(e?.message || "Load members failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const isLeader = useMemo(() => me?.role === "LEADER" && me?.is_active, [me]);

  // ✅ Apply from CropModal: upload PNG -> storage -> update profiles.avatar_url
  async function applyCroppedAvatar(payload: { blob: Blob; previewDataUrl: string }) {
    setMsg("");
    setErr("");

    if (!me?.id) {
      setErr("ยังไม่ได้ login");
      return;
    }

    try {
      const sb: any = supabaseBrowser as any;

      const path = `${me.id}/avatar.png`;

      const { error: upErr } = await sb.storage.from("avatars").upload(path, payload.blob, {
        upsert: true,
        contentType: "image/png",
        cacheControl: "3600",
      });

      if (upErr) {
        setErr(upErr.message);
        return;
      }

      const { data } = sb.storage.from("avatars").getPublicUrl(path);
      const publicUrl = data.publicUrl;

      const { error: dbErr } = await sb.from("profiles").update({ avatar_url: publicUrl }).eq("id", me.id);
      if (dbErr) {
        setErr(dbErr.message);
        return;
      }

      setMsg("อัปเดตรูปโปรไฟล์แล้ว");
      setAvatarFile(null);
      setCropOpen(false);
      await load();
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    }
  }

  async function invite() {
    setMsg("");
    setErr("");

    const email = inviteEmail.trim();
    if (!email) {
      setErr("กรุณาใส่ email");
      return;
    }

    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = await safeJson(res);
      if (!res.ok) {
        setErr((json && (json.error || json.message)) || `Invite failed (${res.status})`);
        return;
      }

      setMsg("ส่ง Invite แล้ว (เช็คอีเมลผู้ใช้)");
      setInviteEmail("");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Invite failed");
    }
  }

  return (
    <div className="p-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">สมาชิก</h1>
          <p className="mt-1 text-sm text-gray-600">รายชื่อสมาชิกทั้งหมดในระบบ</p>
        </div>

        <button onClick={load} className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50">
          รีเฟรช
        </button>
      </div>

      {loading && <div className="mt-6 rounded-xl border p-4 text-sm text-gray-600">กำลังโหลด...</div>}

      {!loading && msg && (
        <div className="mt-6 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-800">{msg}</div>
      )}

      {!loading && err && (
        <div className="mt-6 rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">{err}</div>
      )}

      {/* โปรไฟล์ของฉัน */}
      <div className="mt-6 rounded-2xl border p-5">
        <div className="text-sm text-gray-600">โปรไฟล์ของฉัน</div>

        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {/* ✅ Avatar วงกลมเล็ก + ปุ่มกล้อง */}
            <div className="relative">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative h-24 w-24 overflow-hidden rounded-full border bg-gray-50"
                title="เปลี่ยนรูปโปรไฟล์"
              >
                {me?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={me.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No avatar</div>
                )}

                {/* hover overlay */}
                <div className="absolute inset-0 hidden items-center justify-center bg-black/35 text-white group-hover:flex">
                  <span className="text-xs">แก้ไข</span>
                </div>
              </button>

              {/* icon button แบบ Discord */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full border bg-white shadow-sm hover:bg-gray-50"
                title="อัปโหลดรูป"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 7l1.5-2h3L15 7h3a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h3z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 17a4 4 0 100-8 4 4 0 000 8z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </button>

              {/* input ซ่อน */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setAvatarFile(f);
                  if (f) setCropOpen(true);
                  // reset value เพื่อเลือกไฟล์เดิมซ้ำได้
                  e.currentTarget.value = "";
                }}
              />
            </div>

            <div>
              <div className="font-semibold">{me?.display_name || "-"}</div>
              <div className="text-xs text-gray-500">
                role: {me?.role || "-"} / dept: {me?.department || "-"}
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 md:w-[420px]">
            เลือกรูปจากเครื่อง → ปรับ “ซูม/เลื่อน” ในหน้าต่างเล็ก → Apply
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          * ระบบจะอัปโหลดเป็น PNG วงกลม (พื้นหลังโปร่งใส) และอัปเดต avatar_url
        </p>
      </div>

      {/* Invite (Leader เท่านั้น) */}
      {isLeader && (
        <div className="mt-6 rounded-2xl border p-5">
          <div className="text-sm font-semibold">เพิ่มสมาชิก (Invite)</div>
          <div className="mt-1 text-xs text-gray-500">
            ส่ง invite ไปที่อีเมล (ต้องตั้งค่า SERVICE ROLE ใน server route)
          </div>

          <div className="mt-4 flex flex-col gap-2 md:flex-row">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              className="flex-1 rounded-xl border px-4 py-2 text-sm"
            />
            <button onClick={invite} className="rounded-xl bg-lime-300 px-4 py-2 text-sm font-medium hover:opacity-90">
              Invite
            </button>
          </div>
        </div>
      )}

      {/* รายชื่อสมาชิก */}
      <div className="mt-6">
        <div className="text-sm font-semibold">รายชื่อสมาชิก</div>

        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          {members.map((m) => (
            <div key={m.id} className="rounded-2xl border p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 overflow-hidden rounded-full border bg-gray-50">
                    {m.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">-</div>
                    )}
                  </div>

                  <div>
                    <div className="font-semibold">{m.display_name || "-"}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      dept: {m.department} • phone: {m.phone || "-"}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-500">{m.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ✅ Crop Modal (ขนาดไม่เต็มหน้า) */}
      <AvatarCropModal
        open={cropOpen}
        file={avatarFile}
        onClose={() => setCropOpen(false)}
        onApply={applyCroppedAvatar}
      />
    </div>
  );
}
