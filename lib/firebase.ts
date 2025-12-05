import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ConfigKeys =
  | 'EXPO_PUBLIC_FIREBASE_API_KEY'
  | 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'
  | 'EXPO_PUBLIC_FIREBASE_PROJECT_ID'
  | 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'
  | 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'
  | 'EXPO_PUBLIC_FIREBASE_APP_ID';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let appInstance: FirebaseApp | null = null;

function ensureApp(): FirebaseApp {
  if (appInstance) {
    return appInstance;
  }

  const missingKeys = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key as ConfigKeys);

  if (missingKeys.length) {
    throw new Error(
      `Missing Firebase config. Add these env vars: ${missingKeys.join(', ')} (prefixed with EXPO_PUBLIC_)`
    );
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  appInstance = app;
  return appInstance;
}

export function getDb() {
  const app = ensureApp();
  return getFirestore(app);
}

export function getFirebaseAuth() {
  const app = ensureApp();
  try {
    return getAuth(app);
  } catch {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
}
