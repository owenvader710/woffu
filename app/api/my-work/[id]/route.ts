import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

type Ctx = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { supabase, applyCookies } = supabaseFromRequest(req);

  const { id } = await ctx.params;
  if (!id) {
    return applyCookies(NextResponse.json({ error: "Missing id" }, { status: 400 }));
  }

  // auth
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) {
    return applyCookies(NextResponse.json({ error: authErr.message }, { status: 401 }));
  }
  const user = authData?.user;
  if (!user) {
    return applyCookies(NextResponse.json({ error: "Unauthenticated" }, { status: 401 }));
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return applyCookies(NextResponse.json({ error: "Invalid JSON" }, { status: 400 }));
  }

  const nextStatus = body?.status;
  if (!nextStatus) {
    return applyCookies(NextResponse.json({ error: "Missing status" }, { status: 400 }));
  }

  // ✅ อนุญาตเฉพาะงานที่ assign ให้ user คนนี้
  const { data, error } = await supabase
    .from("projects")
    .update({ status: nextStatus })
    .eq("id", id)
    .eq("assignee_id", user.id)
    .select("id, status")
    .single();

  if (error) {
    return applyCookies(NextResponse.json({ error: error.message }, { status: 400 }));
  }

  return applyCookies(NextResponse.json({ data }, { status: 200 }));
}