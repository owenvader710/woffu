import { NextRequest } from "next/server";
import { handleApprovalAction } from "@/app/api/_approvalAction";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return handleApprovalAction(req, id, "APPROVE");
}
