// app/api/projects/route.ts
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "../_supabaseAdmin";
import { sendPushToUser } from "../_push";
import { requireActiveManager, requireActiveUser } from "../_authorization";

const SELECT_FIELDS = [
  "id",
  "code",
  "title",
  "type",
  "status",
  "created_at",
  "start_date",
  "due_date",
  "product_group",
  "brand",
  "video_priority",
  "video_purpose",
  "graphic_job_type",
  "assignee_id",
  "description",
  "department",
  "created_by",
].join(",");

type ProjectRow = {
  id: string;
  code?: string | null;
  title?: string | null;
  type?: string | null;
  status?: string | null;
  created_at?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  product_group?: string | null;
  brand?: string | null;
  video_priority?: string | null;
  video_purpose?: string | null;
  graphic_job_type?: string | null;
  assignee_id?: string | null;
  description?: string | null;
  department?: string | null;
  created_by?: string | null;
  review_summary?: { draft_number: number; review_status: string } | null;
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getInitialStatus(startDate?: string | null) {
  if (!startDate) return "TODO";

  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return "TODO";

  start.setHours(0, 0, 0, 0);
  return start.getTime() > startOfToday().getTime() ? "PRE_ORDER" : "TODO";
}

export async function GET() {
  const access = await requireActiveUser();
  if (access.response) return access.response;
  const supabase = access.supabase;

  const { data: rawData, error } = await supabase
    .from("projects")
    .select(SELECT_FIELDS)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const data: ProjectRow[] = Array.isArray(rawData)
    ? (rawData as unknown as ProjectRow[])
    : [];

  // Attach QC state without altering the project status or requiring a migration on legacy builds.
  const projectIds = data.map(item => item.id);
  const reviewsRes = projectIds.length
    ? await supabase.from("project_draft_reviews")
        .select("project_id, draft_number, review_status")
        .in("project_id", projectIds)
        .order("draft_number", { ascending: false })
    : { data: [], error: null };
  if (reviewsRes.error && !["42P01", "PGRST205", "42703"].includes(reviewsRes.error.code || "")) {
    return NextResponse.json({ error: "Unable to load draft review summaries" }, { status: 500 });
  }
  const qcMap = new Map<string, { draft_number: number; review_status: string }>();
  for (const review of reviewsRes.data ?? []) {
    if (!qcMap.has(review.project_id)) qcMap.set(review.project_id, review);
  }
  const enriched = data.map(item => ({ ...item, review_summary: qcMap.get(item.id) ?? null }));

  // GET must remain read-only. Status activation uses a separately authenticated POST.
  return NextResponse.json({ data: enriched });
}

export async function POST(req: Request) {
  const access = await requireActiveManager();
  if (access.response) return access.response;
  const supabase = access.supabase;
  const user = access.user;

  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const permitted = ["code", "title", "type", "start_date", "due_date", "product_group", "brand", "video_priority", "video_purpose", "graphic_job_type", "assignee_id", "description", "department"] as const;
  const insertRow: Record<string, unknown> = { created_by: user.id };
  const fields = body as Record<string, unknown>;
  for (const key of permitted) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) insertRow[key] = fields[key];
  }
  if (typeof insertRow.title !== "string" || !insertRow.title.trim() || !["VIDEO", "GRAPHIC"].includes(String(insertRow.type))) {
    return NextResponse.json({ error: "Invalid title/type" }, { status: 400 });
  }

  for (const k of Object.keys(insertRow)) {
    if (insertRow[k] === "") insertRow[k] = null;
  }

  if (!insertRow.department && (insertRow.type === "VIDEO" || insertRow.type === "GRAPHIC")) {
    insertRow.department = insertRow.type;
  }

  insertRow.status = getInitialStatus(typeof insertRow.start_date === "string" ? insertRow.start_date : null);

  const { data: insertedRaw, error } = await supabase
    .from("projects")
    .insert(insertRow)
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const insertedData = (insertedRaw ?? null) as unknown as ProjectRow | null;

  if (insertedData?.assignee_id) {
    const projectTitle = insertedData.title || "งานใหม่";
    const notifTitle =
      insertRow.status === "PRE_ORDER"
        ? "คุณได้รับงานล่วงหน้าใหม่"
        : "คุณได้รับงานใหม่";

    const notifMessage =
      insertRow.status === "PRE_ORDER"
        ? `${projectTitle} • งานนี้จะเริ่มตามวันที่กำหนด`
        : `${projectTitle} • กรุณาเข้าไปตรวจสอบรายละเอียด`;

    const notifLink = `/projects/${insertedData.id}`;

    try {
      const admin = createSupabaseAdmin();
      await admin.from("notifications").insert({
        user_id: insertedData.assignee_id,
        type: "JOB_ASSIGNED",
        title: notifTitle,
        message: notifMessage,
        link: notifLink,
        is_read: false,
      });
    } catch {}

    try {
      await sendPushToUser({
        userId: insertedData.assignee_id,
        title: notifTitle,
        message: notifMessage,
        url: notifLink,
      });
    } catch {}
  }

  return NextResponse.json({ data: insertedData }, { status: 201 });
}