import { NextResponse } from "next/server";
import { requireActiveManager } from "@/app/api/_authorization";
import { sendPushToUser } from "@/app/api/_push";

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export async function POST(req: Request) {
  const access = await requireActiveManager();
  if (access.response) return access.response;

  const body = await req.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
  if (!UUID.test(userId)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  try {
    const result = await sendPushToUser({
      userId,
      title: "ทดสอบการแจ้งเตือน",
      message: "การทดสอบ Browser Push ของ WOFFU OS",
      url: "/my-work",
    });
    return NextResponse.json({ ok: result.ok, result }, {
      status: result.ok ? 200 : 503,
    });
  } catch {
    return NextResponse.json({ error: "Push service temporarily unavailable" }, { status: 503 });
  }
}
