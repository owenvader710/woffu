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

  const { error } = await access.supabase.from("push_tokens")
    .delete().eq("user_id", access.user.id).eq("token", token);
  if (error) {
    console.warn("[FCM] Unregister refused", error.code);
    return NextResponse.json({ error: "ไม่สามารถยกเลิก Push ได้" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
