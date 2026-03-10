import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  console.log("[INVITE TEST] POST HIT");
  console.log("[INVITE TEST] body =", body);

  return NextResponse.json({
    ok: true,
    method: "POST",
    body,
  });
}

export async function GET() {
  console.log("[INVITE TEST] GET HIT");
  return NextResponse.json({
    ok: true,
    method: "GET",
  });
}