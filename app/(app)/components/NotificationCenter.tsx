"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/utils/supabase/client";
import { urlBase64ToUint8Array } from "./push";

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

type MeProfile = {
  id: string;
  display_name?: string | null;
  role?: string | null;
};

async function safeJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
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
  } catch {}
}

function showDesktopNotification(n: AppNotification) {
  try {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const notice = new Notification(n.title, {
      body: n.message || "",
      tag: n.id,
      silent: true,
    });

    notice.onclick = () => {
      window.focus();
      if (n.link) window.location.href = n.link;
      notice.close();
    };
  } catch {}
}

export default function NotificationCenter() {
  const [me, setMe] = useState<MeProfile | null>(null);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission | "unsupported">("default");
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  const initializedRef = useRef(false);
  const channelRef = useRef<any>(null);

  async function loadMe() {
    try {
      const res = await fetch("/api/me-profile", { cache: "no-store" });
      const json = await safeJson(res);
      const data = (json?.data ?? json ?? null) as MeProfile | null;
      setMe(data?.id ? data : null);
    } catch {
      setMe(null);
    }
  }

  async function loadInitial() {
    try {
      const res = await fetch("/api/notifications?limit=20", { cache: "no-store" });
      const json = await safeJson(res);
      const rows = Array.isArray(json?.data) ? (json.data as AppNotification[]) : [];
      setItems(rows);
      setUnread(Number(json?.unread || 0));
      initializedRef.current = true;
    } catch {
      setItems([]);
      setUnread(0);
    }
  }

  async function readAll() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setUnread(0);
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
  }

  async function readOne(id: string) {
    await fetch(`/api/notifications/read/${id}`, { method: "POST" });
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, is_read: true } : x)));
    setUnread((prev) => Math.max(prev - 1, 0));
  }

  async function enableDesktopNotifications() {
    try {
      if (!("Notification" in window)) {
        setDesktopPermission("unsupported");
        return;
      }
      const result = await Notification.requestPermission();
      setDesktopPermission(result);
    } catch {
      setDesktopPermission("denied");
    }
  }

  async function checkPushStatus() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushSupported(false);
        setPushEnabled(false);
        return;
      }

      setPushSupported(true);

      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      if (!registration) {
        setPushEnabled(false);
        return;
      }

      const sub = await registration.pushManager.getSubscription();
      setPushEnabled(!!sub);
    } catch {
      setPushEnabled(false);
    }
  }

  async function enablePush() {
    try {
      setPushBusy(true);

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushSupported(false);
        return;
      }

      if (!("Notification" in window)) {
        setDesktopPermission("unsupported");
        return;
      }

      let permission = Notification.permission;
      if (permission !== "granted") {
        permission = await Notification.requestPermission();
      }
      setDesktopPermission(permission);

      if (permission !== "granted") return;

      const reg = await navigator.serviceWorker.register("/sw.js");
      const readyReg = await navigator.serviceWorker.ready;

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        alert("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");
        return;
      }

      let sub = await readyReg.pushManager.getSubscription();
      if (!sub) {
        sub = await readyReg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const res = await fetch("/api/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });

      const json = await safeJson(res);
      if (!res.ok) {
        throw new Error((json && (json.error || json.message)) || "Push subscribe failed");
      }

      setPushEnabled(true);
    } catch (e: any) {
      alert(e?.message || "Push subscribe failed");
    } finally {
      setPushBusy(false);
    }
  }

  async function disablePush() {
    try {
      setPushBusy(true);

      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      if (!registration) {
        setPushEnabled(false);
        return;
      }

      const sub = await registration.pushManager.getSubscription();
      if (!sub) {
        setPushEnabled(false);
        return;
      }

      const endpoint = sub.endpoint;

      await fetch("/api/push-subscriptions/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });

      await sub.unsubscribe();
      setPushEnabled(false);
    } catch (e: any) {
      alert(e?.message || "Push unsubscribe failed");
    } finally {
      setPushBusy(false);
    }
  }

  function pushIncoming(n: AppNotification) {
    setItems((prev) => {
      const exists = prev.some((x) => x.id === n.id);
      if (exists) return prev;
      return [n, ...prev].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    setUnread((prev) => prev + (n.is_read ? 0 : 1));

    if (initializedRef.current) {
      setToasts((prev) => [...prev, n]);

      if (soundEnabled) playBeep();

      const pageHidden = document.visibilityState === "hidden";
      if (pageHidden && desktopPermission === "granted") {
        showDesktopNotification(n);
      }
    }
  }

  useEffect(() => {
    loadMe();
    loadInitial();
    checkPushStatus();
  }, []);

  useEffect(() => {
    if (!("Notification" in window)) {
      setDesktopPermission("unsupported");
      return;
    }
    setDesktopPermission(Notification.permission);
  }, []);

  useEffect(() => {
    const enable = () => setSoundEnabled(true);
    window.addEventListener("click", enable, { once: true });
    window.addEventListener("keydown", enable, { once: true });
    return () => {
      window.removeEventListener("click", enable);
      window.removeEventListener("keydown", enable);
    };
  }, []);

  useEffect(() => {
    if (!me?.id) return;

    const supabase = supabaseBrowser;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`notifications-user-${me.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${me.id}`,
        },
        (payload) => {
          const row = payload.new as AppNotification;
          pushIncoming(row);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [me?.id, soundEnabled, desktopPermission]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  const latestEight = useMemo(() => items.slice(0, 8), [items]);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[9998]">
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
          <div className="absolute bottom-14 right-0 w-[360px] rounded-3xl border border-white/10 bg-[#0b0b0b] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.58)]">
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

            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="text-[11px] text-white/50">
                  realtime {me?.id ? "connected" : "waiting"}
                  {desktopPermission === "granted" ? " · desktop on" : ""}
                </div>

                {desktopPermission === "default" ? (
                  <button
                    type="button"
                    onClick={enableDesktopNotifications}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/80 hover:bg-white/10"
                  >
                    desktop alert
                  </button>
                ) : desktopPermission === "denied" ? (
                  <div className="text-[11px] text-red-300/70">desktop blocked</div>
                ) : desktopPermission === "unsupported" ? (
                  <div className="text-[11px] text-white/35">unsupported</div>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="text-[11px] text-white/50">
                  push {pushEnabled ? "enabled" : "disabled"}
                </div>

                {!pushSupported ? (
                  <div className="text-[11px] text-white/35">unsupported</div>
                ) : pushEnabled ? (
                  <button
                    type="button"
                    onClick={disablePush}
                    disabled={pushBusy}
                    className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-200 hover:bg-red-500/15 disabled:opacity-50"
                  >
                    {pushBusy ? "..." : "ปิด push"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={enablePush}
                    disabled={pushBusy}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50"
                  >
                    {pushBusy ? "..." : "เปิด push"}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {latestEight.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/45">
                  ยังไม่มีแจ้งเตือน
                </div>
              ) : (
                latestEight.map((n) => {
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

      <div className="pointer-events-none fixed bottom-24 right-6 z-[9999] flex w-[360px] max-w-[calc(100vw-32px)] flex-col gap-3">
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