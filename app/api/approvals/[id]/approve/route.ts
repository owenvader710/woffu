import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { supabase, applyCookies } = supabaseFromRequest(req);

    // auth
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    const user = authData?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    // check leader
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

    const admin = supabaseAdmin();

    // load request (bypass RLS)
    const { data: reqRow, error: reqErr } = await admin
      .from("status_change_requests")
      .select("id, project_id, from_status, to_status, request_status")
      .eq("id", id)
      .maybeSingle();

    if (reqErr) {
      const res = NextResponse.json({ error: reqErr.message }, { status: 400 });
      return applyCookies(res);
    }
    if (!reqRow) {
      const res = NextResponse.json({ error: "Not found" }, { status: 404 });
      return applyCookies(res);
    }
    if (reqRow.request_status !== "PENDING") {
      const res = NextResponse.json({ error: "Already processed" }, { status: 409 });
      return applyCookies(res);
    }

    // mark approved
    const { error: upReqErr } = await admin
      .from("status_change_requests")
      .update({
        request_status: "APPROVED",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (upReqErr) {
      const res = NextResponse.json({ error: upReqErr.message }, { status: 400 });
      return applyCookies(res);
    }

    // apply to project
    const { error: upProjectErr } = await admin
      .from("projects")
      .update({ status: reqRow.to_status })
      .eq("id", reqRow.project_id);

    if (upProjectErr) {
      const res = NextResponse.json({ error: upProjectErr.message }, { status: 400 });
      return applyCookies(res);
    }

    const res = NextResponse.json({ ok: true }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}