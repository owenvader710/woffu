import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

// ดึงสมาชิกจาก profiles โดยตรง (กัน members เป็น VIEW แล้วคอลัมน์ไม่ตรง)
export async function GET(req: NextRequest) {
  const { supabase, applyCookies } = supabaseFromRequest(req);

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, department, role, is_active, avatar_url, phone, email, birth_date")
    .order("display_name", { ascending: true });

  if (error) {
    return applyCookies(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  return applyCookies(NextResponse.json({ data }));
}