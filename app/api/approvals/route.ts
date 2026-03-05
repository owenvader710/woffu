import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const { supabase, applyCookies } = supabaseFromRequest(req);

    // 1) auth
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    const user = authData?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    // 2) check leader
    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (meErr) {
      const res = NextResponse.json({ error: meErr.message }, { status: 400 });
      return applyCookies(res);
    }

    const isLeader = me?.role === "LEADER" && me?.is_active !== false;
    if (!isLeader) {
      const res = NextResponse.json({ error: "Not allowed" }, { status: 403 });
      return applyCookies(res);
    }

    // ✅ 3) use service role to bypass RLS
    const admin = supabaseAdmin();

    const selectShape = `
      id,
      project_id,
      from_status,
      to_status,
      request_status,
      created_at,
      requested_by,
      approved_by,
      approved_at,
      rejected_by,
      rejected_at,
      project:project_id (
        id,
        code,
        title,
        department,
        assignee_id,
        assignee:assignee_id ( id, display_name, department )
      ),
      requester:requested_by ( id, display_name, department ),
      approver:approved_by ( id, display_name, department ),
      rejector:rejected_by ( id, display_name, department )
    `;

    // Pending
    const { data: pending, error: pErr } = await admin
      .from("status_change_requests")
      .select(selectShape)
      .eq("request_status", "PENDING")
      .order("created_at", { ascending: false });

    if (pErr) {
      const res = NextResponse.json({ error: pErr.message }, { status: 400 });
      return applyCookies(res);
    }

    // History
    const { data: history, error: hErr } = await admin
      .from("status_change_requests")
      .select(selectShape)
      .in("request_status", ["APPROVED", "REJECTED"])
      .order("created_at", { ascending: false });

    if (hErr) {
      const res = NextResponse.json({ error: hErr.message }, { status: 400 });
      return applyCookies(res);
    }

    const res = NextResponse.json({ pending: pending ?? [], history: history ?? [] }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}