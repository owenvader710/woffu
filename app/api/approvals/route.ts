import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";
import { supabaseAdmin } from "@/utils/supabase/admin";

type ReqRow = {
  id: string;
  project_id: string;
  from_status: string;
  to_status: string;
  request_status: "PENDING" | "APPROVED" | "REJECTED";
  requested_by: string;
  created_at: string;
};

export async function GET(req: NextRequest) {
  try {
    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    const user = authData?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    // ✅ เช็คหัวหน้า (อย่าให้คนทั่วไปเห็น approvals)
    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (meErr) return NextResponse.json({ error: meErr.message }, { status: 400 });
    const isLeader = me?.role === "LEADER" && me?.is_active !== false;
    if (!isLeader) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

    // ✅ ใช้ service role ดึง pending ทั้งหมด (ไม่พึ่ง RLS / ไม่ join relationship)
    const admin = supabaseAdmin();

    const { data: reqs, error: reqErr } = await admin
      .from("status_change_requests")
      .select("id, project_id, from_status, to_status, request_status, requested_by, created_at")
      .eq("request_status", "PENDING")
      .order("created_at", { ascending: false });

    if (reqErr) {
      const res = NextResponse.json({ error: reqErr.message }, { status: 400 });
      return applyCookies(res);
    }

    const rows = (reqs || []) as ReqRow[];
    if (rows.length === 0) {
      const res = NextResponse.json({ data: [] }, { status: 200 });
      return applyCookies(res);
    }

    const projectIds = Array.from(new Set(rows.map((r) => r.project_id).filter(Boolean)));
    const requesterIds = Array.from(new Set(rows.map((r) => r.requested_by).filter(Boolean)));

    // ✅ projects
    const { data: projects, error: projErr } = await admin
      .from("projects")
      .select("id, code, title, department, assignee_id")
      .in("id", projectIds);

    if (projErr) {
      const res = NextResponse.json({ error: projErr.message }, { status: 400 });
      return applyCookies(res);
    }

    const assigneeIds = Array.from(
      new Set((projects || []).map((p: any) => p.assignee_id).filter(Boolean))
    );

    const profileIds = Array.from(new Set([...requesterIds, ...assigneeIds]));

    // ✅ profiles
    const { data: profiles, error: profErr } = await admin
      .from("profiles")
      .select("id, display_name, department, role")
      .in("id", profileIds);

    if (profErr) {
      const res = NextResponse.json({ error: profErr.message }, { status: 400 });
      return applyCookies(res);
    }

    const projById = new Map<string, any>((projects || []).map((p: any) => [p.id, p]));
    const profById = new Map<string, any>((profiles || []).map((p: any) => [p.id, p]));

    const shaped = rows.map((r) => {
      const p = projById.get(r.project_id) || null;
      const assignee = p?.assignee_id ? profById.get(p.assignee_id) || null : null;
      const requester = r.requested_by ? profById.get(r.requested_by) || null : null;

      return {
        ...r,
        project: p
          ? {
              id: p.id,
              code: p.code ?? null,
              title: p.title ?? null,
              department: p.department ?? null,
              assignee: assignee
                ? { id: assignee.id, display_name: assignee.display_name ?? null }
                : null,
            }
          : null,
        requested_by_profile: requester
          ? { id: requester.id, display_name: requester.display_name ?? null }
          : null,
      };
    });

    const res = NextResponse.json({ data: shaped }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}