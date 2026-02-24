// app/api/projects/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "../_supabase";

export async function GET() {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("projects")
    .select(
      "id,title,type,status,created_at,start_date,due_date,brand,video_priority,video_purpose,graphic_job_type,assignee_id,description,department,created_by"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServer();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

  const user = authData?.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const insertRow = {
    ...body,
    created_by: user.id, // ✅ กัน null created_by
  };

  const { data, error } = await supabase
    .from("projects")
    .insert(insertRow)
    .select(
      "id,title,type,status,created_at,start_date,due_date,brand,video_priority,video_purpose,graphic_job_type,assignee_id,description,department,created_by"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}