"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import AvatarCropModal from "./AvatarCropModal";
import EditMemberModal from "./EditMemberModal";

type Dept = "VIDEO" | "GRAPHIC" | "ALL";
type Role = "LEADER" | "MEMBER";

type MeProfile = {
  id: string;
  display_name: string | null;
  department: Dept;
  role: Role;
  email: string | null;
  is_active: boolean;
  avatar_url?: string | null;
  phone?: string | null;
  birth_date?: string | null;
};

type Member = {
  id: string;
  display_name: string | null;
  department: Dept;
  role: Role;
  is_active: boolean;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  birth_date?: string | null;
};

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function initials(name?: string | null) {
  const s = (name || "").trim();
  if (!s) return "U";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "U";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase();
}

function formatBirth(d?: string | null) {
  if (!d) return "-";
  try {
    // รองรับทั้ง YYYY-MM-DD และ ISO
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return d;
  }
}

function DeptPill({ dept }: { dept: Dept }) {
  const cls =
    dept === "VIDEO"
      ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
      : dept === "GRAPHIC"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : "border-white/10 bg-white/5 text-white/70";

  return <span className={cn("inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold", cls)}>{dept}</span>;
}

function RolePill({ role }: { role: Role }) {
  const cls =
    role === "LEADER" ? "border-green-500/30 bg-green-500/10 text-green-200" : "border-white/10 bg-white/5 text-white/70";
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold", cls)}>{role}</span>;
}

function Avatar({
  url,
  name,
  size = 84,
  rounded = "rounded-[26px]",
}: {
  url?: string | null;
  name?: string | null;
  size?: number;
  rounded?: string;
}) {
  const has = !!url;
  return (
    <div
      className={cn("relative overflow-hidden border border-white/10 bg-black/40", rounded)}
      style={{ width: size, height: size }}
    >
      {has ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url!} alt={name || "avatar"} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xl font-extrabold text-[#e5ff78]">
          {initials(name)}
        </div>
      )}
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="text-xs font-semibold tracking-widest text-white/45">{label}</div>
      <div className="mt-1 text-white/85">{value}</div>
    </div>
  );
}

export default function MembersPage() {
  const [me, setMe] = useState<MeProfile | null>(null);
  const isLeader = me?.role === "LEADER" && me?.is_active === true;

  const [items, setItems] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // modals
  const [cropOpen, setCropOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);

  const [savingAvatar, setSavingAvatar] = useState(false);

  async function loadMe() {
    try {
      const r = await fetch("/api/me-profile", { cache: "no-store" });
      const j = await safeJson(r);
      const m = (j?.data ?? j) as MeProfile | null;
      setMe(r.ok && m?.id ? m : null);
    } catch {
      setMe(null);
    }
  }

  async function loadMembers() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/members", { cache: "no-store" });
      const j = await safeJson(r);

      if (!r.ok) {
        setItems([]);
        setError((j && (j.error || j.message)) || `Load members failed (${r.status})`);
        return;
      }

      const arr = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
      const normalized = (arr as Member[]).map((m) => ({
        ...m,
        display_name: m.display_name ?? null,
        email: m.email ?? null,
        phone: m.phone ?? null,
        avatar_url: m.avatar_url ?? null,
        birth_date: (m as any).birth_date ?? null,
      }));

      setItems(normalized);
    } catch (e: any) {
      setItems([]);
      setError(e?.message || "Load members failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      await loadMe();
      await loadMembers();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ เซฟรูปโปรไฟล์ของ “me”
  async function applyCroppedAvatar(blob: Blob) {
    setError("");

    if (!me?.id) {
      setError("ไม่พบผู้ใช้งาน (me) กรุณารีเฟรช");
      return;
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      setError("Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)");
      return;
    }

    setSavingAvatar(true);
    try {
      const supabase = createBrowserClient(url, anon);
      const fileName = `avatar-${me.id}-${Date.now()}.png`;

      const up = await supabase.storage.from("avatars").upload(fileName, blob, {
        contentType: "image/png",
        upsert: true,
      });

      if (up.error) {
        setError(up.error.message);
        return;
      }

      const pub = supabase.storage.from("avatars").getPublicUrl(fileName);
      const publicUrl = pub?.data?.publicUrl || null;

      if (!publicUrl) {
        setError("ไม่สามารถสร้าง public url ได้");
        return;
      }

      const upd = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", me.id);
      if (upd.error) {
        setError(upd.error.message);
        return;
      }
    } catch (e: any) {
      setError(e?.message || "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setSavingAvatar(false);
    }
  }

  const filtered = useMemo(() => {
    return items
      .filter((m) => m.is_active !== false)
      .sort((a, b) => {
        if (a.role !== b.role) return a.role === "LEADER" ? -1 : 1;
        return String(a.display_name ?? "").localeCompare(String(b.display_name ?? ""), "th");
      });
  }, [items]);

  const group = useMemo(() => {
    const g = { VIDEO: [] as Member[], GRAPHIC: [] as Member[], ALL: [] as Member[] };
    for (const m of filtered) {
      if (m.department === "VIDEO") g.VIDEO.push(m);
      else if (m.department === "GRAPHIC") g.GRAPHIC.push(m);
      else g.ALL.push(m);
    }
    return g;
  }, [filtered]);

  function openEdit(m: Member) {
    if (!isLeader) return;
    setEditing(m);
    setEditOpen(true);
  }

  const MemberCard = ({ m }: { m: Member }) => (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar url={m.avatar_url} name={m.display_name} size={56} rounded="rounded-2xl" />
          <div className="min-w-0">
            <div className="truncate text-lg font-extrabold text-white">{m.display_name || "-"}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <DeptPill dept={m.department} />
              <RolePill role={m.role} />
            </div>
          </div>
        </div>

        {isLeader ? (
          <button
            onClick={() => openEdit(m)}
            className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
            title="แก้ไขสมาชิก"
          >
            แก้ไข
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
        <div>
          <div className="text-xs font-semibold tracking-widest text-white/45">EMAIL</div>
          <div className="mt-1 break-all text-white/85">{m.email || "-"}</div>
        </div>
        <div>
          <div className="text-xs font-semibold tracking-widest text-white/45">เบอร์</div>
          <div className="mt-1 text-white/85">{m.phone || "-"}</div>
        </div>
        <div>
          <div className="text-xs font-semibold tracking-widest text-white/45">วันเกิด</div>
          <div className="mt-1 text-white/85">{formatBirth(m.birth_date)}</div>
        </div>
      </div>
    </div>
  );

  const Section = ({ title, list }: { title: string; list: Member[] }) => {
    if (list.length === 0) return null;
    return (
      <div className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <div className="text-sm font-semibold tracking-widest text-white/50">{title}</div>
          <div className="text-xs text-white/35">จำนวน: {list.length}</div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {list.map((m) => (
            <MemberCard key={m.id} m={m} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-black text-white">
      <div className="w-full px-6 py-8 lg:px-10 lg:py-10">
        {/* ✅ โปรไฟล์บนสุด: รูปซ้าย / ข้อมูลขวา (คล้ายเรฟ) */}
        <div className="rounded-[34px] border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.03] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.55)]">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
            {/* LEFT: Avatar + Upload under avatar */}
            <div className="flex flex-col items-start gap-3">
              <div className="text-xs font-semibold tracking-widest text-white/50">MY PROFILE</div>

              <Avatar
                url={me?.avatar_url ?? null}
                name={me?.display_name ?? me?.email ?? null}
                size={180}
                rounded="rounded-[28px]"
              />

              <label
                className={cn(
                  "mt-1 inline-flex w-full cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10",
                  savingAvatar ? "pointer-events-none opacity-60" : ""
                )}
                title={savingAvatar ? "กำลังอัปโหลด..." : "อัปโหลดรูปโปรไฟล์"}
              >
                {savingAvatar ? "กำลังอัปโหลด..." : "อัปโหลดรูป"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (!f) return;
                    setCropFile(f);
                    setCropOpen(true);
                    e.currentTarget.value = "";
                  }}
                />
              </label>

              <button
                onClick={() => {
                  loadMe();
                  loadMembers();
                }}
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 disabled:opacity-50"
              >
                รีเฟรช
              </button>
            </div>

            {/* RIGHT: Name + pills + fields + edit */}
            <div className="min-w-0">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-3xl font-extrabold tracking-tight">
                      {me?.display_name || me?.email || "ผู้ใช้งาน"}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <DeptPill dept={me?.department ?? "ALL"} />
                      <RolePill role={me?.role ?? "MEMBER"} />
                      {me?.is_active === false ? (
                        <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-200">
                          INACTIVE
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* ✅ ใช้ปุ่มเดิม (เปิด EditMemberModal แต่ส่งเป็น member ของตัวเอง) */}
                  <button
                    onClick={() => {
                      if (!me?.id) return;
                      // เปิด modal เดิมของสมาชิก แต่ใช้กับ me ได้เลย (เพราะ PATCH endpoint เดียวกัน)
                      const asMember: Member = {
                        id: me.id,
                        display_name: me.display_name ?? null,
                        department: me.department ?? "ALL",
                        role: me.role ?? "MEMBER",
                        is_active: me.is_active ?? true,
                        email: me.email ?? null,
                        phone: me.phone ?? null,
                        avatar_url: me.avatar_url ?? null,
                        birth_date: me.birth_date ?? null,
                      };
                      setEditing(asMember);
                      setEditOpen(true);
                    }}
                    className="rounded-2xl bg-[#e5ff78] px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
                  >
                    แก้ไขโปรไฟล์
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <ProfileField label="EMAIL" value={<span className="break-all">{me?.email || "-"}</span>} />
                  <ProfileField label="เบอร์" value={me?.phone || "-"} />
                  <ProfileField label="วันเกิด" value={formatBirth(me?.birth_date ?? null)} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Members list (คงเดิม) */}
        {loading ? (
          <div className="mt-6 rounded-[30px] border border-white/10 bg-white/5 p-5 text-sm text-white/60">กำลังโหลด...</div>
        ) : error ? (
          <div className="mt-6 rounded-[30px] border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">{error}</div>
        ) : (
          <>
            <Section title="VIDEO" list={group.VIDEO} />
            <Section title="GRAPHIC" list={group.GRAPHIC} />
            <Section title="ALL" list={group.ALL} />
          </>
        )}

        {/* Modals */}
        <AvatarCropModal
          open={cropOpen}
          imageFile={cropFile}
          onClose={() => {
            setCropOpen(false);
            setCropFile(null);
          }}
          onConfirm={async (blob) => {
            setCropOpen(false);
            setCropFile(null);
            await applyCroppedAvatar(blob);
            await loadMe();
            await loadMembers();
          }}
        />

        {editing ? (
          <EditMemberModal
            open={editOpen}
            onClose={() => {
              setEditOpen(false);
              setEditing(null);
            }}
            member={editing as any}
            onSaved={async () => {
              setEditOpen(false);
              setEditing(null);
              await loadMe();
              await loadMembers();
            }}
          />
        ) : null}
      </div>
    </div>
  );
}