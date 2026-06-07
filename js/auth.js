/* ============================================
   AUTHENTICATION SYSTEM
   Email/Password + Google OAuth (NO OTP)
   ============================================ */

const Auth = {
  currentUser: null,
  db: null,
  googleClientId: 'YOUR_GOOGLE_CLIENT_ID', // Replace with actual Google OAuth Client ID

  async init() {
    console.log('[Auth] init() starting...');
    await this.openDB();
    await this.restoreSession();
    this.bindEvents();
    this.renderGoogleButton();
    console.log('[Auth] init() complete. User:', this.currentUser ? this.currentUser.email : 'none');
  },

  openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('AudixDB', 2);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => { this.db = req.result; resolve(); };
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        console.log('[Auth] DB upgrade to v2...');
        // Users store
        if (!db.objectStoreNames.contains('users')) {
          const usersStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
          usersStore.createIndex('email', 'email', { unique: true });
          usersStore.createIndex('googleId', 'googleId', { unique: false });
        }
        // Per-user data stores
        if (!db.objectStoreNames.contains('userSongs')) {
          db.createObjectStore('userSongs', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('userAchievements')) {
          db.createObjectStore('userAchievements', { keyPath: 'userId' });
        }
        if (!db.objectStoreNames.contains('userSettings')) {
          db.createObjectStore('userSettings', { keyPath: 'userId' });
        }
        // Migrate old songs store if exists
        if (!db.objectStoreNames.contains('songs')) {
          db.createObjectStore('songs', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  },

  // Simple hash function (SHA-256 based, NOT for production security)
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
    console.log('[Auth] Registering user:', email);
    if (!email || !password || password.length < 6) {
      throw new Error('Email required and password must be at least 6 characters');
    }
    if (!username || username.length < 3) {
      throw new Error('Username must be at least 3 characters');
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
          console.log('[Auth] User registered with id:', user.id);
          resolve(user);
        };
        addReq.onerror = () => reject(addReq.error);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async login(email, password) {
    console.log('[Auth] Login attempt:', email);
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
        console.log('[Auth] Login successful for:', email);
        resolve(user);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async googleLogin(credential) {
    console.log('[Auth] Google login attempt');
    // Decode JWT from Google
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
          // Update existing Google user
          user.profilePic = profilePic;
          user.email = email;
          user.username = username;
          store.put(user);
          console.log('[Auth] Google user updated:', email);
          resolve(user);
        } else {
          // Check if email already exists
          const emailIndex = store.index('email');
          const emailReq = emailIndex.get(email);
          emailReq.onsuccess = () => {
            if (emailReq.result) {
              // Link Google to existing account
              user = emailReq.result;
              user.googleId = googleId;
              user.profilePic = profilePic;
              store.put(user);
              console.log('[Auth] Linked Google to existing user:', email);
              resolve(user);
            } else {
              // Create new Google user
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
                console.log('[Auth] New Google user created:', email);
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
    console.log('[Auth] Session set for user:', user.email);
  },

  async restoreSession() {
    const session = localStorage.getItem('audix_session') || sessionStorage.getItem('audix_session');
    if (!session) {
      console.log('[Auth] No session found');
      this.showLoginModal();
      return;
    }
    try {
      const data = JSON.parse(session);
      // Verify user still exists in DB
      const user = await this.getUserById(data.userId);
      if (user) {
        this.currentUser = user;
        this.updateUI();
        console.log('[Auth] Session restored for:', user.email);
      } else {
        console.log('[Auth] Stored session user not found, clearing');
        this.logout();
      }
    } catch (e) {
      console.error('[Auth] Session restore error:', e);
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
    console.log('[Auth] Logging out...');
    this.currentUser = null;
    localStorage.removeItem('audix_session');
    sessionStorage.removeItem('audix_session');
    // Stop audio
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
      const tx = this.db.transaction(['users', 'userSongs', 'userAchievements', 'userSettings'], 'readwrite');

      tx.objectStore('users').delete(userId);
      tx.objectStore('userAchievements').delete(userId);
      tx.objectStore('userSettings').delete(userId);

      // Delete user songs
      const songsStore = tx.objectStore('userSongs');
      const allReq = songsStore.getAll();
      allReq.onsuccess = () => {
        const songs = allReq.result || [];
        songs.forEach(song => {
          if (song.userId === userId) songsStore.delete(song.id);
        });
      };

      tx.oncomplete = () => {
        console.log('[Auth] Account deleted for user:', userId);
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
        // Update current user if it's the same
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
          if (typeof Utils !== 'undefined') Utils.toast('Welcome back, ' + user.username + '!');
          // Reload user data
          if (typeof Library !== 'undefined') await Library.loadUserSongs();
          if (typeof Achievements !== 'undefined') await Achievements.loadUserAchievements();
        } catch (err) {
          if (typeof Utils !== 'undefined') Utils.toast(err.message, 'error');
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
          if (typeof Utils !== 'undefined') Utils.toast('Passwords do not match', 'error');
          return;
        }
        try {
          const user = await this.register(username, email, password);
          this.setSession(user, true);
          this.hideLoginModal();
          if (typeof Utils !== 'undefined') Utils.toast('Account created! Welcome, ' + username + '!');
        } catch (err) {
          if (typeof Utils !== 'undefined') Utils.toast(err.message, 'error');
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
    if (this.googleClientId === 'YOUR_GOOGLE_CLIENT_ID') {
      container.innerHTML = '<p style="color:var(--text-secondary);font-size:0.8rem;text-align:center;">Google Login requires a Client ID.<br>See README for setup.</p>';
      return;
    }
    // Render Google Sign-In button
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.id.initialize({
        client_id: this.googleClientId,
        callback: (response) => this.handleGoogleResponse(response)
      });
      google.accounts.id.renderButton(container, {
        theme: 'filled_black',
        size: 'large',
        width: '100%'
      });
    }
  },

  async handleGoogleResponse(response) {
    try {
      const user = await this.googleLogin(response.credential);
      this.setSession(user, true);
      this.hideLoginModal();
      if (typeof Utils !== 'undefined') Utils.toast('Welcome, ' + user.username + '!');
      if (typeof Library !== 'undefined') await Library.loadUserSongs();
      if (typeof Achievements !== 'undefined') await Achievements.loadUserAchievements();
    } catch (err) {
      if (typeof Utils !== 'undefined') Utils.toast('Google login failed: ' + err.message, 'error');
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

    // Header avatar
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

    // Sidebar user
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

    // Login modal visibility
    if (isLoggedIn) {
      this.hideLoginModal();
    } else {
      this.showLoginModal();
    }

    // Update profile page if visible
    if (typeof Profile !== 'undefined') Profile.updateDisplay();
  },

  getUserId() {
    return this.currentUser ? this.currentUser.id : null;
  }
};

// Global handler for Google callback (called by GIS library)
window.handleGoogleCredentialResponse = (response) => {
  if (typeof Auth !== 'undefined') {
    Auth.handleGoogleResponse(response);
  }
};
