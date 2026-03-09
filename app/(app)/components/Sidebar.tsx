"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/utils/supabase/client";

type MeProfile = {
  id: string;
  display_name: string | null;
  role: "LEADER" | "MEMBER" | "ADMIN";
  department: "VIDEO" | "GRAPHIC" | "ALL";
  email?: string | null;
  is_active?: boolean;
};

type NavItem = {
  label: string;
  href: string;
};

type SidebarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function Sidebar({ mobile = false, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [me, setMe] = useState<MeProfile | null>(null);
  const [isProjectOpen, setIsProjectOpen] = useState(false);

  const isLeader = useMemo(
    () => (me?.role === "LEADER" || me?.role === "ADMIN") && me?.is_active !== false,
    [me]
  );

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me-profile", { cache: "no-store" });
        const j = await safeJson(r);
        const m = (j?.data ?? j) as MeProfile | null;
        setMe(r.ok && m?.id ? m : null);
      } catch {
        setMe(null);
      }
    })();
  }, []);

  const projectActive = useMemo(() => {
    return (
      pathname === "/projects" ||
      pathname?.startsWith("/projects/") ||
      pathname === "/completed" ||
      pathname === "/blocked"
    );
  }, [pathname]);

  useEffect(() => {
    if (projectActive) {
      setIsProjectOpen(true);
    }
  }, [projectActive]);

  const handleNavigate = useCallback(() => {
    if (mobile) onNavigate?.();
  }, [mobile, onNavigate]);

  const handleProjectToggle = useCallback(() => {
    setIsProjectOpen((prev) => !prev);
  }, []);

  async function logout() {
    try {
      await supabaseBrowser.auth.signOut();
    } catch {}
    if (mobile) onNavigate?.();
    router.push("/login");
    router.refresh();
  }

  const linkCls = (active: boolean) =>
    cn(
      "flex items-center justify-between rounded-2xl px-4 py-3 text-[15px] font-extrabold tracking-[0.04em] transition-all duration-200",
      active
        ? "bg-[#e5ff78] text-black shadow-[0_10px_30px_rgba(229,255,120,0.18)]"
        : "text-white/72 hover:bg-white/10 hover:text-white"
    );

  const subLinkCls = (active: boolean) =>
    cn(
      "ml-3 flex items-center rounded-xl px-4 py-2.5 text-[11px] font-black tracking-[0.16em] transition-all duration-200",
      active
        ? "bg-white/10 text-[#e5ff78]"
        : "text-white/42 hover:bg-white/5 hover:text-white/80"
    );

  return (
    <aside
      className={cn(
        "w-full shrink-0",
        mobile
          ? "h-auto min-h-full px-0 py-0"
          : "lg:sticky lg:top-0 lg:h-screen lg:w-[320px] lg:p-5"
      )}
    >
      <div
        className={cn(
          "flex h-full flex-col border-white/10 bg-[#0a0a0a] bg-gradient-to-b from-white/5 to-transparent",
          mobile ? "min-h-full px-0" : "lg:rounded-[40px] lg:border lg:shadow-2xl"
        )}
      >
        <div className="px-5 pt-5 sm:px-6 sm:pt-6 lg:px-10 lg:pt-12">
          <div className="text-[30px] font-black leading-none tracking-tighter text-[#e5ff78] lg:text-3xl">
            WOFFU OS
          </div>

          <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.28em] text-white/28 sm:text-[10px] lg:mt-1 lg:text-[10px] lg:tracking-[0.3em]">
            Production Workflow
          </div>

          {me?.display_name ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 lg:mt-6">
              <div className="truncate text-sm font-bold text-white">{me.display_name}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/35">
                {me.role || "-"} · {me.department || "-"}
              </div>
            </div>
          ) : null}
        </div>

        <nav className="mt-6 flex-1 space-y-2 overflow-y-auto px-4 pb-6 sm:px-5 lg:mt-12 lg:px-6">
          <Link
            href="/dashboard"
            className={linkCls(pathname === "/dashboard")}
            onClick={handleNavigate}
          >
            <span>DASHBOARD</span>
          </Link>

          <div className="space-y-1">
            <button
              type="button"
              onClick={handleProjectToggle}
              className={cn(linkCls(projectActive), "w-full text-left")}
            >
              <span>PROJECT</span>
              <span
                className={cn(
                  "text-[10px] opacity-55 transition-transform duration-200",
                  isProjectOpen ? "rotate-90" : "rotate-0"
                )}
              >
                ▶
              </span>
            </button>

            <div
              className={cn(
                "grid transition-all duration-200 ease-out",
                isProjectOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <div className="space-y-1 py-1">
                  <Link
                    href="/projects"
                    className={subLinkCls(pathname === "/projects")}
                    onClick={handleNavigate}
                  >
                    ALL PROJECT
                  </Link>

                  <Link
                    href="/completed"
                    className={subLinkCls(pathname === "/completed")}
                    onClick={handleNavigate}
                  >
                    COMPLETED
                  </Link>

                  <Link
                    href="/blocked"
                    className={subLinkCls(pathname === "/blocked")}
                    onClick={handleNavigate}
                  >
                    BLOCKED
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/my-work"
            className={linkCls(pathname === "/my-work")}
            onClick={handleNavigate}
          >
            <span>MY WORK</span>
          </Link>

          <Link
            href="/team-notices"
            className={linkCls(pathname === "/team-notices")}
            onClick={handleNavigate}
          >
            <span>TEAM NOTICES</span>
          </Link>

          <Link
            href="/members"
            className={linkCls(pathname === "/members")}
            onClick={handleNavigate}
          >
            <span>MEMBERS</span>
          </Link>

          {isLeader ? (
            <Link
              href="/approvals"
              className={linkCls(pathname === "/approvals")}
              onClick={handleNavigate}
            >
              <span>APPROVALS</span>
            </Link>
          ) : null}
        </nav>

        <div className="px-5 pb-6 pt-2 sm:px-6 lg:px-8 lg:pb-10">
          <div className="mb-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent lg:mb-6" />

          <button
            type="button"
            onClick={logout}
            className="w-full rounded-2xl bg-[#e5ff78] px-4 py-3 text-sm font-extrabold text-black transition-transform hover:scale-[1.02] active:scale-[0.99]"
          >
            Logout
          </button>

          <div className="mt-4 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-white/18 lg:mt-6 lg:text-[10px] lg:tracking-widest">
            © 2026 WOFFU OS
          </div>
        </div>
      </div>
    </aside>
  );
}