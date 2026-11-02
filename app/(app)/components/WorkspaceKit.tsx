"use client";

import React from "react";
import { CheckCircle2, ChevronRight, RefreshCw } from "lucide-react";
import Link from "next/link";

export function WorkspaceHeader({
  eyebrow = "WOFFU OS / WORKSPACE",
  title,
  description,
  onRefresh,
  refreshing = false,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#e5ff78]/90">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-[30px]">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">{description}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {children}
        {onRefresh && (
          <button type="button" disabled={refreshing} onClick={onRefresh}
            aria-label="โหลดข้อมูลล่าสุด"
            className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/25 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#e5ff78] disabled:opacity-50">
            <RefreshCw size={15} aria-hidden="true" className={refreshing ? "animate-spin" : ""}/>
            รีเฟรช
          </button>
        )}
      </div>
    </header>
  );
}

export function ChecklistProgress({
  completed,
  total,
  label = "ความคืบหน้า",
  helper,
}: {
  completed: number;
  total: number;
  label?: string;
  helper?: string;
}) {
  const boundedTotal = Math.max(0, total);
  const boundedDone = Math.max(0, Math.min(boundedTotal, completed));
  const percentage = boundedTotal ? Math.round((boundedDone / boundedTotal) * 100) : 0;

  return (
    <div className="woffu-clean-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 size={18} className="text-[#e5ff78]" aria-hidden="true" />
          {label}
        </div>
        <span className="text-lg font-bold tabular-nums text-white">{percentage}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar"
        aria-label={label} aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-[#e5ff78] transition-[width] duration-300"
          style={{ width: `${percentage}%` }} />
      </div>
      <p className="mt-2 text-xs text-white/50">
        {helper || `เสร็จแล้ว ${boundedDone} จาก ${boundedTotal} รายการ`}
      </p>
    </div>
  );
}

export function QuickLink({
  href, label, detail, count, variant = "neutral",
}: {
  href: string;
  label: string;
  detail: string;
  count: number;
  variant?: "neutral" | "attention" | "danger" | "brand";
}) {
  const tones = {
    neutral: "border-white/10 bg-[#17191b]",
    attention: "border-amber-400/25 bg-[#211c15]",
    danger: "border-red-400/25 bg-[#23181a]",
    brand: "border-[#e5ff78]/35 bg-[#1d2314]",
  };
  return (
    <Link href={href} className={`group flex min-h-28 flex-col justify-between gap-3 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-white/30 focus-visible:outline-2 focus-visible:outline-[#e5ff78] ${tones[variant]}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-white/85">{label}</span>
        <ChevronRight size={17} className="text-white/40 transition group-hover:translate-x-1 group-hover:text-white" aria-hidden="true"/>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-[30px] font-bold leading-none tabular-nums">{count}</span>
        <span className="text-right text-xs text-white/45">{detail}</span>
      </div>
    </Link>
  );
}
