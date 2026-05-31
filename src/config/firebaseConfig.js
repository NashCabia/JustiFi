// Firebase config.
// Prefer Vite env vars, but fallback to the existing project config so the app works out-of-the-box.

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBaHZPusCb0anyESLskcEXYk12Pf8pZa20',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'justifi-91dbf.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'justifi-91dbf',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'justifi-91dbf.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '453501025792',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:453501025792:web:a5096744233c39300ea2e5',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-HCD8HN73ND'
};
