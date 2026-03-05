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
    const { data: projects, error } = await supabase
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

    if (error) {
      const res = NextResponse.json({ error: error.message }, { status: 400 });
      return applyCookies(res);
    }

    const rows = Array.isArray(projects) ? projects : [];

    // ✅ แนบ pending request (ถ้ามี) ให้แต่ละโปรเจกต์ เพื่อให้ F5 แล้วยังโชว์ “รออนุมัติ”
    if (rows.length > 0) {
      const ids = rows.map((x: any) => x.id);

      const { data: pendingReqs, error: reqErr } = await supabase
        .from("status_change_requests")
        .select("id, project_id, from_status, to_status, status, created_at")
        .in("project_id", ids)
        .eq("status", "PENDING")
        .order("created_at", { ascending: false });

      if (!reqErr && Array.isArray(pendingReqs)) {
        const map = new Map<string, any>();
        for (const r of pendingReqs) {
          // เอาอันล่าสุดของแต่ละโปรเจกต์
          if (!map.has(r.project_id)) map.set(r.project_id, r);
        }

        const merged = rows.map((p: any) => ({
          ...p,
          pending_request: map.get(p.id) ?? null,
        }));

        const res = NextResponse.json({ data: merged }, { status: 200 });
        return applyCookies(res);
      }
    }

    const res = NextResponse.json({ data: rows }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}