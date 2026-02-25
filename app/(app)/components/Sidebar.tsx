// app/(app)/components/Sidebar.tsx
import Link from "next/link";

const NavItem = ({ href, label }: { href: string; label: string }) => (
  <Link
    href={href}
    className="block rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition"
  >
    {label}
  </Link>
);

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 border-r border-white/10 bg-black p-4">
      <div className="px-3 py-2">
        <div className="text-white font-semibold tracking-wide">WOFFU</div>
        <div className="text-xs text-white/50">Work Tracking</div>
      </div>

      <nav className="mt-3 flex flex-col gap-1">
        <NavItem href="/dashboard" label="Dashboard" />
        <NavItem href="/projects" label="Projects" />
        <NavItem href="/my-work" label="My Work" />
        <NavItem href="/members" label="Members" />
        <NavItem href="/approvals" label="Approvals" />
      </nav>

      <div className="mt-auto px-3 py-2 text-xs text-white/40">
        © {new Date().getFullYear()}
      </div>
    </aside>
  );
}