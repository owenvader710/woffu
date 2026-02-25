import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/app/api/_supabase";

export async function GET(_req: NextRequest) {
  const supabase = await createSupabaseServer();

  // ต้อง login
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  if (!authData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ดึงคำขอทั้งหมด (select * เพื่อกัน schema เปลี่ยน เช่น status column ไม่ชื่อ status)
  const { data: rows, error } = await supabase
    .from("status_change_requests")
    .select("*");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // หา field สถานะที่มีอยู่จริง (รองรับหลายชื่อ)
  const pickStatus = (r: any) =>
    String(r?.status ?? r?.request_status ?? r?.approval_status ?? "").toUpperCase();

  const all = Array.isArray(rows) ? rows : [];
  const pending = all.filter((r) => pickStatus(r) === "PENDING");
  const approved = all.filter((r) => pickStatus(r) === "APPROVED");
  const rejected = all.filter((r) => pickStatus(r) === "REJECTED");

  return NextResponse.json({
    counts: {
      all: all.length,
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      history: approved.length + rejected.length,
    },
  });
}