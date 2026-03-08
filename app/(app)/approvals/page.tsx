"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ProfileMini = {
  id: string;
  display_name?: string | null;
  email?: string | null;
};

type DepartmentFilter = "ALL" | "VIDEO" | "GRAPHIC" | "HISTORY";

type StatusRequest = {
  id: string;
  project_id: string;
  from_status: string;
  to_status: string;
  request_status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  requested_by: string;
  approved_by?: string | null;

  project?: {
    id: string;
    code?: string | null;
    title: string | null;
    department?: "VIDEO" | "GRAPHIC" | "ALL" | null;
    assignee_id?: string | null;
  } | null;

  requester?: ProfileMini | null;
  assignee?: ProfileMini | null;
};

async function safeJson(res: Response) {
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatDateTimeTH(iso: string) {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
    const time = d.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${date} ${time}`;
  } catch {
    return iso;
  }
}

function badgeClass(s: StatusRequest["request_status"]) {
  if (s === "PENDING") {
    return "border-yellow-400/40 bg-yellow-400/10 text-yellow-200 shadow-[0_0_18px_rgba(250,204,21,0.18)]";
  }
  if (s === "APPROVED") {
    return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.18)]";
  }
  return "border-red-400/40 bg-red-400/10 text-red-200 shadow-[0_0_18px_rgba(239,68,68,0.18)]";
}

function normalizeDepartment(
  dep?: string | null
): "VIDEO" | "GRAPHIC" | "ALL" | "UNKNOWN" {
  if (dep === "VIDEO" || dep === "GRAPHIC" || dep === "ALL") return dep;
  return "UNKNOWN";
}

function departmentPillClass(dep?: string | null) {
  const d = normalizeDepartment(dep);

  if (d === "VIDEO") {
    return "border-cyan-400/40 bg-cyan-400/10 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.18)]";
  }
  if (d === "GRAPHIC") {
    return "border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-200 shadow-[0_0_18px_rgba(217,70,239,0.18)]";
  }
  if (d === "ALL") {
    return "border-violet-400/40 bg-violet-400/10 text-violet-200 shadow-[0_0_18px_rgba(139,92,246,0.18)]";
  }
  return "border-white/15 bg-white/5 text-white/60";
}

function filterByDepartment(items: StatusRequest[], filter: DepartmentFilter) {
  if (filter === "ALL") return items;
  return items.filter((item) => normalizeDepartment(item.project?.department) === filter);
}

function ApprovalCard({
  item,
  onApprove,
  onReject,
}: {
  item: StatusRequest;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const department = normalizeDepartment(item.project?.department);

  return (
    <div className="group min-w-0 overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_10px_30px_rgba(0,0,0,0.35)] transition duration-200 hover:border-white/20 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_14px_40px_rgba(0,0,0,0.42)]">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex max-w-full rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-white/90">
              <span className="truncate">
                {item.project?.code || item.project_id.slice(0, 6).toUpperCase()}
              </span>
            </span>

            <span
              className={cn(
                "inline-flex max-w-full rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-wide",
                departmentPillClass(item.project?.department)
              )}
            >
              <span className="truncate">{department}</span>
            </span>

            <span
              className={cn(
                "inline-flex max-w-full rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-wide",
                badgeClass(item.request_status)
              )}
            >
              <span className="truncate">{item.request_status}</span>
            </span>
          </div>

          <div className="mt-3 min-w-0 text-base font-extrabold leading-snug text-white">
            <Link
              className="block break-words underline decoration-white/20 underline-offset-4 transition hover:decoration-white/60"
              href={`/projects/${item.project_id}`}
            >
              <span className="line-clamp-2">{item.project?.title || "Project"}</span>
            </Link>
          </div>

          <div className="mt-2 break-words text-sm text-white/70">
            {item.from_status} → {item.to_status}
          </div>

          <div className="mt-2 break-words text-xs leading-6 text-white/55">
            {item.assignee?.display_name
              ? `ผู้รับผิดชอบ ${item.assignee.display_name}`
              : "ยังไม่ระบุผู้รับผิดชอบ"}
            {` · โดย ${item.requester?.display_name || "-"}`}
            {` · ${formatDateTimeTH(item.created_at)}`}
          </div>
        </div>
      </div>

      {(onApprove || onReject) && (
        <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
          {onReject && (
            <button
              onClick={onReject}
              className="w-full rounded-2xl border border-red-400/35 bg-red-500/90 px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_0_18px_rgba(239,68,68,0.45),0_0_38px_rgba(239,68,68,0.18)] transition duration-200 hover:scale-[1.02] hover:bg-red-400 hover:shadow-[0_0_24px_rgba(239,68,68,0.65),0_0_44px_rgba(239,68,68,0.24)] active:scale-[0.98] sm:w-auto"
            >
              Reject
            </button>
          )}

          {onApprove && (
            <button
              onClick={onApprove}
              className="w-full rounded-2xl border border-emerald-300/40 bg-emerald-400 px-5 py-2.5 text-sm font-extrabold text-black shadow-[0_0_18px_rgba(52,211,153,0.58),0_0_40px_rgba(16,185,129,0.24)] transition duration-200 hover:scale-[1.02] hover:bg-emerald-300 hover:shadow-[0_0_26px_rgba(110,231,183,0.78),0_0_50px_rgba(16,185,129,0.32)] active:scale-[0.98] sm:w-auto"
            >
              Approve
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApprovalsPage() {
  const [items, setItems] = useState<StatusRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<DepartmentFilter>("ALL");

  async function loadAll() {
    setLoading(true);
    setErr("");

    try {
      const res = await fetch("/api/approvals", { cache: "no-store" });
      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error((json && (json.error || json.message)) || "Load approvals failed");
      }

      const data = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
          ? json
          : json?.data?.pending || json?.data?.history
            ? [...(json?.data?.pending ?? []), ...(json?.data?.history ?? [])]
            : [];

      setItems(data as StatusRequest[]);
    } catch (e: any) {
      setItems([]);
      setErr(e?.message || "Load approvals failed");
    } finally {
      setLoading(false);
    }
  }

  async function act(id: string, action: "approve" | "reject") {
    try {
      const res = await fetch(`/api/approvals/${encodeURIComponent(id)}/${action}`, {
        method: "POST",
      });
      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error((json && (json.error || json.message)) || "Action failed");
      }

      await loadAll();
    } catch (e: any) {
      alert(e?.message || "Action failed");
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const pending = useMemo(() => items.filter((x) => x.request_status === "PENDING"), [items]);
  const history = useMemo(() => items.filter((x) => x.request_status !== "PENDING"), [items]);

  const filteredPending = useMemo(() => {
    if (filter === "HISTORY") return [];
    return filterByDepartment(pending, filter);
  }, [pending, filter]);

  const filteredHistory = useMemo(() => {
    if (filter === "HISTORY") return history;
    return filterByDepartment(history, filter);
  }, [history, filter]);

  const filterOptions: DepartmentFilter[] = ["ALL", "VIDEO", "GRAPHIC", "HISTORY"];

  const filterCount = (option: DepartmentFilter) => {
    if (option === "HISTORY") return history.length;
    if (option === "ALL") return pending.length;
    return pending.filter(
      (item) => normalizeDepartment(item.project?.department) === option
    ).length;
  };

  return (
    <div className="w-full bg-black text-white">
      <div className="w-full px-4 py-6 md:px-6 md:py-8 lg:px-10 lg:py-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-[0.22em] text-white/45">WOFFU</div>
            <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              Approvals
            </h1>
            <div className="mt-2 text-sm text-white/50">Pending: {pending.length}</div>
          </div>

          <button
            onClick={loadAll}
            disabled={loading}
            className="w-fit rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 disabled:opacity-50"
          >
            รีเฟรช
          </button>
        </div>

        <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => {
              const active = filter === option;

              return (
                <button
                  key={option}
                  onClick={() => setFilter(option)}
                  className={cn(
                    "rounded-full border px-4 py-2.5 text-sm font-extrabold tracking-wide transition duration-200",
                    active
                      ? "border-white/10 bg-white text-black shadow-[0_0_24px_rgba(255,255,255,0.14)]"
                      : "border-white/10 bg-transparent text-white/80 hover:border-white/20 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {option} ({filterCount(option)})
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-[30px] border border-white/10 bg-white/5 p-5 text-sm text-white/60">
            กำลังโหลด...
          </div>
        ) : err ? (
          <div className="mt-6 rounded-[30px] border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
            {err}
          </div>
        ) : filter === "HISTORY" ? (
          <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4 md:rounded-[30px] md:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-extrabold tracking-wide text-white/90">HISTORY</div>
              <div className="text-xs text-white/50">ล่าสุด 20 รายการ</div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="mt-4 text-sm text-white/50">ยังไม่มีประวัติ</div>
            ) : (
              <div className="mt-4 space-y-3">
                {filteredHistory.slice(0, 20).map((r) => (
                  <ApprovalCard key={r.id} item={r} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4 md:rounded-[30px] md:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-extrabold tracking-wide text-white/90">PENDING</div>
              <div className="text-xs text-white/50">{filteredPending.length} รายการ</div>
            </div>

            {filteredPending.length === 0 ? (
              <div className="mt-4 text-sm text-white/50">ไม่มีคำขอรออนุมัติ</div>
            ) : (
              <div className="mt-4 space-y-3">
                {filteredPending.map((r) => (
                  <ApprovalCard
                    key={r.id}
                    item={r}
                    onApprove={() => act(r.id, "approve")}
                    onReject={() => act(r.id, "reject")}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}