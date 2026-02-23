"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type { Project, ProjectStatus } from "./useProjects";

function formatDateTH(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "2-digit" });
}

function matchQuery(p: Project, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = `${p.title ?? ""} ${p.brand ?? ""} ${p.video_priority ?? ""} ${p.video_purpose ?? ""} ${
    p.graphic_job_type ?? ""
  }`.toLowerCase();
  return hay.includes(needle);
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
      ? "border-sky-500/30 bg-sky-500/10 text-sky-200"
      : "border-white/10 bg-white/5 text-white/70";

  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] ${cls}`}>{children}</span>;
}

function statusTone(s: ProjectStatus) {
  if (s === "TODO") return "neutral";
  if (s === "IN_PROGRESS") return "blue";
  if (s === "BLOCKED") return "red";
  return "green";
}

type Mode = "ACTIVE" | "COMPLETED" | "BLOCKED";

export default function ProjectListView({
  title,
  mode,
  items,
  loading,
  error,
  isLeader,
  onRefresh,
  onEdit,
  onDelete,
}: {
  title: string;
  mode: Mode;
  items: Project[];
  loading: boolean;
  error: string;
  isLeader: boolean;
  onRefresh: () => void;
  onEdit?: (p: Project) => void;
  onDelete?: (p: Project) => void;
}) {
  // filters
  const [typeFilter, setTypeFilter] = useState<"ALL" | "VIDEO" | "GRAPHIC">("ALL");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    let x = items;

    // ✅ โหมดกำหนดว่าเอาสถานะไหน
    if (mode === "ACTIVE") x = x.filter((p) => p.status !== "COMPLETED" && p.status !== "BLOCKED");
    if (mode === "COMPLETED") x = x.filter((p) => p.status === "COMPLETED");
    if (mode === "BLOCKED") x = x.filter((p) => p.status === "BLOCKED");

    if (typeFilter !== "ALL") x = x.filter((p) => p.type === typeFilter);
    if (q.trim()) x = x.filter((p) => matchQuery(p, q));
    return x;
  }, [items, mode, typeFilter, q]);

  const IconBtn = ({
    title,
    onClick,
    children,
    danger,
  }: {
    title: string;
    onClick: () => void;
    children: React.ReactNode;
    danger?: boolean;
  }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${
        danger
          ? "border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/15"
          : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-semibold tracking-widest text-white/50">WOFFU</div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">{title}</h1>
          <div className="mt-2 text-sm text-white/60">ทั้งหมด: {list.length}</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            รีเฟรช
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["ALL", "VIDEO", "GRAPHIC"] as const).map((t) => {
              const active = typeFilter === t;
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? "border-white/10 bg-white text-black"
                      : "border-white/10 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {t === "ALL" ? "ทุกฝ่าย" : t}
                </button>
              );
            })}
          </div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหา: ชื่อโปรเจกต์ / แบรนด์ / รูปแบบงาน / ประเภทงาน"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78] md:w-[420px]"
          />
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">กำลังโหลด...</div>
      )}

      {!loading && error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
      )}

      {!loading && !error && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <table className="w-full text-sm text-white/80">
            <thead className="bg-white/5 text-xs text-white/50">
              <tr className="text-left">
                <th className="p-4">โปรเจกต์</th>
                <th className="p-4">ฝ่าย</th>
                <th className="p-4">สถานะ</th>
                <th className="p-4">วันที่สั่ง</th>
                <th className="p-4">Deadline</th>
                <th className="p-4 text-right">จัดการ</th>
              </tr>
            </thead>

            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td className="p-6 text-white/40" colSpan={6}>
                    ไม่มีรายการตามเงื่อนไขนี้
                  </td>
                </tr>
              ) : (
                list.map((p) => (
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
                      <Pill tone={statusTone(p.status)}>{p.status}</Pill>
                    </td>

                    <td className="p-4 text-white/60">{formatDateTH(p.created_at)}</td>
                    <td className="p-4 text-white/60">{formatDateTH(p.due_date)}</td>

                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        {isLeader && onEdit && onDelete ? (
                          <>
                            <IconBtn title="แก้ไข" onClick={() => onEdit(p)}>
                              ✏️
                            </IconBtn>
                            <IconBtn title="ลบ" danger onClick={() => onDelete(p)}>
                              🗑️
                            </IconBtn>
                          </>
                        ) : (
                          <span className="text-xs text-white/30">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}