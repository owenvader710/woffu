import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 254) {
    return NextResponse.json({ error: "กรุณาระบุอีเมลให้ถูกต้อง" }, { status: 400 });
  }

  try {
    // Use the same SSR cookie client for request + callback so PKCE verifier
    // cookies are available to exchangeCodeForSession on the same browser.
    const { supabase, applyCookies } = supabaseFromRequest(req);
    const recoveryUrl = new URL("/auth/confirm", req.nextUrl.origin);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: recoveryUrl.toString(),
    });

    // Do not reveal whether the account exists or the email was rate-limited.
    // Free Supabase email delivery may be throttled; suggest contacting a leader.
    if (error) console.warn("[PASSWORD RECOVERY] Email request unavailable", error.code || "unknown");

    const response = NextResponse.json(
      { ok: true, message: "หากอีเมลมีอยู่ในระบบ จะมีลิงก์รีเซ็ตรหัสผ่านส่งไปให้" },
      { headers: { "Cache-Control": "no-store" } }
    );
    return applyCookies(response);
  } catch {
    return NextResponse.json(
      { error: "บริการกู้คืนรหัสผ่านไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง" },
      { status: 503 }
    );
  }
}
