import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

async function getParamId(
  req: NextRequest,
  ctx: { params?: Promise<{ id?: string }> | { id?: string } },
  regex: RegExp
) {
  const rawParams = ctx?.params ? await ctx.params : null;
  const fromParams = rawParams?.id;
  if (fromParams) return String(fromParams);

  const m = req.nextUrl.pathname.match(regex);
  return m?.[1] ? decodeURIComponent(m[1]) : "";
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function PATCH(
  req: NextRequest,
  context: { params?: Promise<{ id?: string }> | { id?: string } }
) {
  try {
    const projectId = await getParamId(req, context, /\/api\/my-work\/([^/]+)\/?$/);

    if (!projectId) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    if (!isUuid(projectId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

    const user = authData?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const nextStatus = body?.status;

    if (!nextStatus) {
      return NextResponse.json({ error: "Missing status" }, { status: 400 });
    }

    // ✅ อ่านโปรไฟล์ของคนกด (เช็คหัวหน้า)
    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (meErr) return NextResponse.json({ error: meErr.message }, { status: 400 });

    const isLeader = me?.role === "LEADER" && me?.is_active === true;

    // ✅ ดึงสถานะปัจจุบันของโปรเจกต์ (ต้องเป็นงานที่ assign ให้ตัวเอง)
    const { data: proj, error: projErr } = await supabase
      .from("projects")
      .select("id, status, assignee_id")
      .eq("id", projectId)
      .eq("assignee_id", user.id)
      .maybeSingle();

    if (projErr) return NextResponse.json({ error: projErr.message }, { status: 400 });

    if (!proj) {
      // ไม่ใช่งานของตัวเอง หรือไม่มีสิทธิ์
      const res = NextResponse.json({ error: "Not found or not allowed" }, { status: 403 });
      return applyCookies(res);
    }

    const fromStatus = proj.status;

    // ✅ หัวหน้า: อัปเดตได้ทันที
    if (isLeader) {
      const { data: updated, error: updErr } = await supabase
        .from("projects")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", projectId)
        .select("id, status")
        .maybeSingle();

      if (updErr) {
        const res = NextResponse.json({ error: updErr.message }, { status: 400 });
        return applyCookies(res);
      }

      await supabase.from("project_logs").insert({
        project_id: projectId,
        actor_id: user.id,
        action: "STATUS_CHANGED",
        message: `Changed status: ${fromStatus} -> ${nextStatus}`,
        meta: { from_status: fromStatus, to_status: nextStatus, mode: "DIRECT" },
      });

      const res = NextResponse.json({ ok: true, mode: "DIRECT", data: updated }, { status: 200 });
      return applyCookies(res);
    }

    // ✅ ไม่ใช่หัวหน้า: ส่งคำขอ (เหมือน /api/projects/[id]/request-status)
    const { data: pending, error: pendErr } = await supabase
      .from("status_change_requests")
      .select("id")
      .eq("project_id", projectId)
      .eq("requested_by", user.id)
      .eq("request_status", "PENDING")
      .limit(1);

    if (pendErr) {
      const res = NextResponse.json({ error: pendErr.message }, { status: 400 });
      return applyCookies(res);
    }

    if (pending && pending.length > 0) {
      const res = NextResponse.json(
        { ok: true, mode: "REQUESTED", message: "ส่งคำขอแล้ว กำลังรอหัวหน้าอนุมัติ" },
        { status: 200 }
      );
      return applyCookies(res);
    }

    const { error: insErr } = await supabase.from("status_change_requests").insert({
      project_id: projectId,
      from_status: fromStatus,
      to_status: nextStatus,
      request_status: "PENDING",
      requested_by: user.id,
      created_at: new Date().toISOString(),
    });

    if (insErr) {
      const res = NextResponse.json({ error: insErr.message }, { status: 400 });
      return applyCookies(res);
    }

    await supabase.from("project_logs").insert({
      project_id: projectId,
      actor_id: user.id,
      action: "STATUS_REQUESTED",
      message: `Requested status change: ${fromStatus} -> ${nextStatus}`,
      meta: { from_status: fromStatus, to_status: nextStatus, mode: "REQUESTED" },
    });

    const res = NextResponse.json(
      { ok: true, mode: "REQUESTED", message: "ต้องให้หัวหน้าอนุมัติ (ส่งคำขอแล้ว)" },
      { status: 200 }
    );
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}