// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

// GET /api/projects -> list projects + has_pending_request
export async function GET(req: NextRequest) {
  try {
    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    if (!auth?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    // 1) load projects
    const { data: projects, error: pErr } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

    const list = projects ?? [];
    const ids = list.map((p: any) => p.id).filter(Boolean);

    // 2) find pending requests for these project ids
    let pendingSet = new Set<string>();
    if (ids.length > 0) {
      const { data: pendings, error: rErr } = await supabase
        .from("status_change_requests")
        .select("project_id")
        .in("project_id", ids)
        .eq("request_status", "PENDING");

      if (rErr) return NextResponse.json({ error: rErr.message }, { status: 400 });

      for (const row of pendings ?? []) {
        if (row?.project_id) pendingSet.add(row.project_id);
      }
    }

    // 3) attach flag
    const data = list.map((p: any) => ({
      ...p,
      has_pending_request: pendingSet.has(p.id),
    }));

    const res = NextResponse.json({ data }, { status: 200 });
    
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}

// POST /api/projects -> create project (หัวหน้าเท่านั้น)
export async function POST(request: NextRequest) {
  try {
    const { supabase, applyCookies } = supabaseFromRequest(request);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    const user = auth?.user;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // เช็ค role จาก profiles
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 400 });
    if (!profile?.is_active) return NextResponse.json({ error: "Inactive profile" }, { status: 403 });
    if (profile.role !== "LEADER") return NextResponse.json({ error: "Leader only" }, { status: 403 });

    const body = await request.json();
    const { title, type, department, due_date, assignee_id, code, start_date } = body;

    const { data, error } = await supabase
      .from("projects")
      .insert({
        title,
        type,
        department,
        status: "TODO",
        assignee_id: assignee_id ?? null,
        created_by: user.id,
        code: code ?? null,
        start_date: start_date ?? null,
        due_date: due_date ?? null,
      })
      .select("*")
      .single();

if (error) return NextResponse.json({ error: error.message }, { status: 400 });

// ✅ log: project created
await supabase.from("project_logs").insert({
  project_id: data.id,
  actor_id: user.id,
  action: "PROJECT_CREATED",
  message: `สร้างโปรเจกต์: ${data.title}`,
  meta: { type: data.type, department: data.department, assignee_id: data.assignee_id ?? null },
});

  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
    
  }
}
