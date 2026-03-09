/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyADWz-aqM3WKoFdDwJeSLzIdO8yRMT0dvo",
  authDomain: "woffu-os.firebaseapp.com",
  projectId: "woffu-os",
  storageBucket: "woffu-os.firebasestorage.app",
  messagingSenderId: "212080800103",
  appId: "1:212080800103:web:e1cfa8679376d009e6bfc2",
  measurementId: "G-VNBS4952XV",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || payload?.data?.title || "WOFFU";
  const body = payload?.notification?.body || payload?.data?.body || "";
  const link = payload?.data?.link || "/";

  self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    data: { link },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const link = event.notification?.data?.link || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(link);
    })
  );
});