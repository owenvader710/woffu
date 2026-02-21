// app/api/projects/[id]/logs/route.ts
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
    .from("project_logs")
    .select(
      `
      *,
      actor:profiles!project_logs_actor_id_fkey(id, display_name, department, role, avatar_url)
    `
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const res = NextResponse.json({ data }, { status: 200 });
  return applyCookies(res);
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed", seen: true }, { status: 405 });
}