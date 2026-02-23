"use client";

import React, { useEffect, useState } from "react";
import { useToast } from "@/app/components/ToastStack";

type ApprovalItem = {
  id: string;
  project_id?: string | null;
  from_status: string;
  to_status: string;
  created_at: string;
  request_status?: "PENDING" | "APPROVED" | "REJECTED";
  projects?: { title?: string | null } | null;
  requester?: { display_name?: string | null } | null;
};

function formatDateTH(iso?: string | null) {
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

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export default function ApprovalsPage() {
  const toast = useToast();

  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [busyId, setBusyId] = useState<string>("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/approvals", { cache: "no-store" });
      const json = await safeJson(res);

      if (!res.ok) {
        const msg =
          (json && (json.error || json.message)) ||
          `Load approvals failed (${res.status})`;
        setItems([]);
        setError(msg);
        return;
      }

      const data = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setItems([]);
      setError(e?.message || "Load approvals failed");
    } finally {
      setLoading(false);
    }
  }

  async function postAction(id: string, action: "approve" | "reject") {
    if (!id) {
      toast.push({ kind: "error", title: "ผิดพลาด", message: "Missing request id (client)" });
      return;
    }

    setBusyId(id);
    try {
      const res = await fetch(`/api/approvals/${id}/${action}`, { method: "POST" });
      const json = await safeJson(res);

      if (!res.ok) {
        const msg =
          (json && (json.error || json.message)) ||
          `${action.toUpperCase()} failed (${res.status})`;
        toast.push({ kind: "error", title: "ทำรายการไม่สำเร็จ", message: msg });
        return;
      }

      toast.push({
        kind: "success",
        title: "สำเร็จ",
        message: action === "approve" ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว",
      });

      // ให้รายการหายทันทีแบบเนียน ๆ (optimistic) แล้วค่อย load กันพลาด
      setItems((prev) => prev.filter((x) => x.id !== id));
      await load();
    } catch (e: any) {
      toast.push({ kind: "error", title: "ทำรายการไม่สำเร็จ", message: e?.message || "Action failed" });
    } finally {
      setBusyId("");
    }
  }

  useEffect(() => {
    load();
  }, []); 
  <div className="wof-page w-full">
    <div className="wof-shell">
      {/* content */}
    </div>
  </div>
  return (
    
    <div className="p-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">คำขอเปลี่ยนสถานะ (Approvals)</h1>
          <p className="mt-1 text-sm text-gray-600">รายการรออนุมัติทั้งหมด: {items.length}</p>
        </div>

        <button
          onClick={load}
          className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          disabled={loading}
        >
          รีเฟรช
        </button>
      </div>

      {loading && (
        <div className="mt-6 rounded-xl border p-4 text-sm text-gray-600">กำลังโหลด...</div>
      )}

      {!loading && error && (
        <div className="mt-6 rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="mt-6 rounded-xl border p-4 text-sm text-gray-600">ไม่มีรายการรออนุมัติ</div>
      )}

      <div className="mt-6 space-y-4">
        {items.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-xl border p-4">
            <div>
              <div className="text-lg font-semibold">{r.projects?.title || "(ไม่พบชื่อโปรเจกต์)"}</div>
              <div className="mt-1 text-sm text-gray-600">
                {r.from_status} → {r.to_status} · โดย {r.requester?.display_name || "-"} ·{" "}
                {formatDateTH(r.created_at)}
              </div>
              <div className="mt-1 text-xs text-gray-400">id: {r.id}</div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => postAction(r.id, "reject")}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                disabled={busyId === r.id}
              >
                {busyId === r.id ? "..." : "Reject"}
              </button>
              <button
                onClick={() => postAction(r.id, "approve")}
                className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
                disabled={busyId === r.id}
              >
                {busyId === r.id ? "..." : "Approve"}
              </button>
              
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
