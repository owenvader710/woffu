import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

function isLeaderRole(role?: string | null) {
  return String(role || "").toUpperCase() === "LEADER";
}

// ล้าง HISTORY (เฉพาะหัวหน้า)
// - ไม่ลบ pending
export async function POST(req: NextRequest) {
  const { supabase } = await supabaseFromRequest(req);

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  if (!authData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me, error: meErr } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", authData.user.id)
    .single();
  if (meErr) return NextResponse.json({ error: meErr.message }, { status: 500 });
  if (!me || !isLeaderRole(me.role) || me.is_active === false) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("status_change_requests")
    .delete()
    .neq("request_status", "PENDING");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}