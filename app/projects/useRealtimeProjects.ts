"use client";

import { useEffect, useState, useCallback } from "react";

export type Project = {
  id: string;
  title: string;
  type: "VIDEO" | "GRAPHIC";
  department: "VIDEO" | "GRAPHIC" | "ALL";
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
  assignee_id: string | null;
  created_by: string;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  code?: string | null;
};

function extractArray(json: any) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.data)) return json.data;
  if (json && Array.isArray(json.projects)) return json.projects;
  return null;
}

export function useRealtimeProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (!res.ok) {
        const msg = (json && (json.error || json.message)) || `Load projects failed (${res.status})`;
        setProjects([]);
        setError(msg);
        return;
      }

      const arr = extractArray(json);
      if (!arr) {
        console.error("Invalid /api/projects response:", json);
        setProjects([]);
        setError("Invalid projects response");
        return;
      }

      setProjects(arr);
    } catch (e: any) {
      setProjects([]);
      setError(e?.message || "Load projects failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load();

    // ✅ auto-refresh กันต้องกด F5
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [load]);

  return { projects, loading, error, refresh: load };
}
