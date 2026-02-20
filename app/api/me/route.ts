// app/api/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function GET(req: NextRequest) {
  try {
    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      return NextResponse.json({ user: null, error: authErr.message }, { status: 401 });
    }

    const user = authData?.user ?? null;
    if (!user) {
      return NextResponse.json({ user: null, error: "Unauthenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, display_name, role, department, is_active")
      .eq("id", user.id)
      .maybeSingle();

    const res = NextResponse.json({ user, profile, error: null }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json(
      { user: null, profile: null, error: e?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
