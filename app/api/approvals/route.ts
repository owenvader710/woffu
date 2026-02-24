import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function GET(req: NextRequest) {
  const { supabase } = await supabaseFromRequest(req);

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. เช็คสิทธิ์: ใช้ .single() และเช็คค่าตรงๆ
  const { data: me } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single(); // ใช้ single เพราะ id เป็น PK ยังไงก็ต้องมี 1 หรือไม่มีเลย

  const isLeader = me?.role?.toUpperCase() === "LEADER" && me?.is_active === true;

  if (!isLeader) {
    return NextResponse.json({ data: [] });
  }

  // 2. ดึงข้อมูล Status Change Requests
  const { data, error } = await supabase
    .from("status_change_requests")
    .select(`
      id,
      project_id,
      from_status,
      to_status,
      status,
      note,
      created_at,
      requested_by,
      project:projects (
        id,
        title,
        brand,
        type
      ),
      requester:profiles (
        id,
        display_name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch requests error:", error); // ควร log ไว้ดูฝั่ง server
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }

  return NextResponse.json({ data });
}