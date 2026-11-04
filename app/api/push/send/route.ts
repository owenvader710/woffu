import { NextRequest, NextResponse } from "next/server";
import { requireActiveManager } from "@/app/api/_authorization";
import { sendPushToUser } from "@/app/api/_push";
import { normalizeInternalNotificationPath } from "@/lib/notificationUrl";

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export async function POST(req: NextRequest) {
  const access = await requireActiveManager();
  if (access.response) return access.response;

  const body = await req.json().catch(() => null);
  const userId = typeof body?.user_id === "string" ? body.user_id.trim() : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!UUID.test(userId) || !title || title.length > 120 || message.length > 500) {
    return NextResponse.json({ error: "Invalid recipient or message" }, { status: 400 });
  }

  try {
    const result = await sendPushToUser({
      userId, title, message,
      url: normalizeInternalNotificationPath(body?.url),
    });
    return NextResponse.json(result, {
      status: result.ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Push service temporarily unavailable" }, { status: 503 });
  }
}
