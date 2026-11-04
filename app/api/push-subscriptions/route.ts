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
  const p256dh = typeof body?.keys?.p256dh === "string" ? body.keys.p256dh.trim() : "";
  const auth = typeof body?.keys?.auth === "string" ? body.keys.auth.trim() : "";

  if (!endpoint.startsWith("https://") || endpoint.length > 2048 ||
      !p256dh || p256dh.length > 255 || !auth || auth.length > 255) {
    return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
  }

  // Use the caller's RLS policy. A service-role upsert here would allow
  // a member to take over a subscription endpoint owned by another user.
  const { error } = await access.supabase.from("push_subscriptions").upsert({
    user_id: access.user.id,
    endpoint, p256dh, auth,
  }, { onConflict: "endpoint" });

  if (error) {
    console.warn("[PUSH] Subscription refused", error.code);
    return NextResponse.json({ error: "ไม่สามารถเปิดการแจ้งเตือน Push ได้" },
      { status: error.code === "42501" || error.code === "23505" ? 409 : 500 });
  }
  return NextResponse.json({ ok: true });
}
