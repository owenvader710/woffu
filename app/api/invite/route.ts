import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    message: "POST WORKING",
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "GET WORKING",
  });
}