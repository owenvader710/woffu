import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";
import { createSupabaseAdmin } from "@/app/api/_supabaseAdmin";
import { sendPushToUser } from "@/app/api/_push";

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
      request_status: "APPROVED",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updReqErr) {
    return NextResponse.json({ error: updReqErr.message }, { status: 500 });
  }

  const { error: updProjErr } = await admin
    .from("projects")
    .update({ status: reqRow.to_status })
    .eq("id", reqRow.project_id);

  if (updProjErr) {
    return NextResponse.json({ error: updProjErr.message }, { status: 500 });
  }

  try {
    await admin.from("notifications").insert({
      user_id: reqRow.requested_by,
      type: "JOB_STATUS_CHANGED",
      title: "สถานะงานของคุณถูกอนุมัติแล้ว",
      message: `${reqRow.from_status} → ${reqRow.to_status}`,
      link: "/my-work",
      is_read: false,
    });
  } catch {
    // ignore notification error
  }

  try {
    await sendPushToUser({
      userId: reqRow.requested_by,
      title: "สถานะงานของคุณถูกอนุมัติแล้ว",
      message: `${reqRow.from_status} → ${reqRow.to_status}`,
      url: "/my-work",
    });
  } catch {
    // ignore push error
  }

  return NextResponse.json({ ok: true });
}