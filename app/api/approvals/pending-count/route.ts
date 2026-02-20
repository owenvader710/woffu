import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function GET(req: NextRequest) {
  try {
    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

    const user = authData?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    // leader only
    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (meErr) return NextResponse.json({ error: meErr.message }, { status: 400 });
    if (!me?.is_active || me.role !== "LEADER") {
      return NextResponse.json({ error: "Leader only" }, { status: 403 });
    }

    // pending = approved_at is null
    const { count, error } = await supabase
      .from("status_change_requests")
      .select("id", { count: "exact", head: true })
      .is("approved_at", null);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const res = NextResponse.json({ pending: count ?? 0 }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
