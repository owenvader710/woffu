import { requireActiveUser } from "@/app/api/_authorization";

export type ApprovalCounters = {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
  history: number;
};

export async function getApprovalCounters() {
  const access = await requireActiveUser();
  if (access.response) return { response: access.response };
  if (!access.supabase || !access.profile) throw new Error("Authorization unavailable");
  if (!["LEADER", "ADMIN"].includes(access.profile.role)) {
    const counts: ApprovalCounters = { all: 0, pending: 0, approved: 0, rejected: 0, history: 0 };
    return { counts };
  }

  const statuses = ["PENDING", "APPROVED", "REJECTED"] as const;
  const results = await Promise.all(statuses.map(status =>
    access.supabase!.from("status_change_requests")
      .select("id", { count: "exact", head: true })
      .eq("request_status", status)
  ));
  if (results.some(result => result.error)) {
    console.warn("[APPROVAL COUNTS] Database error", results.find(result => result.error)?.error?.code);
    throw new Error("Could not count approval requests");
  }
  const [pending, approved, rejected] = results.map(result => result.count ?? 0);
  const counts: ApprovalCounters = {
    pending, approved, rejected,
    history: approved + rejected,
    all: pending + approved + rejected,
  };
  return { counts };
}
