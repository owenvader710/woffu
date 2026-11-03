import { NextResponse } from "next/server";
import { getDeploymentSafety } from "@/lib/stagingSafety";

export async function GET() {
  const state = getDeploymentSafety(process.env);
  return NextResponse.json(
    {
      preview: state.preview,
      readOnly: state.readOnly,
      stagingConnected: state.stagingConnected,
      blockedDatabase: state.blockedDatabase,
      reason: state.reason,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
