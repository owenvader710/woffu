"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/utils/supabase/client";

export type RequestMini = {
  id: string;
  project_id: string;
  from_status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
  to_status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
  request_status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  approved_at: string | null;
};

export type MyWorkItem = {
  id: string;
  title: string;
  type: "VIDEO" | "GRAPHIC";
  department: "VIDEO" | "GRAPHIC" | "ALL";
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
  created_at: string;
  start_date: string | null;
  due_date: string | null;
  assignee_id: string | null;

  // ✅ เพิ่ม
  last_request?: RequestMini | null;
  pending_request?: RequestMini | null;
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

    // ✅ รองรับทั้ง v2 และ v1
    let cleanup: null | (() => void) = null;

    try {
      if (supabase && typeof supabase.channel === "function") {
        const channel = supabase
          .channel("realtime-my-work")
          .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
            if (mounted.current) refresh();
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "status_change_requests" }, () => {
            if (mounted.current) refresh();
          })
          .subscribe();

        cleanup = () => {
          try {
            supabase.removeChannel(channel);
          } catch {}
        };
      } else if (supabase && typeof supabase.from === "function") {
        const sub1 = supabase.from("projects").on("*", () => mounted.current && refresh()).subscribe();
        const sub2 = supabase
          .from("status_change_requests")
          .on("*", () => mounted.current && refresh())
          .subscribe();

        cleanup = () => {
          try {
            supabase.removeSubscription(sub1);
            supabase.removeSubscription(sub2);
          } catch {}
        };
      }
    } catch {
      // ignore
    }

    return () => {
      mounted.current = false;
      if (cleanup) cleanup();
    };
  }, [refresh]);

  return { items, loading, error, refresh };
}
