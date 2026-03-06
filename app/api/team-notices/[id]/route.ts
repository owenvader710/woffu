import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "../../_supabase";
import { createSupabaseAdmin } from "../../_supabaseAdmin";

export async function DELETE(
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

  const { data: me, error: meErr } = await admin
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (meErr) return NextResponse.json({ error: meErr.message }, { status: 500 });
  if (!me || me.is_active === false) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: row, error: rowErr } = await admin
    .from("team_notices")
    .select("id, created_by")
    .eq("id", id)
    .single();

  if (rowErr) return NextResponse.json({ error: rowErr.message }, { status: 404 });

  const isLeader = me.role === "LEADER" || me.role === "ADMIN";
  const isOwner = row.created_by === user.id;

  if (!isLeader && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await admin
    .from("team_notices")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}