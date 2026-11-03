/**
 * WOFFU OS: actionable work derived from existing projects, Draft QC and
 * status-approval requests. Pure module: no database calls or side effects.
 * All access control must be enforced by the API/RLS before invoking it.
 */
export type ActionKind = "OVERDUE" | "BLOCKED" | "REVISION" | "QC" | "APPROVAL" | "DUE_SOON";

export type ActionProject = {
  id: string;
  title: string;
  code: string | null;
  brand: string | null;
  status: string;
  assignee_id: string | null;
  reviewer_id: string | null;
  due_date: string | null;
  created_at: string;
};

export type ActionReview = {
  id: string;
  project_id: string;
  draft_number: number;
  review_status: "SUBMITTED" | "CHANGES_REQUESTED" | "APPROVED";
  created_at: string;
  feedback: string | null;
};

export type ActionApproval = {
  id: string;
  project_id: string;
  to_status: string;
  created_at: string;
};

export type ActionItem = {
  id: string;
  kind: ActionKind;
  priority: "urgent" | "high" | "normal";
  projectId: string;
  projectTitle: string;
  code: string | null;
  brand: string | null;
  label: string;
  description: string;
  href: string;
  date: string | null;
};

export const ACTION_KINDS: readonly ActionKind[] = [
  "OVERDUE", "BLOCKED", "REVISION", "QC", "APPROVAL", "DUE_SOON",
] as const;

const PRIORITY_RANK: Record<ActionKind, number> = {
  OVERDUE: 0,
  BLOCKED: 1,
  REVISION: 2,
  QC: 3,
  APPROVAL: 4,
  DUE_SOON: 5,
};

const HORIZON_MS = 72 * 60 * 60 * 1000;

function timestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

export function buildActionCenter(input: {
  projects: ActionProject[];
  reviews: ActionReview[];
  approvals: ActionApproval[];
  viewerId: string;
  isManager: boolean;
  nowMs: number;
}): { items: ActionItem[]; counts: Record<ActionKind, number> } {
  const { projects, reviews, approvals, viewerId, isManager, nowMs } = input;
  const byProject = new Map<string, ActionProject>();
  const latestReviews = new Map<string, ActionReview>();
  const items: ActionItem[] = [];
  const counts = Object.fromEntries(ACTION_KINDS.map(kind => [kind, 0])) as Record<ActionKind, number>;

  for (const project of projects) {
    if (!isManager && project.assignee_id !== viewerId && project.reviewer_id !== viewerId) continue;
    byProject.set(project.id, project);
  }

  // Draft numbers, not event timestamps, determine which QC result is current.
  // Historical rejected Drafts must never appear as active once Draft 2 exists.
  for (const review of reviews) {
    if (!byProject.has(review.project_id)) continue;
    const existing = latestReviews.get(review.project_id);
    if (!existing || review.draft_number > existing.draft_number ||
        (review.draft_number === existing.draft_number &&
         (timestamp(review.created_at) ?? 0) > (timestamp(existing.created_at) ?? 0))) {
      latestReviews.set(review.project_id, review);
    }
  }

  function append(
    kind: ActionKind,
    project: ActionProject,
    label: string,
    description: string,
    href: string,
    date: string | null
  ) {
    const priority: ActionItem["priority"] =
      kind === "OVERDUE" || kind === "BLOCKED" ? "urgent" :
      kind === "REVISION" || kind === "QC" || kind === "APPROVAL" ? "high" : "normal";
    items.push({
      id: `${kind}:${project.id}`,
      kind, priority, projectId: project.id, projectTitle: project.title,
      code: project.code, brand: project.brand, label, description, href, date,
    });
    counts[kind]++;
  }

  for (const project of byProject.values()) {
    if (project.status === "COMPLETED") continue;
    const owned = project.assignee_id === viewerId;
    const reviewer = project.reviewer_id === viewerId && !owned;
    const workHref = `/projects/${project.id}`;
    const review = latestReviews.get(project.id);

    if (review?.review_status === "SUBMITTED" && (isManager || reviewer)) {
      append("QC", project, `ตรวจ Draft ${review.draft_number}`,
        "มีไฟล์ส่งตรวจแล้ว เปิดดูและเลือกผ่าน QC หรือส่งกลับแก้ไข",
        `${workHref}#draft-reviews`, review.created_at);
    }
    if (review?.review_status === "CHANGES_REQUESTED" && (isManager || owned)) {
      append("REVISION", project, `แก้ไข Draft ${review.draft_number}`,
        isManager ? "ติดตามงานที่ถูกส่งกลับแก้ไข" :
          review.feedback?.trim() || "ตรวจ Feedback และส่ง Draft รอบถัดไป",
        `${workHref}#draft-reviews`, review.created_at);
    }

    if (!isManager && !owned) continue;
    if (project.status === "BLOCKED") {
      append("BLOCKED", project, "งานติดปัญหา",
        "ตรวจสาเหตุและประสานงานเพื่อให้ดำเนินการต่อได้",
        workHref, project.due_date);
      continue; // A blocked item takes precedence over its deadline.
    }

    const due = timestamp(project.due_date);
    if (due !== null && due < nowMs) {
      append("OVERDUE", project, "เกินกำหนดส่ง",
        "งานยังไม่ปิดและเลยกำหนดส่งแล้ว", workHref, project.due_date);
    } else if (due !== null && due <= nowMs + HORIZON_MS) {
      append("DUE_SOON", project, "ใกล้กำหนดส่ง",
        "ครบกำหนดภายใน 72 ชั่วโมง", workHref, project.due_date);
    }
  }

  if (isManager) {
    const seen = new Set<string>();
    for (const approval of approvals) {
      if (seen.has(approval.id)) continue;
      seen.add(approval.id);
      const project = byProject.get(approval.project_id);
      if (!project) continue;
      append("APPROVAL", project, "อนุมัติสถานะงาน",
        `คำขอเปลี่ยนสถานะเป็น ${approval.to_status}`,
        "/approvals", approval.created_at);
      // Approval actions must be individually identifiable even if multiple
      // requests exist for the same project.
      items[items.length - 1].id = `APPROVAL:${approval.id}`;
    }
  }

  items.sort((a, b) => {
    const urgency = PRIORITY_RANK[a.kind] - PRIORITY_RANK[b.kind];
    if (urgency) return urgency;
    const aTime = timestamp(a.date);
    const bTime = timestamp(b.date);
    if (aTime !== null && bTime !== null && aTime !== bTime) return aTime - bTime;
    if (aTime !== null && bTime === null) return -1;
    if (aTime === null && bTime !== null) return 1;
    return a.projectTitle.localeCompare(b.projectTitle, "th");
  });

  return { items, counts };
}
