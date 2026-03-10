import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";
import { createSupabaseAdmin } from "@/app/api/_supabaseAdmin";
import { sendPushToUser } from "@/app/api/_push";

function badId(id: string) {
  return !id || id.length < 10;
}

function statusLabel(status: string) {
  switch (status) {
    case "PRE_ORDER":
      return "งานล่วงหน้า";
    case "TODO":
      return "รอเริ่ม";
    case "IN_PROGRESS":
      return "กำลังทำ";
    case "COMPLETED":
      return "เสร็จแล้ว";
    case "BLOCKED":
      return "ติดปัญหา";
    default:
      return status;
  }
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

  const body = await req.json().catch(() => null);
  const rejectReason =
    typeof body?.reason === "string" && body.reason.trim()
      ? body.reason.trim()
      : null;

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

  const updatePayload: Record<string, any> = {
    request_status: "REJECTED",
  };

  if (rejectReason) {
    updatePayload.reject_reason = rejectReason;
  }

  const { error: updReqErr } = await admin
    .from("status_change_requests")
    .update(updatePayload)
    .eq("id", id);

  if (updReqErr) {
    return NextResponse.json({ error: updReqErr.message }, { status: 500 });
  }

  const { data: projectRow } = await admin
    .from("projects")
    .select("id, title")
    .eq("id", reqRow.project_id)
    .maybeSingle();

  const projectTitle = projectRow?.title || "งานของคุณ";
  const pushMessage = rejectReason
    ? `${projectTitle} • ${statusLabel(reqRow.from_status)} → ${statusLabel(reqRow.to_status)} • ไม่อนุมัติ (${rejectReason})`
    : `${projectTitle} • ${statusLabel(reqRow.from_status)} → ${statusLabel(reqRow.to_status)} • ไม่อนุมัติ`;

  const link = `/projects/${reqRow.project_id}`;

  try {
    await admin.from("notifications").insert({
      user_id: reqRow.requested_by,
      type: "JOB_STATUS_REJECTED",
      title: "คำขอเปลี่ยนสถานะงานไม่ผ่านอนุมัติ",
      message: pushMessage,
      link,
      is_read: false,
    });
  } catch {}

  try {
    await sendPushToUser({
      userId: reqRow.requested_by,
      title: "คำขอเปลี่ยนสถานะงานไม่ผ่านอนุมัติ",
      message: pushMessage,
      url: link,
    });
  } catch {}

  return NextResponse.json({ ok: true });
}