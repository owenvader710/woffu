import { NextResponse } from "next/server";

/**
 * Legacy FCM registration is intentionally retired in V2. To enable Push,
 * use the explicit browser opt-in button in NotificationCenter, which stores
 * the VAPID subscription through POST /api/push-subscriptions.
 */
export async function POST() {
  return NextResponse.json({
    code: "FCM_RETIRED",
    error: "กรุณาเปิดการแจ้งเตือน Push จากเมนูแจ้งเตือน",
  }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
