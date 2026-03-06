// app/api/projects/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "../_supabase";

const SELECT_FIELDS = [
  "id",
  "code",
  "title",
  "type",
  "status",
  "created_at",
  "start_date",
  "due_date",
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
  brand?: string | null;
  video_priority?: string | null;
  video_purpose?: string | null;
  graphic_job_type?: string | null;
  assignee_id?: string | null;
  description?: string | null;
  department?: string | null;
  created_by?: string | null;
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

export async function GET() {
  const supabase = await createSupabaseServer();

  const { data: rawData, error } = await supabase
    .from("projects")
    .select(SELECT_FIELDS)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const data: ProjectRow[] = Array.isArray(rawData) ? (rawData as ProjectRow[]) : [];

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

    return NextResponse.json({ data: refreshed });
  }

  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServer();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

  const user = authData?.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

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

  const { data, error } = await supabase
    .from("projects")
    .insert(insertRow)
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}