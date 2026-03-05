"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ProfileMini = {
  id: string;
  display_name?: string | null;
  email?: string | null;
};

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
    const date = d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "2-digit" });
    const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${date} ${time}`;
  } catch {
    return iso;
  }
}

function badgeClass(s: StatusRequest["request_status"]) {
  if (s === "PENDING") return "border-yellow-400/30 bg-yellow-400/10 text-yellow-200";
  if (s === "APPROVED") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  return "border-red-400/30 bg-red-400/10 text-red-200";
}

export default function ApprovalsPage() {
  const [items, setItems] = useState<StatusRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function loadAll() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/approvals", { cache: "no-store" });
      const json = await safeJson(res);
      if (!res.ok) throw new Error((json && (json.error || json.message)) || "Load approvals failed");

      // รองรับทั้ง 2 รูปแบบ: array ตรงๆ หรือ { pending, history }
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
      const res = await fetch(`/api/approvals/${encodeURIComponent(id)}/${action}`, { method: "POST" });
      const json = await safeJson(res);
      if (!res.ok) throw new Error((json && (json.error || json.message)) || "Action failed");
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

  return (
    <div className="w-full bg-black text-white">
      <div className="w-full px-6 py-8 lg:px-10 lg:py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold tracking-widest text-white/50">WOFFU</div>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Approvals</h1>
            <div className="mt-2 text-sm text-white/50">Pending: {pending.length}</div>
          </div>

          <button
            onClick={loadAll}
            disabled={loading}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 disabled:opacity-50"
          >
            รีเฟรช
          </button>
        </div>

        {loading ? (
          <div className="mt-6 rounded-[30px] border border-white/10 bg-white/5 p-5 text-sm text-white/60">กำลังโหลด...</div>
        ) : err ? (
          <div className="mt-6 rounded-[30px] border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">{err}</div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Pending */}
            <div className="rounded-[30px] border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-white/90">PENDING</div>
                <div className="text-xs text-white/50">{pending.length} รายการ</div>
              </div>

              {pending.length === 0 ? (
                <div className="mt-4 text-sm text-white/50">ไม่มีคำขอรออนุมัติ</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {pending.map((r) => (
                    <div key={r.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                            <span className="rounded-lg border border-white/10 bg-black/40 px-2 py-0.5 text-[11px] font-extrabold text-white/85">
                              {r.project?.code || r.project_id.slice(0, 6).toUpperCase()}
                            </span>
                            <Link className="min-w-0 truncate underline underline-offset-4" href={`/projects/${r.project_id}`}>
                              {r.project?.title || "Project"}
                            </Link>
                          </div>

                          <div className="mt-1 text-xs text-white/60">
                            {r.from_status} → {r.to_status}
                            {r.project?.department ? ` · ฝ่าย ${r.project.department}` : ""}
                            {r.assignee?.display_name ? ` · ผู้รับผิดชอบ ${r.assignee.display_name}` : ""}
                            {` · โดย ${r.requester?.display_name || "-"} · ${formatDateTimeTH(r.created_at)}`}
                          </div>
                        </div>

                        <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-xs ${badgeClass(r.request_status)}`}>
                          {r.request_status}
                        </span>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => act(r.id, "approve")}
                          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => act(r.id, "reject")}
                          className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* History */}
            <div className="rounded-[30px] border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-white/90">HISTORY</div>
                <div className="text-xs text-white/50">ล่าสุด 20 รายการ</div>
              </div>

              {history.length === 0 ? (
                <div className="mt-4 text-sm text-white/50">ยังไม่มีประวัติ</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {history.slice(0, 20).map((r) => (
                    <div key={r.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                            <span className="rounded-lg border border-white/10 bg-black/40 px-2 py-0.5 text-[11px] font-extrabold text-white/85">
                              {r.project?.code || r.project_id.slice(0, 6).toUpperCase()}
                            </span>
                            <Link className="min-w-0 truncate underline underline-offset-4" href={`/projects/${r.project_id}`}>
                              {r.project?.title || "Project"}
                            </Link>
                          </div>

                          <div className="mt-1 text-xs text-white/60">
                            {r.from_status} → {r.to_status}
                            {r.project?.department ? ` · ฝ่าย ${r.project.department}` : ""}
                            {r.assignee?.display_name ? ` · ผู้รับผิดชอบ ${r.assignee.display_name}` : ""}
                            {` · โดย ${r.requester?.display_name || "-"} · ${formatDateTimeTH(r.created_at)}`}
                          </div>
                        </div>

                        <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-xs ${badgeClass(r.request_status)}`}>
                          {r.request_status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}