/* ============================================
   AUTHENTICATION SYSTEM
   Email/Password + Google OAuth (NO OTP)
   ============================================ */

const Auth = {
  currentUser: null,
  db: null,
  // Client ID stored in code only, NEVER displayed in UI
  googleClientId: '478887203737db4cr9gjp22bqvl941k5fl11ef45q22s.apps.googleusercontent.com',

  async init() {
    console.log('[Auth] init()');
    await this.openDB();
    await this.restoreSession();
    this.bindEvents();
    this.renderGoogleButton();
  },

  openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('AudixDB', 2);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => { this.db = req.result; resolve(); };
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('users')) {
          const usersStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
          usersStore.createIndex('email', 'email', { unique: true });
          usersStore.createIndex('googleId', 'googleId', { unique: false });
        }
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
        if (!db.objectStoreNames.contains('songs')) {
          db.createObjectStore('songs', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  },

  async hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  generateSalt() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  },

  async register(username, email, password) {
    if (!email || !password || password.length < 6) {
      throw new Error('Email required and password must be at least 6 characters');
    }
    if (!username || username.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Please enter a valid email address');
    }

    return new Promise(async (resolve, reject) => {
      const tx = this.db.transaction('users', 'readwrite');
      const store = tx.objectStore('users');
      const index = store.index('email');
      const req = index.get(email);

      req.onsuccess = async () => {
        if (req.result) {
          reject(new Error('Email already registered'));
          return;
        }
        const salt = this.generateSalt();
        const passwordHash = await this.hashPassword(password, salt);
        const user = {
          username,
          email,
          passwordHash,
          salt,
          profilePic: null,
          createdAt: Date.now(),
          googleId: null
        };
        const addReq = store.add(user);
        addReq.onsuccess = () => {
          user.id = addReq.result;
          resolve(user);
        };
        addReq.onerror = () => reject(addReq.error);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async login(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    return new Promise(async (resolve, reject) => {
      const tx = this.db.transaction('users', 'readonly');
      const store = tx.objectStore('users');
      const index = store.index('email');
      const req = index.get(email);

      req.onsuccess = async () => {
        const user = req.result;
        if (!user) {
          reject(new Error('User not found'));
          return;
        }
        const hash = await this.hashPassword(password, user.salt);
        if (hash !== user.passwordHash) {
          reject(new Error('Incorrect password'));
          return;
        }
        resolve(user);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async googleLogin(credential) {
    const payload = this.parseJwt(credential);
    if (!payload || !payload.sub) {
      throw new Error('Invalid Google credential');
    }

    const googleId = payload.sub;
    const email = payload.email;
    const username = payload.name || email.split('@')[0];
    const profilePic = payload.picture || null;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('users', 'readwrite');
      const store = tx.objectStore('users');
      const index = store.index('googleId');
      const req = index.get(googleId);

      req.onsuccess = () => {
        let user = req.result;
        if (user) {
          user.profilePic = profilePic;
          user.email = email;
          user.username = username;
          store.put(user);
          resolve(user);
        } else {
          const emailIndex = store.index('email');
          const emailReq = emailIndex.get(email);
          emailReq.onsuccess = () => {
            if (emailReq.result) {
              user = emailReq.result;
              user.googleId = googleId;
              user.profilePic = profilePic;
              store.put(user);
              resolve(user);
            } else {
              const newUser = {
                username,
                email,
                passwordHash: null,
                salt: null,
                profilePic,
                createdAt: Date.now(),
                googleId
              };
              const addReq = store.add(newUser);
              addReq.onsuccess = () => {
                newUser.id = addReq.result;
                resolve(newUser);
              };
              addReq.onerror = () => reject(addReq.error);
            }
          };
        }
      };
      req.onerror = () => reject(req.error);
    });
  },

  parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('[Auth] JWT parse error:', e);
      return null;
    }
  },

  setSession(user, rememberMe = true) {
    this.currentUser = user;
    const session = {
      userId: user.id,
      email: user.email,
      username: user.username,
      profilePic: user.profilePic,
      googleId: user.googleId,
      timestamp: Date.now(),
      rememberMe
    };
    if (rememberMe) {
      localStorage.setItem('audix_session', JSON.stringify(session));
    } else {
      sessionStorage.setItem('audix_session', JSON.stringify(session));
    }
    this.updateUI();
    // Broadcast profile change to all UI components
    this.broadcastProfileUpdate();
  },

  async restoreSession() {
    const session = localStorage.getItem('audix_session') || sessionStorage.getItem('audix_session');
    if (!session) {
      this.showLoginModal();
      return;
    }
    try {
      const data = JSON.parse(session);
      const user = await this.getUserById(data.userId);
      if (user) {
        this.currentUser = user;
        this.updateUI();
        this.hideLoginModal();
        // Load user data
        if (typeof Library !== 'undefined') await Library.loadUserSongs();
        if (typeof Achievements !== 'undefined') await Achievements.loadUserAchievements();
        if (typeof Settings !== 'undefined') await Settings.load();
        this.broadcastProfileUpdate();
      } else {
        this.logout();
      }
    } catch (e) {
      this.logout();
    }
  },

  getUserById(id) {
    return new Promise((resolve) => {
      if (!this.db) { resolve(null); return; }
      const tx = this.db.transaction('users', 'readonly');
      const store = tx.objectStore('users');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem('audix_session');
    sessionStorage.removeItem('audix_session');
    if (typeof Player !== 'undefined' && Player.audio) {
      Player.audio.pause();
      Player.audio.src = '';
    }
    this.updateUI();
    this.showLoginModal();
    if (typeof Utils !== 'undefined') Utils.toast('Logged out successfully');
  },

  deleteAccount() {
    return new Promise((resolve, reject) => {
      if (!this.currentUser) { reject(new Error('Not logged in')); return; }
      const userId = this.currentUser.id;
      const tx = this.db.transaction(['users', 'userSongs', 'userAchievements', 'userSettings', 'userLyrics'], 'readwrite');

      tx.objectStore('users').delete(userId);
      tx.objectStore('userAchievements').delete(userId);
      tx.objectStore('userSettings').delete(userId);
      tx.objectStore('userLyrics').delete(userId);

      const songsStore = tx.objectStore('userSongs');
      const allReq = songsStore.getAll();
      allReq.onsuccess = () => {
        const songs = allReq.result || [];
        songs.forEach(song => {
          if (song.userId === userId) songsStore.delete(song.id);
        });
      };

      tx.oncomplete = () => {
        this.logout();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  },

  updateProfile(userId, updates) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('users', 'readwrite');
      const store = tx.objectStore('users');
      const req = store.get(userId);
      req.onsuccess = () => {
        const user = req.result;
        if (!user) { reject(new Error('User not found')); return; }
        Object.assign(user, updates);
        store.put(user);
        if (this.currentUser && this.currentUser.id === userId) {
          this.currentUser = user;
          this.setSession(user, true);
        }
        resolve(user);
      };
      req.onerror = () => reject(req.error);
    });
  },

  changePassword(userId, oldPassword, newPassword) {
    return new Promise(async (resolve, reject) => {
      if (!newPassword || newPassword.length < 6) {
        reject(new Error('New password must be at least 6 characters'));
        return;
      }
      const tx = this.db.transaction('users', 'readwrite');
      const store = tx.objectStore('users');
      const req = store.get(userId);
      req.onsuccess = async () => {
        const user = req.result;
        if (!user || !user.passwordHash) {
          reject(new Error('Password change not available for Google accounts'));
          return;
        }
        const oldHash = await this.hashPassword(oldPassword, user.salt);
        if (oldHash !== user.passwordHash) {
          reject(new Error('Current password is incorrect'));
          return;
        }
        const newSalt = this.generateSalt();
        user.passwordHash = await this.hashPassword(newPassword, newSalt);
        user.salt = newSalt;
        store.put(user);
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  },

  bindEvents() {
    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(tab.dataset.tab + 'Panel').classList.add('active');
      });
    });

    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        try {
          const user = await this.login(email, password);
          this.setSession(user, rememberMe);
          this.hideLoginModal();
          Utils.toast('Welcome back, ' + user.username + '!');
          if (typeof Library !== 'undefined') await Library.loadUserSongs();
          if (typeof Achievements !== 'undefined') await Achievements.loadUserAchievements();
        } catch (err) {
          Utils.toast(err.message, 'error');
        }
      });
    }

    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirm = document.getElementById('regPasswordConfirm').value;
        if (password !== confirm) {
          Utils.toast('Passwords do not match', 'error');
          return;
        }
        try {
          const user = await this.register(username, email, password);
          this.setSession(user, true);
          this.hideLoginModal();
          Utils.toast('Account created! Welcome, ' + username + '!');
        } catch (err) {
          Utils.toast(err.message, 'error');
        }
      });
    }

    // User avatar button
    const avatarBtn = document.getElementById('userAvatarBtn');
    if (avatarBtn) {
      avatarBtn.addEventListener('click', () => {
        window.location.hash = 'profile';
      });
    }
  },

  renderGoogleButton() {
    const container = document.getElementById('googleSignInBtn');
    if (!container) return;
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.id.initialize({
        client_id: this.googleClientId,
        callback: (response) => this.handleGoogleResponse(response)
      });
      google.accounts.id.renderButton(container, {
        theme: 'filled_black',
        size: 'large',
        width: '100%',
        text: 'continue_with'
      });
    } else {
      // Google script not loaded yet, retry
      setTimeout(() => this.renderGoogleButton(), 500);
    }
  },

  async handleGoogleResponse(response) {
    try {
      const user = await this.googleLogin(response.credential);
      this.setSession(user, true);
      this.hideLoginModal();
      Utils.toast('Welcome, ' + user.username + '!');
      if (typeof Library !== 'undefined') await Library.loadUserSongs();
      if (typeof Achievements !== 'undefined') await Achievements.loadUserAchievements();
    } catch (err) {
      Utils.toast('Google login failed: ' + err.message, 'error');
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

    const avatarBtn = document.getElementById('userAvatarBtn');
    const headerPfp = document.getElementById('headerPfp');
    if (avatarBtn && headerPfp) {
      avatarBtn.classList.toggle('hidden', !isLoggedIn);
      if (this.currentUser && this.currentUser.profilePic) {
        headerPfp.src = this.currentUser.profilePic;
        headerPfp.classList.remove('hidden');
      } else {
        headerPfp.classList.add('hidden');
        avatarBtn.textContent = this.currentUser ? this.currentUser.username.charAt(0).toUpperCase() : '';
      }
    }

    const sidebarUser = document.getElementById('sidebarUser');
    const sidebarPfp = document.getElementById('sidebarPfp');
    const sidebarUsername = document.getElementById('sidebarUsername');
    const sidebarEmail = document.getElementById('sidebarEmail');
    if (sidebarUser) {
      sidebarUser.classList.toggle('hidden', !isLoggedIn);
      if (this.currentUser) {
        if (sidebarPfp) {
          if (this.currentUser.profilePic) {
            sidebarPfp.src = this.currentUser.profilePic;
            sidebarPfp.classList.remove('hidden');
          } else {
            sidebarPfp.classList.add('hidden');
          }
        }
        if (sidebarUsername) sidebarUsername.textContent = this.currentUser.username;
        if (sidebarEmail) sidebarEmail.textContent = this.currentUser.email;
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
    // Update all UI components that show user info
    if (typeof Profile !== 'undefined') Profile.updateDisplay();
    if (typeof Notifications !== 'undefined') Notifications.updateProfileInfo();

    // Update sidebar
    const sidebarUsername = document.getElementById('sidebarUsername');
    const sidebarEmail = document.getElementById('sidebarEmail');
    const sidebarPfp = document.getElementById('sidebarPfp');
    if (this.currentUser) {
      if (sidebarUsername) sidebarUsername.textContent = this.currentUser.username;
      if (sidebarEmail) sidebarEmail.textContent = this.currentUser.email;
      if (sidebarPfp && this.currentUser.profilePic) {
        sidebarPfp.src = this.currentUser.profilePic;
        sidebarPfp.classList.remove('hidden');
      }
    }
  },

  getUserId() {
    return this.currentUser ? this.currentUser.id : null;
  }
};

window.handleGoogleCredentialResponse = (response) => {
  if (typeof Auth !== 'undefined') {
    Auth.handleGoogleResponse(response);
  }
};
