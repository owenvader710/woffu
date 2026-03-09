"use client";

import { useEffect } from "react";
import { getFcmToken, subscribeForegroundMessages } from "@/lib/push";

export default function PushBootstrap() {
  useEffect(() => {
    let unsub: undefined | (() => void);

    (async () => {
      try {
        const token = await getFcmToken();
        if (token) {
          await fetch("/api/push/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
        }

        unsub = await subscribeForegroundMessages((payload) => {
          const title = payload?.notification?.title || payload?.data?.title || "WOFFU";
          const body = payload?.notification?.body || payload?.data?.body || "";

          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, { body });
          }
        });
      } catch (e) {
        console.error("Push bootstrap error:", e);
      }
    })();

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  return null;
}