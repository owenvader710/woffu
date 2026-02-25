import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

function badId(id?: string) {
  return !id || id === "undefined" || id === "null";
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (badId(id)) return NextResponse.json({ error: "Invalid approval id" }, { status: 400 });

  const { supabase } = await supabaseFromRequest(req);

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  const user = authData?.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me, error: meErr } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();
  if (meErr) return NextResponse.json({ error: meErr.message }, { status: 500 });
  if (!me || String(me.role).toUpperCase() !== "LEADER" || me.is_active === false) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ✅ แก้ไข: เลือกคอลัมน์ request_status
  const { data: reqRow, error: reqErr } = await supabase
    .from("status_change_requests")
    .select("id, project_id, from_status, to_status, request_status, requested_by") 
    .eq("id", id)
    .single();

  if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 });
  if (!reqRow) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  // ✅ แก้ไข: เช็คแบบ Case-insensitive และรองรับค่า NULL
  const currentStatus = String(reqRow.request_status || "PENDING").toUpperCase();
  if (currentStatus !== "PENDING") {
    return NextResponse.json({ error: `Request is not pending (Current: ${currentStatus})` }, { status: 400 });
  }

  const now = new Date().toISOString();

  // ✅ แก้ไข: Update คอลัมน์ request_status
  const { error: updReqErr } = await supabase
    .from("status_change_requests")
    .update({ request_status: "APPROVED", approved_by: user.id, approved_at: now })
    .eq("id", id);
    
  if (updReqErr) return NextResponse.json({ error: updReqErr.message }, { status: 500 });

  const { error: updProjErr } = await supabase
    .from("projects")
    .update({ status: reqRow.to_status })
    .eq("id", reqRow.project_id);
  if (updProjErr) return NextResponse.json({ error: updProjErr.message }, { status: 500 });

  await supabase.from("project_logs").insert({
    project_id: reqRow.project_id,
    action: "STATUS_APPROVED",
    created_by: user.id,
    detail: {
      request_id: id,
      from_status: reqRow.from_status,
      to_status: reqRow.to_status,
      requested_by: reqRow.requested_by,
    },
  });

  return NextResponse.json({ ok: true });
}