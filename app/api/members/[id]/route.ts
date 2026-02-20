// app/api/members/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const id = ctx?.params?.id;
    if (!id) return NextResponse.json({ error: "Missing member id" }, { status: 400 });

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

    const patch: any = { updated_at: new Date().toISOString() };
    if (typeof body?.display_name === "string") patch.display_name = body.display_name;
    if (typeof body?.department === "string") patch.department = body.department;
    if (typeof body?.role === "string") patch.role = body.role;
    if (typeof body?.phone === "string") patch.phone = body.phone;
    if (typeof body?.avatar_url === "string") patch.avatar_url = body.avatar_url;
    if (typeof body?.is_active === "boolean") patch.is_active = body.is_active;

    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", id)
      .select("id, display_name, role, department, phone, avatar_url, is_active")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const res = NextResponse.json({ ok: true, profile: data }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const id = ctx?.params?.id;
    if (!id) return NextResponse.json({ error: "Missing member id" }, { status: 400 });

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

    // 1) deactivate profile first (soft delete)
    const { error: pErr } = await supabase
      .from("profiles")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

    // 2) optional: delete auth user (requires service role)
    const admin = supabaseAdmin();
    const { error: delErr } = await admin.auth.admin.deleteUser(id);
    // ถ้าลบไม่ได้ก็ไม่ถือว่าพัง เพราะอย่างน้อย profile ถูกปิดแล้ว
    if (delErr) {
      const res = NextResponse.json({ ok: true, warning: delErr.message }, { status: 200 });
      return applyCookies(res);
    }

    const res = NextResponse.json({ ok: true }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
