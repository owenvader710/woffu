import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function POST(req: NextRequest) {
  let credentials: unknown;
  try {
    credentials = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Never pass unexpected JSON types to the Auth provider, and do not log passwords.
  if (!credentials || typeof credentials !== "object" || Array.isArray(credentials)) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const { email, password } = credentials as Record<string, unknown>;
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password ||
    email.length > 320
  ) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  try {
    const { supabase, applyCookies } = supabaseFromRequest(req);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
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
