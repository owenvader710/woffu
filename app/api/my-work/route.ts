import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function GET(req: NextRequest) {
  try {
    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    const user = authData?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    // ✅ เห็นเฉพาะงานที่ assign ให้ตัวเอง
    const { data, error } = await supabase
      .from("projects")
      .select(`
        id, code, title, type, department, status, created_at, start_date, due_date,
        assignee_id, created_by,
        brand, video_priority, video_purpose, graphic_job_type
      `)
      .eq("assignee_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      const res = NextResponse.json({ error: error.message }, { status: 400 });
      return applyCookies(res);
    }

    // ✅ ดึง "คำขอเปลี่ยนสถานะ" ที่กำลัง PENDING ของโปรเจกต์เหล่านี้
    // เพื่อให้รีเฟรชหน้าแล้วแถบ "รออนุมัติ" ไม่หายไป
    const projectIds = (data ?? []).map((x: any) => x.id).filter(Boolean);

    const pendingMap: Record<
      string,
      {
        id: string;
        project_id: string;
        from_status: string;
        to_status: string;
        request_status: string;
        created_at: string;
        requested_by: string;
      }
    > = {};

    if (projectIds.length > 0) {
      const { data: pendings, error: pendErr } = await supabase
        .from("status_change_requests")
        .select("id, project_id, from_status, to_status, request_status, created_at, requested_by")
        .in("project_id", projectIds)
        .eq("request_status", "PENDING")
        .order("created_at", { ascending: false });

      if (!pendErr && Array.isArray(pendings)) {
        for (const r of pendings as any[]) {
          // เอาอันล่าสุดของแต่ละโปรเจกต์
          if (!pendingMap[r.project_id]) pendingMap[r.project_id] = r;
        }
      }
    }

    const merged = (data ?? []).map((p: any) => ({
      ...p,
      pending_request: pendingMap[p.id] ?? null,
    }));

    const res = NextResponse.json({ data: merged }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}