// app/api/members/[id]/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "../../_supabase";

function badId(id?: string) {
  return !id || id === "undefined" || id === "null";
}

async function getParamId(params: any) {
  // Next.js v16: params อาจเป็น Promise
  const p = typeof params?.then === "function" ? await params : params;
  return p?.id as string | undefined;
}

export async function PATCH(req: Request, ctx: { params: any }) {
  const id = await getParamId(ctx.params);
  if (badId(id)) {
    return NextResponse.json({ error: "Invalid member id" }, { status: 400 });
  }

  const supabase = await createSupabaseServer();

  // ต้อง login ก่อน
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  if (!authData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // เช็คว่า "คนที่กำลังแก้" เป็นหัวหน้า (LEADER) เท่านั้น
  const { data: meProfile, error: meErr } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", authData.user.id)
    .single();

  if (meErr) return NextResponse.json({ error: meErr.message }, { status: 500 });

  const isLeader =
    String(meProfile?.role || "").toUpperCase() === "LEADER" && meProfile?.is_active !== false;

  if (!isLeader) {
    return NextResponse.json({ error: "Forbidden (leader only)" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  // whitelist ฟิลด์ที่อนุญาตให้หัวหน้าแก้
  const patch: any = {};

  if ("display_name" in body) patch.display_name = body.display_name ?? null;
  if ("phone" in body) patch.phone = body.phone ? String(body.phone).trim() : null;
  if ("email" in body) patch.email = body.email ? String(body.email).trim() : null;

  if ("department" in body) patch.department = body.department ?? null;
  if ("role" in body) patch.role = body.role ?? null;
  if ("is_active" in body) patch.is_active = body.is_active ?? null;

  // กันส่งค่าว่างแบบแปลกๆ
  for (const k of Object.keys(patch)) {
    if (patch[k] === "undefined") patch[k] = null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select("id, display_name, department, role, is_active, avatar_url, phone, email")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}