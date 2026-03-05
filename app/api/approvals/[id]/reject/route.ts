import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { supabase, applyCookies } = supabaseFromRequest(req);
    const admin = supabaseAdmin();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    const user = authData?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

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

    const { data: reqRow, error: reqErr } = await admin
      .from("status_change_requests")
      .select("*")
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
      const res = NextResponse.json({ error: "Already processed" }, { status: 400 });
      return applyCookies(res);
    }

    const { error: updReqErr } = await admin
      .from("status_change_requests")
      .update({ request_status: "REJECTED", approved_by: user.id })
      .eq("id", id);

    if (updReqErr) {
      const res = NextResponse.json({ error: updReqErr.message }, { status: 400 });
      return applyCookies(res);
    }

    try {
      await admin.from("activity_logs").insert({
        action: "STATUS_CHANGE_REJECTED",
        project_id: reqRow.project_id,
        meta: { from: reqRow.from_status, to: reqRow.to_status, request_id: id },
        created_by: user.id,
      });
    } catch {}

    const res = NextResponse.json({ ok: true }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}