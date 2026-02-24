// app/api/approvals-count/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "../_supabase";

export async function GET(_req: NextRequest) {
  const supabase = createSupabaseServer();

  // ต้อง login
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  if (!authData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // helper: นับด้วย status (ถ้าไม่มีคอลัมน์ status จะ fallback ไปใช้ approved_at)
  async function countWhere(where: "PENDING" | "HISTORY", dept?: "VIDEO" | "GRAPHIC") {
    // 1) พยายามใช้คอลัมน์ status ก่อน
    const base1 = supabase
      .from("status_change_requests")
      .select("id", { count: "exact", head: true });

    const q1 =
      where === "PENDING"
        ? base1.eq("status", "PENDING")
        : base1.in("status", ["APPROVED", "REJECTED"]);

    const q1dept = dept ? q1.eq("department", dept) : q1;

    const r1 = await q1dept;
    if (!r1.error) return r1.count ?? 0;

    // 2) fallback: ถ้าไม่มี status -> ใช้ approved_at แทน (PENDING = approved_at is null, HISTORY = not null)
    const base2 = supabase
      .from("status_change_requests")
      .select("id", { count: "exact", head: true });

    const q2 =
      where === "PENDING" ? base2.is("approved_at", null) : base2.not("approved_at", "is", null);

    const q2dept = dept ? q2.eq("department", dept) : q2;

    const r2 = await q2dept;
    if (r2.error) throw r2.error;
    return r2.count ?? 0;
  }

  try {
    const [all, video, graphic, history] = await Promise.all([
      countWhere("PENDING"),
      countWhere("PENDING", "VIDEO"),
      countWhere("PENDING", "GRAPHIC"),
      countWhere("HISTORY"),
    ]);

    return NextResponse.json({
      data: {
        all,
        video,
        graphic,
        history,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to count" }, { status: 500 });
  }
}