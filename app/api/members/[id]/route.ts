import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { supabase, applyCookies } = supabaseFromRequest(req);

  const id = params?.id;
  if (!id) return applyCookies(NextResponse.json({ error: "Missing id" }, { status: 400 }));

  // auth
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return applyCookies(NextResponse.json({ error: authErr.message }, { status: 401 }));

  const user = authData?.user;
  if (!user) return applyCookies(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

  const body = await req.json().catch(() => null);
  if (!body) return applyCookies(NextResponse.json({ error: "Invalid JSON" }, { status: 400 }));

  // only allow patch fields we expect
  const patch: any = {
    display_name: body.display_name ?? undefined,
    department: body.department ?? undefined,
    role: body.role ?? undefined,
    is_active: body.is_active ?? undefined,
    phone: body.phone ?? undefined,
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

  if (error) {
    return applyCookies(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  return applyCookies(NextResponse.json({ data }));
}