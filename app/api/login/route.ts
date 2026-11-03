import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";
import { parseLoginCredentials } from "@/lib/loginCredentials";

export async function POST(req: NextRequest) {
  let credentials: unknown;
  try {
    credentials = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validated = parseLoginCredentials(credentials);
  if (!validated) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  const { email, password } = validated;

  try {
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

    // An Auth user must also have an active WOFFU profile.
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
  } catch {
    // Avoid leaking provider, database, or environment details to callers.
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
