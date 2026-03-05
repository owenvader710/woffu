import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function GET(req: NextRequest) {
  try {
    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    const user = authData?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    // ✅ งานที่ assign ให้ตัวเอง
    const { data: projects, error: pErr } = await supabase
      .from("projects")
      .select(
        `
        id, code, title, type, department, status, created_at, start_date, due_date,
        assignee_id, created_by,
        brand, video_priority, video_purpose, graphic_job_type
      `
      )
      .eq("assignee_id", user.id)
      .order("created_at", { ascending: false });

    if (pErr) {
      const res = NextResponse.json({ error: pErr.message }, { status: 400 });
      return applyCookies(res);
    }

    const ids = (projects || []).map((x: any) => x.id).filter(Boolean);

    // ✅ ดึง “คำขอรออนุมัติ” ของ user สำหรับโปรเจกต์ชุดนี้
    let pendingByProject: Record<string, any> = {};
    if (ids.length > 0) {
      const { data: pendings, error: rErr } = await supabase
        .from("status_change_requests")
        .select("id, project_id, from_status, to_status, request_status, created_at")
        .eq("requested_by", user.id)
        .eq("request_status", "PENDING")
        .in("project_id", ids)
        .order("created_at", { ascending: false });

      if (!rErr && Array.isArray(pendings)) {
        // เลือก “ล่าสุด” ต่อโปรเจกต์
        for (const r of pendings) {
          if (!pendingByProject[r.project_id]) pendingByProject[r.project_id] = r;
        }
      }
    }

    const merged = (projects || []).map((p: any) => ({
      ...p,
      pending_request: pendingByProject[p.id] ?? null,
    }));

    const res = NextResponse.json({ data: merged }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}