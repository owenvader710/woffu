"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type AppNotification = {
  id: string;
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

function formatDateTimeTH(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const date = d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "2-digit" });
  const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

function toneClass(type: string) {
  if (type === "JOB_ASSIGNED") return "border-lime-400/20 bg-lime-400/10 text-lime-200";
  if (type === "JOB_STATUS_CHANGED") return "border-blue-400/20 bg-blue-400/10 text-blue-200";
  if (type === "TEAM_NOTICE") return "border-violet-400/20 bg-violet-400/10 text-violet-200";
  return "border-white/10 bg-white/5 text-white/80";
}

function playBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.22);
  } catch {
    // ignore
  }
}

export default function NotificationCenter() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const lastSeenRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    const enable = () => setSoundEnabled(true);
    window.addEventListener("click", enable, { once: true });
    window.addEventListener("keydown", enable, { once: true });
    return () => {
      window.removeEventListener("click", enable);
      window.removeEventListener("keydown", enable);
    };
  }, []);

  async function loadInitial() {
    const res = await fetch("/api/notifications?limit=20", { cache: "no-store" });
    const json = await safeJson(res);
    const rows = Array.isArray(json?.data) ? (json.data as AppNotification[]) : [];
    setItems(rows);
    setUnread(Number(json?.unread || 0));

    if (rows.length > 0) {
      lastSeenRef.current = rows[0].created_at;
    }
    initializedRef.current = true;
  }

  async function pollNew() {
    const since = lastSeenRef.current;
    const url = since
      ? `/api/notifications?since=${encodeURIComponent(since)}&limit=20`
      : "/api/notifications?limit=20";

    const res = await fetch(url, { cache: "no-store" });
    const json = await safeJson(res);
    const rows = Array.isArray(json?.data) ? (json.data as AppNotification[]) : [];

    setUnread(Number(json?.unread || 0));

    if (rows.length > 0) {
      const sorted = [...rows].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      setItems((prev) => {
        const map = new Map<string, AppNotification>();
        [...sorted.reverse(), ...prev].forEach((x) => map.set(x.id, x));
        return Array.from(map.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      if (initializedRef.current) {
        setToasts((prev) => [...prev, ...sorted]);
        if (soundEnabled) playBeep();
      }

      lastSeenRef.current = rows[0].created_at;
    }
  }

  async function readAll() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setUnread(0);
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
  }

  async function readOne(id: string) {
    await fetch(`/api/notifications/read/${id}`, { method: "POST" });
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, is_read: true } : x))
    );
    setUnread((prev) => Math.max(prev - 1, 0));
  }

  useEffect(() => {
    loadInitial();
    const t = window.setInterval(() => {
      pollNew();
    }, 10000);

    return () => window.clearInterval(t);
  }, [soundEnabled]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  const latestFive = useMemo(() => items.slice(0, 8), [items]);

  return (
    <>
      <div className="fixed right-6 top-6 z-[9998]">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#111] text-white shadow-[0_10px_40px_rgba(0,0,0,0.4)] hover:bg-white/10"
          title="Notifications"
        >
          🔔
          {unread > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-extrabold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </button>

        {open ? (
          <div className="absolute right-0 mt-3 w-[360px] rounded-3xl border border-white/10 bg-[#0b0b0b] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.58)]">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold text-white">แจ้งเตือน</div>
              <button
                type="button"
                onClick={readAll}
                className="text-xs font-semibold text-white/60 hover:text-white"
              >
                อ่านทั้งหมด
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {latestFive.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/45">
                  ยังไม่มีแจ้งเตือน
                </div>
              ) : (
                latestFive.map((n) => {
                  const body = (
                    <div
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 transition hover:bg-white/10"
                      onClick={() => readOne(n.id)}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${toneClass(n.type)}`}>
                          {n.type}
                        </span>
                        {!n.is_read ? (
                          <span className="mt-1 h-2 w-2 rounded-full bg-lime-300" />
                        ) : null}
                      </div>

                      <div className="mt-2 font-semibold text-white">{n.title}</div>
                      {n.message ? (
                        <div className="mt-1 text-sm leading-6 text-white/65">{n.message}</div>
                      ) : null}
                      <div className="mt-2 text-xs text-white/35">{formatDateTimeTH(n.created_at)}</div>
                    </div>
                  );

                  return n.link ? (
                    <Link key={n.id} href={n.link}>
                      {body}
                    </Link>
                  ) : (
                    <div key={n.id}>{body}</div>
                  );
                })
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none fixed bottom-6 right-6 z-[9999] flex w-[360px] max-w-[calc(100vw-32px)] flex-col gap-3">
        {toasts.slice(-3).map((n) => (
          <div
            key={n.id}
            className="pointer-events-auto rounded-3xl border border-white/10 bg-[#0d0d0d] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.58)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${toneClass(n.type)}`}>
                  {n.type}
                </div>
                <div className="mt-2 font-bold text-white">{n.title}</div>
                {n.message ? (
                  <div className="mt-1 text-sm leading-6 text-white/65">{n.message}</div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== n.id))}
                className="rounded-xl px-2 py-1 text-sm text-white/50 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            {n.link ? (
              <div className="mt-3">
                <Link
                  href={n.link}
                  onClick={() => readOne(n.id)}
                  className="inline-flex rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
                >
                  เปิดดู
                </Link>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}