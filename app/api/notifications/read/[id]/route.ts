import { NextResponse } from "next/server";
import { requireActiveUser } from "@/app/api/_authorization";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
  }
  const access = await requireActiveUser();
  if (access.response) return access.response;
  if (!access.supabase || !access.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await access.supabase.from("notifications")
    .update({ is_read: true }).eq("id", id).eq("user_id", access.user.id);
  if (error) {
    console.error("[NOTIFICATIONS] Mark read failed", error.code);
    return NextResponse.json({ error: "อัปเดตการแจ้งเตือนไม่สำเร็จ" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
