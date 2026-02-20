import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function GET(req: NextRequest) {
  try {
    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    if (!auth?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, role, department, phone, avatar_url, is_active")
      .eq("id", auth.user.id)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const res = NextResponse.json({ data });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
