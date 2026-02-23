"use client";

import { useCallback, useEffect, useState } from "react";

export type ProjectStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
export type ProjectType = "VIDEO" | "GRAPHIC";

export type Project = {
  id: string;
  title: string;
  type: ProjectType;
  status: ProjectStatus;
  created_at: string;
  start_date: string | null;
  due_date: string | null;

  brand?: string | null;
  video_priority?: string | null;
  video_purpose?: string | null;
  graphic_job_type?: string | null;

  assignee_id?: string | null;
  description?: string | null;
  department?: "VIDEO" | "GRAPHIC" | "ALL";
};

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export function useProjects() {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, setItems, loading, error, refresh };
}