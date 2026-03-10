import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";
import { createSupabaseAdmin } from "@/app/api/_supabaseAdmin";
import { sendPushToUser } from "@/app/api/_push";

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

function statusLabel(status: string) {
  switch (status) {
    case "PRE_ORDER":
      return "งานล่วงหน้า";
    case "TODO":
      return "รอเริ่ม";
    case "IN_PROGRESS":
      return "กำลังทำ";
    case "COMPLETED":
      return "เสร็จแล้ว";
    case "BLOCKED":
      return "ติดปัญหา";
    default:
      return status;
  }
}

export async function POST(
  req: NextRequest,
  context: { params?: Promise<{ id?: string }> | { id?: string } }
) {
  try {
    const projectId = await getParamId(
      req,
      context,
      /\/api\/projects\/([^/]+)\/request-status\/?$/
    );

    if (!projectId) {
      return NextResponse.json({ error: "Missing project id (params.id)" }, { status: 400 });
    }

    if (!isUuid(projectId)) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    }

    const { supabase, applyCookies } = await supabaseFromRequest(req);
    const admin = createSupabaseAdmin();

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

    const user = authData?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const from_status = body?.from_status;
    const to_status = body?.to_status;
    const blocked_reason =
      typeof body?.blocked_reason === "string" ? body.blocked_reason.trim() : "";

    if (!from_status || !to_status) {
      return NextResponse.json({ error: "Missing from_status/to_status" }, { status: 400 });
    }

    if (to_status === "BLOCKED" && !blocked_reason) {
      return NextResponse.json({ error: "Missing blocked_reason" }, { status: 400 });
    }

    const { data: pending, error: pendErr } = await supabase
      .from("status_change_requests")
      .select("id")
      .eq("project_id", projectId)
      .eq("requested_by", user.id)
      .eq("request_status", "PENDING")
      .limit(1);

    if (pendErr) {
      return NextResponse.json({ error: pendErr.message }, { status: 400 });
    }

    if (pending && pending.length > 0) {
      const res = NextResponse.json(
        { ok: true, message: "Already pending (wait for manager approval first)" },
        { status: 200 }
      );
      return applyCookies(res);
    }

    const { data: projectRow, error: projectErr } = await supabase
      .from("projects")
      .select("id, title, department")
      .eq("id", projectId)
      .single();

    if (projectErr) {
      return NextResponse.json({ error: projectErr.message }, { status: 400 });
    }

    const insertPayload: Record<string, any> = {
      project_id: projectId,
      from_status,
      to_status,
      request_status: "PENDING",
      requested_by: user.id,
      created_at: new Date().toISOString(),
    };

    const { data: insertedReq, error: insErr } = await supabase
      .from("status_change_requests")
      .insert(insertPayload)
      .select("id, project_id, from_status, to_status, request_status, created_at")
      .single();

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 400 });
    }

    const message =
      to_status === "BLOCKED"
        ? `Requested status change: ${from_status} -> ${to_status} | blocked_reason: ${blocked_reason}`
        : `Requested status change: ${from_status} -> ${to_status}`;

    const logPayload: Record<string, any> = {
      project_id: projectId,
      actor_id: user.id,
      action: "STATUS_REQUESTED",
      message,
      meta: {
        from_status,
        to_status,
        mode: "REQUESTED",
        request_id: insertedReq.id,
        ...(blocked_reason ? { blocked_reason } : {}),
      },
    };

    const { error: logErr } = await supabase.from("project_logs").insert(logPayload);

    if (logErr) {
      return NextResponse.json({ error: `Log insert failed: ${logErr.message}` }, { status: 400 });
    }

    // ===== แจ้งเตือนหัวหน้า =====
    try {
      const { data: leaders, error: leaderErr } = await admin
        .from("profiles")
        .select("id, role, is_active")
        .in("role", ["LEADER", "ADMIN"])
        .eq("is_active", true);

      if (!leaderErr && leaders && leaders.length > 0) {
        const targetLeaderIds = leaders
          .map((x: any) => x.id)
          .filter((id: string) => !!id && id !== user.id);

        if (targetLeaderIds.length > 0) {
          const projectTitle = projectRow?.title || "โปรเจกต์ไม่มีชื่อ";
          const readableFrom = statusLabel(from_status);
          const readableTo = statusLabel(to_status);

          const notifTitle = "มีคำขอเปลี่ยนสถานะใหม่";
          const notifMessage =
            to_status === "BLOCKED" && blocked_reason
              ? `${projectTitle} • ${readableFrom} → ${readableTo} • เหตุผล: ${blocked_reason}`
              : `${projectTitle} • ${readableFrom} → ${readableTo}`;

          const notifLink = "/approvals";

          try {
            await admin.from("notifications").insert(
              targetLeaderIds.map((leaderId: string) => ({
                user_id: leaderId,
                type: "STATUS_CHANGE_REQUESTED",
                title: notifTitle,
                message: notifMessage,
                link: notifLink,
                is_read: false,
              }))
            );
          } catch {}

          await Promise.allSettled(
            targetLeaderIds.map((leaderId: string) =>
              sendPushToUser({
                userId: leaderId,
                title: notifTitle,
                message: notifMessage,
                url: notifLink,
              })
            )
          );
        }
      }
    } catch {
      // ไม่ให้ notification ทำให้ request-status ล้ม
    }

    const res = NextResponse.json(
      {
        ok: true,
        mode: "REQUESTED",
        request: {
          id: insertedReq.id,
          from_status: insertedReq.from_status,
          to_status: insertedReq.to_status,
          status: insertedReq.request_status,
          created_at: insertedReq.created_at,
        },
      },
      { status: 200 }
    );

    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed. Use POST." }, { status: 405 });
}