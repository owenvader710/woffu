import { NextResponse } from "next/server";

/**
 * Retired duplicate workflow. V2 My Work and StatusButtons already POST
 * /api/projects/[id]/request-status, where assignee, active profile,
 * current status, blocked reason, duplicate checks and leader notification
 * are enforced consistently. Do not reintroduce direct status UPDATE here.
 */
export async function PATCH() {
  return NextResponse.json({
    code: "LEGACY_STATUS_ENDPOINT_RETIRED",
    error: "กรุณาใช้การขอเปลี่ยนสถานะผ่านหน้า My Work เวอร์ชันใหม่",
  }, { status: 410, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
