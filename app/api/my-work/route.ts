import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function GET(req: NextRequest) {
  try {
    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 401 });
    }

    const user = authData?.user;
    if (!user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const { data: projects, error } = await supabase
      .from("projects")
      .select(`
        id,
        code,
        title,
        type,
        department,
        status,
        created_at,
        start_date,
        due_date,
        assignee_id,
        created_by,
        brand,
        video_priority,
        video_purpose,
        graphic_job_type
      `)
      .eq("assignee_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      const res = NextResponse.json({ error: error.message }, { status: 400 });
      return applyCookies(res);
    }

    const rows = Array.isArray(projects) ? projects : [];

    if (rows.length === 0) {
      const res = NextResponse.json({ data: [] }, { status: 200 });
      return applyCookies(res);
    }

    const ids = rows.map((x: any) => x.id).filter(Boolean);

    const { data: pendingReqs, error: reqErr } = await supabase
      .from("status_change_requests")
      .select(`
        id,
        project_id,
        from_status,
        to_status,
        request_status,
        created_at
      `)
      .in("project_id", ids)
      .eq("request_status", "PENDING")
      .order("created_at", { ascending: false });

    if (reqErr) {
      const res = NextResponse.json({ error: reqErr.message }, { status: 400 });
      return applyCookies(res);
    }

    const map = new Map<string, any>();

    if (Array.isArray(pendingReqs)) {
      for (const r of pendingReqs) {
        if (!map.has(r.project_id)) {
          map.set(r.project_id, {
            id: r.id,
            project_id: r.project_id,
            from_status: r.from_status,
            to_status: r.to_status,
            status: r.request_status,
            created_at: r.created_at,
          });
        }
      }
    }

    const merged = rows.map((p: any) => ({
      ...p,
      pending_request: map.get(p.id) ?? null,
    }));

    const res = NextResponse.json({ data: merged }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}