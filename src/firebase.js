import { initializeApp, getApps, getApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Fail fast in dev if any required env var is missing, so a typo in
// .env.local doesn't silently produce a broken Firebase app.
const missing = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  throw new Error(
    `Missing Firebase config values: ${missing.join(', ')}. ` +
      `Add the corresponding VITE_FIREBASE_* entries to .env.local.`,
  );
}

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export { firebaseConfig };
