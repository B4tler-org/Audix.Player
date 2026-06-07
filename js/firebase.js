import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDN_EWDxVXQiEXB0GV9esg3RZJIRrvMkpg",
  authDomain: "audix-cf5dd.firebaseapp.com",
  projectId: "audix-cf5dd",
  storageBucket: "audix-cf5dd.firebasestorage.app",
  messagingSenderId: "251879225148",
  appId: "1:251879225148:web:59de2af7eba8bb631e9039",
  measurementId: "G-858KTP0X10"
};
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
