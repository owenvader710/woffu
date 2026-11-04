import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/app/api/_authorization";
import { draftRpcError, draftResultResponse, notifyDraftRecipient, type DraftRpcResult } from "@/app/api/_draftReview";

type Context = { params: Promise<{ id: string }> };
const validUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, context: Context) {
  const { id } = await context.params;
  if (!validUuid.test(id)) return NextResponse.json({ error: "Invalid review id" }, { status: 400 });

  const access = await requireActiveUser();
  if (access.response) return access.response;
  if (!access.supabase) return NextResponse.json({ error: "Auth unavailable" }, { status: 500 });

  const body = await request.json().catch(() => null);
  const action = body?.action;
  const feedback = typeof body?.feedback === "string" ? body.feedback.trim() : null;
  if (!["APPROVE", "REQUEST_CHANGES"].includes(action) ||
      (action === "REQUEST_CHANGES" && !feedback) ||
      (feedback && feedback.length > 4000)) {
    return NextResponse.json({ error: "Invalid review decision or feedback" }, { status: 400 });
  }

  const { data, error } = await access.supabase.rpc("woffu_review_project_draft", {
    p_review_id: id,
    p_action: action,
    p_feedback: feedback,
  });
  const failure = draftRpcError(error);
  if (failure) return failure;

  const result = data as DraftRpcResult | null;
  if (result?.ok && result.submitted_by) {
    await notifyDraftRecipient(
      result.submitted_by,
      action === "APPROVE" ? "Draft ผ่าน QC แล้ว" : "Draft ต้องแก้ไข",
      String.raw`${result.project_title || "โปรเจกต์"} • Draft ${result.draft_number}${feedback ? " • " + feedback.slice(0, 180) : ""}`,
      "/projects/" + result.project_id + "#draft-reviews"
    );
  }
  return draftResultResponse(result);
}
