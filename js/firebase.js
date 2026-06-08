/* ============================================
   FIREBASE INITIALIZATION — v1.2 (Suspended Key Fix)
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

// Global flag for Firebase health
window._firebaseSuspended = false;

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  try {
    firebase.initializeApp(firebaseConfig);
    console.log('[Firebase] Initialized successfully (Auth + Firestore)');

    // Test the key with a lightweight call to detect suspension early
    firebase.auth().onAuthStateChanged((user) => {
      console.log('[Firebase] Auth state listener active — SDK is responsive');
    }, (err) => {
      if (err && err.code === 'auth/invalid-api-key') {
        console.error('[Firebase] API Key appears invalid or suspended:', err.message);
        window._firebaseSuspended = true;
        showFirebaseError('Your Firebase API key has been suspended by Google. Please generate a new key in Firebase Console.');
      }
    });

  } catch (e) {
    console.error('[Firebase] Initialization failed:', e);
    window._firebaseSuspended = true;
  }
} else {
  console.log('[Firebase] Already initialized or compat SDK not loaded');
}

function showFirebaseError(msg) {
  const el = document.getElementById('firebase-error-banner');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
    return;
  }
  const banner = document.createElement('div');
  banner.id = 'firebase-error-banner';
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#e74c3c;color:#fff;padding:12px 16px;text-align:center;font-size:0.9rem;font-weight:600;';
  banner.textContent = msg;
  document.body.appendChild(banner);
}
