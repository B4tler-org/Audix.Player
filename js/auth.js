/* ============================================
   AUTHENTICATION SYSTEM — v3.4 (Firebase Google Auth)
   FIX: Explicit UI update after popup success + guards against modal re-show
   ============================================ */

const Auth = {
  currentUser: null,
  db: null,
  idb: null,
  firebaseReady: false,
  uiUpdatePending: false,

  async init() {
    console.log('[Auth] init() starting...');

    if (typeof firebase === 'undefined') {
      console.error('[Auth] Firebase SDK not loaded!');
      this.showError('Firebase failed to load. Check your internet connection.');
      return;
    }
    if (!firebase.apps || firebase.apps.length === 0) {
      console.error('[Auth] Firebase not initialized!');
      this.showError('Firebase not initialized.');
      return;
    }
    if (!firebase.auth) {
      console.error('[Auth] Firebase Auth SDK not loaded!');
      this.showError('Firebase Auth SDK missing.');
      return;
    }
    if (!firebase.firestore) {
      console.error('[Auth] Firebase Firestore SDK not loaded!');
      this.showError('Firebase Firestore SDK missing.');
      return;
    }

    this.firebaseReady = true;
    console.log('[Auth] Firebase SDKs verified: OK');

    this.idb = await this.openIDB();
    this.db = firebase.firestore();
    this.bindEvents();

    // Handle redirect result (if user came back from a redirect)
    try {
      const result = await firebase.auth().getRedirectResult();
      if (result.user) {
        console.log('[Auth] Redirect result found:', result.user.uid);
        this.currentUser = result.user;
        await this.ensureUserProfile(result.user);
        this.hideLoginModal();
        this.updateUI();
        this.loadUserData();
        this.broadcastProfileUpdate();
      }
    } catch (error) {
      if (error.code && error.code !== 'auth/no-auth-event') {
        console.warn('[Auth] getRedirectResult error:', error.code);
      }
    }

    // Auth state listener
    firebase.auth().onAuthStateChanged(async (user) => {
      console.log('[Auth] onAuthStateChanged fired. User:', user ? user.uid : 'null');
      if (user) {
        this.currentUser = user;
        await this.ensureUserProfile(user);
        this.hideLoginModal();
        this.updateUI();
        this.loadUserData();
        this.broadcastProfileUpdate();
      } else {
        this.currentUser = null;
        this.updateUI();
        // Only show login modal if we're sure there's no user
        if (!firebase.auth().currentUser) {
          this.showLoginModal();
        }
      }
    });

    // Re-check auth state when user returns to tab (mobile popup fix)
    window.addEventListener('focus', () => {
      const user = firebase.auth().currentUser;
      if (user && this.currentUser) {
        console.log('[Auth] Focus event — user still signed in');
        this.hideLoginModal();
      } else if (user && !this.currentUser) {
        console.log('[Auth] Focus event — user found, updating UI');
        this.currentUser = user;
        this.hideLoginModal();
        this.updateUI();
        this.loadUserData();
        this.broadcastProfileUpdate();
      }
    });

    console.log('[Auth] init() complete');
  },

  openIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('AudixDB', 3);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('userSongs')) {
          db.createObjectStore('userSongs', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('userAchievements')) {
          db.createObjectStore('userAchievements', { keyPath: 'userId' });
        }
        if (!db.objectStoreNames.contains('userSettings')) {
          db.createObjectStore('userSettings', { keyPath: 'userId' });
        }
        if (!db.objectStoreNames.contains('userLyrics')) {
          db.createObjectStore('userLyrics', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('userGamification')) {
          db.createObjectStore('userGamification', { keyPath: 'userId' });
        }
      };
    });
  },

  async ensureUserProfile(user) {
    try {
      const userRef = this.db.collection('users').doc(user.uid);
      const doc = await userRef.get();
      if (!doc.exists) {
        await userRef.set({
          uid: user.uid,
          displayName: user.displayName || 'User',
          email: user.email,
          photoURL: user.photoURL || null,
          customPhotoURL: null,
          xp: 0,
          level: 1,
          achievements: [],
          unlockedRewards: [],
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('[Auth] Firestore profile created');
      } else {
        console.log('[Auth] Firestore profile exists');
      }
    } catch (err) {
      console.error('[Auth] ensureUserProfile error:', err);
    }
  },

  async loadUserData() {
    try {
      if (typeof Library !== 'undefined') await Library.loadUserSongs();
      if (typeof Achievements !== 'undefined') await Achievements.loadUserAchievements();
      if (typeof Settings !== 'undefined') await Settings.load();
      if (typeof Gamification !== 'undefined') Gamification.load();
    } catch (e) {
      console.error('[Auth] loadUserData error:', e);
    }
  },

  async loginWithGoogle() {
    if (!this.firebaseReady) {
      this.showError('Firebase not ready. Please refresh.');
      return;
    }

    const btn = document.getElementById('googleSignInBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span style="display:inline-block;width:16px;height:16px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></span> Connecting...';
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      console.log('[Auth] Attempting signInWithPopup...');
      const result = await firebase.auth().signInWithPopup(provider);
      console.log('[Auth] Popup login success:', result.user.uid);

      // CRITICAL FIX: Explicitly update UI immediately after popup success
      // (onAuthStateChanged may be delayed or not fire on some mobile browsers)
      this.currentUser = result.user;
      await this.ensureUserProfile(result.user);
      this.hideLoginModal();
      this.updateUI();
      this.loadUserData();
      this.broadcastProfileUpdate();

      if (typeof Utils !== 'undefined') Utils.toast('Welcome, ' + (result.user.displayName || 'User') + '!');

    } catch (error) {
      console.error('[Auth] Google login failed:', error.code, error.message);

      let message = 'Google login failed';
      let isPopupBlocked = false;

      if (error.code === 'auth/popup-closed-by-user') {
        message = 'Login cancelled';
      } else if (error.code === 'auth/popup-blocked') {
        message = 'Popup blocked! Please allow popups for this site, then try again.';
        isPopupBlocked = true;
      } else if (error.code === 'auth/unauthorized-domain') {
        message = 'This domain is not authorized. Add it in Firebase Console > Authentication > Settings > Authorized domains.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        message = 'Account exists with different login method.';
      } else if (error.code === 'auth/network-request-failed') {
        message = 'Network error. Check your connection.';
      } else if (error.code === 'auth/operation-not-supported-in-this-environment') {
        message = 'Google login not supported in this browser. Try Chrome or Safari.';
      } else if (error.code === 'auth/internal-error') {
        message = 'Internal error. Try again or use a different browser.';
      } else {
        message = error.message || 'Unknown login error';
      }

      this.showError(message, isPopupBlocked);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Sign in with Google`;
      }
    }
  },

  logout() {
    firebase.auth().signOut().then(() => {
      console.log('[Auth] User signed out');
      if (typeof Player !== 'undefined' && Player.audio) {
        Player.audio.pause();
        Player.audio.src = '';
      }
      this.currentUser = null;
      this.updateUI();
      this.showLoginModal();
      if (typeof Utils !== 'undefined') Utils.toast('Logged out successfully');
    }).catch((error) => {
      console.error('[Auth] Logout error:', error);
      if (typeof Utils !== 'undefined') Utils.toast('Logout failed: ' + error.message, 'error');
    });
  },

  async updateProfile(userId, updates) {
    if (!this.currentUser || this.currentUser.uid !== userId) {
      throw new Error('User not found or not authenticated');
    }
    try {
      const userRef = this.db.collection('users').doc(userId);
      await userRef.update(updates);
      if (updates.displayName || updates.username) {
        await this.currentUser.updateProfile({ displayName: updates.displayName || updates.username });
      }
      if (updates.customPhotoURL) {
        await this.currentUser.updateProfile({ photoURL: updates.customPhotoURL });
      } else if (updates.photoURL || updates.profilePic) {
        await this.currentUser.updateProfile({ photoURL: updates.photoURL || updates.profilePic });
      }
      console.log('[Auth] Profile updated');
      this.broadcastProfileUpdate();
    } catch (err) {
      console.error('[Auth] updateProfile error:', err);
      throw err;
    }
  },

  async deleteAccount() {
    const user = firebase.auth().currentUser;
    if (!user) {
      if (typeof Utils !== 'undefined') Utils.toast('Not logged in', 'error');
      return Promise.reject(new Error('Not logged in'));
    }
    const confirmed = confirm('WARNING: This will permanently delete your account and ALL your data. This cannot be undone. Are you sure?');
    if (!confirmed) return Promise.resolve();
    try {
      await this.db.collection('users').doc(user.uid).delete();
      await user.delete();
      if (typeof Utils !== 'undefined') Utils.toast('Account deleted');
    } catch (error) {
      console.error('[Auth] Delete account error:', error);
      if (typeof Utils !== 'undefined') Utils.toast('Failed to delete account: ' + error.message, 'error');
      throw error;
    }
  },

  async changePassword() {
    if (typeof Utils !== 'undefined') {
      Utils.toast('Password change is not available for Google sign-in accounts.', 'info');
    }
    return Promise.reject(new Error('Password change not available for Google accounts'));
  },

  bindEvents() {
    const googleBtn = document.getElementById('googleSignInBtn');
    if (googleBtn) {
      googleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[Auth] Google button clicked');
        this.loginWithGoogle();
      });
      console.log('[Auth] Google button listener attached');
    } else {
      console.error('[Auth] googleSignInBtn not found!');
    }

    const avatarBtn = document.getElementById('userAvatarBtn');
    if (avatarBtn) {
      avatarBtn.addEventListener('click', () => { window.location.hash = 'profile'; });
    }
  },

  showError(msg, isPopupBlocked) {
    console.error('[Auth] ERROR:', msg);
    const panel = document.getElementById('loginPanel');
    if (panel) {
      let errEl = document.getElementById('auth-error-msg');
      if (!errEl) {
        errEl = document.createElement('div');
        errEl.id = 'auth-error-msg';
        errEl.style.cssText = 'color:#e74c3c;background:rgba(231,76,60,0.1);padding:10px 14px;border-radius:8px;margin-top:12px;font-size:0.85rem;text-align:center;';
        panel.appendChild(errEl);
      }
      errEl.textContent = msg;

      if (isPopupBlocked) {
        let retryBtn = document.getElementById('auth-retry-btn');
        if (!retryBtn) {
          retryBtn = document.createElement('button');
          retryBtn.id = 'auth-retry-btn';
          retryBtn.textContent = 'Retry Login';
          retryBtn.style.cssText = 'margin-top:8px;padding:8px 16px;background:var(--accent);color:#fff;border:none;border-radius:20px;cursor:pointer;font-size:0.85rem;';
          retryBtn.addEventListener('click', () => this.loginWithGoogle());
          panel.appendChild(retryBtn);
        }
      }
    }
    if (typeof Utils !== 'undefined') Utils.toast(msg, 'error');
  },

  showLoginModal() {
    // GUARD: Don't show login modal if user is already signed in
    if (this.currentUser || firebase.auth().currentUser) {
      console.log('[Auth] showLoginModal() blocked — user is already signed in');
      this.hideLoginModal();
      return;
    }
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.remove('hidden');
  },

  hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.add('hidden');
  },

  updateUI() {
    const isLoggedIn = !!this.currentUser;
    const user = this.currentUser;

    console.log('[Auth] updateUI() — isLoggedIn:', isLoggedIn, 'user:', user ? user.uid : 'null');

    const avatarBtn = document.getElementById('userAvatarBtn');
    const headerPfp = document.getElementById('headerPfp');
    if (avatarBtn && headerPfp) {
      avatarBtn.classList.toggle('hidden', !isLoggedIn);
      if (user && user.photoURL) {
        headerPfp.src = user.photoURL;
        headerPfp.classList.remove('hidden');
      } else {
        headerPfp.classList.add('hidden');
        avatarBtn.textContent = user ? (user.displayName || user.email || 'U').charAt(0).toUpperCase() : '';
      }
    }

    const sidebarUser = document.getElementById('sidebarUser');
    const sidebarPfp = document.getElementById('sidebarPfp');
    const sidebarUsername = document.getElementById('sidebarUsername');
    const sidebarEmail = document.getElementById('sidebarEmail');
    if (sidebarUser) {
      sidebarUser.classList.toggle('hidden', !isLoggedIn);
      if (user) {
        if (sidebarPfp) {
          if (user.photoURL) { sidebarPfp.src = user.photoURL; sidebarPfp.classList.remove('hidden'); }
          else { sidebarPfp.classList.add('hidden'); }
        }
        if (sidebarUsername) sidebarUsername.textContent = user.displayName || 'User';
        if (sidebarEmail) sidebarEmail.textContent = user.email || '';
      }
    }

    if (isLoggedIn) {
      this.hideLoginModal();
    } else {
      this.showLoginModal();
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
    if (this.currentUser) {
      if (sidebarUsername) sidebarUsername.textContent = this.currentUser.displayName || 'User';
      if (sidebarEmail) sidebarEmail.textContent = this.currentUser.email || '';
      if (sidebarPfp && this.currentUser.photoURL) { sidebarPfp.src = this.currentUser.photoURL; sidebarPfp.classList.remove('hidden'); }
    }
  },

  getUserId() {
    return this.currentUser ? this.currentUser.uid : null;
  }
};
