import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

function extractRequestId(req: NextRequest, context?: { params?: { id?: string } }) {
  // 1) ปกติ: ได้จาก params
  const fromParams = context?.params?.id;
  if (fromParams) return fromParams;

  // 2) fallback: parse จาก pathname
  // /api/approvals/<id>/reject
  const path = req.nextUrl.pathname;
  const m = path.match(/\/api\/approvals\/([^/]+)\/reject\/?$/);
  return m?.[1];
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function POST(req: NextRequest, context: { params?: { id?: string } }) {
  try {
    const id = extractRequestId(req, context);
    if (!id) return NextResponse.json({ error: "Missing request id (params.id)" }, { status: 400 });
    if (!isUuid(id)) return NextResponse.json({ error: `Invalid request id: ${id}` }, { status: 400 });

    const { supabase, applyCookies } = supabaseFromRequest(req);

    // auth
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
    if (!me?.is_active || me.role !== "LEADER") {
      return NextResponse.json({ error: "Leader only" }, { status: 403 });
    }

    // โหลด request
    const { data: reqRow, error: reqErr } = await supabase
      .from("status_change_requests")
      .select("id, project_id, request_status")
      .eq("id", id)
      .single();

    if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 400 });
    if (!reqRow) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    if (reqRow.request_status !== "PENDING") {
      const res = NextResponse.json({ ok: true, message: "Already processed" }, { status: 200 });
      return applyCookies(res);
    }

    // mark REJECTED
    const { error: upErr } = await supabase
      .from("status_change_requests")
      .update({
        request_status: "REJECTED",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });
await supabase.from("project_logs").insert({
  project_id: reqRow.project_id, // ถ้าตอนนี้ select มาแค่ id,request_status ให้เพิ่ม project_id มาด้วย
  actor_id: user.id,
  action: "STATUS_REJECTED",
  message: "ปฏิเสธคำขอเปลี่ยนสถานะ",
  meta: { request_id: id },
});
// ...ของเดิมทั้งหมด
const { error: logErr } = await supabase.from("project_logs").insert({
  project_id: reqRow.project_id,
  actor_id: user.id,
  action: "STATUS_APPROVED",
  message: `อนุมัติคำขอเปลี่ยนสถานะ → ${reqRow.to_status}`,
  meta: { request_id: id, to_status: reqRow.to_status },
});
if (logErr) return NextResponse.json({ error: `Log insert failed: ${logErr.message}` }, { status: 400 });
// ...

    const res = NextResponse.json({ ok: true }, { status: 200 });
    
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
    
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed. Use POST." }, { status: 405 });
}
