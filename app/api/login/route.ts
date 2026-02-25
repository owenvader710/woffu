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

    const res = NextResponse.json({ ok: true }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}