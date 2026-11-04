import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/app/api/_authorization";
import { draftRpcError, draftResultResponse, notifySubmittedDraft, type DraftRpcResult } from "@/app/api/_draftReview";

type Context = { params: Promise<{ id: string }> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  if (!uuid.test(id)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  const access = await requireActiveUser();
  if (access.response) return access.response;
  if (!access.supabase) return NextResponse.json({ error: "Auth unavailable" }, { status: 500 });

  const { data, error } = await access.supabase
    .from("project_draft_reviews")
    .select("id, project_id, draft_number, review_status, submission_url, submission_note, submitted_by, created_at, reviewed_by, reviewed_at, feedback")
    .eq("project_id", id)
    .order("draft_number", { ascending: false });

  const failure = draftRpcError(error);
  if (failure) return failure;
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest, context: Context) {
  const { id } = await context.params;
  if (!uuid.test(id)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  const access = await requireActiveUser();
  if (access.response) return access.response;
  if (!access.supabase) return NextResponse.json({ error: "Auth unavailable" }, { status: 500 });

  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const note = typeof body?.note === "string" ? body.note.trim() : null;
  if (!/^https:\/\/\S+$/i.test(url) || url.length > 2048 || (note && note.length > 4000)) {
    return NextResponse.json({ error: "Valid HTTPS link and note (max 4,000 characters) required" }, { status: 400 });
  }

  const { data, error } = await access.supabase.rpc("woffu_submit_project_draft", {
    p_project_id: id,
    p_submission_url: url,
    p_submission_note: note,
  });
  const failure = draftRpcError(error);
  if (failure) return failure;

  const result = data as DraftRpcResult | null;
  if (result?.ok) {
    await notifySubmittedDraft(result, access.user?.id);
  }
  return draftResultResponse(result);
}
