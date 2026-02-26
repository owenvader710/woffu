"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type MeProfile = {
  id: string;
  role: "LEADER" | "MEMBER";
  is_active: boolean;
  display_name?: string | null;
};

type ProfileMini = {
  id: string;
  display_name: string | null;
  department?: "VIDEO" | "GRAPHIC" | "ALL" | null;
  role?: "LEADER" | "MEMBER" | null;
  avatar_url?: string | null;
};

type StatusRequest = {
  id: string;
  project_id: string;
  from_status: string;
  to_status: string;
  request_status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  requested_by: string;
  approved_by: string | null;
  approved_at: string | null;

  project?: {
    id: string;
    title: string;
    type: "VIDEO" | "GRAPHIC";
    status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
    brand: string | null;
  } | null;

  requester?: ProfileMini | null;
  approver?: ProfileMini | null;
};

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function formatDateTimeTH(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function badgeClass(status: StatusRequest["request_status"]) {
  if (status === "APPROVED") return "border-green-200 bg-green-50 text-green-700";
  if (status === "REJECTED") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export default function ApprovalsPage() {
  const [me, setMe] = useState<MeProfile | null>(null);
  const isLeader = useMemo(() => me?.role === "LEADER" && me?.is_active === true, [me]);

  const [items, setItems] = useState<StatusRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function loadAll() {
    setLoading(true);
    setErr("");

    try {
      const rMe = await fetch("/api/me-profile", { cache: "no-store" });
      const jMe = await safeJson(rMe);
      const m = (jMe?.data ?? jMe) as MeProfile | null;
      const meObj = rMe.ok && m?.id ? m : null;
      setMe(meObj);

      const leaderNow = meObj?.role === "LEADER" && meObj?.is_active === true;
      if (!leaderNow) {
        setItems([]);
        setErr("หน้านี้สำหรับหัวหน้าเท่านั้น");
        return;
      }

      const res = await fetch("/api/approvals", { cache: "no-store" });
      const json = await safeJson(res);

      if (!res.ok) {
        setItems([]);
        setErr((json && (json.error || json.message)) || `Load approvals failed (${res.status})`);
        return;
      }

      const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      setItems(data);
    } catch (e: any) {
      setItems([]);
      setErr(e?.message || "Load approvals failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = useMemo(() => items.filter((x) => x.request_status === "PENDING"), [items]);
  const history = useMemo(() => items.filter((x) => x.request_status !== "PENDING"), [items]);

  async function act(id: string, action: "approve" | "reject") {
    setErr("");
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await safeJson(res);
      if (!res.ok) {
        setErr((json && (json.error || json.message)) || `Action failed (${res.status})`);
        return;
      }
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || "Action failed");
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-semibold tracking-widest text-white/50">WOFFU</div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">Approvals</h1>
          <div className="mt-2 text-sm text-white/60">Pending: {pending.length}</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadAll}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            รีเฟรช
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">กำลังโหลด...</div>
      )}

      {!loading && err && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{err}</div>
      )}

      {!loading && !err && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Pending</div>
              <div className="text-xs text-white/50">ทั้งหมด: {pending.length}</div>
            </div>

            {pending.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/50">ไม่มีคำขอรออนุมัติ</div>
            ) : (
              <div className="space-y-3">
                {pending.map((r) => (
                  <div key={r.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">
                          <Link className="underline underline-offset-4" href={`/projects/${r.project_id}`}>
                            {r.project?.title || "Project"}
                          </Link>
                        </div>
                        <div className="mt-1 text-xs text-white/60">
                          {r.from_status} → {r.to_status} · โดย {r.requester?.display_name || "-"} · {formatDateTimeTH(r.created_at)}
                        </div>
                      </div>

                      <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-xs ${badgeClass(r.request_status)}`}>
                        {r.request_status}
                      </span>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => act(r.id, "approve")}
                        className="rounded-xl bg-[#e5ff78] px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => act(r.id, "reject")}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200 hover:bg-red-500/15"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-white">History</div>
              <div className="text-xs text-white/50">ทั้งหมด: {history.length}</div>
            </div>

            {history.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/50">ยังไม่มีประวัติ</div>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 20).map((r) => (
                  <div key={r.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">
                          <Link className="underline underline-offset-4" href={`/projects/${r.project_id}`}>
                            {r.project?.title || "Project"}
                          </Link>
                        </div>
                        <div className="mt-1 text-xs text-white/60">
                          {r.from_status} → {r.to_status} · โดย {r.requester?.display_name || "-"} · {formatDateTimeTH(r.created_at)}
                        </div>
                        <div className="mt-1 text-xs text-white/50">
                          อนุมัติโดย {r.approver?.display_name || "-"} · {formatDateTimeTH(r.approved_at)}
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
  );
}