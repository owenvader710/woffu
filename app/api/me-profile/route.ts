// app/api/me-profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function GET(req: NextRequest) {
  try {
    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    const user = authData?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, is_active, display_name, department")
      .eq("id", user.id)
      .single();

    if (error) {
      const res = NextResponse.json({ error: error.message }, { status: 400 });
      return applyCookies(res);
    }

    const res = NextResponse.json({ data }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}