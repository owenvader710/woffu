// app/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  // ถ้า login แล้ว → ไป dashboard
  if (data?.user) redirect("/dashboard");

  // ถ้ายังไม่ login → ไปหน้า login
  redirect("/login");
}