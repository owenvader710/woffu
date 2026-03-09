"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/utils/supabase/client";

type NavItem = { label: string; href: string };

async function safeJson(res: Response) {
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [isLeader, setIsLeader] = useState(false);
  const [openProjects, setOpenProjects] = useState(false);

  const projectChildren: NavItem[] = useMemo(
    () => [
      { label: "PROJECTS", href: "/projects" },
      { label: "COMPLETED", href: "/completed" },
      { label: "BLOCKED", href: "/blocked" },
    ],
    []
  );

  const shouldOpenProjects = useMemo(() => {
    return (
      pathname === "/projects" ||
      pathname?.startsWith("/projects/") ||
      pathname === "/completed" ||
      pathname === "/blocked"
    );
  }, [pathname]);

  useEffect(() => {
    setOpenProjects(shouldOpenProjects);
  }, [shouldOpenProjects]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me-profile", { cache: "no-store" });
        const j = await safeJson(r);
        const me = j?.data ?? j;
        setIsLeader((me?.role === "LEADER" || me?.role === "ADMIN") && me?.is_active === true);
      } catch {
        setIsLeader(false);
      }
    })();
  }, []);

  const isActive = useCallback((href: string) => pathname === href, [pathname]);

  const handleNavClick = useCallback(() => {
    setOpenProjects(false);
  }, []);

  async function logout() {
    try {
      await supabaseBrowser.auth.signOut();
    } catch {}
    router.push("/login");
    router.refresh();
  }

  const baseBtn =
    "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold tracking-wide transition-all duration-200";
  const activeBtn = "bg-[#e5ff78] text-black";
  const idleBtn = "text-white/80 hover:bg-white/5 hover:text-white";

  const subBtn =
    "flex w-full items-center rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200";
  const activeSub = "bg-[#e5ff78] text-black";
  const idleSub = "text-white/70 hover:bg-white/5 hover:text-white";

  return (
    <aside className="sticky top-0 flex h-screen w-[260px] flex-col overflow-hidden bg-[#0B0F0F] px-5 py-6">
      <div className="mb-5 select-none text-3xl font-extrabold tracking-tight text-[#e5ff78]">
        WOFFU
      </div>

      <div className="mb-6 h-px w-full bg-white/10" />

      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        <Link className={`${baseBtn} ${isActive("/dashboard") ? activeBtn : idleBtn}`} href="/dashboard" onClick={handleNavClick}>
          DASHBOARD
        </Link>

        <button
          type="button"
          onClick={() => setOpenProjects((v) => !v)}
          className={`${baseBtn} ${shouldOpenProjects ? activeBtn : idleBtn} text-left`}
        >
          PROJECT
          <span className="ml-auto text-xs opacity-70 transition-transform duration-200">
            {openProjects ? "▾" : "▸"}
          </span>
        </button>

        <div
          className={`ml-2 grid transition-all duration-200 ${
            openProjects ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col gap-1 pt-1">
              {projectChildren.map((c) => (
                <Link
                  key={c.href}
                  href={c.href}
                  onClick={handleNavClick}
                  className={`${subBtn} ${isActive(c.href) ? activeSub : idleSub}`}
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <Link className={`${baseBtn} ${isActive("/my-work") ? activeBtn : idleBtn}`} href="/my-work" onClick={handleNavClick}>
          MY WORK
        </Link>

        <Link className={`${baseBtn} ${isActive("/members") ? activeBtn : idleBtn}`} href="/members" onClick={handleNavClick}>
          MEMBERS
        </Link>

        {isLeader && (
          <Link className={`${baseBtn} ${isActive("/approvals") ? activeBtn : idleBtn}`} href="/approvals" onClick={handleNavClick}>
            APPROVALS
          </Link>
        )}
      </nav>

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