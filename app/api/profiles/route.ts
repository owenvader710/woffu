import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/app/api/_authorization";

export async function GET(_req: NextRequest) {
  try {
    const access = await requireActiveUser();
    if (access.response) return access.response;
    const supabase = access.supabase;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, role, department, phone, avatar_url, is_active")
      .order("display_name", { ascending: true });

    if (error) return NextResponse.json({ error: "Unable to load profile" }, { status: 400 });

    const res = NextResponse.json({ data });
    return res;
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
