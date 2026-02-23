"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Project = {
  id: string;
  title: string;
  type: "VIDEO" | "GRAPHIC";
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
  created_at: string;
  due_date: string | null;
  brand?: string | null;
  video_priority?: string | null;
  video_purpose?: string | null;
  graphic_job_type?: string | null;
};

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function formatDateTH(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "2-digit" });
}

function secondLine(p: Project) {
  const brand = p.brand ? `แบรนด์: ${p.brand}` : null;
  const videoBits =
    p.type === "VIDEO"
      ? [
          p.video_priority
            ? `ความสำคัญ: ${p.video_priority === "SPECIAL" ? "SPECIAL" : `${p.video_priority}ดาว`}`
            : null,
          p.video_purpose ? `รูปแบบ: ${p.video_purpose}` : null,
        ].filter(Boolean)
      : [];
  const graphicBits =
    p.type === "GRAPHIC" ? [p.graphic_job_type ? `ประเภทงาน: ${p.graphic_job_type}` : null].filter(Boolean) : [];
  const all = [brand, ...videoBits, ...graphicBits].filter(Boolean);
  return all.length ? all.join(" · ") : "";
}

export default function ProjectsListByStatus({
  title,
  status,
}: {
  title: string;
  status: Project["status"];
}) {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
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
      setItems(data.filter((p: Project) => p.status === status));
    } catch (e: any) {
      setItems([]);
      setError(e?.message || "Load projects failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status]);

  const count = useMemo(() => items.length, [items]);

  return (
    <div className="p-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-gray-600">รายการทั้งหมด: {count}</p>
        </div>
        <button onClick={load} className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50">
          รีเฟรช
        </button>
      </div>

      {loading && <div className="mt-6 rounded-xl border p-4 text-sm text-gray-600">กำลังโหลด...</div>}
      {!loading && error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      {!loading && !error && (
        <div className="mt-6 overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="p-4">โปรเจกต์</th>
                <th className="p-4">ฝ่าย</th>
                <th className="p-4">วันที่สั่ง</th>
                <th className="p-4">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="p-6 text-gray-400" colSpan={4}>
                    ไม่มีรายการ
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="p-4">
                      <Link className="underline" href={`/projects/${p.id}`}>
                        {p.title}
                      </Link>
                      {secondLine(p) ? <div className="mt-1 text-xs text-gray-500">{secondLine(p)}</div> : null}
                    </td>
                    <td className="p-4">{p.type}</td>
                    <td className="p-4">{formatDateTH(p.created_at)}</td>
                    <td className="p-4">{formatDateTH(p.due_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}