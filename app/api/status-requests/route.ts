import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/app/api/_supabase";

export async function POST(req: NextRequest) {
  const { supabase } = await supabaseFromRequest(req);

  // ต้อง login
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  const user = authData?.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { project_id, from_status, to_status, note } = body;

  if (!project_id || !from_status || !to_status) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("status_change_requests")
    .insert({
      project_id,
      from_status,
      to_status,
      note: note ?? null,
      requested_by: user.id,
      request_status: "PENDING", // ✅ สำคัญ
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}