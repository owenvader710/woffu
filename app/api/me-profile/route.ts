import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function GET(req: NextRequest) {
  const { supabase, applyCookies } = supabaseFromRequest(req);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return applyCookies(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, role, department, is_active, avatar_url, phone, email")
    .eq("id", user.id)
    .single();

  if (error) {
    return applyCookies(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  return applyCookies(NextResponse.json({ data }));
}

export async function PATCH(req: NextRequest) {
  const { supabase, applyCookies } = supabaseFromRequest(req);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return applyCookies(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return applyCookies(NextResponse.json({ error: "Invalid JSON" }, { status: 400 }));
  }

  // allowlist fields
  const patch: Record<string, any> = {};
  if ("display_name" in body) patch.display_name = body.display_name || null;
  if ("phone" in body) patch.phone = body.phone || null;
  if ("email" in body) patch.email = body.email || null;
  if ("avatar_url" in body) patch.avatar_url = body.avatar_url || null;

  if (Object.keys(patch).length === 0) {
    return applyCookies(NextResponse.json({ error: "No fields to update" }, { status: 400 }));
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id)
    .select("id, display_name, role, department, is_active, avatar_url, phone, email")
    .single();

  if (error) {
    return applyCookies(NextResponse.json({ error: error.message }, { status: 500 }));
  }

  return applyCookies(NextResponse.json({ data }));
}