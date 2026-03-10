"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import dynamic from "next/dynamic";

const AvatarCropModal = dynamic(() => import("./AvatarCropModal"), {
  loading: () => null,
});

const EditMemberModal = dynamic(() => import("./EditMemberModal"), {
  loading: () => null,
});

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
    const dt = new Date(d);
    return dt.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return d;
  }
}

function toDateInputValue(iso?: string | null) {
  if (!iso) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function DeptPill({ dept }: { dept: Dept }) {
  const cls =
    dept === "VIDEO"
      ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
      : dept === "GRAPHIC"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
        : "border-white/10 bg-white/5 text-white/70";

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold", cls)}>
      {dept}
    </span>
  );
}

function RolePill({ role }: { role: Role }) {
  const cls =
    role === "LEADER"
      ? "border-green-500/30 bg-green-500/10 text-green-200"
      : "border-white/10 bg-white/5 text-white/70";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold", cls)}>
      {role}
    </span>
  );
}

function Avatar({
  url,
  name,
  size = 150,
}: {
  url?: string | null;
  name?: string | null;
  size?: number;
}) {
  const has = !!url;
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40"
      style={{ width: size, height: size }}
    >
      {has ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url!} alt={name || "avatar"} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-extrabold text-[#e5ff78]">
          {initials(name)}
        </div>
      )}
    </div>
  );
}

function EditMyProfileModal({
  open,
  onClose,
  me,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  me: MeProfile | null;
  onSaved: () => Promise<void> | void;
}) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");

  useEffect(() => {
    if (!open || !me) return;
    setErr("");
    setDisplayName(me.display_name ?? "");
    setPhone(me.phone ?? "");
    setBirthDate(toDateInputValue(me.birth_date ?? null));
  }, [open, me]);

  if (!open || !me?.id) return null;

  async function save() {
    setSaving(true);
    setErr("");
    try {
      const payload = {
        display_name: displayName.trim() ? displayName.trim() : null,
        phone: phone.trim() ? phone.trim() : null,
        birth_date: birthDate ? birthDate : null,
      };

      const res = await fetch(`/api/members/${encodeURIComponent(me?.id ?? "")}`, {
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
        <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-widest text-white/50">MY PROFILE</div>
            <div className="mt-1 text-xl font-extrabold">แก้ไขโปรไฟล์</div>
          </div>

          <button
            onClick={onClose}
            className="w-fit rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
            disabled={saving}
          >
            ปิด
          </button>
        </div>

        <div className="space-y-4 px-5 py-4 sm:px-6 sm:py-5">
          {err ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {err}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-semibold text-white/60">ชื่อที่แสดง</div>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]"
                placeholder="ชื่อ"
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
              <div className="mb-2 text-xs font-semibold text-white/60">อีเมล (อ่านอย่างเดียว)</div>
              <div className="break-all rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80">
                {me.email || "-"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6 sm:py-5">
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

export default function MembersPage() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"MEMBER" | "LEADER">("MEMBER");
  const [inviteDepartment, setInviteDepartment] = useState<"VIDEO" | "GRAPHIC" | "ALL">("ALL");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteErr, setInviteErr] = useState("");

  const [me, setMe] = useState<MeProfile | null>(null);
  const isLeader = me?.role === "LEADER" && me?.is_active === true;

  const [items, setItems] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [cropOpen, setCropOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [myEditOpen, setMyEditOpen] = useState(false);

  const [savingAvatar, setSavingAvatar] = useState(false);

  const loadMe = useCallback(async () => {
    const r = await fetch("/api/me-profile", { cache: "no-store" });
    const j = await safeJson(r);
    const m = (j?.data ?? j) as MeProfile | null;
    return r.ok && m?.id ? m : null;
  }, []);

  const loadMembers = useCallback(async () => {
    const r = await fetch("/api/members", { cache: "no-store" });
    const j = await safeJson(r);

    if (!r.ok) {
      throw new Error((j && (j.error || j.message)) || `Load members failed (${r.status})`);
    }

    const arr = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
    return (arr as Member[]).map((m) => ({
      ...m,
      display_name: m.display_name ?? null,
      email: m.email ?? null,
      phone: m.phone ?? null,
      avatar_url: m.avatar_url ?? null,
      birth_date: (m as any).birth_date ?? null,
    }));
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [meData, membersData] = await Promise.all([loadMe(), loadMembers()]);
      setMe(meData);
      setItems(membersData);
    } catch (e: any) {
      setItems([]);
      setError(e?.message || "Load members failed");
    } finally {
      setLoading(false);
    }
  }, [loadMe, loadMembers]);

  async function sendInvite() {
    setInviteBusy(true);
    setInviteMsg("");
    setInviteErr("");

    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          department: inviteDepartment,
        }),
      });

      const json = await safeJson(res);

      if (!res.ok) {
        setInviteErr((json && (json.error || json.message)) || "Invite failed");
        return;
      }

      setInviteMsg("ส่งคำเชิญสำเร็จแล้ว");
      setInviteEmail("");
      setInviteRole("MEMBER");
      setInviteDepartment("ALL");
    } catch (e: any) {
      setInviteErr(e?.message || "Invite failed");
    } finally {
      setInviteBusy(false);
    }
  }

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

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

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
    <div className="min-w-0 rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:rounded-[28px] md:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar url={m.avatar_url} name={m.display_name} size={88} />
          <div className="min-w-0">
            <div className="break-words text-base font-extrabold text-white md:text-lg">
              {m.display_name || "-"}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <DeptPill dept={m.department} />
              <RolePill role={m.role} />
              {!m.is_active ? (
                <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-200">
                  INACTIVE
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {isLeader ? (
          <button
            onClick={() => openEdit(m)}
            className="w-fit rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
            title="แก้ไขสมาชิก"
          >
            แก้ไข
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold tracking-widest text-white/45">EMAIL</div>
          <div className="mt-1 break-all text-white/85">{m.email || "-"}</div>
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold tracking-widest text-white/45">เบอร์</div>
          <div className="mt-1 break-words text-white/85">{m.phone || "-"}</div>
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold tracking-widest text-white/45">วันเกิด</div>
          <div className="mt-1 break-words text-white/85">{formatBirth(m.birth_date)}</div>
        </div>
      </div>
    </div>
  );

  const Section = ({ title, list }: { title: string; list: Member[] }) => {
    if (list.length === 0) return null;
    return (
      <div className="mt-8">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
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
      <div className="w-full px-4 py-6 md:px-6 md:py-8 lg:px-10 lg:py-10">
        <div className="rounded-[28px] border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.03] p-4 shadow-[0_25px_80px_rgba(0,0,0,0.55)] md:rounded-[34px] md:p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] lg:gap-8">
            <div className="flex flex-col items-center gap-3">
              <div className="w-full">
                <div className="text-xs font-semibold tracking-widest text-white/50">MY PROFILE</div>
              </div>

              <div className="mt-2 md:mt-4">
                <Avatar
                  url={me?.avatar_url ?? null}
                  name={me?.display_name ?? me?.email ?? null}
                  size={210}
                />
              </div>

              <div className="mt-3 flex w-full max-w-[260px] gap-2">
                <label
                  className={cn(
                    "flex flex-1 cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/85 hover:bg-white/10",
                    savingAvatar ? "pointer-events-none opacity-60" : ""
                  )}
                  title={savingAvatar ? "กำลังอัปโหลด..." : "อัปโหลดรูปโปรไฟล์"}
                >
                  <span className="truncate">{savingAvatar ? "กำลังอัปโหลด..." : "อัปโหลดรูป"}</span>
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
                  onClick={() => void refreshAll()}
                  disabled={loading}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 disabled:opacity-50"
                >
                  รีเฟรช
                </button>
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="break-words text-2xl font-extrabold md:text-3xl">
                    {me?.display_name || me?.email || "ผู้ใช้งาน"}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <DeptPill dept={me?.department ?? "ALL"} />
                    <RolePill role={me?.role ?? "MEMBER"} />
                  </div>
                </div>

                <button
                  onClick={() => setMyEditOpen(true)}
                  className="w-fit rounded-2xl bg-[#e5ff78] px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
                >
                  แก้ไขโปรไฟล์
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="min-w-0 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-xs font-semibold tracking-widest text-white/45">EMAIL</div>
                  <div className="mt-1 break-all text-white/85">{me?.email || "-"}</div>
                </div>
                <div className="min-w-0 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="text-xs font-semibold tracking-widest text-white/45">เบอร์</div>
                  <div className="mt-1 break-words text-white/85">{me?.phone || "-"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isLeader ? (
          <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:rounded-[34px] md:p-6">
            <div className="text-lg font-extrabold text-white md:text-xl">Invite Member</div>
            <div className="mt-1 text-sm leading-6 text-white/45">
              เชิญสมาชิกผ่านอีเมล เพื่อให้ผู้ถูกเชิญตั้งรหัสผ่านเองและเข้าใช้งานระบบได้
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#e5ff78] md:col-span-2"
              />

              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "MEMBER" | "LEADER")}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]"
              >
                <option value="MEMBER">MEMBER</option>
                <option value="LEADER">LEADER</option>
              </select>

              <select
                value={inviteDepartment}
                onChange={(e) => setInviteDepartment(e.target.value as "VIDEO" | "GRAPHIC" | "ALL")}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-[#e5ff78]"
              >
                <option value="ALL">ALL</option>
                <option value="VIDEO">VIDEO</option>
                <option value="GRAPHIC">GRAPHIC</option>
              </select>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={sendInvite}
                disabled={inviteBusy}
                className="rounded-2xl bg-[#e5ff78] px-5 py-2.5 text-sm font-bold text-black hover:opacity-90 disabled:opacity-60"
              >
                {inviteBusy ? "กำลังส่ง..." : "Send Invite"}
              </button>

              {inviteMsg ? <div className="text-sm text-lime-300">{inviteMsg}</div> : null}
              {inviteErr ? <div className="text-sm text-red-300">{inviteErr}</div> : null}
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 rounded-[30px] border border-white/10 bg-white/5 p-5 text-sm text-white/60">
            กำลังโหลด...
          </div>
        ) : error ? (
          <div className="mt-6 rounded-[30px] border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
            {error}
          </div>
        ) : (
          <>
            <Section title="VIDEO" list={group.VIDEO} />
            <Section title="GRAPHIC" list={group.GRAPHIC} />
            <Section title="ALL" list={group.ALL} />
          </>
        )}

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
            await refreshAll();
          }}
        />

        <EditMyProfileModal
          open={myEditOpen}
          onClose={() => setMyEditOpen(false)}
          me={me}
          onSaved={async () => {
            await refreshAll();
          }}
        />

        {isLeader && editing ? (
          <EditMemberModal
            open={editOpen}
            onClose={() => setEditOpen(false)}
            member={editing as any}
            onSaved={async () => {
              setEditOpen(false);
              setEditing(null);
              await refreshAll();
            }}
          />
        ) : null}
      </div>
    </div>
  );
}