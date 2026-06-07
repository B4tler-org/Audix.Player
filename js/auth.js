/* ============================================
   AUTHENTICATION SYSTEM — v3.0
   Firebase Auth + Firestore
   ============================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile as fbUpdateProfile,
  deleteUser,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDN_EWDxVXQiEXB0GV9esg3RZJIRrvMkpg",
  authDomain: "audix-cf5dd.firebaseapp.com",
  projectId: "audix-cf5dd",
  storageBucket: "audix-cf5dd.firebasestorage.app",
  messagingSenderId: "251879225148",
  appId: "1:251879225148:web:59de2af7eba8bb631e9039",
  measurementId: "G-858KTP0X10"
};

const app = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

const Auth = {
  currentUser: null,
  userData: null,
  confirmationResult: null,

  async init() {
    console.log('[Auth] init()');
    this.bindEvents();
    this.renderGoogleButton();

    // Handle redirect result (mobile Google login)
    try {
      const result = await getRedirectResult(firebaseAuth);
      if (result && result.user) {
        const user = result.user;
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            username: user.displayName || user.email.split('@')[0],
            email: user.email,
            profilePic: user.photoURL || null,
            createdAt: serverTimestamp(),
            xp: 0, level: 1, achievements: [], unlockedRewards: []
          });
        }
      }
    } catch (e) {
      console.error('[Auth] Redirect result error:', e);
    }

    onAuthStateChanged(firebaseAuth, async (user) => {
      if (user) {
        this.currentUser = user;
        await this.loadUserData(user.uid);
        this.hideLoginModal();
        this.updateUI();
        if (typeof Library !== 'undefined') await Library.loadUserSongs();
        if (typeof Achievements !== 'undefined') await Achievements.loadUserAchievements();
      } else {
        this.currentUser = null;
        this.userData = null;
        this.showLoginModal();
        this.updateUI();
      }
    });
  },

  async loadUserData(uid) {
    try {
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        this.userData = snap.data();
      } else {
        this.userData = {
          username: this.currentUser.displayName || this.currentUser.email.split('@')[0],
          email: this.currentUser.email,
          profilePic: this.currentUser.photoURL || null,
          createdAt: serverTimestamp(),
          xp: 0,
          level: 1,
          achievements: [],
          unlockedRewards: []
        };
        await setDoc(ref, this.userData);
      }
    } catch (e) {
      console.error('[Auth] loadUserData error:', e);
    }
  },

  async register(username, email, password) {
    if (!username || username.length < 3) throw new Error('Username must be at least 3 characters');
    if (!email || !password || password.length < 6) throw new Error('Email required and password must be at least 6 characters');

    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    await fbUpdateProfile(cred.user, { displayName: username });

    await setDoc(doc(db, 'users', cred.user.uid), {
      username,
      email,
      profilePic: null,
      createdAt: serverTimestamp(),
      xp: 0,
      level: 1,
      achievements: [],
      unlockedRewards: []
    });

    return cred.user;
  },

  async login(email, password) {
    if (!email || !password) throw new Error('Email and password are required');
    const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
    return cred.user;
  },

  async googleLogin() {
    // Use redirect on mobile, popup on desktop
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      await signInWithRedirect(firebaseAuth, googleProvider);
      return; // page will reload, result handled in init()
    }
    const cred = await signInWithPopup(firebaseAuth, googleProvider);
    const user = cred.user;
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        username: user.displayName || user.email.split('@')[0],
        email: user.email,
        profilePic: user.photoURL || null,
        createdAt: serverTimestamp(),
        xp: 0,
        level: 1,
        achievements: [],
        unlockedRewards: []
      });
    }
    return user;
  },

  async sendPhoneOTP(phoneNumber) {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, 'recaptcha-container', {
        size: 'invisible'
      });
    }
    this.confirmationResult = await signInWithPhoneNumber(firebaseAuth, phoneNumber, window.recaptchaVerifier);
    return this.confirmationResult;
  },

  async verifyPhoneOTP(otp) {
    if (!this.confirmationResult) throw new Error('No OTP sent yet');
    const cred = await this.confirmationResult.confirm(otp);
    const user = cred.user;
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        username: user.phoneNumber,
        email: '',
        profilePic: null,
        createdAt: serverTimestamp(),
        xp: 0,
        level: 1,
        achievements: [],
        unlockedRewards: []
      });
    }
    return user;
  },

  async logout() {
    await signOut(firebaseAuth);
    this.currentUser = null;
    this.userData = null;
    localStorage.removeItem('audix_session');
    sessionStorage.removeItem('audix_session');
  },

  async updateProfile(updates) {
    if (!this.currentUser) throw new Error('Not logged in');
    const ref = doc(db, 'users', this.currentUser.uid);
    await updateDoc(ref, updates);
    this.userData = { ...this.userData, ...updates };
    if (updates.username || updates.profilePic) {
      await fbUpdateProfile(this.currentUser, {
        displayName: updates.username || this.currentUser.displayName,
        photoURL: updates.profilePic || this.currentUser.photoURL
      });
    }
    this.updateUI();
    this.broadcastProfileUpdate();
    return this.userData;
  },

  async changePassword(oldPassword, newPassword) {
    if (!this.currentUser) throw new Error('Not logged in');
    if (!newPassword || newPassword.length < 6) throw new Error('New password must be at least 6 characters');
    const credential = EmailAuthProvider.credential(this.currentUser.email, oldPassword);
    await reauthenticateWithCredential(this.currentUser, credential);
    await updatePassword(this.currentUser, newPassword);
  },

  async deleteAccount() {
    if (!this.currentUser) throw new Error('Not logged in');
    const uid = this.currentUser.uid;
    await deleteDoc(doc(db, 'users', uid));
    await deleteDoc(doc(db, 'achievements', uid));
    await deleteUser(this.currentUser);
  },

  getUserId() {
    return this.currentUser ? this.currentUser.uid : null;
  },

  getUsername() {
    return this.userData?.username || this.currentUser?.displayName || 'User';
  },

  getProfilePic() {
    return this.userData?.profilePic || this.currentUser?.photoURL || null;
  },

  bindEvents() {
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(tab.dataset.tab + 'Panel').classList.add('active');
      });
    });

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        try {
          await this.login(email, password);
          Utils.toast('Welcome back!');
        } catch (err) {
          Utils.toast(err.message, 'error');
        }
      });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirm = document.getElementById('regPasswordConfirm').value;
        if (password !== confirm) { Utils.toast('Passwords do not match', 'error'); return; }
        try {
          await this.register(username, email, password);
          Utils.toast('Account created! Welcome, ' + username + '!');
        } catch (err) {
          Utils.toast(err.message, 'error');
        }
      });
    }

    // Phone OTP events
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    if (sendOtpBtn) {
      sendOtpBtn.addEventListener('click', async () => {
        const phone = document.getElementById('phoneNumber').value.trim();
        if (!phone) { Utils.toast('Enter a phone number', 'error'); return; }
        try {
          sendOtpBtn.textContent = 'Sending...';
          sendOtpBtn.disabled = true;
          await this.sendPhoneOTP(phone);
          document.getElementById('phoneStep1').style.display = 'none';
          document.getElementById('phoneStep2').style.display = 'block';
          Utils.toast('OTP sent!');
        } catch (err) {
          Utils.toast(err.message, 'error');
          sendOtpBtn.textContent = 'Send OTP';
          sendOtpBtn.disabled = false;
        }
      });
    }

    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    if (verifyOtpBtn) {
      verifyOtpBtn.addEventListener('click', async () => {
        const otp = document.getElementById('otpInput').value.trim();
        if (!otp) { Utils.toast('Enter the OTP', 'error'); return; }
        try {
          verifyOtpBtn.textContent = 'Verifying...';
          verifyOtpBtn.disabled = true;
          await this.verifyPhoneOTP(otp);
          Utils.toast('Phone login successful!');
        } catch (err) {
          Utils.toast(err.message, 'error');
          verifyOtpBtn.textContent = 'Verify OTP';
          verifyOtpBtn.disabled = false;
        }
      });
    }

    const resendOtpBtn = document.getElementById('resendOtpBtn');
    if (resendOtpBtn) {
      resendOtpBtn.addEventListener('click', () => {
        document.getElementById('phoneStep1').style.display = 'block';
        document.getElementById('phoneStep2').style.display = 'none';
        document.getElementById('sendOtpBtn').textContent = 'Send OTP';
        document.getElementById('sendOtpBtn').disabled = false;
        window.recaptchaVerifier = null;
      });
    }

    const avatarBtn = document.getElementById('userAvatarBtn');
    if (avatarBtn) {
      avatarBtn.addEventListener('click', () => { window.location.hash = 'profile'; });
    }
  },

  renderGoogleButton() {
    const container = document.getElementById('googleSignInBtn');
    if (!container) return;
    container.innerHTML = `<button class="btn-google" id="firebaseGoogleBtn" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 16px;background:#fff;color:#333;border:none;border-radius:8px;font-size:14px;cursor:pointer;justify-content:center;">
      <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
      Continue with Google
    </button>`;

    document.getElementById('firebaseGoogleBtn').addEventListener('click', async () => {
      try {
        await this.googleLogin();
        Utils.toast('Welcome!');
      } catch (err) {
        Utils.toast('Google login failed: ' + err.message, 'error');
      }
    });
  },

  showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.remove('hidden');
  },

  hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.add('hidden');
  },

  updateUI() {
    const isLoggedIn = !!this.currentUser;

    // Phone OTP events
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    if (sendOtpBtn) {
      sendOtpBtn.addEventListener('click', async () => {
        const phone = document.getElementById('phoneNumber').value.trim();
        if (!phone) { Utils.toast('Enter a phone number', 'error'); return; }
        try {
          sendOtpBtn.textContent = 'Sending...';
          sendOtpBtn.disabled = true;
          await this.sendPhoneOTP(phone);
          document.getElementById('phoneStep1').style.display = 'none';
          document.getElementById('phoneStep2').style.display = 'block';
          Utils.toast('OTP sent!');
        } catch (err) {
          Utils.toast(err.message, 'error');
          sendOtpBtn.textContent = 'Send OTP';
          sendOtpBtn.disabled = false;
        }
      });
    }

    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    if (verifyOtpBtn) {
      verifyOtpBtn.addEventListener('click', async () => {
        const otp = document.getElementById('otpInput').value.trim();
        if (!otp) { Utils.toast('Enter the OTP', 'error'); return; }
        try {
          verifyOtpBtn.textContent = 'Verifying...';
          verifyOtpBtn.disabled = true;
          await this.verifyPhoneOTP(otp);
          Utils.toast('Phone login successful!');
        } catch (err) {
          Utils.toast(err.message, 'error');
          verifyOtpBtn.textContent = 'Verify OTP';
          verifyOtpBtn.disabled = false;
        }
      });
    }

    const resendOtpBtn = document.getElementById('resendOtpBtn');
    if (resendOtpBtn) {
      resendOtpBtn.addEventListener('click', () => {
        document.getElementById('phoneStep1').style.display = 'block';
        document.getElementById('phoneStep2').style.display = 'none';
        document.getElementById('sendOtpBtn').textContent = 'Send OTP';
        document.getElementById('sendOtpBtn').disabled = false;
        window.recaptchaVerifier = null;
      });
    }

    const avatarBtn = document.getElementById('userAvatarBtn');
    const headerPfp = document.getElementById('headerPfp');
    if (avatarBtn && headerPfp) {
      avatarBtn.classList.toggle('hidden', !isLoggedIn);
      const pic = this.getProfilePic();
      if (pic) {
        headerPfp.src = pic;
        headerPfp.classList.remove('hidden');
      } else {
        headerPfp.classList.add('hidden');
        avatarBtn.textContent = isLoggedIn ? this.getUsername().charAt(0).toUpperCase() : '';
      }
    }

    const sidebarUser = document.getElementById('sidebarUser');
    const sidebarPfp = document.getElementById('sidebarPfp');
    const sidebarUsername = document.getElementById('sidebarUsername');
    const sidebarEmail = document.getElementById('sidebarEmail');
    if (sidebarUser) {
      sidebarUser.classList.toggle('hidden', !isLoggedIn);
      if (isLoggedIn) {
        const pic = this.getProfilePic();
        if (sidebarPfp) {
          if (pic) { sidebarPfp.src = pic; sidebarPfp.classList.remove('hidden'); }
          else sidebarPfp.classList.add('hidden');
        }
        if (sidebarUsername) sidebarUsername.textContent = this.getUsername();
        if (sidebarEmail) sidebarEmail.textContent = this.currentUser.email || '';
      }
    }

    if (typeof Profile !== 'undefined') Profile.updateDisplay();
    if (typeof Notifications !== 'undefined') Notifications.updateProfileInfo();
  },

  broadcastProfileUpdate() {
    if (typeof Profile !== 'undefined') Profile.updateDisplay();
    if (typeof Notifications !== 'undefined') Notifications.updateProfileInfo();
    const sidebarUsername = document.getElementById('sidebarUsername');
    const sidebarEmail = document.getElementById('sidebarEmail');
    const sidebarPfp = document.getElementById('sidebarPfp');
    if (this.userData) {
      if (sidebarUsername) sidebarUsername.textContent = this.getUsername();
      if (sidebarEmail) sidebarEmail.textContent = this.currentUser?.email || '';
      const pic = this.getProfilePic();
      if (sidebarPfp && pic) {
        sidebarPfp.src = pic;
        sidebarPfp.classList.remove('hidden');
      }
    }
  }
};

export { db, firebaseAuth };
window.Auth = Auth;
export default Auth;
