import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/app/api/_authorization";

export async function GET(_req: NextRequest) {
  const access = await requireActiveUser();
  if (access.response) return access.response;
  const supabase = access.supabase;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, department, role, is_active, avatar_url, phone, email, birth_date")
    .order("display_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Unable to load team members" }, { status: 500 });
  }

  return NextResponse.json({ data });
}