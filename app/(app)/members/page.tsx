"use client";

import React, { useEffect, useMemo, useState } from "react";
import EditMemberModal from "./EditMemberModal";

type Member = {
  id: string;
  display_name: string | null;
  department: "VIDEO" | "GRAPHIC" | "ALL";
  role: "LEADER" | "MEMBER";
  is_active: boolean;
  phone?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  birth_date?: string | null; // ✅ เพิ่ม
};

type Me = {
  id: string;
  role: "LEADER" | "MEMBER";
  is_active: boolean;
};

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function formatBirthTH(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    // ถ้าเป็น YYYY-MM-DD อยู่แล้ว
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const dd = iso.slice(8, 10);
      const mm = iso.slice(5, 7);
      const yyyy = iso.slice(0, 4);
      const dt = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
      if (!Number.isNaN(dt.getTime())) {
        return dt.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "2-digit" });
      }
    }
    return "-";
  }
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "2-digit" });
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "amber" | "red" | "blue";
}) {
  const cls =
    tone === "green"
      ? "border-green-500/30 bg-green-500/10 text-green-200"
      : tone === "amber"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : tone === "red"
      ? "border-red-500/30 bg-red-500/10 text-red-200"
      : tone === "blue"
      ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
      : "border-white/10 bg-white/5 text-white/70";

  return <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${cls}`}>{children}</span>;
}

export default function MembersPage() {
  const [items, setItems] = useState<Member[]>([]);
  const [me, setMe] = useState<Me | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);

  const isLeader = useMemo(() => me?.role === "LEADER" && me?.is_active === true, [me]);

  async function loadMe() {
    try {
      const r = await fetch("/api/me-profile", { cache: "no-store" });
      const j = await safeJson(r);
      const m = (j?.data ?? j) as Me | null;
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
      setItems(arr);
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

  const activeItems = useMemo(() => items.filter((m) => m.is_active !== false), [items]);

  function openEdit(m: Member) {
    if (!isLeader) return;
    setEditing(m);
    setEditOpen(true);
  }

  return (
    <div className="min-h-screen w-full bg-black text-white">
      <div className="w-full px-6 py-8 lg:px-10 lg:py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-semibold tracking-widest text-white/50">WOFFU</div>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">Members</h1>
            <div className="mt-2 text-sm text-white/60">ทั้งหมด: {activeItems.length}</div>
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
          </div>
        </div>

        {loading && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">กำลังโหลด...</div>
        )}

        {!loading && error && (
          <div className="mt-6 rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeItems.map((m) => (
              <div
                key={m.id}
                className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-lg font-extrabold text-white">{m.display_name || "-"}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Pill tone={m.department === "VIDEO" ? "blue" : m.department === "GRAPHIC" ? "amber" : "neutral"}>
                        {m.department}
                      </Pill>
                      <Pill tone={m.role === "LEADER" ? "green" : "neutral"}>{m.role}</Pill>
                    </div>
                  </div>

                  {isLeader ? (
                    <button
                      onClick={() => openEdit(m)}
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
                      title="แก้ไขสมาชิก"
                    >
                      แก้ไข
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 space-y-2 text-sm text-white/70">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-white/45">Email</div>
                    <div className="truncate text-white/80">{m.email || "-"}</div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-white/45">เบอร์</div>
                    <div className="truncate text-white/80">{m.phone || "-"}</div>
                  </div>

                  {/* ✅ เพิ่มแสดงวันเดือนปีเกิด */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-white/45">วันเกิด</div>
                    <div className="truncate text-white/80">{formatBirthTH(m.birth_date)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <EditMemberModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        member={editing}
        onSaved={async () => {
          await loadMembers();
        }}
      />
    </div>
  );
}