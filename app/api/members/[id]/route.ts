import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../_supabase";

function badId(id?: string) {
  return !id || id === "undefined" || id === "null";
}

function pickDefined<T extends Record<string, any>>(obj: T) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

// ✅ Next.js v15+: params เป็น Promise ต้อง await ก่อน
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  if (badId(id)) {
    return NextResponse.json({ error: "Invalid member id" }, { status: 400 });
  }

  // ✅ แก้ไข: เพิ่ม await และเช็ค undefined เพื่อกัน Error
  const supabase = await createSupabaseServer();
  
  if (!supabase) {
    return NextResponse.json({ error: "Supabase client not initialized" }, { status: 500 });
  }

  // ✅ บรรทัดนี้จะไม่พังแล้ว เพราะเราตรวจสอบตัวแปร supabase ก่อนเรียกใช้
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  if (!authData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ✅ เช็คสิทธิ์: ให้ LEADER เท่านั้นที่แก้สมาชิกได้
  const { data: meProfile, error: meErr } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (meErr) return NextResponse.json({ error: meErr.message }, { status: 500 });

  const isLeader =
    String(meProfile?.role || "").toUpperCase() === "LEADER" &&
    meProfile?.is_active !== false;

  if (!isLeader) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  // ✅ ทำความสะอาด payload: กันส่ง "" / undefined
  const patch = pickDefined({
    display_name: body.display_name ?? undefined,
    department: body.department ?? undefined,
    role: body.role ?? undefined,
    is_active: typeof body.is_active === "boolean" ? body.is_active : undefined,
    phone: body.phone === "" ? null : body.phone ?? undefined,
    email: body.email === "" ? null : body.email ?? undefined,
  });

  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select("id, display_name, department, role, is_active, avatar_url, phone, email")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  return NextResponse.json({ data });
}