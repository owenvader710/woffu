import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function GET(req: NextRequest) {
  try {
    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    const user = authData?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    // ✅ งานของฉัน (assignee = ตัวเอง)
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

    // ✅ ดึง pending request ของ “ฉัน” เพื่อให้ F5 แล้วไม่หาย
    const { data: reqs, error: rErr } = await supabase
      .from("status_change_requests")
      .select("id, project_id, from_status, to_status, status, created_at")
      .eq("requester_id", user.id)
      .eq("status", "PENDING");

    if (rErr) {
      // ถ้าตาราง/คอลัมน์ยังไม่พร้อม จะไม่พังหน้า (แค่ไม่โชว์ pending)
      const res = NextResponse.json({ data: projects ?? [] }, { status: 200 });
      return applyCookies(res);
    }

    const pendingByProject = new Map<string, any>();
    for (const r of reqs ?? []) pendingByProject.set(r.project_id, r);

    const merged =
      (projects ?? []).map((p: any) => ({
        ...p,
        pending_request: pendingByProject.get(p.id) ?? null,
      })) ?? [];

    const res = NextResponse.json({ data: merged }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}