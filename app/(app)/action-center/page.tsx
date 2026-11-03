"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowUpRight, BellRing, ClipboardCheck, Clock3,
  Inbox, Search, ShieldAlert, Wrench,
} from "lucide-react";
import { WorkspaceHeader } from "../components/WorkspaceKit";
import { ACTION_KINDS, type ActionItem, type ActionKind } from "@/lib/actionCenter";

type Category = ActionKind | "ALL";
type ActionPayload = {
  items: ActionItem[];
  counts: Record<ActionKind, number>;
  total: number;
  isManager: boolean;
  partial: boolean;
  updatedAt: string;
};

const DETAILS: Record<ActionKind, { label: string; color: string; note: string }> = {
  OVERDUE: {
    label: "เกินกำหนด", color: "border-red-400/30 bg-red-500/10 text-red-200",
    note: "ควรจัดการก่อน",
  },
  BLOCKED: {
    label: "ติดปัญหา", color: "border-red-400/30 bg-red-500/10 text-red-200",
    note: "ต้องประสานงาน",
  },
  REVISION: {
    label: "ต้องแก้ไข", color: "border-orange-400/30 bg-orange-500/10 text-orange-200",
    note: "มี Feedback ใหม่",
  },
  QC: {
    label: "รอตรวจ QC", color: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    note: "ส่ง Draft แล้ว",
  },
  APPROVAL: {
    label: "รออนุมัติ", color: "border-blue-400/30 bg-blue-500/10 text-blue-200",
    note: "รอหัวหน้าทีม",
  },
  DUE_SOON: {
    label: "ใกล้ส่ง", color: "border-white/15 bg-white/5 text-white/75",
    note: "ภายใน 72 ชั่วโมง",
  },
};

const FILTERS: readonly Category[] = ["ALL", ...ACTION_KINDS];

function formatDate(iso: string | null) {
  if (!iso) return null;
  const dt = new Date(iso);
  if (!Number.isFinite(dt.getTime())) return null;
  return dt.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok", day: "numeric", month: "short",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function ActionCenterPage() {
  const [payload, setPayload] = useState<ActionPayload | null>(null);
  const [filter, setFilter] = useState<Category>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/action-center", { cache: "no-store", signal });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || "ไม่สามารถโหลดรายการที่ต้องดำเนินการได้");
      }
      if (!signal?.aborted) setPayload(json.data as ActionPayload);
    } catch (e) {
      if (!signal?.aborted) setError(e instanceof Error ? e.message : "ไม่สามารถโหลดงานได้");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // Schedule stateful loading outside the effect's synchronous body.
    const frame = window.requestAnimationFrame(() => void load(controller.signal));
    return () => {
      window.cancelAnimationFrame(frame);
      controller.abort();
    };
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return (payload?.items ?? []).filter(item => {
      if (filter !== "ALL" && item.kind !== filter) return false;
      if (!term) return true;
      return [item.projectTitle, item.code, item.brand, item.label, item.description]
        .some(text => String(text ?? "").toLocaleLowerCase().includes(term));
    });
  }, [payload, filter, search]);

  const attentionCount = (payload?.counts.OVERDUE ?? 0) +
    (payload?.counts.BLOCKED ?? 0) + (payload?.counts.REVISION ?? 0);

  return (
    <main className="mx-auto w-full max-w-[1450px] px-4 pb-12 pt-6 text-white md:px-6 md:pt-8 lg:px-8">
      <WorkspaceHeader
        eyebrow="WOFFU OS / ACTION CENTER"
        title="รายการที่ต้องดำเนินการ"
        description="รวมงานเร่งด่วน Draft ที่รอตรวจ งานส่งกลับแก้ และกำหนดส่งไว้ในที่เดียว"
        refreshing={loading}
        onRefresh={() => void load()}
      >
        <Link href="/my-work"
          className="woffu-focus-ring inline-flex min-h-10 items-center rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/75 hover:bg-white/10">
          งานของฉัน
        </Link>
      </WorkspaceHeader>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="woffu-clean-panel flex flex-col justify-between gap-3 p-4">
          <span className="flex items-center gap-2 text-sm text-white/60">
            <Inbox size={17} aria-hidden="true" /> รายการทั้งหมด
          </span>
          <strong className="text-3xl tabular-nums">{payload?.total ?? "–"}</strong>
          <span className="text-xs text-white/45">เฉพาะรายการที่เกี่ยวข้องกับคุณ</span>
        </div>
        <div className="woffu-clean-panel flex flex-col justify-between gap-3 p-4">
          <span className="flex items-center gap-2 text-sm text-red-200/80">
            <AlertTriangle size={17} aria-hidden="true" /> ต้องติดตามก่อน
          </span>
          <strong className="text-3xl tabular-nums text-red-200">{payload ? attentionCount : "–"}</strong>
          <span className="text-xs text-white/45">เกินกำหนด / ติดปัญหา / ต้องแก้ไข</span>
        </div>
        <div className="woffu-clean-panel flex flex-col justify-between gap-3 p-4">
          <span className="flex items-center gap-2 text-sm text-[#e5ff78]">
            <ClipboardCheck size={17} aria-hidden="true" /> รอตรวจ / อนุมัติ
          </span>
          <strong className="text-3xl tabular-nums text-[#e5ff78]">
            {payload ? payload.counts.QC + payload.counts.APPROVAL : "–"}
          </strong>
          <span className="text-xs text-white/45">รายการที่รอการตัดสินใจ</span>
        </div>
      </div>

      <section className="woffu-clean-panel mt-5 space-y-4 p-4 md:p-5" aria-label="ค้นหาและกรองรายการ">
        <div className="relative">
          <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input type="search" autoComplete="off" aria-label="ค้นหาโปรเจกต์"
            value={search} onChange={event => setSearch(event.target.value)}
            placeholder="ค้นหาชื่องาน รหัสงาน หรือแบรนด์…"
            className="woffu-input-simple pl-10"/>
        </div>
        <div role="group" aria-label="กรองประเภทงาน" className="flex flex-wrap gap-2">
          {FILTERS.filter(kind => kind === "ALL" || payload?.isManager || kind !== "APPROVAL").map(kind => {
            const count = kind === "ALL" ? payload?.total ?? 0 : payload?.counts[kind] ?? 0;
            const label = kind === "ALL" ? "ทั้งหมด" : DETAILS[kind].label;
            return (
              <button key={kind} type="button" onClick={() => setFilter(kind)}
                aria-pressed={filter === kind}
                className={`woffu-focus-ring min-h-10 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${filter === kind
                  ? "border-[#e5ff78] bg-[#e5ff78] text-black"
                  : "border-white/15 bg-[#121416] text-white/70 hover:border-white/35"}`}>
                {label} ({count})
              </button>
            );
          })}
        </div>
        <p className="text-xs text-white/45" aria-live="polite">
          แสดง {filtered.length} รายการ
          {payload?.updatedAt ? ` · อัปเดต ${formatDate(payload.updatedAt)}` : ""}
          {payload?.partial ? " · มีงานจำนวนมาก กรุณาเปิดหน้ารายการโปรเจกต์เพื่อตรวจสอบเพิ่มเติม" : ""}
        </p>
      </section>

      {error && (
        <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
          <ShieldAlert size={18} aria-hidden="true" className="shrink-0"/>
          <div>{error} <button type="button" onClick={() => void load()}
            className="ml-2 font-semibold underline underline-offset-2">ลองอีกครั้ง</button></div>
        </div>
      )}

      {loading && !payload && <p role="status" className="mt-6 text-sm text-white/60">กำลังรวบรวมรายการ…</p>}
      {!loading && !error && filtered.length === 0 && (
        <div className="woffu-clean-panel mt-5 flex flex-col items-center gap-3 p-10 text-center">
          <BellRing size={28} className="text-[#e5ff78]" aria-hidden="true" />
          <h2 className="text-lg font-semibold">ไม่มีรายการในตัวกรองนี้</h2>
          <p className="max-w-sm text-sm text-white/55">เมื่องานมี Draft รอตรวจ กำหนดส่งใกล้เข้ามา หรือมีงานส่งกลับแก้ไข รายการจะปรากฏที่นี่</p>
          {(filter !== "ALL" || search) &&
            <button type="button" onClick={() => { setFilter("ALL"); setSearch(""); }}
              className="woffu-focus-ring mt-2 rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10">
              แสดงทั้งหมด
            </button>}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {filtered.map(item => {
          const detail = DETAILS[item.kind];
          return (
            <Link key={item.id} href={item.href}
              className="woffu-clean-panel woffu-focus-ring group flex flex-col gap-3 p-4 transition hover:border-white/25 hover:bg-white/[0.07] sm:flex-row sm:items-center sm:gap-5">
              <div className="flex shrink-0 items-center gap-3 sm:w-40">
                {item.kind === "OVERDUE" || item.kind === "BLOCKED" ?
                  <AlertTriangle size={20} className="text-red-200" aria-hidden="true" /> :
                  item.kind === "REVISION" ? <Wrench size={20} className="text-orange-200" aria-hidden="true"/> :
                  item.kind === "DUE_SOON" ? <Clock3 size={20} className="text-white/60" aria-hidden="true" /> :
                  <ClipboardCheck size={20} className="text-[#e5ff78]" aria-hidden="true" />}
                <span className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${detail.color}`}>
                  {detail.label}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {item.code && <span className="rounded border border-white/10 px-1.5 py-0.5 text-[11px] text-white/50">{item.code}</span>}
                  {item.brand && <span className="text-[11px] font-medium text-[#e5ff78]/70">{item.brand}</span>}
                </div>
                <h2 className="mt-1 break-words text-sm font-semibold text-white sm:text-base">{item.projectTitle}</h2>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/55">{item.description}</p>
              </div>
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 pt-3 sm:min-w-40 sm:flex-col sm:items-end sm:gap-2 sm:border-0 sm:pt-0">
                <span className="text-xs text-white/50">{formatDate(item.date) || detail.note}</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#e5ff78]">
                  {item.label} <ArrowUpRight size={15} aria-hidden="true" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
