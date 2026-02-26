// app/api/projects/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "../_supabase";

const SELECT_FIELDS = [
  "id",
  "code", // ✅ เพิ่ม code
  "title",
  "type",
  "status",
  "created_at",
  "start_date",
  "due_date",
  "brand",
  "video_priority",
  "video_purpose",
  "graphic_job_type",
  "assignee_id",
  "description",
  "department",
  "created_by",
].join(",");

export async function GET() {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("projects")
    .select(SELECT_FIELDS)
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

  // ✅ กัน undefined/empty บาง field แล้วค่อยส่งเข้า DB
  const insertRow: Record<string, any> = {
    ...body,
    created_by: user.id,
  };

  // ล้างค่า empty string บางตัวเพื่อไม่ให้ DB งอแง
  for (const k of Object.keys(insertRow)) {
    if (insertRow[k] === "") insertRow[k] = null;
  }

  // ✅ ถ้า frontend ส่ง type มา แต่ไม่ส่ง department ให้ default = type
  if (!insertRow.department && (insertRow.type === "VIDEO" || insertRow.type === "GRAPHIC")) {
    insertRow.department = insertRow.type;
  }

  const { data, error } = await supabase.from("projects").insert(insertRow).select(SELECT_FIELDS).single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}