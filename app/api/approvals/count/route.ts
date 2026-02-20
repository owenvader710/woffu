// app/api/approvals/count/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function GET(req: NextRequest) {
  try {
    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return NextResponse.json({ count: 0 }, { status: 200 });

    const { data: me } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (!me?.is_active || me.role !== "LEADER") {
      const res = NextResponse.json({ count: 0 }, { status: 200 });
      return applyCookies(res);
    }

    const { count, error } = await supabase
      .from("status_change_requests")
      .select("id", { count: "exact", head: true })
      .eq("request_status", "PENDING");

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const res = NextResponse.json({ count: count ?? 0 }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
