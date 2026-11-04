import { NextRequest, NextResponse } from "next/server";

// Legacy endpoint: prevent bypassing the current approval checks.
// The UI uses /api/approvals/[id]/approve instead.
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { error: "This endpoint has been retired; use /api/approvals/[id]/approve." },
    { status: 410 }
  );
}
