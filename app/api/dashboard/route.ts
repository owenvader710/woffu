// app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

type Status = "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";

function toISODate(d: Date) {
  // yyyy-mm-dd
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, applyCookies } = supabaseFromRequest(req);

    // auth
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    const user = authData?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    // profile (role)
    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select("id, display_name, role, department, is_active")
      .eq("id", user.id)
      .single();

    if (meErr) return NextResponse.json({ error: meErr.message }, { status: 400 });
    if (!me?.is_active) return NextResponse.json({ error: "Inactive profile" }, { status: 403 });

    const isLeader = me.role === "LEADER";

    // 1) total projects (count)
    const { count: totalProjects, error: totalErr } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true });

    if (totalErr) return NextResponse.json({ error: totalErr.message }, { status: 400 });

    // 2) byStatus (ดึงเฉพาะ status มานับใน JS)
    const { data: statusRows, error: statusErr } = await supabase
      .from("projects")
      .select("status");

    if (statusErr) return NextResponse.json({ error: statusErr.message }, { status: 400 });

    const byStatus: Record<Status, number> = {
      TODO: 0,
      IN_PROGRESS: 0,
      BLOCKED: 0,
      COMPLETED: 0,
    };

    for (const r of statusRows ?? []) {
      const s = r?.status as Status;
      if (s && byStatus[s] !== undefined) byStatus[s] += 1;
    }

    // 3) pending approvals count (leader only)
    let pendingApprovals = 0;
    if (isLeader) {
      const { count: pendingCount, error: pendingErr } = await supabase
        .from("status_change_requests")
        .select("id", { count: "exact", head: true })
        .eq("request_status", "PENDING");

      if (pendingErr) return NextResponse.json({ error: pendingErr.message }, { status: 400 });
      pendingApprovals = pendingCount ?? 0;
    }

    // 4) my work due soon (ภายใน 3 วันข้างหน้า, ยังไม่ completed)
    const today = new Date();
    const soon = new Date();
    soon.setDate(today.getDate() + 3);

    const todayISO = toISODate(today);
    const soonISO = toISODate(soon);

    const { count: myDueSoonCount, error: dueErr } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("assignee_id", user.id)
      .neq("status", "COMPLETED")
      .gte("due_date", todayISO)
      .lte("due_date", soonISO);

    if (dueErr) return NextResponse.json({ error: dueErr.message }, { status: 400 });

    const payload = {
      me: {
        id: me.id,
        display_name: me.display_name ?? null,
        role: me.role,
        department: me.department,
        email: user.email ?? null,
      },
      totalProjects: totalProjects ?? 0,
      byStatus,
      pendingApprovals, // leader only (member จะเป็น 0)
      myWorkDueSoonCount: myDueSoonCount ?? 0,
      dueSoonWindowDays: 3,
    };

    const res = NextResponse.json(payload, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
