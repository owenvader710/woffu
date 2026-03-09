import { NextResponse } from "next/server";
import { sendPushToUser } from "@/app/api/_push";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body?.userId) {
      return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });
    }

    const result = await sendPushToUser({
      userId: body.userId,
      title: "ทดสอบแจ้งเตือน",
      message: "ถ้าขึ้นอันนี้ แปลว่า FCM ส่งได้แล้ว",
      url: "/my-work",
    });

    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    console.error("[FCM TEST ERROR]", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Push test failed" },
      { status: 500 }
    );
  }
}