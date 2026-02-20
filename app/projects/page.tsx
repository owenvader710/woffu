"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import CreateProjectModal from "./CreateProjectModal";

type Project = {
  id: string;
  title: string;
  type: "VIDEO" | "GRAPHIC";
  department: "VIDEO" | "GRAPHIC" | "ALL";
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
  created_at: string;
  start_date: string | null;
  due_date: string | null;
};

type Member = {
  id: string;
  display_name: string | null;
  department: "VIDEO" | "GRAPHIC" | "ALL";
  role: "LEADER" | "MEMBER";
  is_active: boolean;
  phone?: string | null;
  avatar_url?: string | null;
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

export default function ProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);

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

      const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      setItems(data);
    } catch (e: any) {
      setItems([]);
      setError(e?.message || "Load projects failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadMembers() {
    // พยายามใช้ /api/members ก่อน (เหมาะสุด)
    // ถ้าโปรเจกต์ของนายใช้ /api/profiles ก็จะ fallback ให้
    const tryUrls = ["/api/members", "/api/profiles"];

    for (const url of tryUrls) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        const json = await safeJson(res);
        if (!res.ok) continue;

        const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : null;
        if (Array.isArray(data)) {
          const actives = data.filter((m: Member) => m.is_active !== false);
          setMembers(actives);
          return;
        }
      } catch {
        // try next
      }
    }

    setMembers([]);
  }

  useEffect(() => {
    loadProjects();
    loadMembers();
  }, []);

  return (
    <div className="p-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">โปรเจกต์ทั้งหมด</h1>
          <p className="mt-1 text-sm text-gray-600">รายการทั้งหมด: {items.length}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              loadProjects();
              loadMembers();
            }}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          >
            รีเฟรช
          </button>

          <button
            onClick={() => setOpen(true)}
            className="rounded-xl bg-lime-300 px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            + สั่งงานใหม่
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-6 rounded-xl border p-4 text-sm text-gray-600">กำลังโหลด...</div>
      )}

      {!loading && error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="mt-6 rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="p-4">ชื่อโปรเจกต์</th>
                <th className="p-4">ประเภท</th>
                <th className="p-4">แผนก</th>
                <th className="p-4">สถานะ</th>
                <th className="p-4">วันที่สั่ง</th>
                <th className="p-4">Deadline</th>
              </tr>
            </thead>

            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="p-6 text-gray-400" colSpan={6}>
                    ยังไม่มีโปรเจกต์
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="p-4">
  <Link className="underline" href={`/projects/${p.id}`}>
    {p.title}
  </Link>
</td>
                    <td className="p-4">{p.type}</td>
                    <td className="p-4">{p.department}</td>
                    <td className="p-4">{p.status}</td>
                    <td className="p-4">{formatDateTH(p.created_at)}</td>
                    <td className="p-4">{formatDateTH(p.due_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <CreateProjectModal
        open={open}
        onClose={() => setOpen(false)}
        members={members} // ✅ สำคัญ: ส่ง member จริงเข้า modal
        onCreated={async () => {
          setOpen(false);
          await loadProjects();
        }}
      />
    </div>
  );
}
