// app/api/projects/[id]/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../_supabase";
import { requireActiveManager } from "../../_authorization";

function badId(id?: string) {
  return !id || id === "undefined" || id === "null";
}

// ⬇️ เพิ่มฟังก์ชัน GET ตัวนี้เข้าไปเพื่อให้โหลดรายละเอียดงานได้ ⬇️
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (badId(id)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const supabase = await createSupabaseServer();

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

  const permitted = ["code", "title", "type", "start_date", "due_date", "product_group", "brand", "video_priority", "video_purpose", "graphic_job_type", "assignee_id", "description", "department"] as const;
  const patch: Record<string, unknown> = {};
  for (const key of permitted) {
    if (Object.prototype.hasOwnProperty.call(body, key)) patch[key] = body[key] === "" ? null : body[key];
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "No editable fields" }, { status: 400 });

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