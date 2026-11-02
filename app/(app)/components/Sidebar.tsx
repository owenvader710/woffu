"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/utils/supabase/client";
import { BadgeCheck, ChevronRight, CircleAlert, FolderKanban, LayoutDashboard, ListTodo, LogOut, Megaphone, UsersRound } from "lucide-react";

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
      "woffu-focus-ring flex min-h-11 items-center justify-between rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-colors duration-150",
      active
        ? "bg-[#e5ff78] text-black"
        : "text-white/72 hover:bg-white/10 hover:text-white"
    );

  const subLinkCls = (active: boolean) =>
    cn(
      "woffu-focus-ring ml-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors duration-150",
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
          : "lg:sticky lg:top-0 lg:h-screen lg:w-[270px] lg:p-3"
      )}
    >
      <div
        className={cn(
          "flex h-full flex-col border-white/10 bg-[#131518]",
          mobile ? "min-h-full px-0" : "lg:rounded-[22px] lg:border"
        )}
      >
        <div className="px-5 pt-5 sm:px-6 sm:pt-6 lg:px-5 lg:pt-7">
          <div className="text-[25px] font-bold leading-none tracking-tight text-[#e5ff78]">
            WOFFU OS
          </div>

          <div className="mt-1.5 text-[11px] font-medium tracking-[0.08em] text-white/45">
            Production Workflow
          </div>

          {me?.display_name ? (
            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3">
              <div className="truncate text-sm font-bold text-white">{me.display_name}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/35">
                {me.role || "-"} · {me.department || "-"}
              </div>
            </div>
          ) : null}
        </div>

        <nav className="mt-5 flex-1 space-y-1 overflow-y-auto px-3 pb-5 sm:px-4 lg:mt-7 lg:px-3">
          <Link
            href="/dashboard"
            className={linkCls(pathname === "/dashboard")}
            onClick={handleNavigate}
          >
            <span className="flex items-center gap-3"><LayoutDashboard size={18} aria-hidden="true" /> ภาพรวมงาน</span>
          </Link>

          <div className="space-y-1">
            <button
              type="button"
              onClick={handleProjectToggle}
              className={cn(linkCls(projectActive), "w-full text-left")}
            >
              <span className="flex items-center gap-3"><FolderKanban size={18} aria-hidden="true" /> โปรเจกต์</span>
              <ChevronRight size={16} aria-hidden="true"
                className={cn(
                  "opacity-55 transition-transform duration-200",
                  isProjectOpen ? "rotate-90" : "rotate-0"
                )}
              >
              />
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
                    ทั้งหมด
                  </Link>

                  <Link
                    href="/completed"
                    className={subLinkCls(pathname === "/completed")}
                    onClick={handleNavigate}
                  >
                    <BadgeCheck size={14} aria-hidden="true" /> เสร็จแล้ว
                  </Link>

                  <Link
                    href="/blocked"
                    className={subLinkCls(pathname === "/blocked")}
                    onClick={handleNavigate}
                  >
                    <CircleAlert size={14} aria-hidden="true" /> ติดปัญหา
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
            <span className="flex items-center gap-3"><ListTodo size={18} aria-hidden="true" /> งานของฉัน</span>
          </Link>

          <Link
            href="/team-notices"
            className={linkCls(pathname === "/team-notices")}
            onClick={handleNavigate}
          >
            <span className="flex items-center gap-3"><Megaphone size={18} aria-hidden="true" /> ประกาศทีม</span>
          </Link>

          <Link
            href="/members"
            className={linkCls(pathname === "/members")}
            onClick={handleNavigate}
          >
            <span className="flex items-center gap-3"><UsersRound size={18} aria-hidden="true" /> สมาชิก</span>
          </Link>

          {isLeader ? (
            <Link
              href="/approvals"
              className={linkCls(pathname === "/approvals")}
              onClick={handleNavigate}
            >
              <span className="flex items-center gap-3"><BadgeCheck size={18} aria-hidden="true" /> รออนุมัติ</span>
            </Link>
          ) : null}
        </nav>

        <div className="px-4 pb-5 pt-2 sm:px-5 lg:px-4 lg:pb-5">
          <div className="mb-3 h-px bg-white/10" />

          <button
            type="button"
            onClick={logout}
            className="woffu-focus-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/75 transition hover:bg-white/10"
          >
            <LogOut size={16} aria-hidden="true" /> ออกจากระบบ
          </button>

          <div className="mt-4 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-white/18 lg:mt-6 lg:text-[10px] lg:tracking-widest">
            © 2026 WOFFU OS
          </div>
        </div>
      </div>
    </aside>
  );
}