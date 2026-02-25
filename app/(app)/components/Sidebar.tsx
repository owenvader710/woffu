// app/(app)/components/Sidebar.tsx
import Link from "next/link";

const NavItem = ({
  href,
  label,
}: {
  href: string;
  label: string;
}) => {
  return (
    <Link
      href={href}
      className="block rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition"
    >
      {label}
    </Link>
  );
};

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:gap-2 md:p-4 md:border-r md:border-white/10 md:bg-black">
      <div className="px-3 py-2">
        <div className="text-white font-semibold tracking-wide">WOFFU</div>
        <div className="text-xs text-white/50">Work Tracking</div>
      </div>

      <nav className="flex flex-col gap-1">
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