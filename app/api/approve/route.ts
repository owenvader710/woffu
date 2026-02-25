import { NextResponse } from "next/server";
import { supabaseFromRequest } from "../../../utils/supabase/api";

export async function POST(request: Request) {
  const { supabase } = await supabaseFromRequest(request);

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { request_id } = await request.json();

  // อ่าน request
  const { data: reqRow, error: reqErr } = await supabase
    .from("status_change_requests")
    .select("*")
    .eq("id", request_id)
    .single();

  if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 400 });

  // 1) อนุมัติ request (policy จะบังคับให้ leader เท่านั้น update ได้)
  const { error: approveErr } = await supabase
    .from("status_change_requests")
    .update({ approved_by: user.id, approved_at: new Date().toISOString() })
    .eq("id", request_id);

  if (approveErr) return NextResponse.json({ error: approveErr.message }, { status: 400 });

  // 2) update project status (policy leader only)
  const { error: projUpdateErr } = await supabase
    .from("projects")
    .update({ status: reqRow.to_status, updated_at: new Date().toISOString() })
    .eq("id", reqRow.project_id);

  if (projUpdateErr) return NextResponse.json({ error: projUpdateErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
