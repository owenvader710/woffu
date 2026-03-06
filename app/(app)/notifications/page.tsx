"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type AppNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message?: string | null;
  link?: string | null;
  is_read: boolean;
  created_at: string;
};

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatDateTimeTH(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";

  const date = d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
  const time = d.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${date} ${time}`;
}

function toneClass(type: string) {
  if (type === "JOB_ASSIGNED") {
    return "border-lime-400/20 bg-lime-400/10 text-lime-200";
  }
  if (type === "JOB_STATUS_CHANGED") {
    return "border-blue-400/20 bg-blue-400/10 text-blue-200";
  }
  if (type === "TEAM_NOTICE") {
    return "border-violet-400/20 bg-violet-400/10 text-violet-200";
  }
  return "border-white/10 bg-white/5 text-white/80";
}

const FILTERS = ["ALL", "UNREAD", "JOB_ASSIGNED", "JOB_STATUS_CHANGED", "TEAM_NOTICE"] as const;
type FilterType = (typeof FILTERS)[number];

export default function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [query, setQuery] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/notifications?limit=50", { cache: "no-store" });
      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error((json && (json.error || json.message)) || "Load notifications failed");
      }

      const rows = Array.isArray(json?.data) ? (json.data as AppNotification[]) : [];
      setItems(rows);
    } catch (e: any) {
      setItems([]);
      setError(e?.message || "Load notifications failed");
    } finally {
      setLoading(false);
    }
  }

  async function readOne(id: string) {
    try {
      setMarkingId(id);

      const res = await fetch(`/api/notifications/read/${id}`, {
        method: "POST",
      });
      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error((json && (json.error || json.message)) || "Mark read failed");
      }

      setItems((prev) =>
        prev.map((x) => (x.id === id ? { ...x, is_read: true } : x))
      );
    } catch (e: any) {
      setError(e?.message || "Mark read failed");
    } finally {
      setMarkingId(null);
    }
  }

  async function readAll() {
    try {
      setMarkingAll(true);

      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      const json = await safeJson(res);

      if (!res.ok) {
        throw new Error((json && (json.error || json.message)) || "Mark all read failed");
      }

      setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    } catch (e: any) {
      setError(e?.message || "Mark all read failed");
    } finally {
      setMarkingAll(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    return {
      ALL: items.length,
      UNREAD: items.filter((x) => !x.is_read).length,
      JOB_ASSIGNED: items.filter((x) => x.type === "JOB_ASSIGNED").length,
      JOB_STATUS_CHANGED: items.filter((x) => x.type === "JOB_STATUS_CHANGED").length,
      TEAM_NOTICE: items.filter((x) => x.type === "TEAM_NOTICE").length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;

    if (filter === "UNREAD") {
      list = list.filter((x) => !x.is_read);
    } else if (filter !== "ALL") {
      list = list.filter((x) => x.type === filter);
    }

    const needle = query.trim().toLowerCase();
    if (needle) {
      list = list.filter((x) =>
        `${x.title || ""} ${x.message || ""} ${x.type || ""}`.toLowerCase().includes(needle)
      );
    }

    return list;
  }, [items, filter, query]);

  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-semibold tracking-widest text-white/50">WOFFU</div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">Notifications</h1>
          <div className="mt-2 text-sm text-white/50">ทั้งหมด: {filtered.length}</div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50"
          >
            รีเฟรช
          </button>

          <button
            onClick={readAll}
            disabled={markingAll || items.every((x) => x.is_read)}
            className="rounded-xl bg-[#e5ff78] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
          >
            {markingAll ? "กำลังอ่าน..." : "อ่านทั้งหมด"}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f;
            const count = counts[f] ?? 0;

            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                  active
                    ? "border-white/10 bg-white text-black"
                    : "border-white/10 bg-transparent text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                {f} ({count})
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาจากหัวข้อ ข้อความ หรือประเภทแจ้งเตือน"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e5ff78]"
          />
        </div>
      </div>

      {loading ? (
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">
          กำลังโหลด...
        </div>
      ) : error ? (
        <div className="mt-6 rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
          {error}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/40">
              ยังไม่มีแจ้งเตือนในเงื่อนไขนี้
            </div>
          ) : (
            filtered.map((n) => {
              const card = (
                <div
                  className={cn(
                    "rounded-3xl border bg-white/5 p-5 transition hover:bg-white/[0.07]",
                    n.is_read ? "border-white/10" : "border-lime-400/15 shadow-[0_0_0_1px_rgba(163,230,53,0.06)]"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-1 text-[10px] font-bold",
                            toneClass(n.type)
                          )}
                        >
                          {n.type}
                        </span>

                        {!n.is_read ? (
                          <span className="inline-flex items-center rounded-full border border-lime-400/20 bg-lime-400/10 px-2 py-1 text-[10px] font-bold text-lime-200">
                            NEW
                          </span>
                        ) : null}

                        <span className="ml-auto text-xs text-white/35">
                          {formatDateTimeTH(n.created_at)}
                        </span>
                      </div>

                      <div className="mt-3 text-base font-bold text-white">{n.title}</div>

                      {n.message ? (
                        <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/65">
                          {n.message}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {!n.is_read ? (
                        <button
                          type="button"
                          onClick={() => readOne(n.id)}
                          disabled={markingId === n.id}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"
                        >
                          {markingId === n.id ? "..." : "อ่านแล้ว"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );

              return n.link ? (
                <Link key={n.id} href={n.link}>
                  {card}
                </Link>
              ) : (
                <div key={n.id}>{card}</div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}