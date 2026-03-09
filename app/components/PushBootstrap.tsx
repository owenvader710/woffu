"use client";

import { useEffect } from "react";
import { getFcmToken, subscribeForegroundMessages } from "@/lib/push";

export default function PushBootstrap() {
  useEffect(() => {
    let unsub: undefined | (() => void);

    (async () => {
      try {
        const token = await getFcmToken();
        console.log("FCM TOKEN:", token);

        if (token) {
          const res = await fetch("/api/push/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });

          const text = await res.text();
          console.log("REGISTER PUSH RESULT:", res.status, text);
        }

        unsub = await subscribeForegroundMessages((payload) => {
          console.log("FOREGROUND MESSAGE:", payload);

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