"use client";

import React, { useMemo, useState } from "react";

type Member = {
  id: string;
  display_name: string | null;
  department: "VIDEO" | "GRAPHIC" | "ALL";
  role: "LEADER" | "MEMBER";
  is_active: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  members: Member[];
  onCreated: () => void | Promise<void>;
};

export default function CreateProjectModal({ open, onClose, members, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"VIDEO" | "GRAPHIC">("VIDEO");
  const [department, setDepartment] = useState<"VIDEO" | "GRAPHIC" | "ALL">("VIDEO");
  const [startDate, setStartDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  const activeMembers = useMemo(() => {
    return (members || [])
      .filter((m) => m.is_active !== false)
      .sort((a, b) => (a.display_name || "").localeCompare(b.display_name || "", "th"));
  }, [members]);

  if (!open) return null;

  async function safeJson(res: Response) {
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async function submit() {
    setError("");
    if (!title.trim()) {
      setError("กรุณาใส่ชื่อโปรเจกต์");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        title: title.trim(),
        type,
        department,
        start_date: startDate || null,
        due_date: dueDate || null,
        assignee_id: assigneeId || null,
      };

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await safeJson(res);

      if (!res.ok) {
        setError((json && (json.error || json.message)) || `Create failed (${res.status})`);
        return;
      }

      // reset
      setTitle("");
      setType("VIDEO");
      setDepartment("VIDEO");
      setStartDate("");
      setDueDate("");
      setAssigneeId("");

      await onCreated();
    } catch (e: any) {
      setError(e?.message || "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">สั่งงานใหม่</h2>
            <p className="mt-1 text-sm text-gray-500">Create new project</p>
          </div>
          <button onClick={onClose} className="rounded-xl px-3 py-2 text-sm hover:bg-gray-100">
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4">
          <div>
            <label className="text-sm font-medium">ชื่อโปรเจกต์</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border px-4 py-2 text-sm"
              placeholder="เช่น ทำคลิปรีวิวลู่วิ่ง"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">ประเภท</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="mt-1 w-full rounded-xl border px-4 py-2 text-sm"
              >
                <option value="VIDEO">VIDEO</option>
                <option value="GRAPHIC">GRAPHIC</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">แผนก</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as any)}
                className="mt-1 w-full rounded-xl border px-4 py-2 text-sm"
              >
                <option value="VIDEO">VIDEO</option>
                <option value="GRAPHIC">GRAPHIC</option>
                <option value="ALL">ALL</option>
              </select>
            </div>
          </div>

          {/* ✅ dropdown สมาชิก */}
          <div>
            <label className="text-sm font-medium">ผู้รับงาน (Assignee)</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="mt-1 w-full rounded-xl border px-4 py-2 text-sm"
            >
              <option value="">- ไม่ระบุ -</option>
              {activeMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {(m.display_name || "-") + ` (${m.department})`}
                </option>
              ))}
            </select>

            {activeMembers.length === 0 && (
              <p className="mt-1 text-xs text-gray-500">
                ยังไม่พบสมาชิก (ถ้าไม่มี /api/members ให้สร้าง หรือเช็คว่า /api/profiles คืน data แล้ว)
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">เริ่ม</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-xl border px-4 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Deadline</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full rounded-xl border px-4 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
            disabled={submitting}
          >
            ยกเลิก
          </button>
          <button
            onClick={submit}
            className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? "กำลังสร้าง..." : "สั่งงาน"}
          </button>
        </div>
      </div>
    </div>
  );
}
