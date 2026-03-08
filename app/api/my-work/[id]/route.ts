import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

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

type DbStatus = "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export async function PATCH(
  req: NextRequest,
  context: { params?: Promise<{ id?: string }> | { id?: string } }
) {
  try {
    const projectId = await getParamId(req, context, /\/api\/my-work\/([^/]+)\/?$/);

    if (!projectId) return NextResponse.json({ error: "Missing project id" }, { status: 400 });
    if (!isUuid(projectId)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });

    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    const user = authData?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const to_status = body?.status as DbStatus | undefined;

    if (!to_status) return NextResponse.json({ error: "Missing status" }, { status: 400 });

    // จำกัดสถานะที่อนุญาตใน my-work เท่านั้น (ไม่ไปยุ่งระบบอื่น)
    const allowed: DbStatus[] = ["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
    if (!allowed.includes(to_status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // ต้องเป็นงานที่ assign ให้ตัวเองเท่านั้น
    const { data: proj, error: projErr } = await supabase
      .from("projects")
      .select("id, status, assignee_id")
      .eq("id", projectId)
      .maybeSingle();

    if (projErr) {
      const res = NextResponse.json({ error: projErr.message }, { status: 400 });
      return applyCookies(res);
    }
    if (!proj || proj.assignee_id !== user.id) {
      const res = NextResponse.json({ error: "Not found or not allowed" }, { status: 403 });
      return applyCookies(res);
    }

    const from_status = (proj.status as DbStatus) ?? "TODO";

    // ตรวจ role ผู้ใช้
    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (meErr) {
      const res = NextResponse.json({ error: meErr.message }, { status: 400 });
      return applyCookies(res);
    }

    const isLeader = String(me?.role || "").toUpperCase() === "LEADER";

    // ✅ ถ้าหัวหน้า → อัปเดตได้เลย
    if (isLeader) {
      const { data: updated, error: upErr } = await supabase
        .from("projects")
        .update({ status: to_status })
        .eq("id", projectId)
        .select("id, status")
        .maybeSingle();

      if (upErr) {
        const res = NextResponse.json({ error: upErr.message }, { status: 400 });
        return applyCookies(res);
      }
      if (!updated) {
        const res = NextResponse.json({ error: "Not found or not allowed" }, { status: 403 });
        return applyCookies(res);
      }

      const res = NextResponse.json({ ok: true, mode: "UPDATED", data: updated }, { status: 200 });
      return applyCookies(res);
    }

    // ✅ ถ้าไม่ใช่หัวหน้า → สร้างคำขอ รออนุมัติ (ใช้ระบบเดิม status_change_requests)
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
        { ok: true, mode: "REQUESTED", message: "Already pending (wait for manager approval first)" },
        { status: 200 }
      );
      return applyCookies(res);
    }

    const { error: insErr } = await supabase.from("status_change_requests").insert({
      project_id: projectId,
      from_status,
      to_status,
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
      message: `Requested status change: ${from_status} -> ${to_status}`,
      meta: { from_status, to_status, mode: "REQUESTED", source: "MY_WORK" },
    });

    const res = NextResponse.json({ ok: true, mode: "REQUESTED" }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed. Use PATCH." }, { status: 405 });
}