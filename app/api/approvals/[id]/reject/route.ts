import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";
import { createSupabaseAdmin } from "@/app/api/_supabaseAdmin";

function badId(id: string) {
  return !id || id.length < 10;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (badId(id)) {
    return NextResponse.json({ error: "Invalid approval id" }, { status: 400 });
  }

  const { supabase } = await supabaseFromRequest(req);
  const admin = createSupabaseAdmin();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 401 });
  }

  const user = auth?.user;
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { data: me, error: meErr } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (meErr) {
    return NextResponse.json({ error: meErr.message }, { status: 500 });
  }

  if (!me || me.is_active === false || (me.role !== "LEADER" && me.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: reqRow, error: reqErr } = await admin
    .from("status_change_requests")
    .select("id, project_id, from_status, to_status, request_status, requested_by")
    .eq("id", id)
    .single();

  if (reqErr) {
    return NextResponse.json({ error: reqErr.message }, { status: 500 });
  }

  if (!reqRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (reqRow.request_status !== "PENDING") {
    return NextResponse.json({ error: "Already processed" }, { status: 400 });
  }

  const { error: updReqErr } = await admin
    .from("status_change_requests")
    .update({
      request_status: "REJECTED",
      approved_by: user.id,
    })
    .eq("id", id);

  if (updReqErr) {
    return NextResponse.json({ error: updReqErr.message }, { status: 500 });
  }

  const { error: logErr } = await admin.from("project_logs").insert({
    project_id: reqRow.project_id,
    action: "STATUS_REJECTED",
    created_by: user.id,
    detail: {
      request_id: id,
      from_status: reqRow.from_status,
      to_status: reqRow.to_status,
      requested_by: reqRow.requested_by,
      reviewed_by: user.id,
      result: "REJECTED",
    },
  });

  if (logErr) {
    return NextResponse.json({ error: logErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}