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

  const body = await req.json();

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const insertRow = {
    title: body.title,
    content: body.content,
    notice_type: body.notice_type ?? "GENERAL",
    attachment_url: body.attachment_url ?? null,
    attachment_name: body.attachment_name ?? null,
    is_pinned: body.is_pinned ?? false,
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

  return NextResponse.json({ data });
}