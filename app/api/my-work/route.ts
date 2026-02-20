// app/api/my-work/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function GET(req: NextRequest) {
  try {
    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    const user = authData?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    // 1) งานของฉัน
    const { data: projects, error: pErr } = await supabase
      .from("projects")
      .select("id, title, type, department, status, created_at, start_date, due_date, assignee_id, created_by")
      .eq("assignee_id", user.id)
      .order("created_at", { ascending: false });

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

    const ids = (projects || []).map((p: any) => p.id);
    if (ids.length === 0) {
      const res = NextResponse.json({ data: [] }, { status: 200 });
      return applyCookies(res);
    }

    // 2) คำขอของฉัน (ล่าสุดต่อโปรเจกต์) — เอาทั้ง PENDING/APPROVED/REJECTED
    const { data: reqs, error: rErr } = await supabase
      .from("status_change_requests")
      .select("id, project_id, from_status, to_status, request_status, created_at, approved_at")
      .in("project_id", ids)
      .eq("requested_by", user.id)
      .order("created_at", { ascending: false });

    if (rErr) return NextResponse.json({ error: rErr.message }, { status: 400 });

    // map คำขอล่าสุดต่อ project
    const latestByProject = new Map<string, any>();
    for (const r of reqs || []) {
      if (!latestByProject.has(r.project_id)) latestByProject.set(r.project_id, r);
    }

    const merged = (projects || []).map((p: any) => ({
      ...p,
      last_request: latestByProject.get(p.id) || null,
      pending_request:
        latestByProject.get(p.id)?.request_status === "PENDING" ? latestByProject.get(p.id) : null,
    }));

    const res = NextResponse.json({ data: merged }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
