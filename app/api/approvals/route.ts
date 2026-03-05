import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";
import { createSupabaseAdmin } from "@/app/api/_supabaseAdmin";

function isLeaderRole(role?: string | null) {
  return String(role || "").toUpperCase() === "LEADER";
}

// NOTE:
// - ตาราง `status_change_requests` ใช้คอลัมน์ `request_status` (ไม่ใช่ `status`)
// - หน้านี้ใช้สำหรับหัวหน้าเท่านั้น
// - ส่งกลับ 2 กลุ่ม: pending + history
export async function GET(req: NextRequest) {
  const { supabase } = await supabaseFromRequest(req);

  // ต้อง login
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  if (!authData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ต้องเป็นหัวหน้า
  const { data: me, error: meErr } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", authData.user.id)
    .single();

  if (meErr) return NextResponse.json({ error: meErr.message }, { status: 500 });
  if (!me || !isLeaderRole(me.role) || me.is_active === false) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ✅ ใช้ service role เพื่อไม่ติด RLS และไม่พึ่ง relationship/FK name
  const admin = createSupabaseAdmin();

  const baseSelect =
    "id, project_id, from_status, to_status, note, request_status, created_at, requested_by, approved_by";

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

  const pendingRaw = (pendingRes.data ?? []) as any[];
  const historyRaw = (historyRes.data ?? []) as any[];
  const all = [...pendingRaw, ...historyRaw];

  const projectIds = Array.from(new Set(all.map((r) => r.project_id).filter(Boolean)));
  const requesterIds = Array.from(new Set(all.map((r) => r.requested_by).filter(Boolean)));

  const projQuery = projectIds.length
    ? await admin
        .from("projects")
        .select("id, code, title, department, assignee_id, brand, type")
        .in("id", projectIds)
    : ({ data: [], error: null } as any);

  const projectsArr = ((projQuery.data ?? []) as any[]) || [];
  if (projQuery.error) return NextResponse.json({ error: projQuery.error.message }, { status: 500 });

  const assigneeIds = Array.from(new Set(projectsArr.map((p) => p.assignee_id).filter(Boolean)));
  const profileIds = Array.from(new Set([...requesterIds, ...assigneeIds]));

  const profQuery = profileIds.length
    ? await admin.from("profiles").select("id, display_name, email, department, role").in("id", profileIds)
    : ({ data: [], error: null } as any);

  const profilesArr = ((profQuery.data ?? []) as any[]) || [];
  if (profQuery.error) return NextResponse.json({ error: profQuery.error.message }, { status: 500 });

  // ✅ FIX: ใส่ generics ให้ Map เพื่อไม่ให้ TS มองเป็น {}
  const projectMap = new Map<string, any>(projectsArr.map((p) => [p.id, p]));
  const profileMap = new Map<string, any>(profilesArr.map((p) => [p.id, p]));

  const hydrate = (rows: any[]) =>
    rows.map((r) => {
      const project: any | null = projectMap.get(r.project_id) ?? null;
      const requester: any | null = profileMap.get(r.requested_by) ?? null;
      const assignee: any | null = project?.assignee_id ? profileMap.get(project.assignee_id) ?? null : null;
      return { ...r, project, requester, assignee };
    });

  return NextResponse.json({
    data: { pending: hydrate(pendingRaw), history: hydrate(historyRaw) },
  });
}