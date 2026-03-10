import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

type ProjectRow = {
  id: string;
  title: string;
  code?: string | null;
  type?: "VIDEO" | "GRAPHIC" | string | null;
  department?: "VIDEO" | "GRAPHIC" | "ALL" | string | null;
  status?: "PRE_ORDER" | "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED" | string | null;
  created_at?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  brand?: string | null;
  video_priority?: string | null;
  video_purpose?: string | null;
  graphic_job_type?: string | null;
  assignee_id?: string | null;
};

type MemberRow = {
  id: string;
  display_name?: string | null;
  department?: "VIDEO" | "GRAPHIC" | "ALL" | string | null;
  role?: "LEADER" | "MEMBER" | "ADMIN" | string | null;
  is_active?: boolean | null;
};

type ApprovalRow = {
  id: string;
  project_id: string;
  request_status: "PENDING" | "APPROVED" | "REJECTED";
  created_at?: string | null;
  project?: {
    id?: string | null;
    title?: string | null;
    code?: string | null;
    department?: "VIDEO" | "GRAPHIC" | "ALL" | string | null;
  } | null;
};

type NoticeRow = {
  id: string;
  title: string;
  content?: string | null;
  notice_type?: string | null;
  is_pinned?: boolean | null;
  created_at?: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const { supabase, applyCookies } = await supabaseFromRequest(req);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 401 });
    }

    const user = authData?.user;
    if (!user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select("id, display_name, role, department, is_active")
      .eq("id", user.id)
      .single();

    if (meErr) {
      return NextResponse.json({ error: meErr.message }, { status: 400 });
    }

    if (!me?.is_active) {
      return NextResponse.json({ error: "Inactive profile" }, { status: 403 });
    }

    const isLeader = me.role === "LEADER" || me.role === "ADMIN";

    const [projectsRes, membersRes, approvalsRes, noticesRes] = await Promise.all([
      supabase
        .from("projects")
        .select(
          [
            "id",
            "title",
            "code",
            "type",
            "department",
            "status",
            "created_at",
            "start_date",
            "due_date",
            "brand",
            "video_priority",
            "video_purpose",
            "graphic_job_type",
            "assignee_id",
          ].join(",")
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("members")
        .select("id, display_name, department, role, is_active")
        .eq("is_active", true),

      isLeader
        ? supabase
            .from("status_change_requests")
            .select(`
              id,
              project_id,
              request_status,
              created_at,
              project:projects (
                id,
                title,
                code,
                department
              )
            `)
            .eq("request_status", "PENDING")
            .order("created_at", { ascending: false })
            .limit(5)
        : Promise.resolve({ data: [], error: null }),

      supabase
        .from("team_notices")
        .select("id, title, content, notice_type, is_pinned, created_at")
        .eq("is_active", true)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (projectsRes.error) {
      return NextResponse.json({ error: projectsRes.error.message }, { status: 400 });
    }

    if (membersRes.error) {
      return NextResponse.json({ error: membersRes.error.message }, { status: 400 });
    }

    if ((approvalsRes as any)?.error) {
      return NextResponse.json({ error: (approvalsRes as any).error.message }, { status: 400 });
    }

    if (noticesRes.error) {
      return NextResponse.json({ error: noticesRes.error.message }, { status: 400 });
    }

    const projects = Array.isArray(projectsRes.data)
      ? (projectsRes.data as unknown as ProjectRow[])
      : [];

    const members = Array.isArray(membersRes.data)
      ? (membersRes.data as unknown as MemberRow[])
      : [];

    const approvals = Array.isArray((approvalsRes as any)?.data)
      ? ((approvalsRes as any).data as unknown as ApprovalRow[])
      : [];

    const notices = Array.isArray(noticesRes.data)
      ? (noticesRes.data as unknown as NoticeRow[])
      : [];

    const activeProjects = projects.filter((p) => p.status !== "COMPLETED");

    const projectCounts = {
      total: activeProjects.length,
      preOrder: activeProjects.filter((p) => p.status === "PRE_ORDER").length,
      todo: activeProjects.filter((p) => p.status === "TODO").length,
      inProgress: activeProjects.filter((p) => p.status === "IN_PROGRESS").length,
      blocked: activeProjects.filter((p) => p.status === "BLOCKED").length,
      completed: projects.filter((p) => p.status === "COMPLETED").length,
      progressPercent:
        projects.length > 0
          ? Math.round(
              (projects.filter((p) => p.status === "COMPLETED").length / projects.length) * 100
            )
          : 0,
    };

    const myIncompleteLatest = isLeader
      ? []
      : projects
          .filter(
            (p) =>
              p.assignee_id === user.id &&
              p.status !== "COMPLETED" &&
              p.status !== "BLOCKED"
          )
          .slice(0, 3);

    const queuePreOrder = isLeader
      ? []
      : projects
          .filter((p) => p.assignee_id === user.id && p.status === "PRE_ORDER")
          .sort(
            (a, b) =>
              new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime()
          )
          .slice(0, 5);

    const latestGraphic = projects
      .filter((p) => p.type === "GRAPHIC" && p.status !== "COMPLETED")
      .slice(0, 5);

    const latestVideo = projects
      .filter((p) => p.type === "VIDEO" && p.status !== "COMPLETED")
      .slice(0, 5);

    const workload = members
      .filter((m) => m.role !== "LEADER" && m.role !== "ADMIN")
      .map((m) => {
        const count = projects.filter(
          (p) => p.assignee_id === m.id && p.status !== "COMPLETED"
        ).length;

        return {
          id: m.id,
          name: m.display_name || m.id,
          department: m.department || "ALL",
          count,
        };
      })
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "th"))
      .slice(0, 8);

    const payload = {
      me: {
        id: me.id,
        display_name: me.display_name ?? null,
        role: me.role ?? null,
        department: me.department ?? null,
        is_active: me.is_active ?? false,
      },
      summary: {
        projectCounts,
      },
      sections: {
        approvals,
        notices,
        myIncompleteLatest,
        queuePreOrder,
        latestGraphic,
        latestVideo,
        workload,
      },
    };

    const res = NextResponse.json({ data: payload }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}