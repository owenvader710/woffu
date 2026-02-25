// app/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (data?.user) redirect("/dashboard");
  redirect("/login");
}