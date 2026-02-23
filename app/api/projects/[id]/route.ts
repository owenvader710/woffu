import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../_supabase";

const SELECT_FIELDS =
  "id,title,type,status,created_at,start_date,due_date,brand,video_priority,video_purpose,graphic_job_type,assignee_id,description,department,created_by";

function badId(id?: string) {
  return !id || id === "undefined" || id === "null";
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (badId(id)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const supabase = createSupabaseServer();

  // ✅ ต้อง auth ก่อน (ให้ RLS ใช้ user)
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  if (!authData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  // กัน assignee_id หลุดเป็น "undefined"
  const patch = {
    ...body,
    assignee_id:
      body.assignee_id === "undefined" || body.assignee_id === undefined ? null : body.assignee_id,
  };

  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", id)
    .select(SELECT_FIELDS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (badId(id)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const supabase = createSupabaseServer();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  if (!authData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}