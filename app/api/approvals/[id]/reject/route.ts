import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";
import { supabaseAdmin } from "@/utils/supabase/admin";

function isLeaderRole(role?: string | null) {
  return String(role || "").toUpperCase() === "LEADER";
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { supabase, applyCookies } = await supabaseFromRequest(req);
  const admin = supabaseAdmin();
  const { id } = await ctx.params;

  // auth
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  if (!authData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // leader check
  const { data: me, error: meErr } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", authData.user.id)
    .single();

  if (meErr) return NextResponse.json({ error: meErr.message }, { status: 500 });
  if (!me || !isLeaderRole(me.role) || me.is_active === false) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // admin load request
  const { data: reqRow, error: reqErr } = await admin
    .from("status_change_requests")
    .select("id, request_status")
    .eq("id", id)
    .maybeSingle();

  if (reqErr) {
    const res = NextResponse.json({ error: reqErr.message }, { status: 500 });
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

  // admin mark rejected (อย่าใช้ processed_at / updated_at / rejected_by ถ้าไม่มีคอลัมน์)
  const { error: uErr } = await admin
    .from("status_change_requests")
    .update({
      request_status: "REJECTED",
      approved_by: authData.user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", reqRow.id);

  if (uErr) {
    const res = NextResponse.json({ error: uErr.message }, { status: 500 });
    return applyCookies(res);
  }

  const res = NextResponse.json({ ok: true });
  return applyCookies(res);
}