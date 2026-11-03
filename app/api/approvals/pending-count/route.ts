import { NextResponse } from "next/server";
import { getApprovalCounters } from "@/app/api/_approvalCounts";

export async function GET() {
  try {
    const result = await getApprovalCounters();
    if (result.response) return result.response;
    return NextResponse.json({ count: result.counts?.pending ?? 0 }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Unable to count approvals" }, { status: 500 });
  }
}
