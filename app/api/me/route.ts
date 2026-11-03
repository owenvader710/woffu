// app/api/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function GET(req: NextRequest) {
  try {
    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      return NextResponse.json({ user: null, error: "Unauthenticated" }, { status: 401 });
    }

    const user = authData?.user ?? null;
    if (!user) {
      return NextResponse.json({ user: null, error: "Unauthenticated" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name, role, department, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      const res = NextResponse.json({ user: null, profile: null, error: "Unable to verify account" }, { status: 500 });
      return applyCookies(res);
    }
    if (!profile || profile.is_active !== true) {
      const res = NextResponse.json({ user: null, profile: null, error: "Account unavailable" }, { status: 403 });
      return applyCookies(res);
    }

    const res = NextResponse.json({ user, profile, error: null }, { status: 200 });
    return applyCookies(res);
  } catch {
    return NextResponse.json(
      { user: null, profile: null, error: "Internal error" },
      { status: 500 }
    );
  }
}
