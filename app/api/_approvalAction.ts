import { NextRequest, NextResponse } from "next/server";
import { requireActiveManager } from "@/app/api/_authorization";
import { createSupabaseAdmin } from "@/app/api/_supabaseAdmin";
import { sendPushToUser } from "@/app/api/_push";

type ApprovalAction = "APPROVE" | "REJECT";
type ApprovalResult = {
  ok: boolean;
  code?: string;
  message?: string;
  request_id?: string;
  project_id?: string;
  project_title?: string | null;
  requested_by?: string;
  from_status?: string;
  to_status?: string;
  action?: ApprovalAction;
  reason?: string | null;
};

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    PRE_ORDER: "งานล่วงหน้า",
    TODO: "รอเริ่ม",
    IN_PROGRESS: "กำลังทำ",
    COMPLETED: "เสร็จแล้ว",
    BLOCKED: "ติดปัญหา",
    CANCELLED: "ยกเลิก",
  };
  return labels[status ?? ""] || status || "-";
}

function resultStatus(code?: string) {
  if (code === "UNAUTHORIZED") return 401;
  if (code === "FORBIDDEN") return 403;
  if (code === "NOT_FOUND" || code === "PROJECT_NOT_FOUND") return 404;
  if (code === "ALREADY_PROCESSED" || code === "STALE_PROJECT") return 409;
  return 400;
}

/**
 * This endpoint requires migration:
 * supabase/migrations/202611020001_atomic_status_approvals.sql
 *
 * Never fall back to the old two-query implementation if the RPC is absent.
 */
export async function handleApprovalAction(
  req: NextRequest,
  id: string,
  action: ApprovalAction
) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid approval id" }, { status: 400 });
  }

  const access = await requireActiveManager();
  if (access.response) return access.response;
  const supabase = access.supabase;
  if (!supabase) {
    return NextResponse.json({ error: "Unable to verify account" }, { status: 500 });
  }

  const body = action === "REJECT" ? await req.json().catch(() => null) : null;
  const reason = typeof body?.reason === "string" ? body.reason.trim() : null;

  if (action === "REJECT" && (!reason || reason.length > 2000)) {
    return NextResponse.json(
      { error: "กรุณาระบุเหตุผลการไม่อนุมัติ (ไม่เกิน 2,000 ตัวอักษร)" },
      { status: 400 }
    );
  }

  // PostgreSQL function locks the request and project rows inside one transaction.
  const { data, error } = await supabase.rpc("woffu_process_status_approval", {
    p_request_id: id,
    p_action: action,
    p_reason: reason,
  });

  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      return NextResponse.json(
        { error: "Approval database migration is not installed. Contact an administrator." },
        { status: 503 }
      );
    }
    console.error("[APPROVAL] RPC failed", { code: error.code, message: error.message });
    return NextResponse.json({ error: "Could not process approval" }, { status: 500 });
  }

  const result = data as ApprovalResult | null;
  if (!result || result.ok !== true) {
    return NextResponse.json(
      { error: result?.message || "Approval could not be processed", code: result?.code },
      { status: resultStatus(result?.code) }
    );
  }

  // Best-effort notification AFTER the transaction committed.
  // A push error must not turn a successful approval into an API failure.
  if (result.requested_by && result.project_id) {
    const approved = action === "APPROVE";
    const title = approved
      ? "สถานะงานของคุณถูกอนุมัติแล้ว"
      : "คำขอเปลี่ยนสถานะงานไม่ผ่านอนุมัติ";
    const text = `${result.project_title || "งานของคุณ"} • ${statusLabel(result.from_status)} → ${statusLabel(result.to_status)}${!approved && result.reason ? ` • เหตุผล: ${result.reason}` : ""}`;
    const url = `/projects/${result.project_id}`;

    try {
      const admin = createSupabaseAdmin();
      const { error: insertError } = await admin.from("notifications").insert({
        user_id: result.requested_by,
        type: approved ? "JOB_STATUS_CHANGED" : "JOB_STATUS_REJECTED",
        title,
        message: text,
        link: url,
        is_read: false,
      });
      if (insertError) console.error("[APPROVAL] Notification persistence failed", insertError.code);
    } catch (e) {
      console.error("[APPROVAL] Notification persistence unavailable", e);
    }

    try {
      await sendPushToUser({
        userId: result.requested_by,
        title,
        message: text,
        url,
      });
    } catch (e) {
      console.error("[APPROVAL] Push delivery failed", e);
    }
  }

  return NextResponse.json({ ok: true, request_id: result.request_id, action });
}
