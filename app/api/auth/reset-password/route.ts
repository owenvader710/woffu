import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function GET(req: NextRequest) {
  const { supabase, applyCookies } = supabaseFromRequest(req);
  const { data, error } = await supabase.auth.getUser();
  return applyCookies(NextResponse.json(
    { ready: !error && !!data.user },
    { status: error || !data.user ? 401 : 200, headers: { "Cache-Control": "no-store" } }
  ));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  const confirm = typeof body?.confirmPassword === "string" ? body.confirmPassword : "";
  if (password.length < 10 || password.length > 128 || confirm !== password) {
    return NextResponse.json(
      { error: "รหัสผ่านต้องมี 10–128 ตัวอักษร และช่องยืนยันต้องตรงกัน" },
      { status: 400 }
    );
  }

  const { supabase, applyCookies } = supabaseFromRequest(req);
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user) {
    return applyCookies(NextResponse.json(
      { error: "ลิงก์หมดอายุ กรุณาขอลิงก์รีเซ็ตใหม่" },
      { status: 401 }
    ));
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.warn("[PASSWORD RECOVERY] Password update failed", error.code || "unknown");
    return applyCookies(NextResponse.json(
      { error: "ไม่สามารถตั้งรหัสผ่านใหม่ได้ กรุณาเลือกรหัสผ่านอื่นแล้วลองอีกครั้ง" },
      { status: 400 }
    ));
  }

  // Reauthenticate with the new password rather than retaining a recovery
  // session. This also revokes other sessions as configured by Supabase Auth.
  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) {
    console.warn("[PASSWORD RECOVERY] Sign-out failed after password update", signOutError.code || "unknown");
  }

  return applyCookies(NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  ));
}
