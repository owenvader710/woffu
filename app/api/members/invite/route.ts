// app/api/members/invite/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    const user = authData?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    // leader only
    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (meErr) return NextResponse.json({ error: meErr.message }, { status: 400 });
    if (!me?.is_active) return NextResponse.json({ error: "Inactive profile" }, { status: 403 });
    if (me.role !== "LEADER") return NextResponse.json({ error: "Leader only" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const department = body?.department || "VIDEO";
    const role = body?.role || "MEMBER";
    const display_name = typeof body?.display_name === "string" ? body.display_name : "";

    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

    // Admin invite
    const admin = supabaseAdmin();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login`,
      data: {
        display_name,
        department,
        role,
      },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // NOTE:
    // เรามี trigger handle_new_user() สร้าง profiles ให้เองตอน user ถูกสร้างจริง
    // ข้อมูล role/department จะต้องไป set หลัง user สร้างแล้ว (ทำหน้าแก้ไขใน UI ได้)
    const res = NextResponse.json({ ok: true, invited: data }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
