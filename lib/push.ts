import { getToken, onMessage } from "firebase/messaging";
import { FCM_VAPID_KEY, getFirebaseMessaging } from "./firebase";

export async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  return registration;
}

export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  return await Notification.requestPermission();
}

export async function getFcmToken() {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  const registration = await registerServiceWorker();
  if (!registration) return null;

  const permission = await requestNotificationPermission();
  if (permission !== "granted") return null;

  const token = await getToken(messaging, {
    vapidKey: FCM_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  return token || null;
}

export async function subscribeForegroundMessages(
  onReceive: (payload: any) => void
) {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    onReceive(payload);
  });
}