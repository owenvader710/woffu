import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function GET(req: NextRequest) {
  try {
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

    const isLeader = String(me?.role || "").toUpperCase() === "LEADER" && me?.is_active !== false;
    if (!isLeader) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { count, error } = await supabase
      .from("status_change_requests")
      .select("*", { count: "exact", head: true })
      .eq("request_status", "PENDING");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ count: count ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}