import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/app/api/_supabaseAdmin";
import { sendPushToUser } from "@/app/api/_push";

type DraftRpcResult = {
  ok: boolean;
  code?: string;
  id?: string;
  project_id?: string;
  project_title?: string;
  draft_number?: number;
  review_status?: string;
  reviewer_id?: string | null;
  submitted_by?: string;
  feedback?: string | null;
};

export function draftRpcError(error: { code?: string; message?: string } | null) {
  if (!error) return null;
  if (["PGRST202", "PGRST205", "42P01", "42703", "42883"].includes(error.code || "")) {
    return NextResponse.json(
      { error: "Draft Review requires the Phase 3 database migration.", code: "MIGRATION_REQUIRED" },
      { status: 503 }
    );
  }
  console.error("[DRAFT REVIEW] Database operation failed:", error.code, error.message);
  return NextResponse.json({ error: "Unable to process draft review" }, { status: 500 });
}

export function draftResultResponse(result: DraftRpcResult | null) {
  if (!result || result.ok !== true) {
    const code = result?.code || "UNKNOWN";
    const status = code === "UNAUTHORIZED" ? 401 :
      code === "FORBIDDEN" ? 403 :
      code === "NOT_FOUND" ? 404 :
      ["REVIEW_NOT_READY", "ALREADY_REVIEWED", "MAX_DRAFTS_REACHED", "PROJECT_CLOSED"].includes(code) ? 409 : 400;
    return NextResponse.json({ error: code, code }, { status });
  }
  return NextResponse.json({ data: result });
}

/** Notification is best-effort; a successful DB transaction must not be retried for push failures. */
export async function notifyDraftRecipient(
  userId: string | undefined | null,
  title: string,
  message: string,
  url: string
) {
  if (!userId) return;
  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin.from("notifications").insert({
      user_id: userId,
      type: "DRAFT_REVIEW",
      title,
      message,
      link: url,
      is_read: false,
    });
    if (error) console.error("[DRAFT REVIEW] Notification insert:", error.code);
  } catch (e) {
    console.error("[DRAFT REVIEW] Notification unavailable:", e);
  }
  try {
    await sendPushToUser({ userId, title, message, url });
  } catch (e) {
    console.error("[DRAFT REVIEW] Push unavailable:", e);
  }
}

export type { DraftRpcResult };
