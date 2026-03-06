"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import LogoutButton from "@/app/components/LogoutButton";

type MeProfile = {
  id: string;
  display_name: string | null;
  role: "LEADER" | "MEMBER" | "ADMIN";
  department: "VIDEO" | "GRAPHIC" | "ALL";
  email?: string | null;
  is_active?: boolean;
};

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function Sidebar() {
  const pathname = usePathname();
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

  useEffect(() => {
    if (
      pathname?.startsWith("/projects") ||
      pathname === "/completed" ||
      pathname === "/blocked"
    ) {
      setIsProjectOpen(true);
    }
  }, [pathname]);

  const linkCls = (active: boolean) =>
    cn(
      "flex items-center justify-between rounded-2xl px-4 py-3 text-base font-bold tracking-wide transition-all duration-200",
      active ? "bg-[#e5ff78] text-black shadow-lg shadow-[#e5ff78]/20" : "text-white/70 hover:bg-white/10 hover:text-white"
    );

  const subLinkCls = (active: boolean) =>
    cn(
      "ml-4 flex items-center rounded-xl px-4 py-2.5 text-xs font-black tracking-[0.15em] transition-all",
      active ? "bg-white/15 text-[#e5ff78]" : "text-white/40 hover:text-white/80"
    );

  return (
    <aside className="sticky top-0 h-screen w-[320px] shrink-0 p-5">
      <div className="flex h-full flex-col rounded-[40px] border border-white/10 bg-[#0a0a0a] bg-gradient-to-b from-white/5 to-transparent shadow-2xl">
        <div className="px-10 pt-12">
          <div className="text-3xl font-black tracking-tighter text-[#e5ff78]">WOFFU OS</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">
            Production Workflow
          </div>
        </div>

        <nav className="mt-12 flex-1 space-y-2 overflow-y-auto px-6">
          <Link href="/dashboard" className={linkCls(pathname === "/dashboard")}>
            <span>DASHBOARD</span>
          </Link>

          <div className="space-y-1">
            <button
              onClick={() => setIsProjectOpen(!isProjectOpen)}
              className={cn(
                linkCls(pathname?.startsWith("/projects") || pathname === "/completed" || pathname === "/blocked"),
                "w-full text-left"
              )}
            >
              <span>PROJECT</span>
              <span className="text-[10px] opacity-50">{isProjectOpen ? "▲" : "▼"}</span>
            </button>

            {isProjectOpen && (
              <div className="mt-1 space-y-1 py-1">
                <Link href="/projects" className={subLinkCls(pathname === "/projects")}>
                  ALL PROJECT
                </Link>
                <Link href="/completed" className={subLinkCls(pathname === "/completed")}>
                  COMPLETED
                </Link>
                <Link href="/blocked" className={subLinkCls(pathname === "/blocked")}>
                  BLOCKED
                </Link>
              </div>
            )}
          </div>

          <Link href="/my-work" className={linkCls(pathname === "/my-work")}>
            <span>MY WORK</span>
          </Link>

          <Link href="/team-notices" className={linkCls(pathname === "/team-notices")}>
            <span>TEAM NOTICES</span>
          </Link>

          <Link href="/members" className={linkCls(pathname === "/members")}>
            <span>MEMBERS</span>
          </Link>

          {isLeader && (
            <Link href="/approvals" className={linkCls(pathname === "/approvals")}>
              <span>APPROVALS</span>
            </Link>
          )}
        </nav>

        <div className="px-8 pb-10">
          <div className="mb-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="transform transition-transform hover:scale-105 active:scale-95">
            <LogoutButton />
          </div>
          <div className="mt-6 text-center text-[10px] font-bold tracking-widest uppercase text-white/20">
            © 2026 woffu OS
          </div>
        </div>
      </div>
    </aside>
  );
}