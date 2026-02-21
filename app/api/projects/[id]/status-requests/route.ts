// app/api/projects/[id]/status-requests/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";
import { getIdFromContextOrPath, isUuid } from "../_params";

export async function GET(req: NextRequest, context: any) {
  const projectId = await getIdFromContextOrPath(req, context);

  if (!projectId) return NextResponse.json({ error: "Missing project id (params.id)" }, { status: 400 });
  if (!isUuid(projectId)) return NextResponse.json({ error: `Invalid project id: ${projectId}` }, { status: 400 });

  const { supabase, applyCookies } = supabaseFromRequest(req);

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  if (!authData?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("status_change_requests")
    .select(
      `
      *,
      requester:profiles!status_change_requests_requested_by_fkey(id, display_name, department, role, avatar_url),
      approver:profiles!status_change_requests_approved_by_fkey(id, display_name, department, role, avatar_url)
    `
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const res = NextResponse.json({ data }, { status: 200 });
  return applyCookies(res);
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}