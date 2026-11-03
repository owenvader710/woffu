import { NextRequest, NextResponse } from "next/server";
import { POST as submitStatusRequest } from "@/app/api/projects/[id]/request-status/route";

/**
 * Legacy compatibility route: delegate to the single authorized V2 workflow.
 * Never offer another status-change INSERT path that bypasses current status,
 * assignee ownership, duplicate checks or leader notifications.
 */
export async function POST(req: NextRequest) {
  const clone = req.clone();
  const body = await req.json().catch(() => null);
  const projectId = typeof body?.project_id === "string" ? body.project_id.trim() : "";
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(projectId)) {
    return NextResponse.json({ error: "Invalid project_id" }, { status: 400 });
  }
  return submitStatusRequest(clone, { params: { id: projectId } });
}
