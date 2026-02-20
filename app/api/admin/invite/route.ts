import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json().catch(() => ({}));
    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

    // 1) auth ฝั่ง user ปัจจุบัน (เพื่อเช็คว่าเป็น LEADER)
    const { supabase } = supabaseFromRequest(req);
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
    if (!me?.is_active || me.role !== "LEADER")
      return NextResponse.json({ error: "Leader only" }, { status: 403 });

    // 2) ใช้ Service Role (admin) เพื่อ invite
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
