import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

type Dept = "VIDEO" | "GRAPHIC" | "ALL";

export async function GET(req: NextRequest) {
  try {
    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    const user = authData?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    // ✅ allow leader only
    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (meErr) {
      const res = NextResponse.json({ error: meErr.message }, { status: 400 });
      return applyCookies(res);
    }

    if (!me || me.is_active === false || me.role !== "LEADER") {
      const res = NextResponse.json({ error: "Not allowed" }, { status: 403 });
      return applyCookies(res);
    }

    // ✅ IMPORTANT: table ไม่มี processed_at / processed_by -> ห้าม select
    const { data: rows, error } = await supabase
      .from("status_change_requests")
      .select(
        `
        id,
        project_id,
        requested_by,
        from_status,
        to_status,
        status,
        created_at,
        note,
        project:projects(
          id,
          code,
          title,
          department,
          assignee_id
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      const res = NextResponse.json({ error: error.message }, { status: 400 });
      return applyCookies(res);
    }

    // ✅ เติมข้อมูล assignee ให้ UI
    const assigneeIds = Array.from(
      new Set(
        (rows ?? [])
          .map((r: any) => r?.project?.assignee_id)
          .filter(Boolean)
      )
    ) as string[];

    const assigneesMap = new Map<string, { id: string; display_name: string | null; department: Dept | null }>();

    if (assigneeIds.length) {
      const { data: assignees, error: aErr } = await supabase
        .from("profiles")
        .select("id, display_name, department")
        .in("id", assigneeIds);

      if (!aErr && Array.isArray(assignees)) {
        for (const a of assignees as any[]) {
          assigneesMap.set(a.id, {
            id: a.id,
            display_name: a.display_name ?? null,
            department: (a.department ?? null) as Dept | null,
          });
        }
      }
    }

    const data = (rows ?? []).map((r: any) => {
      const assigneeId = r?.project?.assignee_id ?? null;
      return {
        ...r,
        project: r.project
          ? {
              ...r.project,
              assignee: assigneeId ? assigneesMap.get(assigneeId) ?? null : null,
            }
          : null,
      };
    });

    const res = NextResponse.json({ data }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}