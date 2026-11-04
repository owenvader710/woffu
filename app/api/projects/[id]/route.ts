// app/api/projects/[id]/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../_supabase";
import { requireActiveManager, requireActiveUser } from "../../_authorization";

function badId(id?: string) {
  return !id || id === "undefined" || id === "null";
}

// ⬇️ เพิ่มฟังก์ชัน GET ตัวนี้เข้าไปเพื่อให้โหลดรายละเอียดงานได้ ⬇️
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (badId(id)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const access = await requireActiveUser();
  if (access.response) return access.response;
  const supabase = access.supabase;

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// ✅ ส่วน PATCH เดิมของคุณ
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (badId(id)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  
  const access = await requireActiveManager();
  if (access.response) return access.response;
  const supabase = access.supabase;
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  if (!authData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const permitted = ["code", "title", "type", "start_date", "due_date", "product_group", "brand", "video_priority", "video_purpose", "graphic_job_type", "assignee_id", "description", "department", "reviewer_id"] as const;
  const patch: Record<string, unknown> = {};
  for (const key of permitted) {
    if (Object.prototype.hasOwnProperty.call(body, key)) patch[key] = body[key] === "" ? null : body[key];
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "No editable fields" }, { status: 400 });

  if (Object.prototype.hasOwnProperty.call(patch, "reviewer_id") && patch.reviewer_id !== null) {
    if (typeof patch.reviewer_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(patch.reviewer_id)) {
      return NextResponse.json({ error: "Invalid reviewer" }, { status: 400 });
    }
    const { data: candidate, error: reviewerError } = await supabase.from("profiles")
      .select("id, is_active").eq("id", patch.reviewer_id).maybeSingle();
    if (reviewerError || !candidate?.is_active) {
      return NextResponse.json({ error: "Reviewer must be an active member" }, { status: 400 });
    }
    const { data: currentProject, error: projectError } = await supabase.from("projects")
      .select("assignee_id").eq("id", id).maybeSingle();
    if (projectError || !currentProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if ((body.assignee_id || currentProject.assignee_id) === patch.reviewer_id) {
      return NextResponse.json({ error: "Reviewer cannot be the assignee" }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// ✅ ส่วน DELETE เดิมของคุณ
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveManager();
  if (access.response) return access.response;
  const { id } = await params;
  if (badId(id)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const supabase = access.supabase;
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}