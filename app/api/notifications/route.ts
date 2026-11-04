import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/app/api/_authorization";

export async function GET(req: NextRequest) {
  const access = await requireActiveUser();
  if (access.response) return access.response;
  if (!access.supabase || !access.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawLimit = req.nextUrl.searchParams.get("limit") || "20";
  const parsedLimit = Number(rawLimit);
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
    return NextResponse.json({ error: "limit must be 1–50" }, { status: 400 });
  }

  const since = req.nextUrl.searchParams.get("since");
  if (since && (since.length > 50 || !Number.isFinite(Date.parse(since)))) {
    return NextResponse.json({ error: "Invalid since timestamp" }, { status: 400 });
  }

  // Use the caller's RLS-scoped client, never the service-role client.
  // Disabled accounts are already denied by requireActiveUser.
  let query = access.supabase.from("notifications")
    .select("id, user_id, type, title, message, link, is_read, created_at")
    .eq("user_id", access.user.id)
    .order("created_at", { ascending: false })
    .limit(parsedLimit);

  if (since) query = query.gt("created_at", new Date(since).toISOString());

  const [items, unread] = await Promise.all([
    query,
    access.supabase.from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", access.user.id).eq("is_read", false),
  ]);
  if (items.error || unread.error) {
    console.error("[NOTIFICATIONS] Read failure", items.error?.code || unread.error?.code);
    return NextResponse.json({ error: "โหลดการแจ้งเตือนไม่สำเร็จ" }, { status: 500 });
  }

  return NextResponse.json({
    data: items.data ?? [],
    unread: unread.count ?? 0,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
