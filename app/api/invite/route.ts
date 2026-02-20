// app/api/invite/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function POST(req: NextRequest) {
  try {
    // 1) เช็คว่าเป็น leader และล็อกอินอยู่
    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    const user = authData?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (meErr) return NextResponse.json({ error: meErr.message }, { status: 400 });
    if (!me?.is_active || me.role !== "LEADER") {
      return NextResponse.json({ error: "Leader only" }, { status: 403 });
    }

    // 2) อ่าน body
    const body = await req.json();
    const email: string = (body?.email || "").trim();
    const display_name: string = (body?.display_name || "").trim();
    const department: "VIDEO" | "GRAPHIC" | "ALL" = body?.department || "ALL";
    const role: "LEADER" | "MEMBER" = body?.role || "MEMBER";

    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

    // 3) ใช้ Service role ส่ง invite
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceRole) {
      return NextResponse.json(
        { error: "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL" },
        { status: 500 }
      );
    }

    const admin = createClient(url, serviceRole, {
      auth: { persistSession: false },
    });

    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email);
    if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 400 });

    const invitedUserId = invited?.user?.id;
    if (!invitedUserId) return NextResponse.json({ error: "Invite failed" }, { status: 400 });

    // 4) สร้าง/อัปเดต profiles ให้ user ที่ถูกเชิญ
    const { error: upErr } = await admin
      .from("profiles")
      .upsert(
        {
          id: invitedUserId,
          display_name: display_name || null,
          department,
          role,
          is_active: true,
        },
        { onConflict: "id" }
      );

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

    const res = NextResponse.json({ ok: true, user_id: invitedUserId }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
