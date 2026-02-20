import { NextResponse } from "next/server";
import { supabaseFromRequest } from "../../../utils/supabase/api";

export async function GET(request: Request) {
  const supabase = supabaseFromRequest(request);

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { count, error } = await supabase
    .from("status_change_requests")
    .select("*", { count: "exact", head: true })
    .is("approved_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ count: count ?? 0 });
}
