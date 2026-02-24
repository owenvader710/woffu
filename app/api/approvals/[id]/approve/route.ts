import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

function badId(id?: string) {
  return !id || id === "undefined" || id === "null";
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (badId(id)) return NextResponse.json({ error: "Invalid approval id" }, { status: 400 });

  const { supabase } = await supabaseFromRequest(req);

  // ต้อง login
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  const user = authData?.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ต้องเป็นหัวหน้า
  const { data: me, error: meErr } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();
  if (meErr) return NextResponse.json({ error: meErr.message }, { status: 500 });
  if (!me || String(me.role).toUpperCase() !== "LEADER" || me.is_active === false) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // หา request
  const { data: reqRow, error: reqErr } = await supabase
    .from("status_change_requests")
    .select("id, project_id, from_status, to_status, status, requested_by")
    .eq("id", id)
    .single();
  if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 });
  if (!reqRow) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (String(reqRow.status).toUpperCase() !== "PENDING") {
    return NextResponse.json({ error: "Request is not pending" }, { status: 400 });
  }

  // อนุมัติ
  const now = new Date().toISOString();
  const { error: updReqErr } = await supabase
    .from("status_change_requests")
    .update({ status: "APPROVED", approved_by: user.id, approved_at: now })
    .eq("id", id);
  if (updReqErr) return NextResponse.json({ error: updReqErr.message }, { status: 500 });

  // อัปเดตสถานะโปรเจกต์
  const { error: updProjErr } = await supabase
    .from("projects")
    .update({ status: reqRow.to_status })
    .eq("id", reqRow.project_id);
  if (updProjErr) return NextResponse.json({ error: updProjErr.message }, { status: 500 });

  // log (กันล่ม: ไม่บล็อก response ถ้า insert log fail)
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