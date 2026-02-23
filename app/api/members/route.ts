import { NextResponse } from "next/server";
import { createSupabaseServer } from "../_supabase";

export async function GET() {
  const supabase = createSupabaseServer();

  const { data, error } = await supabase
    .from("members")
    .select("id, display_name, department, role, is_active, avatar_url, email")
    .order("display_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}