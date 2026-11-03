import { NextResponse } from "next/server";

/** Legacy FCM endpoint replaced by POST /api/push-subscriptions/delete. */
export async function POST() {
  return NextResponse.json({
    code: "FCM_RETIRED",
    error: "กรุณาปิด Push จากเมนูแจ้งเตือน",
  }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
