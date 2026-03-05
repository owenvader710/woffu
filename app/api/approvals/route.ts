import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const { supabase, applyCookies } = supabaseFromRequest(req);
    const admin = supabaseAdmin();

    // auth
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    const user = authData?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    // leader check
    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (meErr) {
      const res = NextResponse.json({ error: meErr.message }, { status: 400 });
      return applyCookies(res);
    }
    if (me?.role !== "LEADER") {
      const res = NextResponse.json({ error: "Not allowed" }, { status: 403 });
      return applyCookies(res);
    }

    // ✅ admin read
    const pendingQ = await admin
      .from("status_change_requests")
      .select(
        `
        id, project_id, requested_by, from_status, to_status, request_status, created_at, updated_at,
        projects:projects(id, title, code)
      `
      )
      .eq("request_status", "PENDING")
      .order("created_at", { ascending: false });

    const historyQ = await admin
  .from("status_change_requests")
  .select(
    `
    id, project_id, requested_by, from_status, to_status, request_status, created_at,
    projects:projects(id, title, code)
  `
  )
  .neq("request_status", "PENDING")
  .order("created_at", { ascending: false }) // ✅ ใช้ created_at แทน updated_at
  .limit(50);

    if (pendingQ.error) {
      const res = NextResponse.json({ error: pendingQ.error.message }, { status: 400 });
      return applyCookies(res);
    }
    if (historyQ.error) {
      const res = NextResponse.json({ error: historyQ.error.message }, { status: 400 });
      return applyCookies(res);
    }

    const res = NextResponse.json(
      { pending: pendingQ.data ?? [], history: historyQ.data ?? [] },
      { status: 200 }
    );
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}