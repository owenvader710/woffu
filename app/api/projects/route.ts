import { NextResponse } from "next/server";
import { createSupabaseServer } from "../_supabase";

const SELECT_FIELDS =
  "id,title,type,status,created_at,start_date,due_date,brand,video_priority,video_purpose,graphic_job_type,assignee_id,description,department,created_by";

export async function GET() {
  const supabase = createSupabaseServer();

  const { data, error } = await supabase
    .from("projects")
    .select(SELECT_FIELDS)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const supabase = createSupabaseServer();

  // ✅ ต้องได้ user เพื่อใส่ created_by (แก้ not-null)
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

  const user = authData?.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  // กันค่าที่ชอบหลุดมาเป็น "undefined"
  const cleanAssignee =
    body.assignee_id === "undefined" || body.assignee_id === undefined ? null : body.assignee_id;

  const insertRow = {
    ...body,
    assignee_id: cleanAssignee,
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from("projects")
    .insert(insertRow)
    .select(SELECT_FIELDS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}