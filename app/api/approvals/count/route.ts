import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    const user = authData?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (meErr) {
      const res = NextResponse.json({ error: meErr.message }, { status: 400 });
      return applyCookies(res);
    }
    if (me?.role !== "LEADER") {
      const res = NextResponse.json({ total: 0, pending: 0 }, { status: 200 });
      return applyCookies(res);
    }

    const pendingQ = await supabaseAdmin
      .from("status_change_requests")
      .select("id", { count: "exact", head: true })
      .eq("request_status", "PENDING");

    const totalQ = await supabaseAdmin
      .from("status_change_requests")
      .select("id", { count: "exact", head: true });

    if (pendingQ.error) {
      const res = NextResponse.json({ error: pendingQ.error.message }, { status: 400 });
      return applyCookies(res);
    }
    if (totalQ.error) {
      const res = NextResponse.json({ error: totalQ.error.message }, { status: 400 });
      return applyCookies(res);
    }

    const res = NextResponse.json(
      { total: totalQ.count ?? 0, pending: pendingQ.count ?? 0 },
      { status: 200 }
    );
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}