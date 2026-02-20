import { NextResponse } from "next/server";
import { supabaseFromRequest } from "../../../utils/supabase/api";

export async function POST(request: Request) {
  const supabase = supabaseFromRequest(request);

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { project_id, to_status, note } = body as {
    project_id: string;
    to_status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
    note?: string;
  };

  if (!project_id || !to_status) {
    return NextResponse.json({ error: "project_id and to_status are required" }, { status: 400 });
  }

  // ดึงสถานะปัจจุบัน
  const { data: project, error: pErr } = await supabase
    .from("projects")
    .select("id,status")
    .eq("id", project_id)
    .single();

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

  // สร้างคำขอ
  const { data, error } = await supabase
    .from("status_change_requests")
    .insert({
      project_id,
      requested_by: user.id,
      from_status: project.status,
      to_status,
      note: note ?? null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ request: data });
}
