"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import StatusDropdown, { Status } from "./StatusDropdown";

type PendingReq = {
  id: string;
  from_status: string;
  to_status: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  request_status?: "PENDING" | "APPROVED" | "REJECTED";
  created_at?: string | null;
};

type WorkItem = {
  id: string;
  code?: string | null;
  title: string | null;
  type?: string | null;
  department: "VIDEO" | "GRAPHIC" | "ALL";
  status: Status;
  created_at?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  assignee_id?: string | null;
  created_by?: string | null;
  brand?: string | null;
  video_priority?: string | null;
  video_purpose?: string | null;
  graphic_job_type?: string | null;
  pending_request?: PendingReq | null;
};

async function safeJson(res: Response) {
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type DbStatus =
  | "PRE_ORDER"
  | "TODO"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "BLOCKED"
  | "REVIEW";

function toDbStatus(s: Status): DbStatus {
  if (s === "COMPLETED") return "COMPLETED";
  if (s === "BLOCKED") return "BLOCKED";
  if (s === "PRE_ORDER") return "PRE_ORDER";
  return s as DbStatus;
}

function toUiStatus(s: any): Status {
  if (s === "COMPLETED") return "COMPLETED";
  if (s === "BLOCKED") return "BLOCKED";
  if (s === "PRE_ORDER") return "PRE_ORDER";
  return s as Status;
}

const PENDING_KEY = "woffu_mywork_pending_v1";
const LOCAL_PENDING_STALE_MS = 20000;

function readPendingStore(): Record<string, PendingReq> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function writePendingStore(next: Record<string, PendingReq>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(next));
  } catch {}
}

function setPendingForProject(projectId: string, req: PendingReq) {
  const store = readPendingStore();
  store[projectId] = req;
  writePendingStore(store);
}

function removePendingForProject(projectId: string) {
  const store = readPendingStore();
  delete store[projectId];
  writePendingStore(store);
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function shouldMovePreOrderToTodo(startDate?: string | null) {
  if (!startDate) return false;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return false;
  start.setHours(0, 0, 0, 0);
  return start.getTime() <= startOfToday().getTime();
}

async function autoActivatePreOrder(projectId: string) {
  const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/auto-activate`, {
    method: "POST",
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error((json && (json.error || json.message)) || "Auto activate failed");
  }

  return json;
}

function DeptPill({ dept }: { dept: WorkItem["department"] }) {
  const cls =
    dept === "VIDEO"
      ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
      : dept === "GRAPHIC"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
        : "border-white/10 bg-white/5 text-white/70";

  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold", cls)}>
      {dept}
    </span>
  );
}

function StatusPill({ s }: { s: Status }) {
  const tone =
    s === "PRE_ORDER"
      ? "border-violet-500/30 bg-violet-500/10 text-violet-200"
      : s === "IN_PROGRESS"
        ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
        : s === "BLOCKED"
          ? "border-red-500/30 bg-red-500/10 text-red-200"
          : s === "COMPLETED"
            ? "border-green-500/30 bg-green-500/10 text-green-200"
            : "border-white/10 bg-white/5 text-white/85";

  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold", tone)}>
      {s}
    </span>
  );
}

function fmtDeadline(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

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
}

function fmtDateTH(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function makeCode(w: WorkItem) {
  const real = (w.code ?? "").toString().trim();
  if (real) return real;

  const t = (w.type || "").toUpperCase().trim();
  const short = (w.id || "").replace(/-/g, "").slice(0, 6).toUpperCase();
  return t ? `${t}-${short}` : short;
}

function secondLine(w: WorkItem) {
  const parts = [
    w.brand ? String(w.brand).toUpperCase() : null,
    w.video_purpose ? String(w.video_purpose) : null,
    w.graphic_job_type ? String(w.graphic_job_type) : null,
    w.video_priority ? `PRIORITY: ${String(w.video_priority)}` : null,
  ].filter(Boolean) as string[];

  return parts.length ? parts.join(" · ") : "";
}

function uiLabelFromDb(db: string) {
  if (db === "COMPLETED") return "COMPLETED";
  if (db === "BLOCKED") return "BLOCKED";
  if (db === "PRE_ORDER") return "PRE_ORDER";
  return db;
}

function getPendingStatus(req?: PendingReq | null) {
  return req?.request_status || req?.status || null;
}

function mergePendingState(sourceItems: WorkItem[], store: Record<string, PendingReq>): WorkItem[] {
  const now = Date.now();

  const merged = sourceItems.map((x) => {
    const apiReqStatus = getPendingStatus(x.pending_request);

    if (apiReqStatus === "PENDING" && x.pending_request) {
      setPendingForProject(x.id, x.pending_request);
      return { ...x, pending_request: x.pending_request };
    }

    if (apiReqStatus === "APPROVED" || apiReqStatus === "REJECTED") {
      removePendingForProject(x.id);
      return { ...x, pending_request: null };
    }

    const localPending = store[x.id];
    const localStatus = getPendingStatus(localPending);

    if (localStatus === "PENDING" && localPending) {
      const targetUiStatus = toUiStatus(localPending.to_status);
      const createdAtMs = new Date(localPending.created_at || 0).getTime();
      const isStale =
        Number.isFinite(createdAtMs) &&
        createdAtMs > 0 &&
        now - createdAtMs > LOCAL_PENDING_STALE_MS;

      if (x.status === targetUiStatus) {
        removePendingForProject(x.id);
        return { ...x, pending_request: null };
      }

      if (isStale) {
        removePendingForProject(x.id);
        return { ...x, pending_request: null };
      }

      return { ...x, pending_request: localPending };
    }

    return { ...x, pending_request: null };
  });

  for (const pid of Object.keys(store)) {
    const stillExists = merged.find((x) => x.id === pid);
    if (!stillExists) {
      removePendingForProject(pid);
    }
  }

  return merged;
}

type BlockedModalState = {
  open: boolean;
  projectId: string;
  projectTitle: string;
};

function MobileWorkCard({
  w,
  pending,
  onBlocked,
  onChange,
}: {
  w: WorkItem;
  pending: PendingReq | null;
  onBlocked: (projectId: string, projectTitle: string) => void;
  onChange: (projectId: string, s: Status) => void;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex shrink-0 items-center rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-extrabold text-white/85">
              {makeCode(w)}
            </span>

            <Link
              href={`/projects/${w.id}`}
              className="min-w-0 break-words font-extrabold text-white underline-offset-4 hover:underline"
            >
              {w.title || "-"}
            </Link>
          </div>

          {secondLine(w) ? (
            <div className="mt-2 break-words text-xs leading-6 text-white/45">{secondLine(w)}</div>
          ) : null}

          {pending ? (
            <div className="mt-3 flex max-w-full items-center gap-2 rounded-full border border-lime-400/20 bg-lime-400/10 px-4 py-2 text-xs font-extrabold text-lime-200">
              <span className="h-2 w-2 shrink-0 rounded-full bg-lime-300 shadow-[0_0_18px_rgba(163,230,53,0.9)]" />
              <span className="min-w-0 break-words">
                รออนุมัติ: {uiLabelFromDb(pending.from_status)} → {uiLabelFromDb(pending.to_status)}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <DeptPill dept={w.department} />
        <StatusPill s={w.status} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-[11px] text-white/40">วันเริ่มงาน</div>
          <div className="mt-1 text-sm text-white/85">{fmtDateTH(w.start_date)}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-[11px] text-white/40">Deadline</div>
          <div className="mt-1 text-sm text-white/85">{fmtDeadline(w.due_date)}</div>
        </div>
      </div>

      <div className={cn("mt-4", pending ? "pointer-events-none opacity-60" : "")}>
        <div className="text-[11px] font-bold tracking-widest text-white/35">จัดการ</div>
        <div className="mt-2">
          <StatusDropdown
            value={w.status}
            onChange={(s) => {
              if (s === "BLOCKED") {
                onBlocked(w.id, w.title || "-");
                return;
              }
              onChange(w.id, s);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function MyWorkPage() {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2500);
  }, []);

  const FILTERS = ["ALL", "PRE_ORDER", "TODO", "IN_PROGRESS", "COMPLETED", "BLOCKED"] as const;
  const [statusFilter, setStatusFilter] = useState<(typeof FILTERS)[number]>("ALL");

  const [blockedModal, setBlockedModal] = useState<BlockedModalState>({
    open: false,
    projectId: "",
    projectTitle: "",
  });
  const [blockedNote, setBlockedNote] = useState("");
  const [blockedSubmitting, setBlockedSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");

    try {
      const r = await fetch("/api/my-work", { cache: "no-store" });
      const j = await safeJson(r);

      if (!r.ok) {
        setItems([]);
        setErr((j && (j.error || j.message)) || `Load failed (${r.status})`);
        return;
      }

      const arr = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];

      const normalized = (arr as any[]).map((x) => ({
        ...x,
        status: toUiStatus(x.status),
        pending_request: x.pending_request ?? null,
      })) as WorkItem[];

      const preOrderToActivate = normalized.filter(
        (x) => x.status === "PRE_ORDER" && shouldMovePreOrderToTodo(x.start_date)
      );

      if (preOrderToActivate.length > 0) {
        await Promise.allSettled(preOrderToActivate.map((x) => autoActivatePreOrder(x.id)));

        const retry = await fetch("/api/my-work", { cache: "no-store" });
        const retryJson = await safeJson(retry);

        if (retry.ok) {
          const retryArr = Array.isArray(retryJson?.data)
            ? retryJson.data
            : Array.isArray(retryJson)
              ? retryJson
              : [];

          const retryNormalized = (retryArr as any[]).map((x) => ({
            ...x,
            status: toUiStatus(x.status),
            pending_request: x.pending_request ?? null,
          })) as WorkItem[];

          const retryStore = readPendingStore();
          setItems(mergePendingState(retryNormalized, retryStore));
          return;
        }
      }

      const store = readPendingStore();
      setItems(mergePendingState(normalized, store));
    } catch (e: any) {
      setItems([]);
      setErr(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  async function requestStatusChange(projectId: string, nextUi: Status, blocked_reason?: string): Promise<boolean> {
    const prev = items;
    const target = items.find((x) => x.id === projectId);
    if (!target) return false;

    if (getPendingStatus(target.pending_request) === "PENDING") {
      showToast("มีคำขอรออนุมัติอยู่แล้ว");
      return false;
    }

    const fromDb = toDbStatus(target.status);
    const toDb = toDbStatus(nextUi);

    if (nextUi === "BLOCKED" && !blocked_reason?.trim()) {
      showToast("กรุณาระบุปัญหาของงานก่อน");
      return false;
    }

    const optimisticPending: PendingReq = {
      id: "temp",
      from_status: fromDb,
      to_status: toDb,
      request_status: "PENDING",
      created_at: new Date().toISOString(),
    };

    setItems((xs) => xs.map((x) => (x.id === projectId ? { ...x, pending_request: optimisticPending } : x)));
    setPendingForProject(projectId, optimisticPending);

    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/request-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_status: fromDb,
          to_status: toDb,
          blocked_reason: nextUi === "BLOCKED" ? blocked_reason?.trim() : null,
        }),
      });

      const j = await safeJson(res);

      if (!res.ok) {
        setItems(prev);
        removePendingForProject(projectId);
        showToast((j && (j.error || j.message)) || "Update failed");
        return false;
      }

      const reqRow = j?.request ?? null;
      if (reqRow?.id) {
        const saved: PendingReq = {
          id: reqRow.id,
          from_status: reqRow.from_status,
          to_status: reqRow.to_status,
          request_status: reqRow.request_status || reqRow.status,
          status: reqRow.status,
          created_at: reqRow.created_at ?? null,
        };

        setItems((xs) => xs.map((x) => (x.id === projectId ? { ...x, pending_request: saved } : x)));
        setPendingForProject(projectId, saved);
      }

      showToast("ส่งคำขอสำเร็จแล้ว และกำลังรออนุมัติ");
      return true;
    } catch (e: any) {
      setItems(prev);
      removePendingForProject(projectId);
      showToast(e?.message || "Update failed");
      return false;
    }
  }

  function openBlockedModal(projectId: string, projectTitle: string) {
    setBlockedModal({ open: true, projectId, projectTitle });
    setBlockedNote("");
  }

  function closeBlockedModal(force = false) {
    if (blockedSubmitting && !force) return;
    setBlockedModal({ open: false, projectId: "", projectTitle: "" });
    setBlockedNote("");
  }

  async function confirmBlockedModal() {
    if (!blockedModal.projectId) return;

    const note = blockedNote.trim();
    if (!note) {
      showToast("กรุณาระบุปัญหาของงานก่อน");
      return;
    }

    try {
      setBlockedSubmitting(true);
      const ok = await requestStatusChange(blockedModal.projectId, "BLOCKED", note);
      if (ok) closeBlockedModal(true);
    } finally {
      setBlockedSubmitting(false);
    }
  }

  useEffect(() => {
    void load();

    const interval = window.setInterval(() => {
      void load();
    }, 15000);

    return () => {
      window.clearInterval(interval);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      ALL: items.length,
      PRE_ORDER: 0,
      TODO: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      BLOCKED: 0,
    };
    for (const x of items) c[x.status] = (c[x.status] || 0) + 1;
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    if (statusFilter === "ALL") return items;
    return items.filter((x) => x.status === statusFilter);
  }, [items, statusFilter]);

  return (
    <div className="w-full bg-black text-white">
      <div className="w-full px-4 py-6 md:px-6 lg:px-10 lg:py-10">
        {toast ? (
          <div className="fixed bottom-5 right-3 z-[99999] md:bottom-6 md:right-6">
            <div className="rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-sm font-semibold text-white shadow-[0_30px_120px_rgba(0,0,0,0.7)]">
              {toast}
            </div>
          </div>
        ) : null}

        {blockedModal.open ? (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-[28px] border border-red-500/20 bg-[#0b0b0b] p-5 shadow-[0_0_60px_rgba(239,68,68,0.12)] md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-extrabold tracking-[0.18em] text-red-300/80">ALERT</div>
                  <h2 className="mt-2 text-xl font-extrabold text-white md:text-2xl">แจ้งเตือนงานติดปัญหา</h2>
                  <p className="mt-2 text-sm text-white/60">
                    กรุณาระบุรายละเอียดของปัญหา เพื่อให้หัวหน้าทีมหรือผู้อนุมัติเห็นสาเหตุชัดเจน
                  </p>
                  {blockedModal.projectTitle ? (
                    <div className="mt-3 break-words text-sm text-white/45">งาน: {blockedModal.projectTitle}</div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => closeBlockedModal()}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-bold text-white/80">กล่องข้อความสำหรับแจ้งปัญหา</label>
                <textarea
                  value={blockedNote}
                  onChange={(e) => setBlockedNote(e.target.value)}
                  rows={6}
                  placeholder="เช่น รอไฟล์จากลูกค้า / อุปกรณ์มีปัญหา / ข้อมูลไม่ครบ / ต้องรอคอนเฟิร์มเพิ่มเติม"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-red-400/40 focus:bg-white/[0.07]"
                />
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => closeBlockedModal()}
                  disabled={blockedSubmitting}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-extrabold text-white/80 transition hover:bg-white/10 disabled:opacity-50"
                >
                  ยกเลิก
                </button>

                <button
                  type="button"
                  onClick={confirmBlockedModal}
                  disabled={blockedSubmitting}
                  className="rounded-2xl border border-red-400/35 bg-red-500 px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_0_18px_rgba(239,68,68,0.45),0_0_40px_rgba(239,68,68,0.20)] transition hover:scale-[1.02] hover:bg-red-400 disabled:opacity-50"
                >
                  {blockedSubmitting ? "กำลังส่ง..." : "ยืนยัน"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-widest text-white/50">WOFFU</div>
            <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight md:text-4xl">งานของฉัน</h1>
            <div className="mt-2 text-sm text-white/50">รายการทั้งหมด: {filtered.length}</div>
          </div>

          <button
            onClick={() => void load()}
            disabled={loading}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 disabled:opacity-50"
          >
            รีเฟรช
          </button>
        </div>

        <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4 md:rounded-[30px]">
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((s) => {
              const active = statusFilter === s;
              const label = s === "ALL" ? `ALL (${counts.ALL || 0})` : `${s} (${counts[s] || 0})`;

              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                    active
                      ? "border-white/10 bg-white text-black"
                      : "border-white/10 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-5 text-sm text-white/60 md:rounded-[30px]">
            กำลังโหลด...
          </div>
        ) : err ? (
          <div className="mt-6 rounded-[24px] border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200 md:rounded-[30px]">
            {err}
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-3 xl:hidden">
              {filtered.length === 0 ? (
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 text-sm text-white/50">
                  ไม่พบงานในสถานะนี้
                </div>
              ) : (
                filtered.map((w) => {
                  const pending: PendingReq | null =
                    getPendingStatus(w.pending_request) === "PENDING" ? (w.pending_request ?? null) : null;

                  return (
                    <MobileWorkCard
                      key={w.id}
                      w={w}
                      pending={pending}
                      onBlocked={openBlockedModal}
                      onChange={requestStatusChange}
                    />
                  );
                })
              )}
            </div>

            <div className="mt-6 hidden overflow-visible rounded-[30px] border border-white/10 bg-white/5 xl:block">
              <div className="w-full overflow-x-auto overflow-y-visible rounded-[30px]">
                <table className="w-full min-w-[980px] overflow-visible">
                  <thead>
                    <tr className="text-left text-xs font-semibold tracking-widest text-white/45">
                      <th className="px-6 py-4">งาน</th>
                      <th className="px-6 py-4 text-center">ฝ่าย</th>
                      <th className="px-6 py-4 text-center">สถานะ</th>
                      <th className="px-6 py-4 text-center">Deadline</th>
                      <th className="px-6 py-4 text-right">จัดการ</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10 overflow-visible">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-white/50">
                          ไม่พบงานในสถานะนี้
                        </td>
                      </tr>
                    ) : (
                      filtered.map((w) => {
                        const pending: PendingReq | null =
                          getPendingStatus(w.pending_request) === "PENDING" ? (w.pending_request ?? null) : null;

                        return (
                          <tr key={w.id} className="overflow-visible hover:bg-white/[0.03]">
                            <td className="px-6 py-5">
                              <div className="flex items-start gap-3">
                                <span className="mt-[2px] inline-flex shrink-0 items-center rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-extrabold text-white/85">
                                  {makeCode(w)}
                                </span>

                                <div className="min-w-0">
                                  <Link
                                    href={`/projects/${w.id}`}
                                    className="block truncate text-base font-extrabold text-white hover:underline"
                                  >
                                    {w.title || "-"}
                                  </Link>

                                  {secondLine(w) ? (
                                    <div className="mt-1 truncate text-xs text-white/45">{secondLine(w)}</div>
                                  ) : null}

                                  {pending ? (
                                    <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-lime-400/20 bg-lime-400/10 px-4 py-1 text-xs font-extrabold text-lime-200">
                                      <span className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_18px_rgba(163,230,53,0.9)]" />
                                      รออนุมัติ: {uiLabelFromDb(pending.from_status)} → {uiLabelFromDb(pending.to_status)}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-5 text-center">
                              <DeptPill dept={w.department} />
                            </td>

                            <td className="px-6 py-5 text-center">
                              <StatusPill s={w.status} />
                            </td>

                            <td className="px-6 py-5 text-center text-sm text-white/80">{fmtDeadline(w.due_date)}</td>

                            <td className="relative z-20 overflow-visible px-6 py-5 text-right">
                              <div className={cn("relative z-30 overflow-visible", pending ? "pointer-events-none opacity-60" : "")}>
                                <div className="relative z-40 inline-block overflow-visible">
                                  <StatusDropdown
                                    value={w.status}
                                    onChange={(s) => {
                                      if (s === "BLOCKED") {
                                        openBlockedModal(w.id, w.title || "-");
                                        return;
                                      }
                                      requestStatusChange(w.id, s);
                                    }}
                                  />
                                </div>
                              </div>
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
    </div>
  );
}