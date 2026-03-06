import { NextResponse } from "next/server";
import { createSupabaseServer } from "../_supabase";

export async function GET() {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("team_notices")
    .select("*")
    .eq("is_active", true)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServer();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 401 });
  }

  const user = authData?.user;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();

  if (!title) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  const insertRow = {
    title,
    content: content || null,
    notice_type: body.notice_type ?? "GENERAL",
    attachment_url: body.attachment_url ?? null,
    attachment_name: body.attachment_name ?? null,
    is_pinned: !!body.is_pinned,
    is_active: true,
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from("team_notices")
    .insert(insertRow)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}