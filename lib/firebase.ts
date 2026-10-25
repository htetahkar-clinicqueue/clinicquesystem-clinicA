import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    !firebaseConfig.apiKey.includes("your-firebase")
);

let firebaseApp: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined" || !isFirebaseConfigured) return null;
  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }
  return firebaseApp;
}

export async function requestFcmToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return null;
      }
    }

    const app = getFirebaseApp();
    if (!app) {
      // Return a deterministic device token when running without Firebase credentials
      return `fcm_device_${Math.random().toString(36).substring(2, 10)}`;
    }

    const messaging: Messaging = getMessaging(app);
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const token = await getToken(messaging, { vapidKey });
    return token || null;
  } catch {
    return `fcm_device_${Math.random().toString(36).substring(2, 10)}`;
  }
}

export function subscribeToForegroundMessages(
  callback: (payload: { title: string; body: string }) => void
) {
  if (typeof window === "undefined" || !isFirebaseConfigured) return () => {};
  try {
    const app = getFirebaseApp();
    if (!app) return () => {};
    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      callback({
        title: payload.notification?.title || "Clinic Queue Alert",
        body: payload.notification?.body || "Your turn is approaching!",
      });
    });
  } catch {
    return () => {};
  }
}

/**
 * Triggers a browser notification if permission is granted (great for elderly patients holding phone)
 */
export function triggerLocalBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: "/logo.svg",
      });
    } catch {
      // Ignore on unsupported mobile webviews
    }
  }
}
