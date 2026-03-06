import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "../../../_supabase";
import { createSupabaseAdmin } from "../../../_supabaseAdmin";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const supabase = await createSupabaseServer();
  const admin = createSupabaseAdmin();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

  const user = authData?.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await admin
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}