import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function GET(req: NextRequest) {
  try {
    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const user = authData?.user;
    if (!user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    // A valid Auth session is not enough: suspended/missing team accounts
    // must never receive project, approval or QC data.
    const { data: activeProfile, error: profileError } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      return applyCookies(NextResponse.json({ error: "Unable to verify account" }, { status: 500 }));
    }
    if (!activeProfile || activeProfile.is_active !== true) {
      return applyCookies(NextResponse.json({ error: "Account unavailable" }, { status: 403 }));
    }

    const { data: projects, error } = await supabase
      .from("projects")
      .select(`
        id,
        code,
        title,
        type,
        department,
        status,
        created_at,
        start_date,
        due_date,
        assignee_id,
        created_by,
        brand,
        video_priority,
        video_purpose,
        graphic_job_type
      `)
      .eq("assignee_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      const res = NextResponse.json({ error: error.message }, { status: 400 });
      return applyCookies(res);
    }

    const rows = Array.isArray(projects) ? projects : [];

    if (rows.length === 0) {
      const res = NextResponse.json({ data: [] }, { status: 200 });
      return applyCookies(res);
    }

    const ids = rows.map((x) => x.id).filter(Boolean);

    const { data: pendingReqs, error: reqErr } = await supabase
      .from("status_change_requests")
      .select(`
        id,
        project_id,
        from_status,
        to_status,
        request_status,
        created_at
      `)
      .in("project_id", ids)
      .eq("request_status", "PENDING")
      .order("created_at", { ascending: false });

    if (reqErr) {
      const res = NextResponse.json({ error: reqErr.message }, { status: 400 });
      return applyCookies(res);
    }

    type PendingRequest = {
      id: string;
      project_id: string;
      from_status: string | null;
      to_status: string | null;
      status: string;
      created_at: string;
    };
    const map = new Map<string, PendingRequest>();

    if (Array.isArray(pendingReqs)) {
      for (const r of pendingReqs) {
        if (!map.has(r.project_id)) {
          map.set(r.project_id, {
            id: r.id,
            project_id: r.project_id,
            from_status: r.from_status,
            to_status: r.to_status,
            status: r.request_status,
            created_at: r.created_at,
          });
        }
      }
    }

    // Draft QC is independent from the project's existing status.
    // Legacy installations without Phase 3 migration retain normal My Work behavior.
    const reviewResult = await supabase
      .from("project_draft_reviews")
      .select("project_id, draft_number, review_status, created_at")
      .in("project_id", ids)
      .order("draft_number", { ascending: false });

    if (reviewResult.error && !["42P01", "PGRST205", "42703"].includes(reviewResult.error.code || "")) {
      return applyCookies(NextResponse.json({ error: "Unable to load QC status" }, { status: 500 }));
    }

    const qcByProject = new Map<string, {
      draft_number: number;
      review_status: string;
      created_at: string;
    }>();
    for (const review of reviewResult.data ?? []) {
      if (!qcByProject.has(review.project_id)) {
        qcByProject.set(review.project_id, {
          draft_number: review.draft_number,
          review_status: review.review_status,
          created_at: review.created_at,
        });
      }
    }

    const merged = rows.map((p) => ({
      ...p,
      pending_request: map.get(p.id) ?? null,
      review_summary: qcByProject.get(p.id) ?? null,
    }));

    const res = NextResponse.json({ data: merged }, { status: 200 });
    return applyCookies(res);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}