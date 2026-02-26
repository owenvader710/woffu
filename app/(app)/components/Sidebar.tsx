"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import LogoutButton from "@/app/components/LogoutButton";

type MeProfile = {
  id: string;
  display_name: string | null;
  role: "LEADER" | "MEMBER";
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
  const isLeader = useMemo(() => me?.role === "LEADER" && me?.is_active !== false, [me]);

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

  const projectOpen = useMemo(() => {
    return (
      pathname?.startsWith("/projects") ||
      pathname === "/completed" ||
      pathname === "/blocked" ||
      pathname?.startsWith("/completed") ||
      pathname?.startsWith("/blocked")
    );
  }, [pathname]);

  const linkCls = (active: boolean) =>
    cn(
      "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition",
      active ? "bg-[#e5ff78] text-black" : "text-white/75 hover:bg-white/10 hover:text-white"
    );

  const subLinkCls = (active: boolean) =>
    cn(
      "ml-3 flex items-center rounded-xl px-3 py-2 text-xs font-semibold tracking-widest transition",
      active ? "bg-white text-black" : "text-white/55 hover:bg-white/10 hover:text-white"
    );

  return (
    <aside className={cn("sticky top-0 h-screen shrink-0", "w-[300px] xl:w-[320px]", "p-5")}>
      <div className="flex h-full flex-col rounded-[34px] border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02] shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        {/* Brand */}
        <div className="px-6 pt-6">
          <div className="text-2xl font-extrabold tracking-widest text-[#e5ff78]">WOFFU OS</div>
          <div className="mt-1 text-xs text-white/45">Production Workflow</div>

          {me ? (
            <div className="mt-3 text-xs text-white/55">
              <span className="font-semibold text-white">{me.display_name || me.email || "ผู้ใช้งาน"}</span>{" "}
              <span className="text-white/25">·</span> <span>{me.role}</span>{" "}
              <span className="text-white/25">·</span> <span>{me.department}</span>
            </div>
          ) : null}
        </div>

        {/* Nav */}
        <nav className="mt-6 flex-1 px-4">
          <div className="space-y-1">
            <Link href="/dashboard" className={linkCls(pathname === "/dashboard")}>
              <span>DASHBOARD</span>
            </Link>

            {/* PROJECT */}
            <div className="pt-2">
              <div
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2",
                  projectOpen ? "bg-[#e5ff78] text-black" : "text-white/75"
                )}
              >
                <Link href="/projects" className="text-sm font-semibold">
                  PROJECT
                </Link>
                <span className={cn("text-xs", projectOpen ? "text-black/60" : "text-white/45")}>
                  {projectOpen ? "▲" : "▼"}
                </span>
              </div>

              {projectOpen ? (
                <div className="mt-2 space-y-1">
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
              ) : null}
            </div>

            <Link href="/my-work" className={linkCls(pathname === "/my-work")}>
              <span>MY WORK</span>
            </Link>

            <Link href="/members" className={linkCls(pathname === "/members")}>
              <span>MEMBERS</span>
            </Link>

            {/* ✅ เฉพาะหัวหน้าเท่านั้น */}
            {isLeader ? (
              <Link href="/approvals" className={linkCls(pathname === "/approvals")}>
                <span>APPROVALS</span>
              </Link>
            ) : null}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-5 pb-5">
          <div className="mb-4 h-px bg-white/10" />
          <LogoutButton />
          <div className="mt-4 text-center text-xs text-white/35">© 2026</div>
        </div>
      </div>
    </aside>
  );
}