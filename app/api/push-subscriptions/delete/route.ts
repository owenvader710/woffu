import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/app/api/_authorization";

export async function POST(req: NextRequest) {
  const access = await requireActiveUser();
  if (access.response) return access.response;
  if (!access.supabase || !access.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : "";
  if (!endpoint.startsWith("https://") || endpoint.length > 2048) {
    return NextResponse.json({ error: "Invalid push endpoint" }, { status: 400 });
  }

  const { error } = await access.supabase.from("push_subscriptions")
    .delete().eq("user_id", access.user.id).eq("endpoint", endpoint);

  if (error) {
    console.warn("[PUSH] Unsubscribe refused", error.code);
    return NextResponse.json({ error: "ไม่สามารถปิด Push ได้" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
