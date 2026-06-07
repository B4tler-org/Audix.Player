/* ============================================
   AUTHENTICATION SYSTEM — v3.1 (Firebase Google Auth)
   NO STORAGE DEPENDENCY — Profile pics stored in Firestore as base64
   Removed: custom login, registration, OTP, passwords, JWT parsing, Storage
   ============================================ */

const Auth = {
  currentUser: null,
  db: null,           // Firestore reference
  idb: null,          // IndexedDB reference (kept for songs/achievements)

  async init() {
    console.log('[Auth] init() — Firebase Google Auth v3.1 (No Storage)');
    this.idb = await this.openIDB();
    this.db = firebase.firestore();
    this.bindEvents();

    firebase.auth().onAuthStateChanged(async (user) => {
      if (user) {
        console.log('[Auth] onAuthStateChanged — user signed in:', user.uid);
        this.currentUser = user;
        await this.ensureUserProfile(user);
        this.hideLoginModal();
        this.updateUI();

        if (typeof Library !== 'undefined') await Library.loadUserSongs();
        if (typeof Achievements !== 'undefined') await Achievements.loadUserAchievements();
        if (typeof Settings !== 'undefined') await Settings.load();
        if (typeof Gamification !== 'undefined') Gamification.load();

        this.broadcastProfileUpdate();
      } else {
        console.log('[Auth] onAuthStateChanged — no user');
        this.currentUser = null;
        this.updateUI();
        this.showLoginModal();
      }
    });
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
        const profile = {
          uid: user.uid,
          displayName: user.displayName || 'User',
          email: user.email,
          photoURL: user.photoURL || null,
          customPhotoURL: null,  // base64 custom pic stored here
          xp: 0,
          level: 1,
          achievements: [],
          unlockedRewards: [],
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await userRef.set(profile);
        console.log('[Auth] Firestore profile created for:', user.uid);
      } else {
        console.log('[Auth] Firestore profile exists for:', user.uid);
      }
    } catch (err) {
      console.error('[Auth] ensureUserProfile error:', err);
    }
  },

  async loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await firebase.auth().signInWithPopup(provider);
      console.log('[Auth] Google login success — UID:', result.user.uid);
    } catch (error) {
      console.error('[Auth] Google login failed:', error.code, error.message);
      let message = 'Google login failed';
      if (error.code === 'auth/popup-closed-by-user') {
        message = 'Login cancelled';
      } else if (error.code === 'auth/popup-blocked') {
        message = 'Popup blocked. Please allow popups for this site.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        message = 'Account exists with different login method.';
      } else if (error.code === 'auth/network-request-failed') {
        message = 'Network error. Check your connection.';
      } else {
        message = error.message;
      }
      if (typeof Utils !== 'undefined') Utils.toast(message, 'error');
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
        const newName = updates.displayName || updates.username;
        await this.currentUser.updateProfile({ displayName: newName });
      }
      if (updates.customPhotoURL) {
        await this.currentUser.updateProfile({ photoURL: updates.customPhotoURL });
      } else if (updates.photoURL || updates.profilePic) {
        await this.currentUser.updateProfile({ photoURL: updates.photoURL || updates.profilePic });
      }

      console.log('[Auth] Profile updated in Firestore and Auth');
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
      googleBtn.addEventListener('click', () => this.loginWithGoogle());
    }

    const avatarBtn = document.getElementById('userAvatarBtn');
    if (avatarBtn) {
      avatarBtn.addEventListener('click', () => {
        window.location.hash = 'profile';
      });
    }
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
    const user = this.currentUser;

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
          if (user.photoURL) {
            sidebarPfp.src = user.photoURL;
            sidebarPfp.classList.remove('hidden');
          } else {
            sidebarPfp.classList.add('hidden');
          }
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
      if (sidebarPfp && this.currentUser.photoURL) {
        sidebarPfp.src = this.currentUser.photoURL;
        sidebarPfp.classList.remove('hidden');
      }
    }
  },

  getUserId() {
    return this.currentUser ? this.currentUser.uid : null;
  }
};
