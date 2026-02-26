"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Project = {
  id: string;
  title: string;
  type: "VIDEO" | "GRAPHIC";
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
  created_at: string;
  start_date: string | null;
  due_date: string | null;
  brand?: string | null;
  assignee_id?: string | null;
  description?: string | null;
  video_priority?: string | null;
  video_purpose?: string | null;
  graphic_job_type?: string | null;
};

type Member = {
  id: string;
  display_name: string | null;
  department: "VIDEO" | "GRAPHIC" | "ALL";
  role: "LEADER" | "MEMBER";
  is_active: boolean;
};

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function formatDateTH(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "2-digit" });
}

function formatDateTimeTH(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  const date = d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "2-digit" });
  const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

function statusTone(status: Project["status"]) {
  if (status === "TODO") return "neutral";
  if (status === "IN_PROGRESS") return "blue";
  if (status === "BLOCKED") return "red";
  if (status === "COMPLETED") return "green";
  return "neutral";
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

export type ProjectListMode = "ACTIVE" | "COMPLETED" | "BLOCKED";

export default function ProjectListView({
  title,
  mode = "ACTIVE",
}: {
  title: string;
  mode?: ProjectListMode;
}) {
  const [items, setItems] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  const memberMap = useMemo(() => {
    const m = new Map<string, Member>();
    for (const it of members) m.set(it.id, it);
    return m;
  }, [members]);

  async function loadProjects() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const json = await safeJson(res);

      if (!res.ok) {
        setItems([]);
        setError((json && (json.error || json.message)) || `Load projects failed (${res.status})`);
        return;
      }

      const raw = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      const normalized = raw
        .map((p: any) => ({
          ...p,
          id: p?.id ?? p?.project_id ?? p?.projectId ?? p?.uuid ?? null,
        }))
        .filter((p: any) => !!p.id);

      setItems(normalized);
    } catch (e: any) {
      setItems([]);
      setError(e?.message || "Load projects failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadMembers() {
    try {
      const res = await fetch("/api/members", { cache: "no-store" });
      const json = await safeJson(res);
      if (!res.ok) return setMembers([]);
      const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      setMembers(data.filter((m: Member) => m.is_active !== false));
    } catch {
      setMembers([]);
    }
  }

  useEffect(() => {
    (async () => {
      await Promise.all([loadProjects(), loadMembers()]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredItems = useMemo(() => {
    let list = items;

    if (mode === "ACTIVE") list = list.filter((p) => p.status !== "COMPLETED" && p.status !== "BLOCKED");
    if (mode === "COMPLETED") list = list.filter((p) => p.status === "COMPLETED");
    if (mode === "BLOCKED") list = list.filter((p) => p.status === "BLOCKED");

    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((p) => {
        const assigneeName = p.assignee_id ? memberMap.get(p.assignee_id)?.display_name ?? "" : "";
        const hay = `${p.title ?? ""} ${p.brand ?? ""} ${p.video_priority ?? ""} ${p.video_purpose ?? ""} ${
          p.graphic_job_type ?? ""
        } ${assigneeName}`.toLowerCase();
        return hay.includes(needle);
      });
    }

    return list;
  }, [items, q, memberMap, mode]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-semibold tracking-widest text-white/50">WOFFU</div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">{title}</h1>
          <div className="mt-2 text-sm text-white/60">ทั้งหมด: {filteredItems.length}</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              loadProjects();
              loadMembers();
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            รีเฟรช
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหา: ชื่อโปรเจกต์ / ผู้รับผิดชอบ / แบรนด์ / รูปแบบงาน / ประเภทงาน"
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78] md:w-[520px]"
        />
      </div>

      {loading && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">กำลังโหลด...</div>
      )}

      {!loading && error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
      )}

      {!loading && !error && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5">
          <table className="w-full text-sm text-white/80">
            <thead className="bg-white/5 text-xs text-white/50">
              <tr className="text-left">
                <th className="p-4">โปรเจกต์</th>
                <th className="p-4">ฝ่าย</th>
                <th className="p-4">ผู้รับผิดชอบ</th>
                <th className="p-4">สถานะ</th>
                <th className="p-4">วันที่สั่ง</th>
                <th className="p-4">Deadline</th>
              </tr>
            </thead>

            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td className="p-6 text-white/40" colSpan={6}>
                    ไม่มีรายการตามเงื่อนไขนี้
                  </td>
                </tr>
              ) : (
                filteredItems.map((p) => {
                  const assigneeName = p.assignee_id ? memberMap.get(p.assignee_id)?.display_name ?? "-" : "-";
                  return (
                    <tr key={p.id} className="border-t border-white/10 hover:bg-white/[0.06]">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Link className="font-semibold text-white underline underline-offset-4" href={`/projects/${p.id}`}>
                            {p.title}
                          </Link>
                          {p.brand ? <Pill tone="neutral">{p.brand}</Pill> : null}
                        </div>
                      </td>

                      <td className="p-4">
                        <Pill tone={p.type === "VIDEO" ? "blue" : "amber"}>{p.type}</Pill>
                      </td>

                      <td className="p-4">
                        <span className="text-white/80">{assigneeName || "-"}</span>
                      </td>

                      <td className="p-4">
                        <Pill tone={statusTone(p.status) as any}>{p.status}</Pill>
                      </td>

                      <td className="p-4 text-white/60">{formatDateTH(p.created_at)}</td>
                      <td className="p-4 text-white/60">{formatDateTimeTH(p.due_date)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}