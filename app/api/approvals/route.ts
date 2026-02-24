import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

function isLeaderRole(role?: string | null) {
  return String(role || "").toUpperCase() === "LEADER";
}

// NOTE:
// - ตาราง `status_change_requests` ใช้คอลัมน์ `request_status` (ไม่ใช่ `status`)
// - หน้านี้ใช้สำหรับหัวหน้าเท่านั้น
// - ส่งกลับ 2 กลุ่ม: pending + history
export async function GET(req: NextRequest) {
  const { supabase } = await supabaseFromRequest(req);

  // ต้อง login
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  if (!authData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ต้องเป็นหัวหน้า
  const { data: me, error: meErr } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", authData.user.id)
    .single();

  if (meErr) return NextResponse.json({ error: meErr.message }, { status: 500 });
  if (!me || !isLeaderRole(me.role) || me.is_active === false) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const select = [
    "id",
    "project_id",
    "from_status",
    "to_status",
    "note",
    "request_status",
    "created_at",
    "requested_by",
    "approved_by",
    "approved_at",
    // project (ต้องมี department เพื่อ filter VIDEO/GRAPHIC)
    "project:projects(id,title,brand,type,department)",
    // requester (ชื่อผู้ขอ)
    "requester:profiles!status_change_requests_requested_by_fkey(id,display_name)",
    // approver (คนอนุมัติ/ปฏิเสธ)
    "approver:profiles!status_change_requests_approved_by_fkey(id,display_name)",
  ].join(",");

  const pendingQ = supabase
    .from("status_change_requests")
    .select(select)
    .eq("request_status", "PENDING")
    .order("created_at", { ascending: false });

  const historyQ = supabase
    .from("status_change_requests")
    .select(select)
    .neq("request_status", "PENDING")
    .order("created_at", { ascending: false });

  const [{ data: pending, error: pErr }, { data: history, error: hErr }] = await Promise.all([
    pendingQ,
    historyQ,
  ]);

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  if (hErr) return NextResponse.json({ error: hErr.message }, { status: 500 });

  return NextResponse.json({ data: { pending: pending ?? [], history: history ?? [] } });
}