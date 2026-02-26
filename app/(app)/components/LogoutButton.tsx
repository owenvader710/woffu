"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await supabaseBrowser.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
    >
      ออกจากระบบ
    </button>
  );
}