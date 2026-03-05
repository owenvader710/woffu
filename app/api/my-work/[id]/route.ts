import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

const ALLOWED = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
type DbStatus = (typeof ALLOWED)[number];

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> } // ✅ Next 15/16 style
) {
  try {
    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    const user = authData?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const { id } = await ctx.params;

    const body = await req.json().catch(() => ({}));
    const next = String(body?.status || "").toUpperCase().trim() as DbStatus;

    if (!ALLOWED.includes(next)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${ALLOWED.join(", ")}` },
        { status: 400 }
      );
    }

    // ✅ สำคัญ: ไม่ใช้ .single() เพื่อกัน "Cannot coerce..."
    // ✅ บังคับให้โดนแถวเดียวจริง ด้วย id + assignee_id
    const { data, error } = await supabase
      .from("projects")
      .update({ status: next })
      .eq("id", id)
      .eq("assignee_id", user.id)
      .select("id, status")
      .limit(1);

    if (error) {
      const res = NextResponse.json({ error: error.message }, { status: 400 });
      return applyCookies(res);
    }

    const row = Array.isArray(data) ? data[0] : null;
    if (!row) {
      // ✅ ไม่มีแถวถูกอัปเดต = ไม่ใช่งานของ user หรือ id ไม่ถูก
      const res = NextResponse.json({ error: "Not found or not allowed" }, { status: 404 });
      return applyCookies(res);
    }

    const res = NextResponse.json({ data: row }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}