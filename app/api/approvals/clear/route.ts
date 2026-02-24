import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/app/api/_supabase";

export async function POST() {
  const supabase = createSupabaseServer();

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

  // ล้าง HISTORY: ลบเฉพาะรายการที่จบแล้ว (APPROVED/REJECTED)
  // (PENDING ไม่โดนลบ)
  const { error } = await supabase
    .from("status_change_requests")
    .delete()
    .in("status", ["APPROVED", "REJECTED"]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}