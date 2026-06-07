/* ============================================
   FIREBASE INITIALIZATION — v1.1 (No Storage)
   Centralized Firebase setup for Audix
   Uses: Auth + Firestore only (Spark plan compatible)
   ============================================ */

const firebaseConfig = {
  apiKey: "AIzaSyDN_EWDxVXQiEXB0GV9esg3RZJIRrvMkpg",
  authDomain: "audix-cf5dd.firebaseapp.com",
  projectId: "audix-cf5dd",
  storageBucket: "audix-cf5dd.firebasestorage.app",
  messagingSenderId: "251879225148",
  appId: "1:251879225148:web:59de2af7eba8bb631e9039",
  measurementId: "G-858KTP0X10"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  console.log('[Firebase] Initialized successfully (Auth + Firestore)');
} else {
  console.log('[Firebase] Already initialized or compat SDK not loaded');
}
