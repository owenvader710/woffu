"use client";

import { useState } from "react";

const STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED"] as const;
type Status = (typeof STATUSES)[number];

export default function RequestStatusButton({
  projectId,
  currentStatus,
}: {
  projectId: string;
  currentStatus: Status;
}) {
  const [open, setOpen] = useState(false);
  const [toStatus, setToStatus] = useState<Status>(currentStatus);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async () => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/status-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, to_status: toStatus, note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Request failed");
      setMsg("ส่งคำขอแล้ว รอหัวหน้าอนุมัติ");
      setOpen(false);
      setNote("");
    } catch (e: any) {
      setMsg(e?.message ?? "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-xl border px-3 py-2 text-xs hover:bg-gray-50"
      >
        ขอเปลี่ยนสถานะ
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-72 rounded-2xl border bg-white p-3 shadow-lg">
          <div className="text-xs text-gray-500">Current: {currentStatus}</div>

          <select
            className="mt-2 w-full rounded-xl border bg-gray-50 px-3 py-2 text-sm"
            value={toStatus}
            onChange={(e) => setToStatus(e.target.value as Status)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <textarea
            className="mt-2 w-full rounded-xl border bg-gray-50 px-3 py-2 text-sm"
            rows={3}
            placeholder="หมายเหตุ (ถ้ามี)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <button
            onClick={submit}
            disabled={saving}
            className="mt-2 w-full rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "กำลังส่ง..." : "ส่งคำขอ"}
          </button>
        </div>
      )}

      {msg && <div className="mt-2 text-xs text-gray-600">{msg}</div>}
    </div>
  );
}
