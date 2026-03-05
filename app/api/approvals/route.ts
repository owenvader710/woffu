import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";
import { createSupabaseAdmin } from "@/app/api/_supabaseAdmin";

function isLeaderRole(role: any) {
  return role === "LEADER" || role === "ADMIN";
}

function badId(id: string) {
  return !id || id.length < 10;
}

export async function GET(req: NextRequest) {
  const { supabase } = await supabaseFromRequest(req);

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  const user = authData?.user;
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  // เช็ค role หัวหน้า (ใช้ client ปกติพอ เพราะอ่านของตัวเอง)
  const prof = await supabase.from("profiles").select("id, role, is_active").eq("id", user.id).maybeSingle();
  const me = prof?.data as any;

  if (!me || !isLeaderRole(me.role) || me.is_active === false) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ✅ ใช้ service role เพื่อไม่ติด RLS และไม่พึ่ง relationship ชื่อ FK (schema cache ชอบ error)
  const admin = createSupabaseAdmin();

  const baseSelect =
    "id, project_id, from_status, to_status, note, request_status, created_at, requested_by, approved_by, rejected_by";

  const [pendingRes, historyRes] = await Promise.all([
    admin
      .from("status_change_requests")
      .select(baseSelect)
      .eq("request_status", "PENDING")
      .order("created_at", { ascending: false }),
    admin
      .from("status_change_requests")
      .select(baseSelect)
      .neq("request_status", "PENDING")
      .order("created_at", { ascending: false }),
  ]);

  if (pendingRes.error) return NextResponse.json({ error: pendingRes.error.message }, { status: 500 });
  if (historyRes.error) return NextResponse.json({ error: historyRes.error.message }, { status: 500 });

  const pendingRaw = pendingRes.data ?? [];
  const historyRaw = historyRes.data ?? [];
  const all = [...pendingRaw, ...historyRaw];

  const projectIds = Array.from(new Set(all.map((r: any) => r.project_id).filter(Boolean)));
  const requesterIds = Array.from(new Set(all.map((r: any) => r.requested_by).filter(Boolean)));

  const { data: projects, error: projErr } = projectIds.length
    ? await admin
        .from("projects")
        .select("id, code, title, department, assignee_id, brand, type")
        .in("id", projectIds)
    : ({ data: [], error: null } as any);

  if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 });

  const assigneeIds = Array.from(new Set((projects || []).map((p: any) => p.assignee_id).filter(Boolean)));
  const profileIds = Array.from(new Set([...requesterIds, ...assigneeIds]));

  const { data: profiles, error: profErr } = profileIds.length
    ? await admin.from("profiles").select("id, display_name, email, department, role").in("id", profileIds)
    : ({ data: [], error: null } as any);

  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });

  const projectMap = new Map((projects || []).map((p: any) => [p.id, p]));
  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  const hydrate = (rows: any[]) =>
    rows.map((r: any) => {
      const project = projectMap.get(r.project_id) || null;
      const requester = profileMap.get(r.requested_by) || null;
      const assignee = project?.assignee_id ? profileMap.get(project.assignee_id) || null : null;
      return { ...r, project, requester, assignee };
    });

  return NextResponse.json({
    data: {
      pending: hydrate(pendingRaw),
      history: hydrate(historyRaw),
    },
  });
}