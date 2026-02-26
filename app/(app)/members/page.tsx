"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

function Avatar({ url, name }: { url?: string | null; name?: string | null }) {
  const has = !!url;
  return (
    <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
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

export default function MembersPage() {
  const router = useRouter();

  const [me, setMe] = useState<MeProfile | null>(null);
  const isLeader = me?.role === "LEADER" && me?.is_active === true;

  const [items, setItems] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // UI
  const [deptFilter, setDeptFilter] = useState<"ALL" | "VIDEO" | "GRAPHIC">("ALL");
  const [q, setQ] = useState("");

  // modals
  const [cropOpen, setCropOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);

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

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items
      .filter((m) => m.is_active !== false)
      .filter((m) => (deptFilter === "ALL" ? true : m.department === deptFilter))
      .filter((m) => {
        if (!needle) return true;
        const hay = `${m.display_name ?? ""} ${m.email ?? ""} ${m.phone ?? ""} ${m.department ?? ""} ${m.role ?? ""}`.toLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => {
        if (a.role !== b.role) return a.role === "LEADER" ? -1 : 1;
        return String(a.display_name ?? "").localeCompare(String(b.display_name ?? ""), "th");
      });
  }, [items, deptFilter, q]);

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

  const Card = ({ m }: { m: Member }) => (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar url={m.avatar_url} name={m.display_name} />
          <div className="min-w-0">
            <div className="truncate text-lg font-extrabold text-white">{m.display_name || "-"}</div>
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
      <div className="mt-6">
        <div className="mb-3 flex items-end justify-between">
          <div className="text-sm font-semibold tracking-widest text-white/50">{title}</div>
          <div className="text-xs text-white/35">จำนวน: {list.length}</div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {list.map((m) => (
            <Card key={m.id} m={m} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-black text-white">
      <div className="w-full px-6 py-8 lg:px-10 lg:py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-semibold tracking-widest text-white/50">WOFFU</div>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">Members</h1>

            {me ? (
              <div className="mt-2 text-sm text-white/60">
                <span className="font-semibold text-white">{me.display_name || me.email || "ผู้ใช้งาน"}</span>{" "}
                <span className="text-white/25">·</span> <span>{me.role}</span>{" "}
                <span className="text-white/25">·</span> <span>{me.department}</span>
              </div>
            ) : (
              <div className="mt-2 text-sm text-white/50">-</div>
            )}

            <div className="mt-2 text-sm text-white/50">ทั้งหมด: {filtered.length}</div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                loadMe();
                loadMembers();
              }}
              disabled={loading}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 disabled:opacity-50"
            >
              รีเฟรช
            </button>

            {/* อัปโหลดรูป */}
            <label className="inline-flex cursor-pointer rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10">
              อัปโหลดรูป
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
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 rounded-[30px] border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {(["ALL", "VIDEO", "GRAPHIC"] as const).map((d) => {
              const active = deptFilter === d;
              return (
                <button
                  key={d}
                  onClick={() => setDeptFilter(d)}
                  className={cn(
                    "rounded-2xl border px-3 py-2 text-xs font-semibold transition",
                    active
                      ? "border-white/10 bg-white text-black"
                      : "border-white/10 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {d === "ALL" ? "ทุกฝ่าย" : d}
                </button>
              );
            })}

            <div className="ml-auto w-full md:w-[420px]">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหา: ชื่อ / อีเมล / เบอร์"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78]"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-[30px] border border-white/10 bg-white/5 p-5 text-sm text-white/60">กำลังโหลด...</div>
        ) : error ? (
          <div className="mt-6 rounded-[30px] border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">{error}</div>
        ) : (
          <>
            {/* แยกฝ่าย */}
            {deptFilter === "ALL" ? (
              <>
                <Section title="VIDEO" list={group.VIDEO} />
                <Section title="GRAPHIC" list={group.GRAPHIC} />
                <Section title="ALL" list={group.ALL} />
              </>
            ) : deptFilter === "VIDEO" ? (
              <Section title="VIDEO" list={group.VIDEO} />
            ) : (
              <Section title="GRAPHIC" list={group.GRAPHIC} />
            )}
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
    await applyCroppedAvatar(blob); // ✅ ให้เรียกตัวเดิมที่ใช้เซฟรูป
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
              await loadMembers();
            }}
          />
        ) : null}
      </div>
    </div>
  );
}