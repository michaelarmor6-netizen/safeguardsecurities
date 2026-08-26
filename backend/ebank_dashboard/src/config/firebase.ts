import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Firebase configuration with fallback values for production
const firebaseConfigValues = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCbAQrQEyETkBw_1nMlDwEnkn4jqt1uPpo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "e-bank-dashboard.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "e-bank-dashboard",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "e-bank-dashboard.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "186587489295",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:186587489295:web:c63b39b5216981bf89ef7a",
};

// Firebase configuration - production ready
const firebaseConfig = {
  apiKey: firebaseConfigValues.apiKey,
  authDomain: firebaseConfigValues.authDomain,
  projectId: firebaseConfigValues.projectId,
  storageBucket: firebaseConfigValues.storageBucket,
  messagingSenderId: firebaseConfigValues.messagingSenderId,
  appId: firebaseConfigValues.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, // Optional
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Configure Firestore settings for better offline handling
import { enableNetwork, disableNetwork, connectFirestoreEmulator } from 'firebase/firestore';

// Enable offline persistence and better error handling
if (!import.meta.env.DEV) {
  // In production, enable network retry
  enableNetwork(db).catch((error) => {
    console.warn('Failed to enable Firestore network:', error);
  });
}

// Connect to emulators in development (if enabled)
if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_FIREBASE_EMULATORS === 'true') {
  import('firebase/auth').then(({ connectAuthEmulator }) => {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099');
      console.info('🔧 Connected to Firebase Auth Emulator');
    } catch (error) {
      console.warn('⚠️ Failed to connect to Auth Emulator:', error);
    }
  });

  import('firebase/firestore').then(({ connectFirestoreEmulator }) => {
    try {
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.info('🔧 Connected to Firestore Emulator');
    } catch (error) {
      console.warn('⚠️ Failed to connect to Firestore Emulator:', error);
    }
  });

  import('firebase/storage').then(({ connectStorageEmulator }) => {
    try {
      connectStorageEmulator(storage, 'localhost', 9199);
      console.info('🔧 Connected to Storage Emulator');
    } catch (error) {
      console.warn('⚠️ Failed to connect to Storage Emulator:', error);
    }
  });

  import('firebase/functions').then(({ connectFunctionsEmulator }) => {
    try {
      connectFunctionsEmulator(functions, 'localhost', 5001);
      console.info('🔧 Connected to Functions Emulator');
    } catch (error) {
      console.warn('⚠️ Failed to connect to Functions Emulator:', error);
    }
  });
}

export { app };
export default app;