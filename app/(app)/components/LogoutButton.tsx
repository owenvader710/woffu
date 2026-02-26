"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    try {
      await supabaseBrowser.auth.signOut();
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <button
      onClick={logout}
      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 hover:bg-white/10"
    >
      ออกจากระบบ
    </button>
  );
}