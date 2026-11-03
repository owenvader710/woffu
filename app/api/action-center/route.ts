import { NextResponse } from "next/server";
import { requireActiveUser } from "@/app/api/_authorization";
import {
  buildActionCenter,
  type ActionProject,
  type ActionReview,
  type ActionApproval,
} from "@/lib/actionCenter";

const PROJECT_LIMIT = 500;
const REVIEW_BATCH = 80;
const APPROVAL_LIMIT = 500;

export async function GET() {
  const access = await requireActiveUser();
  if (access.response) return access.response;
  if (!access.supabase || !access.user || !access.profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { supabase, user, profile } = access;
  const isManager = profile.role === "LEADER" || profile.role === "ADMIN";
  const projectsQuery = supabase
    .from("projects")
    .select("id, title, code, brand, status, assignee_id, reviewer_id, due_date, created_at")
    .neq("status", "COMPLETED")
    .order("created_at", { ascending: false })
    .limit(PROJECT_LIMIT);

  // The database's general project RLS is team-readable. Scope this
  // operational endpoint more tightly for members at query time.
  const projectResult = await (isManager
    ? projectsQuery
    : projectsQuery.or(`assignee_id.eq.${user.id},reviewer_id.eq.${user.id}`));

  if (projectResult.error) {
    console.error("[ACTION_CENTER] Project query failed", projectResult.error.code);
    return NextResponse.json({ error: "โหลดรายการโปรเจกต์ไม่สำเร็จ" }, { status: 500 });
  }

  const projects = (projectResult.data ?? []) as ActionProject[];
  const ids = projects.map(project => project.id);
  const groups: string[][] = [];
  for (let i = 0; i < ids.length; i += REVIEW_BATCH) {
    groups.push(ids.slice(i, i + REVIEW_BATCH));
  }

  // Fetch only reviews belonging to the scoped projects. The per-project
  // Draft cap is four, so REVIEW_BATCH * 4 is a safe bounded page size.
  const [reviewResults, approvalResult] = await Promise.all([
    Promise.all(groups.map(group => supabase
      .from("project_draft_reviews")
      .select("id, project_id, draft_number, review_status, created_at, feedback")
      .in("project_id", group)
      .order("draft_number", { ascending: false })
      .limit(REVIEW_BATCH * 4))),
    isManager
      ? supabase
          .from("status_change_requests")
          .select("id, project_id, to_status, created_at")
          .eq("request_status", "PENDING")
          .order("created_at", { ascending: false })
          .limit(APPROVAL_LIMIT)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const reviewError = reviewResults.find(result => result.error)?.error;
  if (reviewError) {
    const missing = ["42P01", "PGRST205", "42703"].includes(reviewError.code || "");
    return NextResponse.json({
      error: missing ? "ต้องติดตั้ง Draft Review Migration บน Staging ก่อน" :
        "โหลดข้อมูล Draft QC ไม่สำเร็จ",
      ...(missing ? { code: "MIGRATION_REQUIRED" } : {}),
    }, { status: missing ? 503 : 500 });
  }
  if (approvalResult.error) {
    console.error("[ACTION_CENTER] Approvals query failed", approvalResult.error.code);
    return NextResponse.json({ error: "โหลดรายการรออนุมัติไม่สำเร็จ" }, { status: 500 });
  }

  const reviews = reviewResults.flatMap(result => result.data ?? []) as ActionReview[];
  const approvals = (approvalResult.data ?? []) as ActionApproval[];
  const { items, counts } = buildActionCenter({
    projects,
    reviews,
    approvals,
    viewerId: user.id,
    isManager,
    nowMs: Date.now(),
  });

  return NextResponse.json({
    data: {
      items,
      counts,
      total: items.length,
      isManager,
      partial: projects.length === PROJECT_LIMIT ||
        (isManager && approvals.length === APPROVAL_LIMIT),
      updatedAt: new Date().toISOString(),
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
