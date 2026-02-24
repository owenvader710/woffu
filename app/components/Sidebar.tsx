"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/utils/supabase/client";

type NavItem = { label: string; href: string };

async function safeJson(res: Response) {
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  // ✅ leader only
  const [isLeader, setIsLeader] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me-profile", { cache: "no-store" });
        const j = await safeJson(r);
        const me = j?.data ?? j;
        setIsLeader(me?.role === "LEADER" && me?.is_active === true);
      } catch {
        setIsLeader(false);
      }
    })();
  }, []);

  const projectChildren: NavItem[] = useMemo(
    () => [
      { label: "PROJECTS", href: "/projects" },
      { label: "COMPLETED", href: "/completed" },
      { label: "BLOCKED", href: "/blocked" },
    ],
    []
  );

  // ✅ auto open when in project group
  const shouldOpenProjects = useMemo(() => {
    return (
      pathname === "/projects" ||
      pathname?.startsWith("/projects/") ||
      pathname === "/completed" ||
      pathname === "/blocked"
    );
  }, [pathname]);

  const [openProjects, setOpenProjects] = useState<boolean>(shouldOpenProjects);

  useEffect(() => {
    setOpenProjects(shouldOpenProjects);
  }, [shouldOpenProjects]);

  const isActive = (href: string) => pathname === href;

  const baseBtn =
    "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold tracking-wide transition";
  const activeBtn = "bg-[#e5ff78] text-black";
  const idleBtn = "text-white/80 hover:bg-white/5 hover:text-white";

  const subBtn =
    "flex w-full items-center rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition";
  const activeSub = "bg-[#e5ff78] text-black";
  const idleSub = "text-white/70 hover:bg-white/5 hover:text-white";

  async function logout() {
    try {
      await supabaseBrowser.auth.signOut();
    } catch {
      // ignore
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 flex h-screen w-[260px] flex-col overflow-hidden bg-[#0B0F0F] px-5 py-6">
      {/* Logo */}
      <div className="mb-5 select-none text-3xl font-extrabold tracking-tight text-[#e5ff78]">
        WOFFU
      </div>

      <div className="mb-6 h-px w-full bg-white/10" />

      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        <Link className={`${baseBtn} ${isActive("/dashboard") ? activeBtn : idleBtn}`} href="/dashboard">
          DASHBOARD
        </Link>

        {/* PROJECT (Parent) */}
        <button
          type="button"
          onClick={() => setOpenProjects((v) => !v)}
          className={`${baseBtn} ${shouldOpenProjects ? activeBtn : idleBtn} text-left`}
        >
          PROJECT
          <span className="ml-auto text-xs opacity-70">{openProjects ? "▾" : "▸"}</span>
        </button>

        {/* Submenu */}
        {openProjects && (
          <div className="ml-2 flex flex-col gap-1">
            {projectChildren.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className={`${subBtn} ${isActive(c.href) ? activeSub : idleSub}`}
              >
                {c.label}
              </Link>
            ))}
          </div>
        )}

        <Link className={`${baseBtn} ${isActive("/my-work") ? activeBtn : idleBtn}`} href="/my-work">
          MY WORK
        </Link>

        <Link className={`${baseBtn} ${isActive("/members") ? activeBtn : idleBtn}`} href="/members">
          MEMBERS
        </Link>

        {isLeader && (
          <Link className={`${baseBtn} ${isActive("/approvals") ? activeBtn : idleBtn}`} href="/approvals">
            APPROVALS
          </Link>
        )}
      </nav>

      {/* Logout */}
      <div className="pt-4">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white/85 hover:bg-white/5"
        >
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}