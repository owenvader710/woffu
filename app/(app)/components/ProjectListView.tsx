"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Project = {
  id: string;
  code?: string | null;
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
  blocked_reason?: string | null;
};

type Member = {
  id: string;
  display_name: string | null;
  department: "VIDEO" | "GRAPHIC" | "ALL";
  role: "LEADER" | "MEMBER";
  is_active: boolean;
};

type ProjectLog = {
  id: string;
  project_id: string;
  action?: string | null;
  message?: string | null;
  meta?: any | null;
  detail?: any | null;
  created_at?: string | null;
};

type StatusRequest = {
  id: string;
  project_id: string;
  from_status: string;
  to_status: string;
  request_status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  approved_at?: string | null;
};

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function formatDateTH(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatDateTimeTH(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  const date = d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
  const time = d.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
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

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${cls}`}>
      {children}
    </span>
  );
}

export type ProjectListMode = "ACTIVE" | "COMPLETED" | "BLOCKED";

function extractBlockedReason(logs: ProjectLog[]): string | null {
  for (const log of logs) {
    const metaReason =
      typeof log?.meta?.blocked_reason === "string" ? log.meta.blocked_reason.trim() : "";
    if (metaReason) return metaReason;

    const detailReason =
      typeof log?.detail?.blocked_reason === "string" ? log.detail.blocked_reason.trim() : "";
    if (detailReason) return detailReason;

    const msg = typeof log?.message === "string" ? log.message : "";
    const marker = "blocked_reason:";
    const idx = msg.toLowerCase().indexOf(marker);
    if (idx >= 0) {
      const text = msg.slice(idx + marker.length).trim();
      if (text) return text;
    }
  }

  return null;
}

function makeCode(p: Project) {
  const real = (p.code ?? "").toString().trim();
  if (real) return real;

  const t = (p.type || "").toUpperCase().trim();
  const short = (p.id || "").replace(/-/g, "").slice(0, 6).toUpperCase();
  return t ? `${t}-${short}` : short;
}

function secondLine(p: Project) {
  const parts = [
    p.brand ? String(p.brand).toUpperCase() : null,
    p.video_purpose ? String(p.video_purpose) : null,
    p.graphic_job_type ? String(p.graphic_job_type) : null,
    p.video_priority ? `PRIORITY: ${String(p.video_priority)}` : null,
  ].filter(Boolean) as string[];

  return parts.length ? parts.join(" · ") : "";
}

function MobileProjectCard({
  p,
  assigneeName,
  blockedReason,
  completedApprovedAt,
  mode,
}: {
  p: Project;
  assigneeName: string;
  blockedReason?: string;
  completedApprovedAt?: string;
  mode: ProjectListMode;
}) {
  const middleLabel = mode === "COMPLETED" ? "Deadline" : "วันที่สั่ง";
  const middleValue = mode === "COMPLETED" ? formatDateTimeTH(p.due_date) : formatDateTH(p.created_at);

  const lastLabel = mode === "COMPLETED" ? "วันที่เสร็จ" : "Deadline";
  const lastValue = mode === "COMPLETED" ? formatDateTimeTH(completedApprovedAt) : formatDateTimeTH(p.due_date);

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex shrink-0 items-center rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-extrabold text-white/85">
              {makeCode(p)}
            </span>

            <Link
              href={`/projects/${p.id}`}
              className="min-w-0 break-words font-extrabold text-white underline-offset-4 hover:underline"
            >
              {p.title || "-"}
            </Link>
          </div>

          {secondLine(p) ? (
            <div className="mt-2 break-words text-xs leading-6 text-white/45">
              {secondLine(p)}
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <Pill tone={p.type === "VIDEO" ? "blue" : "amber"}>{p.type}</Pill>
            <Pill tone={statusTone(p.status)}>{p.status}</Pill>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
          <div className="text-[10px] text-white/40">ผู้รับผิดชอบ</div>
          <div className="mt-1 truncate text-xs text-white/85 md:text-sm">{assigneeName || "-"}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
          <div className="text-[10px] text-white/40">{middleLabel}</div>
          <div className="mt-1 break-words text-xs text-white/85 md:text-sm">{middleValue}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
          <div className="text-[10px] text-white/40">{lastLabel}</div>
          <div className="mt-1 break-words text-xs text-white/85 md:text-sm">{lastValue}</div>
        </div>
      </div>

      {mode === "BLOCKED" && blockedReason ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-xs leading-6 text-red-100">
          <span className="font-extrabold">รายละเอียดปัญหา:</span> {blockedReason}
        </div>
      ) : null}
    </div>
  );
}

export default function ProjectListView({
  title,
  mode = "ACTIVE",
}: {
  title: string;
  mode?: ProjectListMode;
}) {
  const [items, setItems] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [blockedReasons, setBlockedReasons] = useState<Record<string, string>>({});
  const [completedDates, setCompletedDates] = useState<Record<string, string>>({});
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
      if (!res.ok) {
        setMembers([]);
        return;
      }
      const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      setMembers(data.filter((m: Member) => m.is_active !== false));
    } catch {
      setMembers([]);
    }
  }

  useEffect(() => {
    void Promise.all([loadProjects(), loadMembers()]);
  }, []);

  useEffect(() => {
    if (mode !== "BLOCKED") return;

    const blockedItems = items.filter((p) => p.status === "BLOCKED");
    if (blockedItems.length === 0) {
      setBlockedReasons({});
      return;
    }

    let cancelled = false;

    void (async () => {
      const entries = await Promise.all(
        blockedItems.map(async (p) => {
          try {
            const res = await fetch(`/api/projects/${encodeURIComponent(p.id)}/logs`, {
              cache: "no-store",
            });
            const json = await safeJson(res);
            const logs = Array.isArray(json?.data) ? (json.data as ProjectLog[]) : [];
            const reason = extractBlockedReason(logs);
            return [p.id, reason || ""] as const;
          } catch {
            return [p.id, ""] as const;
          }
        })
      );

      if (cancelled) return;

      const next: Record<string, string> = {};
      for (const [id, reason] of entries) {
        if (reason) next[id] = reason;
      }
      setBlockedReasons(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [items, mode]);

  useEffect(() => {
    if (mode !== "COMPLETED") return;

    const completedItems = items.filter((p) => p.status === "COMPLETED");
    if (completedItems.length === 0) {
      setCompletedDates({});
      return;
    }

    let cancelled = false;

    void (async () => {
      const entries = await Promise.all(
        completedItems.map(async (p) => {
          try {
            const res = await fetch(`/api/projects/${encodeURIComponent(p.id)}/status-requests`, {
              cache: "no-store",
            });
            const json = await safeJson(res);
            const rows = Array.isArray(json?.data) ? (json.data as StatusRequest[]) : [];

            const completedApproved = rows.find(
              (r) => r.to_status === "COMPLETED" && r.request_status === "APPROVED"
            );

            return [p.id, completedApproved?.approved_at || ""] as const;
          } catch {
            return [p.id, ""] as const;
          }
        })
      );

      if (cancelled) return;

      const next: Record<string, string> = {};
      for (const [id, approvedAt] of entries) {
        if (approvedAt) next[id] = approvedAt;
      }
      setCompletedDates(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [items, mode]);

  const filteredItems = useMemo(() => {
    let list = items;

    if (mode === "ACTIVE") list = list.filter((p) => p.status !== "COMPLETED" && p.status !== "BLOCKED");
    if (mode === "COMPLETED") list = list.filter((p) => p.status === "COMPLETED");
    if (mode === "BLOCKED") list = list.filter((p) => p.status === "BLOCKED");

    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((p) => {
        const assigneeName = p.assignee_id ? memberMap.get(p.assignee_id)?.display_name ?? "" : "";
        const blockedReason = blockedReasons[p.id] ?? "";
        const completedAt = completedDates[p.id] ?? "";
        const hay =
          `${p.title ?? ""} ${p.brand ?? ""} ${p.video_priority ?? ""} ${p.video_purpose ?? ""} ` +
          `${p.graphic_job_type ?? ""} ${assigneeName} ${blockedReason} ${completedAt} ${p.code ?? ""}`.toLowerCase();
        return hay.includes(needle);
      });
    }

    return list;
  }, [items, q, memberMap, mode, blockedReasons, completedDates]);

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold tracking-widest text-white/50">WOFFU</div>
          <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight text-white">{title}</h1>
          <div className="mt-2 text-sm text-white/60">ทั้งหมด: {filteredItems.length}</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              void loadProjects();
              void loadMembers();
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            รีเฟรช
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหา: ชื่อโปรเจกต์ / รหัสงาน / ผู้รับผิดชอบ / แบรนด์ / รูปแบบงาน / รายละเอียดปัญหา"
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78] xl:max-w-[520px]"
        />
      </div>

      {loading && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          กำลังโหลด...
        </div>
      )}

      {!loading && error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="mt-6 space-y-3 lg:hidden">
            {filteredItems.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/40">
                ไม่มีรายการตามเงื่อนไขนี้
              </div>
            ) : (
              filteredItems.map((p) => {
                const assigneeName = p.assignee_id ? memberMap.get(p.assignee_id)?.display_name ?? "-" : "-";
                const blockedReason = blockedReasons[p.id] ?? "";
                const completedApprovedAt = completedDates[p.id] ?? "";

                return (
                  <MobileProjectCard
                    key={p.id}
                    p={p}
                    assigneeName={assigneeName}
                    blockedReason={blockedReason}
                    completedApprovedAt={completedApprovedAt}
                    mode={mode}
                  />
                );
              })
            )}
          </div>

          <div className="mt-6 hidden overflow-hidden rounded-2xl border border-white/10 bg-white/5 lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm text-white/80">
                <thead className="bg-white/5 text-xs text-white/50">
                  <tr className="text-left">
                    <th className="p-4">โปรเจกต์</th>
                    <th className="p-4">ฝ่าย</th>
                    <th className="p-4">ผู้รับผิดชอบ</th>
                    <th className="p-4">สถานะ</th>
                    <th className="p-4">{mode === "COMPLETED" ? "Deadline" : "วันที่สั่ง"}</th>
                    <th className="p-4">{mode === "COMPLETED" ? "วันที่เสร็จ" : "Deadline"}</th>
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
                      const assigneeName = p.assignee_id
                        ? memberMap.get(p.assignee_id)?.display_name ?? "-"
                        : "-";
                      const blockedReason = blockedReasons[p.id];
                      const completedApprovedAt = completedDates[p.id] ?? "";

                      return (
                        <tr key={p.id} className="border-t border-white/10 align-top hover:bg-white/[0.06]">
                          <td className="p-4">
                            <div className="flex items-start gap-3">
                              <span className="mt-[2px] inline-flex shrink-0 items-center rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-extrabold text-white/85">
                                {makeCode(p)}
                              </span>

                              <div className="min-w-0">
                                <Link
                                  href={`/projects/${p.id}`}
                                  className="block text-base font-extrabold text-white hover:underline"
                                >
                                  {p.title || "-"}
                                </Link>

                                {secondLine(p) ? (
                                  <div className="mt-1 text-xs text-white/45">{secondLine(p)}</div>
                                ) : null}

                                {mode === "BLOCKED" && blockedReason ? (
                                  <div className="mt-3 max-w-[560px] rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs leading-6 text-red-100">
                                    <span className="font-extrabold">รายละเอียดปัญหา:</span> {blockedReason}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <Pill tone={p.type === "VIDEO" ? "blue" : "amber"}>{p.type}</Pill>
                          </td>

                          <td className="p-4">
                            <span className="text-white/80">{assigneeName || "-"}</span>
                          </td>

                          <td className="p-4">
                            <Pill tone={statusTone(p.status)}>{p.status}</Pill>
                          </td>

                          <td className="p-4 text-white/60">
                            {mode === "COMPLETED" ? formatDateTimeTH(p.due_date) : formatDateTH(p.created_at)}
                          </td>
                          <td className="p-4 text-white/60">
                            {mode === "COMPLETED"
                              ? formatDateTimeTH(completedApprovedAt)
                              : formatDateTimeTH(p.due_date)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}