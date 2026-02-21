// app/my-work/useRealtimeMyWork.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/utils/supabase/client";

export type MyWorkItem = {
  id: string;
  title: string;
  type: "VIDEO" | "GRAPHIC";
  department: "VIDEO" | "GRAPHIC" | "ALL";
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
  created_at: string;
  start_date: string | null;
  due_date: string | null;

  // ✅ fields ใหม่ (summary-only)
  brand: string | null;
  video_priority: "2" | "3" | "5" | "SPECIAL" | null;
  video_purpose: string | null;
  graphic_job_type: string | null;
  graphic_category: string | null;
};

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export function useRealtimeMyWork() {
  const [items, setItems] = useState<MyWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/my-work", { cache: "no-store" });
      const json = await safeJson(res);

      if (!res.ok) {
        setItems([]);
        setError((json && (json.error || json.message)) || `Load my-work failed (${res.status})`);
        return;
      }

      const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      setItems(data);
    } catch (e: any) {
      setItems([]);
      setError(e?.message || "Load my-work failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();

    const supabase: any = supabaseBrowser;

    // รองรับทั้ง v2/v1
    let cleanup: null | (() => void) = null;

    try {
      if (typeof supabase?.channel === "function") {
        const channel = supabase
          .channel("realtime-my-work-projects")
          .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
            if (mounted.current) refresh();
          })
          .subscribe();

        cleanup = () => {
          try {
            supabase.removeChannel(channel);
          } catch {}
        };
      } else if (typeof supabase?.from === "function") {
        const sub = supabase
          .from("projects")
          .on("*", () => {
            if (mounted.current) refresh();
          })
          .subscribe();

        cleanup = () => {
          try {
            supabase.removeSubscription(sub);
          } catch {}
        };
      }
    } catch {
      // realtime ใช้ไม่ได้ก็ยังใช้งานหน้าได้ปกติ
    }

    return () => {
      mounted.current = false;
      if (cleanup) cleanup();
    };
  }, [refresh]);

  return { items, loading, error, refresh };
}