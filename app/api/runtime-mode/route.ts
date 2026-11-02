import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      preview: process.env.VERCEL_ENV === "preview",
      readOnly: process.env.VERCEL_ENV === "preview" &&
        process.env.WOFFU_ENABLE_PREVIEW_MUTATIONS !== "true",
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
