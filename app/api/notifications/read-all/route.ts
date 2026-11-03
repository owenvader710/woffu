import { NextResponse } from "next/server";
import { requireActiveUser } from "@/app/api/_authorization";

export async function POST() {
  const access = await requireActiveUser();
  if (access.response) return access.response;
  if (!access.supabase || !access.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { error } = await access.supabase.from("notifications")
    .update({ is_read: true })
    .eq("user_id", access.user.id).eq("is_read", false);
  if (error) {
    console.error("[NOTIFICATIONS] Mark all read failed", error.code);
    return NextResponse.json({ error: "อัปเดตการแจ้งเตือนไม่สำเร็จ" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
