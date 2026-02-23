import React from "react";

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      {children}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "danger";
}) {
  const base =
    "rounded-xl px-4 py-2 text-sm font-semibold transition";

  const style =
    variant === "primary"
      ? "bg-lime-300 text-black hover:opacity-90"
      : variant === "danger"
      ? "border border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/15"
      : "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10";

  return (
    <button onClick={onClick} className={`${base} ${style}`}>
      {children}
    </button>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "red" | "blue" | "amber";
}) {
  const map = {
    neutral: "border-white/10 bg-white/5 text-white/70",
    green: "border-green-500/30 bg-green-500/10 text-green-200",
    red: "border-red-500/30 bg-red-500/10 text-red-200",
    blue: "border-sky-500/30 bg-sky-500/10 text-sky-200",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  };

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${map[tone]}`}>
      {children}
    </span>
  );
}