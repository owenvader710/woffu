// app/api/projects/[id]/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../_supabase";

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
  
  const supabase = await createSupabaseServer();
  // ... โค้ดที่เหลือตามที่คุณส่งมา ...
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  if (!authData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { id: _, ...updateData } = body;
  const patch = {
    ...updateData,
    assignee_id: body.assignee_id === "undefined" || body.assignee_id === undefined ? null : body.assignee_id,
  };

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
  const { id } = await params;
  if (badId(id)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}