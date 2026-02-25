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

const LIME = "#e5ff78";

function Item({
  href,
  label,
  active,
  indent = false,
}: {
  href: string;
  label: string;
  active: boolean;
  indent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative block rounded-xl px-3 py-2 text-[12px] font-semibold tracking-[0.14em] uppercase transition",
        indent ? "ml-2" : "",
        active ? "text-black" : "text-white/70 hover:text-white"
      )}
      style={
        active
          ? {
              background: LIME,
              boxShadow: "0 10px 28px rgba(229,255,120,0.18)",
            }
          : undefined
      }
    >
      {/* subtle hover bg */}
      {!active ? (
        <span className="pointer-events-none absolute inset-0 rounded-xl bg-white/0 transition group-hover:bg-white/[0.06]" />
      ) : null}

      <span className="relative z-[1]">{label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const status = sp?.get("status");

  const [projectsOpen, setProjectsOpen] = useState(true);

  const projectSubs: SubItem[] = useMemo(
    () => [
      { href: "/projects?status=TODO", label: "TODO" },
      { href: "/projects?status=IN_PROGRESS", label: "IN_PROGRESS" },
      { href: "/projects?status=BLOCKED", label: "BLOCKED" },
      { href: "/projects?status=COMPLETED", label: "COMPLETED" },
    ],
    []
  );

  const isProjects = pathname?.startsWith("/projects");

  return (
    <aside className="w-[260px] shrink-0 p-4">
      <div
        className="h-[calc(100vh-32px)] rounded-[28px] border border-white/10 bg-black/70 backdrop-blur-xl"
        style={{
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
        }}
      >
        <div className="flex h-full flex-col p-5">
          {/* Brand */}
          <div className="mb-6">
            <div
              className="text-[18px] font-extrabold tracking-[0.22em]"
              style={{ color: LIME }}
            >
              WOFFU
            </div>
            <div className="mt-1 text-[11px] text-white/40">Work Tracking</div>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-2">
            <Item href="/dashboard" label="Dashboard" active={pathname === "/dashboard"} />

            {/* Projects (main) */}
            <button
              type="button"
              onClick={() => setProjectsOpen((v) => !v)}
              className={cn(
                "text-left",
                // ให้ปุ่มหลักหน้าตาเหมือน Item
                "relative rounded-xl px-3 py-2 text-[12px] font-semibold tracking-[0.14em] uppercase transition",
                isProjects ? "text-black" : "text-white/70 hover:text-white"
              )}
              style={
                isProjects
                  ? { background: LIME, boxShadow: "0 10px 28px rgba(229,255,120,0.18)" }
                  : undefined
              }
            >
              {!isProjects ? (
                <span className="pointer-events-none absolute inset-0 rounded-xl bg-white/0 transition hover:bg-white/[0.06]" />
              ) : null}

              <span className="relative z-[1] flex items-center justify-between">
                <span>Project</span>
                <span className={cn("text-[10px] opacity-70 transition", projectsOpen ? "rotate-180" : "")}>
                  ▾
                </span>
              </span>
            </button>

            {/* Sub menu */}
            {projectsOpen ? (
              <div className="mt-1 flex flex-col gap-2">
                <Item href="/projects" label="Projects" active={isProjects && !status} indent />

                {projectSubs.map((s) => {
                  const sStatus = s.href.split("status=")[1];
                  const active = isProjects && status === sStatus;
                  return <Item key={s.href} href={s.href} label={s.label} active={active} indent />;
                })}
              </div>
            ) : null}

            <Item href="/my-work" label="My Work" active={pathname === "/my-work"} />
            <Item href="/members" label="Members" active={pathname === "/members"} />
            <Item href="/approvals" label="Approvals" active={pathname === "/approvals"} />
          </nav>

          {/* Bottom */}
          <div className="mt-auto pt-6">
            <div className="h-px w-full bg-white/10" />
            <div className="mt-4">
              {/* ปุ่มออกจากระบบล่างสุด */}
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}