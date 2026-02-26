"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import LogoutButton from "./LogoutButton";

type MeProfile = {
  id: string;
  role: "LEADER" | "MEMBER";
  is_active: boolean;
};

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function NavItem({
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
      className={clsx(
        "block rounded-xl px-3 py-2 text-sm transition",
        indent ? "pl-8" : "",
        active
          ? "bg-[#e5ff78] text-black font-semibold"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      )}
    >
      {label}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [openProject, setOpenProject] = useState(true);
  const [isLeader, setIsLeader] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me-profile", { cache: "no-store" });
        const j = await safeJson(r);
        const me = (j?.data ?? j) as MeProfile | null;
        setIsLeader(!!(r.ok && me?.role === "LEADER" && me?.is_active === true));
      } catch {
        setIsLeader(false);
      }
    })();
  }, []);

  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const projectActive = useMemo(() => {
    return active("/projects") || active("/completed") || active("/blocked");
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <aside className="w-[260px] shrink-0 p-4">
      <div className="rounded-[28px] border border-white/10 bg-black/60 p-4 backdrop-blur">
        <div className="px-2 py-2">
          <div className="text-[22px] font-extrabold tracking-widest text-[#e5ff78]">WOFFU OS</div>
          <div className="text-xs text-white/50">Production Workflow</div>
        </div>

        <div className="mt-4 flex flex-col gap-1">
          <NavItem href="/dashboard" label="DASHBOARD" active={active("/dashboard")} />

          <button
            type="button"
            onClick={() => setOpenProject((v) => !v)}
            className={clsx(
              "mt-1 flex items-center justify-between rounded-xl px-3 py-2 text-sm transition",
              projectActive ? "bg-[#e5ff78] text-black font-semibold" : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
            aria-expanded={openProject}
          >
            <span>PROJECT</span>
            <span className="text-xs">{openProject ? "▲" : "▼"}</span>
          </button>

          {openProject && (
            <div className="flex flex-col gap-1">
              <NavItem href="/projects" label="ALL PROJECT" active={active("/projects")} indent />
              <NavItem href="/completed" label="COMPLETED" active={active("/completed")} indent />
              <NavItem href="/blocked" label="BLOCKED" active={active("/blocked")} indent />
            </div>
          )}

          <div className="mt-1">
            <NavItem href="/my-work" label="MY WORK" active={active("/my-work")} />
            <NavItem href="/members" label="MEMBERS" active={active("/members")} />
            {isLeader ? <NavItem href="/approvals" label="APPROVALS" active={active("/approvals")} /> : null}
          </div>

          <div className="mt-6 border-t border-white/10 pt-4">
            <LogoutButton />
          </div>

          <div className="mt-3 px-2 text-xs text-white/30">© {new Date().getFullYear()}</div>
        </div>
      </div>
    </aside>
  );
}