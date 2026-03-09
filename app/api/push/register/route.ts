import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "../../_supabase";
import { createSupabaseAdmin } from "../../_supabaseAdmin";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const admin = createSupabaseAdmin();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 401 });
  }

  const user = authData?.user;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token.trim() : "";

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const { error } = await admin.from("push_tokens").upsert(
    {
      user_id: user.id,
      token,
      platform: "web",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "token" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}