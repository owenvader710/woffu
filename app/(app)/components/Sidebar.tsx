// app/(app)/components/Sidebar.tsx
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import LogoutButton from "@/app/components/LogoutButton";

type SubItem = { href: string; label: string };

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function NavLink({
  href,
  label,
  active,
  sub = false,
}: {
  href: string;
  label: string;
  active: boolean;
  sub?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-xl transition",
        sub ? "px-3 py-2 text-[13px]" : "px-3 py-2.5 text-sm",
        active
          ? "bg-white/10 text-white border border-white/10"
          : "text-white/70 hover:bg-white/8 hover:text-white"
      )}
    >
      {label}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const sp = useSearchParams();

  // เปิด/ปิด submenu "Projects"
  const [projectsOpen, setProjectsOpen] = useState(true);

  const projectsSubs: SubItem[] = useMemo(
    () => [
      { href: "/projects", label: "All Projects" },
      { href: "/projects?status=TODO", label: "TODO" },
      { href: "/projects?status=IN_PROGRESS", label: "IN_PROGRESS" },
      { href: "/projects?status=BLOCKED", label: "BLOCKED" },
      { href: "/projects?status=COMPLETED", label: "COMPLETED" },
    ],
    []
  );

  const isProjects = pathname?.startsWith("/projects");
  const activeStatus = sp?.get("status");

  return (
    <aside className="w-72 shrink-0 border-r border-white/10 bg-black/80 backdrop-blur">
      <div className="flex h-screen flex-col p-4">
        {/* Brand */}
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="text-white font-semibold tracking-wide">WOFFU</div>
          <div className="text-xs text-white/50">Work Tracking</div>
        </div>

        {/* Nav */}
        <nav className="mt-4 flex flex-col gap-1">
          <NavLink href="/dashboard" label="Dashboard" active={pathname === "/dashboard"} />

          {/* Projects + submenu */}
          <button
            type="button"
            onClick={() => setProjectsOpen((v) => !v)}
            className={cn(
              "flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition",
              isProjects ? "border-white/10 bg-white/10 text-white" : "border-transparent text-white/70 hover:bg-white/8 hover:text-white"
            )}
          >
            <span>Projects</span>
            <span className={cn("text-xs text-white/50 transition", projectsOpen ? "rotate-180" : "")}>
              ▾
            </span>
          </button>

          {projectsOpen ? (
            <div className="ml-2 mt-1 flex flex-col gap-1 border-l border-white/10 pl-3">
              {projectsSubs.map((s) => {
                const isActive =
                  s.href === "/projects"
                    ? isProjects && !activeStatus
                    : isProjects && s.href.includes(`status=${activeStatus ?? ""}`);

                return <NavLink key={s.href} href={s.href} label={s.label} active={!!isActive} sub />;
              })}
            </div>
          ) : null}

          <NavLink href="/my-work" label="My Work" active={pathname === "/my-work"} />
          <NavLink href="/members" label="Members" active={pathname === "/members"} />
          <NavLink href="/approvals" label="Approvals" active={pathname === "/approvals"} />
        </nav>

        {/* Bottom */}
        <div className="mt-auto pt-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Account</span>
              <span className="text-xs text-white/35">© {new Date().getFullYear()}</span>
            </div>

            <div className="mt-3">
              {/* ปุ่มออกจากระบบ "ล่างสุด" */}
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}