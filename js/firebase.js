/* ============================================
   FIREBASE INITIALIZATION — v2.0 (New Project)
   Project: audix-8f929
   Uses: Auth + Firestore (Spark plan compatible)
   ============================================ */

const firebaseConfig = {
  apiKey: "AIzaSyB3tUxnLXhoTcobfL70pUtQvWGOT2pHqe4",
  authDomain: "audix-8f929.firebaseapp.com",
  projectId: "audix-8f929",
  storageBucket: "audix-8f929.firebasestorage.app",
  messagingSenderId: "609920254787",
  appId: "1:609920254787:web:7bde862a5fed012181e5f6",
  measurementId: "G-6GJMQ3925R"
};

// Global flag for Firebase health
window._firebaseSuspended = false;

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  try {
    firebase.initializeApp(firebaseConfig);
    console.log('[Firebase] Initialized successfully — Project: audix-8f929');

    // Test auth responsiveness
    firebase.auth().onAuthStateChanged((user) => {
      console.log('[Firebase] Auth state listener active — SDK is responsive');
    }, (err) => {
      if (err && err.code === 'auth/invalid-api-key') {
        console.error('[Firebase] API Key invalid or suspended:', err.message);
        window._firebaseSuspended = true;
        showFirebaseError('Firebase API key issue detected. Please check your Firebase Console.');
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
