"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Edit2, RefreshCw, X } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import AvatarCropModal from "./AvatarCropModal";
import EditMemberModal from "./EditMemberModal";

type Member = {
  id: string;
  display_name: string | null;
  department: string;
  role: string;
  is_active: boolean;
  avatar_url?: string | null;
  phone?: string | null;
  email?: string | null;
};

async function safeJson(res: Response) {
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

function initials(name?: string | null) {
  const s = (name || "").trim();
  if (!s) return "•";
  return s[0].toUpperCase();
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "lime" | "green" | "red";
}) {
  const cls =
    tone === "lime"
      ? "border-[#e5ff78]/30 bg-[#e5ff78]/15 text-[#e5ff78]"
      : tone === "green"
      ? "border-green-500/30 bg-green-500/10 text-green-200"
      : tone === "red"
      ? "border-red-500/30 bg-red-500/10 text-red-200"
      : "border-white/10 bg-white/5 text-white/75";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-tight ${cls}`}>
      {children}
    </span>
  );
}

function AvatarSquare({ url, name }: { url?: string | null; name?: string | null }) {
  return (
    <div className="relative h-[260px] w-[260px] overflow-hidden rounded-[40px] border border-white/10 bg-white/5 shadow-2xl">
      {url ? (
        <img src={url} alt={name || "avatar"} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-6xl font-extrabold text-white/20">
          {initials(name)}
        </div>
      )}
    </div>
  );
}

function AvatarCardImage({ url, name }: { url?: string | null; name?: string | null }) {
  return (
    <div className="relative h-44 w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      {url ? (
        <img src={url} alt={name || "avatar"} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-5xl font-extrabold text-white/20">
          {initials(name)}
        </div>
      )}
    </div>
  );
}

function ModalShell({
  open,
  title,
  subtitle,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0b0b] text-white shadow-[0_30px_120px_rgba(0,0,0,0.75)]">
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <div className="text-lg font-extrabold tracking-tight">{title}</div>
            {subtitle ? <div className="mt-1 text-sm text-white/45">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
            title="ปิด"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function EditFieldModal({
  open,
  label,
  value,
  placeholder,
  type = "text",
  submitting,
  error,
  onClose,
  onSave,
}: {
  open: boolean;
  label: string;
  value: string;
  placeholder?: string;
  type?: "text" | "email" | "tel";
  submitting: boolean;
  error?: string;
  onClose: () => void;
  onSave: (next: string) => void;
}) {
  const [v, setV] = useState(value);

  useEffect(() => {
    if (!open) return;
    setV(value);
  }, [open, value]);

  return (
    <ModalShell open={open} title={`แก้ไข ${label}`} subtitle="Edit" onClose={onClose}>
      {error ? (
        <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      <div className="space-y-4">
        <div>
          <div className="mb-2 text-xs font-bold tracking-widest text-white/45 uppercase">{label}</div>
          <input
            type={type}
            value={v}
            onChange={(e) => setV(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#e5ff78]"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => onSave(v)}
            className="rounded-2xl border border-[#e5ff78]/20 bg-[#e5ff78] px-5 py-2 text-sm font-extrabold text-black hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export default function MembersPage() {
  const [items, setItems] = useState<Member[]>([]);
  const [me, setMe] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ✅ แยก state ไม่ให้ชื่อชนกัน
  const [memberEditOpen, setMemberEditOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // crop avatar
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);

  // edit field modal
  const [fieldEditOpen, setFieldEditOpen] = useState<null | "phone" | "email">(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState<string>("");

  // invite
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteErr, setInviteErr] = useState("");
  const [inviteOk, setInviteOk] = useState("");

  const isLeader = String(me?.role || "").toUpperCase() === "LEADER" && me?.is_active !== false;

  async function loadAll() {
    setLoading(true);
    setErr("");
    try {
      const [rMembers, rMe] = await Promise.all([
        fetch("/api/members", { cache: "no-store" }),
        fetch("/api/me-profile", { cache: "no-store" }),
      ]);

      const jMembers = await safeJson(rMembers);
      const jMe = await safeJson(rMe);

      if (!rMembers.ok) {
        throw new Error((jMembers?.error || jMembers?.message) || `Load failed (${rMembers.status})`);
      }

      const list = Array.isArray(jMembers?.data) ? jMembers.data : Array.isArray(jMembers) ? jMembers : [];
      const meRaw = jMe?.data ?? jMe ?? null;

      setItems(list);

      // ✅ ให้ me มาจาก list เป็นหลัก เพื่อให้ role/department/is_active มาครบ
      if (meRaw?.id) {
        const fromList = list.find((x: Member) => x.id === meRaw.id);
        setMe(fromList || meRaw);
      } else {
        setMe(null);
      }
    } catch (e: any) {
      setErr(e?.message || "Load members failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeItems = useMemo(() => items.filter((m) => m?.is_active !== false), [items]);
  const sortByName = (a: Member, b: Member) =>
    String(a.display_name || a.id).localeCompare(String(b.display_name || b.id));

  const leaders = useMemo(
    () => activeItems.filter((m) => String(m.role).toUpperCase() === "LEADER").sort(sortByName),
    [activeItems]
  );
  const videoSorted = useMemo(
    () =>
      activeItems
        .filter((m) => String(m.role).toUpperCase() !== "LEADER" && String(m.department).toUpperCase() === "VIDEO")
        .sort(sortByName),
    [activeItems]
  );
  const graphicSorted = useMemo(
    () =>
      activeItems
        .filter((m) => String(m.role).toUpperCase() !== "LEADER" && String(m.department).toUpperCase() === "GRAPHIC")
        .sort(sortByName),
    [activeItems]
  );

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setCropFile(file);
    setCropOpen(true);
  }

  async function applyCroppedAvatar(pngBlob: Blob) {
    if (!me?.id) return;
    setSavingAvatar(true);
    setErr("");
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const fileName = `${me.id}/${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(fileName, pngBlob, { contentType: "image/png", upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const avatar_url = pub?.publicUrl || null;

      const { error: updErr } = await supabase.from("profiles").update({ avatar_url }).eq("id", me.id);
      if (updErr) throw updErr;

      await loadAll();
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      setSavingAvatar(false);
    }
  }

  async function saveField(kind: "phone" | "email", next: string) {
    setEditSaving(true);
    setEditErr("");
    try {
      const payload: any = {};
      payload[kind] = next.trim() || null;

      const res = await fetch("/api/me-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await safeJson(res);
      if (!res.ok) throw new Error((json && (json.error || json.message)) || `Save failed (${res.status})`);

      setMe((prev) => (prev ? { ...prev, ...payload } : prev));
      setItems((prev) => prev.map((m) => (m.id === me?.id ? ({ ...m, ...payload } as any) : m)));
      setFieldEditOpen(null);
    } catch (e: any) {
      setEditErr(e?.message || "Save failed");
    } finally {
      setEditSaving(false);
    }
  }

  async function submitInvite() {
    setInviteErr("");
    setInviteOk("");
    const email = inviteEmail.trim();
    if (!email) return setInviteErr("กรุณาใส่ email");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setInviteErr("รูปแบบอีเมลไม่ถูกต้อง");

    setInviting(true);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await safeJson(res);
      if (!res.ok) throw new Error((json && (json.error || json.message)) || `Invite failed (${res.status})`);

      setInviteOk("ส่ง invite แล้ว");
      setInviteEmail("");
    } catch (e: any) {
      setInviteErr(e?.message || "Invite failed");
    } finally {
      setInviting(false);
    }
  }

  if (loading) return <div className="p-10 text-white/50 animate-pulse text-center">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-end mb-10">
          <div>
            <p className="text-[10px] font-black tracking-[0.3em] text-white/30 uppercase">WOFFU SYSTEM</p>
            <h1 className="text-4xl font-black mt-1">
              Members <span className="text-sm font-normal text-white/20 ml-2">({activeItems.length})</span>
            </h1>
          </div>
          <button onClick={loadAll} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all active:scale-95">
            <RefreshCw size={20} />
          </button>
        </header>

        {err ? (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm">{err}</div>
        ) : null}

        {me ? (
          <section className="bg-[#0f0f0f] border border-white/5 rounded-[48px] p-8 md:p-10 mb-16 shadow-2xl">
            <div className="flex flex-col lg:flex-row gap-12 items-center lg:items-start">
              <div className="flex flex-col gap-4 w-full max-w-[260px]">
                <AvatarSquare url={me.avatar_url} name={me.display_name} />

                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                <button
                  onClick={openFilePicker}
                  disabled={savingAvatar}
                  className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-bold hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Camera size={14} /> {savingAvatar ? "กำลังอัปโหลด..." : "เปลี่ยนรูปโปรไฟล์"}
                </button>
                <p className="text-[10px] text-white/20 text-center">* เลือกแล้วปรับซูม/ครอปได้</p>
              </div>

              <div className="flex-1 w-full">
                <div className="flex items-center gap-2 mb-4 justify-center lg:justify-start">
                  <Badge tone="neutral">{String(me.role || "MEMBER").toUpperCase()}</Badge>
                  <Badge tone={me.is_active === false ? "red" : "lime"}>{me.is_active === false ? "INACTIVE" : "ACTIVE"}</Badge>
                </div>

                <h2 className="text-5xl font-black mb-8 tracking-tighter text-center lg:text-left">{me.display_name || "Guest"}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/5 p-5 rounded-[24px] flex justify-between items-center hover:bg-white/10 transition-all">
                    <div>
                      <p className="text-[10px] text-white/30 font-bold uppercase mb-1">Tel.</p>
                      <p className="text-base font-semibold">{me.phone || "-"}</p>
                    </div>
                    <button
                      onClick={() => { setEditErr(""); setFieldEditOpen("phone"); }}
                      className="p-2.5 rounded-xl bg-white/5 text-white/20 hover:text-[#e5ff78] hover:bg-[#e5ff78]/10 transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>

                  <div className="bg-white/5 border border-white/5 p-5 rounded-[24px] flex justify-between items-center hover:bg-white/10 transition-all">
                    <div className="min-w-0">
                      <p className="text-[10px] text-white/30 font-bold uppercase mb-1">E-mail</p>
                      <p className="text-base font-semibold truncate">{me.email || "-"}</p>
                    </div>
                    <button
                      onClick={() => { setEditErr(""); setFieldEditOpen("email"); }}
                      className="p-2.5 rounded-xl bg-white/5 text-white/20 hover:text-[#e5ff78] hover:bg-[#e5ff78]/10 transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>

                {/* ✅ Invite ต้องขึ้นเฉพาะหัวหน้า */}
                {isLeader ? (
                  <div className="mt-8 rounded-[22px] border border-white/10 bg-white/5 p-5">
                    <div className="text-sm font-extrabold text-white/85">เพิ่มสมาชิกใหม่ (Invite)</div>
                    <div className="mt-1 text-xs text-white/45">ส่ง invite ไปที่อีเมล</div>

                    {inviteErr ? (
                      <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{inviteErr}</div>
                    ) : null}
                    {inviteOk ? (
                      <div className="mt-3 rounded-2xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">{inviteOk}</div>
                    ) : null}

                    <div className="mt-4 flex gap-2">
                      <input
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#e5ff78]"
                        inputMode="email"
                      />
                      <button
                        onClick={submitInvite}
                        disabled={inviting}
                        className="rounded-2xl border border-[#e5ff78]/20 bg-[#e5ff78] px-6 py-3 text-sm font-extrabold text-black hover:opacity-90 disabled:opacity-50"
                      >
                        {inviting ? "กำลังส่ง..." : "Invite"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <div className="space-y-16">
          <TeamSection
            title="หัวหน้า"
            subtitle="LEADER"
            data={leaders}
            isLeader={isLeader}
            onEditMember={(m) => { setEditingMember(m); setMemberEditOpen(true); }}
          />
          <TeamSection
            title="ทีมวิดีโอ"
            subtitle="VIDEO"
            data={videoSorted}
            isLeader={isLeader}
            onEditMember={(m) => { setEditingMember(m); setMemberEditOpen(true); }}
          />
          <TeamSection
            title="ทีมกราฟิก"
            subtitle="GRAPHIC"
            data={graphicSorted}
            isLeader={isLeader}
            onEditMember={(m) => { setEditingMember(m); setMemberEditOpen(true); }}
          />
        </div>

        <div className="h-20" />
      </div>

      <AvatarCropModal
        open={cropOpen}
        imageFile={cropFile}
        onClose={() => { setCropOpen(false); setCropFile(null); }}
        onConfirm={async (blob) => {
          setCropOpen(false);
          setCropFile(null);
          await applyCroppedAvatar(blob);
        }}
      />

      <EditFieldModal
        open={fieldEditOpen === "phone"}
        label="Tel."
        value={me?.phone || ""}
        placeholder="เช่น 0612345678"
        type="tel"
        submitting={editSaving}
        error={editErr}
        onClose={() => setFieldEditOpen(null)}
        onSave={(v) => saveField("phone", v)}
      />

      <EditFieldModal
        open={fieldEditOpen === "email"}
        label="E-mail"
        value={me?.email || ""}
        placeholder="เช่น name@company.com"
        type="email"
        submitting={editSaving}
        error={editErr}
        onClose={() => setFieldEditOpen(null)}
        onSave={(v) => saveField("email", v)}
      />

      {/* Edit member modal (หัวหน้าเท่านั้น) */}
      <EditMemberModal
        open={memberEditOpen}
        member={editingMember}
        onClose={() => { setMemberEditOpen(false); setEditingMember(null); }}
        onSaved={async () => { await loadAll(); }}
      />
    </div>
  );
}

function TeamSection({
  title,
  subtitle,
  data,
  isLeader,
  onEditMember,
}: {
  title: string;
  subtitle: string;
  data: Member[];
  isLeader: boolean;
  onEditMember: (m: Member) => void;
}) {
  if (data.length === 0) return null;

  return (
    <div>
      <div className="flex items-end gap-3 mb-8 px-2">
        <h3 className="text-2xl font-black">{title}</h3>
        <span className="text-[11px] font-bold text-white/20 mb-1.5 uppercase tracking-widest">
          {subtitle} ({data.length})
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((m) => (
          <div key={m.id} className="bg-[#0f0f0f] border border-white/5 p-5 rounded-[32px] hover:border-white/15 transition-all">
            <AvatarCardImage url={m.avatar_url} name={m.display_name} />
            <div className="mt-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-extrabold truncate text-white">{m.display_name || "-"}</p>
                <div className="mt-1 space-y-0.5 text-[11px] text-white/45">
                  <div className="truncate">Tel: {m.phone || "-"}</div>
                  <div className="truncate">Mail: {m.email || "-"}</div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <Badge tone={m.is_active === false ? "red" : "neutral"}>{String(m.role || "MEMBER").toUpperCase()}</Badge>

                {/* ✅ ปุ่มแก้สมาชิก เฉพาะหัวหน้า */}
                {isLeader ? (
                  <button
                    onClick={() => onEditMember(m)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/10"
                  >
                    แก้ไข
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}