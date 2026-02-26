import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export async function GET(_req: NextRequest) {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, department, role, is_active, avatar_url, phone, email, birth_date")
    .order("display_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}