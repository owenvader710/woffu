import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function GET(req: NextRequest) {
  const { supabase, applyCookies } = supabaseFromRequest(req);

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return applyCookies(NextResponse.json({ error: authErr.message }, { status: 401 }));

  const user = authData?.user;
  if (!user) return applyCookies(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, department, role, is_active, avatar_url, phone, email, birth_date")
    .eq("id", user.id)
    .single();

  if (error) return applyCookies(NextResponse.json({ error: error.message }, { status: 500 }));

  return applyCookies(NextResponse.json({ data }));
}