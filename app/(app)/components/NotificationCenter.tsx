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

const HIDDEN_KEY = "woffu_hidden_notifications_v1";

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
  if (type === "JOB_ACKNOWLEDGED") return "border-amber-400/20 bg-amber-400/10 text-amber-200";
  return "border-white/10 bg-white/5 text-white/80";
}

function readHiddenIds() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeHiddenIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(ids));
  } catch {}
}

function getProjectIdFromLink(link?: string | null) {
  if (!link) return null;
  const m = link.match(/\/projects\/([a-zA-Z0-9-]+)/);
  return m?.[1] || null;
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
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [ackBusyId, setAckBusyId] = useState<string | null>(null);

  const initializedRef = useRef(false);
  const channelRef = useRef<any>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);

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

  function playBeep() {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        audioCtxRef.current = new AudioCtx();
      }

      const ctx = audioCtxRef.current;
      if (!ctx) return;

      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(920, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.26);

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.26);
    } catch {}
  }

  async function loadInitial() {
    try {
      const res = await fetch("/api/notifications?limit=30", { cache: "no-store" });
      const json = await safeJson(res);
      const rows = Array.isArray(json?.data) ? (json.data as AppNotification[]) : [];

      setItems(rows);
      setUnread(Number(json?.unread || 0));

      const set = new Set<string>();
      rows.forEach((x) => set.add(x.id));
      seenIdsRef.current = set;

      initializedRef.current = true;
    } catch {
      setItems([]);
      setUnread(0);
    }
  }

  async function pollNotifications() {
    try {
      const res = await fetch("/api/notifications?limit=30", { cache: "no-store" });
      const json = await safeJson(res);
      const rows = Array.isArray(json?.data) ? (json.data as AppNotification[]) : [];
      const nextUnread = Number(json?.unread || 0);

      const fresh = rows.filter((x) => !seenIdsRef.current.has(x.id));

      if (fresh.length > 0 && initializedRef.current) {
        fresh
          .slice()
          .reverse()
          .forEach((n) => pushIncoming(n));
      }

      const nextSet = new Set<string>();
      rows.forEach((x) => nextSet.add(x.id));
      seenIdsRef.current = nextSet;

      setItems(rows);
      setUnread(nextUnread);
    } catch {}
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

  function clearVisibleList() {
    const visibleIds = visibleItems.map((x) => x.id);
    const merged = Array.from(new Set([...hiddenIds, ...visibleIds]));
    setHiddenIds(merged);
    writeHiddenIds(merged);
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

      await navigator.serviceWorker.register("/sw.js");
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

      await fetch("/api/push-subscriptions/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });

      await sub.unsubscribe();
      setPushEnabled(false);
    } catch (e: any) {
      alert(e?.message || "Push unsubscribe failed");
    } finally {
      setPushBusy(false);
    }
  }

  async function acknowledgeAssignment(n: AppNotification) {
    const projectId = getProjectIdFromLink(n.link);
    if (!projectId) return;

    try {
      setAckBusyId(n.id);

      const res = await fetch("/api/notifications/ack-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      });

      const json = await safeJson(res);
      if (!res.ok) {
        throw new Error((json && (json.error || json.message)) || "Acknowledge failed");
      }

      await readOne(n.id);
    } catch (e: any) {
      alert(e?.message || "Acknowledge failed");
    } finally {
      setAckBusyId(null);
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

    seenIdsRef.current.add(n.id);
    setUnread((prev) => prev + (n.is_read ? 0 : 1));

    if (initializedRef.current) {
      setToasts((prev) => [...prev, n]);

      if (soundEnabled) {
        playBeep();
      }

      if (document.visibilityState === "hidden" && desktopPermission === "granted") {
        showDesktopNotification(n);
      }
    }
  }

  useEffect(() => {
    setHiddenIds(readHiddenIds());
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
    const enable = () => {
      setSoundEnabled(true);
      if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
    };

    window.addEventListener("click", enable, { once: true });
    window.addEventListener("keydown", enable, { once: true });

    return () => {
      window.removeEventListener("click", enable);
      window.removeEventListener("keydown", enable);
    };
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => {
      pollNotifications();
    }, 5000);

    return () => window.clearInterval(t);
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
  }, [me?.id, desktopPermission, soundEnabled]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  const visibleItems = useMemo(
    () => items.filter((x) => !hiddenIds.includes(x.id)).slice(0, 10),
    [items, hiddenIds]
  );

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[#111] text-white shadow-[0_10px_30px_rgba(0,0,0,0.28)] transition hover:bg-white/10 md:h-11 md:w-11"
          title="Notifications"
        >
          <span className="text-[17px] leading-none md:text-[18px]">🔔</span>
          {unread > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white md:min-w-[20px] md:text-[11px]">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </button>

        {open ? (
          <>
            <button
              type="button"
              aria-label="close notifications overlay"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[9996] bg-black/45 md:hidden"
            />

            <div className="fixed inset-x-3 top-[68px] z-[9998] max-h-[calc(100vh-92px)] overflow-hidden rounded-3xl border border-white/10 bg-[#0b0b0b] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.58)] md:absolute md:inset-auto md:bottom-14 md:right-0 md:top-auto md:w-[360px] md:max-h-none">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-extrabold text-white">แจ้งเตือน</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={clearVisibleList}
                    className="text-xs font-semibold text-white/60 hover:text-white"
                  >
                    เคลียร์รายการ
                  </button>
                  <button
                    type="button"
                    onClick={readAll}
                    className="text-xs font-semibold text-white/60 hover:text-white"
                  >
                    อ่านทั้งหมด
                  </button>
                </div>
              </div>

              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="text-[11px] text-white/50">
                    realtime / poll active
                    {desktopPermission === "granted" ? " · desktop on" : ""}
                    {soundEnabled ? " · sound on" : ""}
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

              <div className="mt-3 max-h-[calc(100vh-250px)] space-y-2 overflow-y-auto pr-1 md:max-h-[420px]">
                {visibleItems.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/45">
                    ยังไม่มีแจ้งเตือน
                  </div>
                ) : (
                  visibleItems.map((n) => {
                    const projectId = getProjectIdFromLink(n.link);
                    const canAcknowledge = n.type === "JOB_ASSIGNED" && !!projectId;

                    return (
                      <div
                        key={n.id}
                        className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3"
                      >
                        <div
                          className="cursor-pointer transition"
                          onClick={() => readOne(n.id)}
                        >
                          <div className="flex items-start gap-2">
                            <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${toneClass(n.type)}`}>
                              {n.type}
                            </span>
                            {!n.is_read ? <span className="mt-1 h-2 w-2 rounded-full bg-lime-300" /> : null}
                          </div>

                          <div className="mt-2 font-semibold text-white">{n.title}</div>
                          {n.message ? (
                            <div className="mt-1 text-sm leading-6 text-white/65">{n.message}</div>
                          ) : null}
                          <div className="mt-2 text-xs text-white/35">{formatDateTimeTH(n.created_at)}</div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {n.link ? (
                            <Link
                              href={n.link}
                              onClick={() => readOne(n.id)}
                              className="inline-flex rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
                            >
                              เปิดดู
                            </Link>
                          ) : null}

                          {canAcknowledge ? (
                            <button
                              type="button"
                              onClick={() => acknowledgeAssignment(n)}
                              disabled={ackBusyId === n.id}
                              className="inline-flex rounded-xl border border-lime-400/20 bg-lime-400/10 px-3 py-2 text-xs font-semibold text-lime-200 hover:bg-lime-400/15 disabled:opacity-50"
                            >
                              {ackBusyId === n.id ? "..." : "รับทราบ"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div className="pointer-events-none fixed bottom-20 right-3 z-[9999] flex w-[min(360px,calc(100vw-24px))] flex-col gap-3 md:bottom-24 md:right-6 md:w-[360px] md:max-w-[calc(100vw-32px)]">
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
                {n.message ? <div className="mt-1 text-sm leading-6 text-white/65">{n.message}</div> : null}
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