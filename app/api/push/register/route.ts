import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/app/api/_authorization";

export async function POST(req: NextRequest) {
  const access = await requireActiveUser();
  if (access.response) return access.response;
  if (!access.supabase || !access.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!token || token.length > 4096) {
    return NextResponse.json({ error: "Invalid push token" }, { status: 400 });
  }

  // Never use Service Role for a token supplied by a caller. RLS ensures a
  // device token already owned by another user cannot be transferred.
  const { error } = await access.supabase.from("push_tokens").upsert({
    user_id: access.user.id,
    token,
    platform: "web",
    updated_at: new Date().toISOString(),
  }, { onConflict: "token" });

  if (error) {
    console.warn("[FCM] Registration refused", error.code);
    return NextResponse.json({ error: "ไม่สามารถลงทะเบียน Push ได้" },
      { status: error.code === "23505" || error.code === "42501" ? 409 : 500 });
  }
  return NextResponse.json({ ok: true });
}
