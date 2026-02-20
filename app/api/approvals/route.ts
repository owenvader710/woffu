import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function GET(req: NextRequest) {
  try {
    const { supabase, applyCookies } = supabaseFromRequest(req);

    // auth
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

    const user = authData?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    // leader-only (ถ้าอยากให้ member เห็นเป็น [] เฉยๆ)
    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (meErr) return NextResponse.json({ error: meErr.message }, { status: 400 });
    if (!me?.is_active) return NextResponse.json({ error: "Inactive profile" }, { status: 403 });

    if (me.role !== "LEADER") {
      const res = NextResponse.json([], { status: 200 });
      return applyCookies(res);
    }

    // ✅ ดึง approvals แบบไม่ embed profiles (กัน error relationship ซ้อน)
    const { data, error } = await supabase
      .from("status_change_requests")
      .select(
        `
        id,
        from_status,
        to_status,
        created_at,
        request_status,
        project_id,
        projects ( title )
      `
      )
      .eq("request_status", "PENDING")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const res = NextResponse.json(data ?? [], { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
