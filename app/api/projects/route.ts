// app/api/projects/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "../_supabase";
import { createSupabaseAdmin } from "../_supabaseAdmin";
import { sendPushToUser } from "../_push";

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

  completed_at?: string | null;
  blocked_reason?: string | null;
};

type StatusChangeRequestRow = {
  project_id: string;
  to_status?: string | null;
  request_status?: string | null;
  status?: string | null;
  approved_at?: string | null;
  created_at?: string | null;
};

type ProjectLogRow = {
  project_id: string;
  message?: string | null;
  meta?: any | null;
  detail?: any | null;
  created_at?: string | null;
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

function shouldMovePreOrderToTodo(startDate?: string | null) {
  if (!startDate) return false;

  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return false;

  start.setHours(0, 0, 0, 0);
  return start.getTime() <= startOfToday().getTime();
}

function extractBlockedReasonFromLogs(logs: ProjectLogRow[]): Record<string, string> {
  const out: Record<string, string> = {};

  for (const log of logs) {
    const projectId = log.project_id;
    if (!projectId || out[projectId]) continue;

    const metaReason =
      typeof log?.meta?.blocked_reason === "string" ? log.meta.blocked_reason.trim() : "";
    if (metaReason) {
      out[projectId] = metaReason;
      continue;
    }

    const detailReason =
      typeof log?.detail?.blocked_reason === "string" ? log.detail.blocked_reason.trim() : "";
    if (detailReason) {
      out[projectId] = detailReason;
      continue;
    }

    const msg = typeof log?.message === "string" ? log.message : "";
    const marker = "blocked_reason:";
    const idx = msg.toLowerCase().indexOf(marker);
    if (idx >= 0) {
      const text = msg.slice(idx + marker.length).trim();
      if (text) {
        out[projectId] = text;
      }
    }
  }

  return out;
}

function extractCompletedAtMap(rows: StatusChangeRequestRow[]): Record<string, string> {
  const grouped = new Map<string, StatusChangeRequestRow[]>();

  for (const row of rows) {
    if (!row.project_id) continue;
    const arr = grouped.get(row.project_id) ?? [];
    arr.push(row);
    grouped.set(row.project_id, arr);
  }

  const out: Record<string, string> = {};

  for (const [projectId, arr] of grouped.entries()) {
    const latest = arr
      .filter((r) => r.to_status === "COMPLETED")
      .filter((r) => r.request_status === "APPROVED" || r.status === "APPROVED")
      .sort(
        (a, b) =>
          new Date(b.approved_at || b.created_at || 0).getTime() -
          new Date(a.approved_at || a.created_at || 0).getTime()
      )[0];

    if (latest?.approved_at) {
      out[projectId] = latest.approved_at;
    }
  }

  return out;
}

async function enrichProjects(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  projects: ProjectRow[]
): Promise<ProjectRow[]> {
  if (!projects.length) return projects;

  const projectIds = projects.map((p) => p.id).filter(Boolean);
  if (!projectIds.length) return projects;

  const completedIds = projects.filter((p) => p.status === "COMPLETED").map((p) => p.id);
  const blockedIds = projects.filter((p) => p.status === "BLOCKED").map((p) => p.id);

  let completedAtMap: Record<string, string> = {};
  let blockedReasonMap: Record<string, string> = {};

  if (completedIds.length > 0) {
    const { data: completedRows } = await supabase
      .from("status_change_requests")
      .select("project_id,to_status,request_status,status,approved_at,created_at")
      .in("project_id", completedIds)
      .eq("to_status", "COMPLETED");

    completedAtMap = extractCompletedAtMap(
      Array.isArray(completedRows) ? (completedRows as StatusChangeRequestRow[]) : []
    );
  }

  if (blockedIds.length > 0) {
    const { data: blockedLogs } = await supabase
      .from("project_logs")
      .select("project_id,message,meta,detail,created_at")
      .in("project_id", blockedIds)
      .order("created_at", { ascending: false });

    blockedReasonMap = extractBlockedReasonFromLogs(
      Array.isArray(blockedLogs) ? (blockedLogs as ProjectLogRow[]) : []
    );
  }

  return projects.map((item) => ({
    ...item,
    completed_at: completedAtMap[item.id] ?? null,
    blocked_reason: blockedReasonMap[item.id] ?? null,
  }));
}

export async function GET() {
  const supabase = await createSupabaseServer();

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

  const preOrderIdsToActivate = data
    .filter((item) => item.status === "PRE_ORDER" && shouldMovePreOrderToTodo(item.start_date))
    .map((item) => item.id)
    .filter(Boolean);

  if (preOrderIdsToActivate.length > 0) {
    const { error: updateErr } = await supabase
      .from("projects")
      .update({ status: "TODO" })
      .in("id", preOrderIdsToActivate)
      .eq("status", "PRE_ORDER");

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    const refreshed: ProjectRow[] = data.map((item) => {
      if (preOrderIdsToActivate.includes(item.id) && item.status === "PRE_ORDER") {
        return { ...item, status: "TODO" };
      }
      return item;
    });

    const enrichedRefreshed = await enrichProjects(supabase, refreshed);
    return NextResponse.json({ data: enrichedRefreshed });
  }

  const enriched = await enrichProjects(supabase, data);
  return NextResponse.json({ data: enriched });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const admin = createSupabaseAdmin();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 401 });
  }

  const user = authData?.user;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const insertRow: Record<string, any> = {
    ...body,
    created_by: user.id,
  };

  for (const k of Object.keys(insertRow)) {
    if (insertRow[k] === "") insertRow[k] = null;
  }

  if (!insertRow.department && (insertRow.type === "VIDEO" || insertRow.type === "GRAPHIC")) {
    insertRow.department = insertRow.type;
  }

  insertRow.status = getInitialStatus(insertRow.start_date);

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
    const notifTitle =
      insertRow.status === "PRE_ORDER"
        ? "คุณได้รับงานล่วงหน้าใหม่"
        : "คุณได้รับงานใหม่";

    const notifMessage = insertedData.title || "มีงานใหม่ถูกมอบหมายให้คุณ";
    const notifLink = `/projects/${insertedData.id}`;

    try {
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