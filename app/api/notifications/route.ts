import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "../_supabase";
import { createSupabaseAdmin } from "../_supabaseAdmin";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const admin = createSupabaseAdmin();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

  const user = authData?.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = req.nextUrl.searchParams.get("since");
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 20), 50);

  let query = admin
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (since) {
    query = query.gt("created_at", since);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const unreadCountRes = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return NextResponse.json({
    data: data ?? [],
    unread: unreadCountRes.count ?? 0,
  });
}