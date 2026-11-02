// app/api/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.session) {
      const res = NextResponse.json(
        { error: error?.message || "Login failed" },
        { status: 401 }
      );
      return applyCookies(res);
    }

    // A signed-in Auth user can still have a disabled WOFFU profile. Check
    // the application account before establishing a usable browser session.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError || !profile?.is_active) {
      await supabase.auth.signOut();
      const res = NextResponse.json(
        { error: "บัญชีนี้ยังไม่ได้รับอนุญาตหรือถูกปิดใช้งาน กรุณาติดต่อหัวหน้าทีม" },
        { status: 403 }
      );
      return applyCookies(res);
    }

    const res = NextResponse.json({ ok: true }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}