import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/utils/supabase/server";

type Ctx = {
  params: Promise<{ id: string }>;
};

function badId(id?: string | null) {
  return !id || id === "undefined" || id === "null";
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const supabase = createSupabaseServer();

  const { id } = await ctx.params;
  if (badId(id)) return NextResponse.json({ error: "Invalid member id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const patch: any = {
    display_name: body.display_name ?? undefined,
    department: body.department ?? undefined,
    role: body.role ?? undefined,
    is_active: body.is_active ?? undefined,
    phone: body.phone ?? undefined,
    email: body.email ?? undefined,
    avatar_url: body.avatar_url ?? undefined,
    birth_date: body.birth_date ?? undefined, // ✅ เพิ่ม
  };

  // normalize empty string -> null (สำคัญสำหรับ date)
  if (patch.birth_date === "") patch.birth_date = null;

  // clean undefined
  Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select("id, display_name, department, role, is_active, avatar_url, phone, email, birth_date")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}