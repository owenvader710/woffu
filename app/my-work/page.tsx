"use client";

import React, { useMemo, useState } from "react";
import { useRealtimeMyWork, MyWorkItem } from "./useRealtimeMyWork";
import { useToast } from "../components/ToastStack";

const STATUSES: MyWorkItem["status"][] = ["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED"];

function formatDateTH(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "2-digit" });
}

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function Badge({ kind, children }: { kind: "pending" | "approved" | "rejected"; children: any }) {
  const cls =
    kind === "pending"
      ? "border-yellow-300 bg-yellow-50 text-yellow-900"
      : kind === "approved"
      ? "border-green-300 bg-green-50 text-green-800"
      : "border-red-200 bg-red-50 text-red-800";
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${cls}`}>{children}</span>;
}

export default function MyWorkPage() {
  const { items, loading, error, refresh } = useRealtimeMyWork();
  const toast = useToast();

  const [draft, setDraft] = useState<Record<string, MyWorkItem["status"]>>({});
  const [submittingId, setSubmittingId] = useState<string>("");

  const initialDraft = useMemo(() => {
    const m: Record<string, MyWorkItem["status"]> = {};
    for (const p of items) m[p.id] = p.status;
    return m;
  }, [items]);

  function getDraftStatus(p: MyWorkItem) {
    return draft[p.id] ?? initialDraft[p.id] ?? p.status;
  }

  async function requestChange(projectId: string, fromStatus: MyWorkItem["status"], toStatus: MyWorkItem["status"]) {
    if (!projectId) {
      toast.push({ kind: "error", title: "ส่งไม่สำเร็จ", message: "Missing project id (client)" });
      return;
    }
    if (fromStatus === toStatus) {
      toast.push({ kind: "info", title: "ยังไม่เปลี่ยน", message: "สถานะยังเหมือนเดิม" });
      return;
    }

    setSubmittingId(projectId);
    try {
      const res = await fetch(`/api/projects/project_id/request-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from_status: fromStatus, to_status: toStatus }),
      });

      const json = await safeJson(res);

      if (!res.ok) {
        const msg = (json && (json.error || json.message)) || `Request failed (${res.status})`;
        toast.push({ kind: "error", title: "ส่งไม่สำเร็จ", message: msg });
        return;
      }

      const mode = json?.mode || "OK";
      if (json?.message) {
        toast.push({ kind: "info", title: "แจ้งเตือน", message: json.message });
      } else if (mode === "APPLIED") {
        toast.push({ kind: "success", title: "สำเร็จ", message: "หัวหน้า: เปลี่ยนสถานะให้แล้ว" });
      } else {
        toast.push({ kind: "success", title: "ส่งแล้ว", message: "ส่งคำขอเปลี่ยนสถานะแล้ว (รอหัวหน้าอนุมัติ)" });
      }

      await refresh();
    } catch (e: any) {
      toast.push({ kind: "error", title: "ส่งไม่สำเร็จ", message: e?.message || "Request failed" });
    } finally {
      setSubmittingId("");
    }
  }

  return (
    <div className="p-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">งานของฉัน</h1>
          <p className="mt-1 text-sm text-gray-600">รายการทั้งหมด: {items.length}</p>
        </div>

        <button onClick={refresh} className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50">
          รีเฟรช
        </button>
      </div>

      {loading && <div className="mt-6 rounded-xl border p-4 text-sm text-gray-600">กำลังโหลด...</div>}

      {!loading && error && (
        <div className="mt-6 rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">{error}</div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="mt-6 rounded-xl border p-4 text-sm text-gray-600">ยังไม่มีงาน</div>
      )}

      <div className="mt-6 space-y-4">
        {items.map((p) => {
          const current = p.status;
          const next = getDraftStatus(p);

          const pending = (p as any).pending_request;
          const last = (p as any).last_request;

          const isPending = !!pending;
          const disableSend = submittingId === p.id || isPending;

          return (
            <div key={p.id} className="rounded-xl border p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-semibold">{p.title}</div>

                    {isPending && (
                      <Badge kind="pending">
                        รออนุมัติ: {pending?.from_status} → {pending?.to_status}
                      </Badge>
                    )}

                    {!isPending && last?.request_status === "APPROVED" && <Badge kind="approved">อนุมัติแล้ว</Badge>}
                    {!isPending && last?.request_status === "REJECTED" && <Badge kind="rejected">ถูกปฏิเสธ</Badge>}
                  </div>

                  <div className="mt-1 text-sm text-gray-600">
                    {p.type} · {p.department} · <b>{current}</b>
                  </div>

                  <div className="mt-1 text-xs text-gray-500">
                    start: {formatDateTH(p.start_date)} · due: {formatDateTH(p.due_date)}
                  </div>

                  <div className="mt-1 text-xs text-gray-400">id: {p.id}</div>
                </div>

                <div className="min-w-[280px]">
                  <label className="text-xs text-gray-600">เปลี่ยนสถานะ</label>

                  <div className="mt-1 flex gap-2">
                    <select
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      value={next}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [p.id]: e.target.value as any }))}
                      disabled={submittingId === p.id || isPending}
                      title={isPending ? "มีคำขอค้างอยู่แล้ว" : ""}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>

                    <button
                      className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
                      disabled={disableSend}
                      onClick={() => requestChange(p.id, current, next)}
                      title={isPending ? "ส่งแล้ว รอหัวหน้าอนุมัติ" : "ส่งคำขอเปลี่ยนสถานะ"}
                    >
                      {submittingId === p.id ? "กำลังส่ง..." : isPending ? "ส่งแล้ว" : "ส่ง"}
                    </button>
                  </div>

                  {isPending && (
                    <div className="mt-2 text-xs text-yellow-800">
                      มีคำขอค้างอยู่แล้ว — รอหัวหน้า Approve/Reject ก่อนถึงจะส่งใหม่ได้
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
