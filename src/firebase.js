import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';

const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  ...(measurementId ? { measurementId } : {}),
};

// Fail fast in dev if any required env var is missing, so a typo in
// .env.local doesn't silently produce a broken Firebase app. measurementId
// is intentionally excluded - it's only present when Analytics is enabled.
const required = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missing = required.filter((key) => !firebaseConfig[key]);

if (missing.length > 0) {
  throw new Error(
    `Missing Firebase config values: ${missing.join(', ')}. ` +
      `Add the corresponding VITE_FIREBASE_* entries to .env.local.`,
  );
}

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export { firebaseConfig };

// Analytics only loads in browser contexts that support it (skips SSR,
// some privacy-restricted browsers, etc.). Fire-and-forget; consumers
// that need the instance can re-call getAnalytics(firebaseApp) themselves.
export const analyticsPromise = measurementId
  ? isAnalyticsSupported().then((supported) => (supported ? getAnalytics(firebaseApp) : null))
  : Promise.resolve(null);
