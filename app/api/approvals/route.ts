import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";
import { supabaseAdmin } from "@/utils/supabase/admin";

function isLeaderRole(role?: string | null) {
  return String(role || "").toUpperCase() === "LEADER";
}

export async function GET(req: NextRequest) {
  const { supabase, applyCookies } = await supabaseFromRequest(req);
  const admin = supabaseAdmin();

  // ต้อง login
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  if (!authData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ต้องเป็นหัวหน้า (เช็คจาก client session เหมือนเดิม)
  const { data: me, error: meErr } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", authData.user.id)
    .single();

  if (meErr) return NextResponse.json({ error: meErr.message }, { status: 500 });
  if (!me || !isLeaderRole(me.role) || me.is_active === false) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ✅ ใช้ admin อ่าน status_change_requests (ข้าม RLS)
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
    "project:projects(id,title,brand,type,department)",
    "requester:profiles!status_change_requests_requested_by_fkey(id,display_name)",
    "approver:profiles!status_change_requests_approved_by_fkey(id,display_name)",
  ].join(",");

  const pendingQ = admin
    .from("status_change_requests")
    .select(select)
    .eq("request_status", "PENDING")
    .order("created_at", { ascending: false });

  const historyQ = admin
    .from("status_change_requests")
    .select(select)
    .neq("request_status", "PENDING")
    .order("created_at", { ascending: false });

  const [{ data: pending, error: pErr }, { data: history, error: hErr }] = await Promise.all([
    pendingQ,
    historyQ,
  ]);

  if (pErr) {
    const res = NextResponse.json({ error: pErr.message }, { status: 500 });
    return applyCookies(res);
  }
  if (hErr) {
    const res = NextResponse.json({ error: hErr.message }, { status: 500 });
    return applyCookies(res);
  }

  const res = NextResponse.json({ data: { pending: pending ?? [], history: history ?? [] } });
  return applyCookies(res);
}