import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyADWz-aqM3WKoFdDwJeSLzIdO8yRMT0dvo",
  authDomain: "woffu-os.firebaseapp.com",
  projectId: "woffu-os",
  storageBucket: "woffu-os.firebasestorage.app",
  messagingSenderId: "212080800103",
  appId: "1:212080800103:web:e1cfa8679376d009e6bfc2",
  measurementId: "G-VNBS4952XV",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export async function getFirebaseMessaging() {
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;
  return getMessaging(firebaseApp);
}

export const FCM_VAPID_KEY =
  "BNh_o4Cs9z7M1bDGROTYKuNu_uzNfE-V0R2twZHo8j4ea6iXg7PDqmDSCH3DXTH8CQQdLHCLgmtkR69o4a7LSWs";