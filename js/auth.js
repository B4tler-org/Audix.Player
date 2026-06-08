/* ============================================
   AUTHENTICATION SYSTEM — v3.6 (Critical Fixes)
   PFP Upload, Tag System, Inventory Fix, 
   Level Recalc, Logout, Admin Badge SVG
   ============================================ */

const Auth = {
  currentUser: null,
  db: null,
  idb: null,
  firebaseReady: false,
  uiUpdatePending: false,
  ADMIN_EMAILS: ['samirkhadka2001@gmail.com', 'utilitiesnepal@gmail.com'],

  async init() {
    console.log('[Auth] init() starting...');

    if (typeof firebase === 'undefined') {
      console.error('[Auth] Firebase SDK not loaded!');
      this.showError('Firebase failed to load. Check your internet connection.');
      return;
    }
    if (window._firebaseSuspended) {
      console.error('[Auth] Firebase API key is suspended. App running in offline mode.');
      this.showError('Firebase API key suspended. The app will work in offline mode. Sign-in is unavailable until a new key is configured.');
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
        if (!firebase.auth().currentUser) {
          this.showLoginModal();
        }
      }
    });

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
        const audixId = await this.generateUniqueAudixId();
        await userRef.set({
          uid: user.uid,
          audixId: audixId,
          displayName: user.displayName || 'User',
          email: user.email,
          photoURL: user.photoURL || null,
          customPhotoURL: null,
          tag: '',
          xp: 0,
          level: 1,
          coins: 0,
          achievements: [],
          unlockedRewards: [],
          inventory: {
            frames: [],
            backgrounds: [],
            avatarBorders: [],
            nameEffects: [],
            badges: [],
            animatedAvatars: [],
            themes: [],
            equipped: {
              frame: null,
              background: null,
              avatarBorder: null,
              nameEffect: null,
              badge: null,
              animatedAvatar: null,
              theme: null
            }
          },
          friends: {
            list: [],
            incoming: [],
            outgoing: [],
            blocked: []
          },
          activityStatus: {
            currentlyPlaying: null,
            artist: null,
            album: null,
            isPlaying: false,
            lastUpdated: null,
            privacy: 'friends'
          },
          adminPerks: {
            equipped: { badge: null, frame: null, verifiedIcon: true, tag: null }
          },
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('[Auth] Firestore profile created with ID:', audixId);
      } else {
        const data = doc.data();
        const updates = {};
        if (!data.audixId) updates.audixId = await this.generateUniqueAudixId();
        if (data.coins === undefined) updates.coins = 0;
        if (data.tag === undefined) updates.tag = '';
        if (!data.inventory) {
          updates.inventory = {
            frames: [], backgrounds: [], avatarBorders: [], nameEffects: [],
            badges: [], animatedAvatars: [], themes: [],
            equipped: { frame: null, background: null, avatarBorder: null, nameEffect: null, badge: null, animatedAvatar: null, theme: null }
          };
        }
        if (!data.friends) {
          updates.friends = { list: [], incoming: [], outgoing: [], blocked: [] };
        }
        if (!data.activityStatus) {
          updates.activityStatus = { currentlyPlaying: null, artist: null, album: null, isPlaying: false, lastUpdated: null, privacy: 'friends' };
        }
        if (!data.adminPerks && this.isAdmin()) {
          updates.adminPerks = { equipped: { badge: null, frame: null, verifiedIcon: true, tag: null } };
        }
        if (Object.keys(updates).length > 0) {
          await userRef.update(updates);
          console.log('[Auth] Migrated user profile');
        }
        console.log('[Auth] Firestore profile exists');
      }
    } catch (err) {
      console.error('[Auth] ensureUserProfile error:', err);
    }
  },

  async generateUniqueAudixId() {
    let attempts = 0;
    while (attempts < 100) {
      const num = Math.floor(1000 + Math.random() * 9000);
      const id = `Audix ${num}`;
      try {
        const snap = await this.db.collection('users').where('audixId', '==', id).limit(1).get();
        if (snap.empty) return id;
      } catch (e) {
        console.warn('[Auth] ID check failed:', e);
      }
      attempts++;
    }
    return `Audix ${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 10)}`;
  },

  async loadUserData() {
    try {
      if (typeof Library !== 'undefined') await Library.loadUserSongs();
      if (typeof Achievements !== 'undefined') await Achievements.loadUserAchievements();
      if (typeof Settings !== 'undefined') await Settings.load();
      if (typeof Gamification !== 'undefined') {
        Gamification.load();
        Gamification.recalculateLevel();
        Gamification.updateUI();
      }
    } catch (e) {
      console.error('[Auth] loadUserData error:', e);
    }
  },

  // ===================== FRIEND SYSTEM =====================
  async searchUserByAudixId(audixId) {
    try {
      const snap = await this.db.collection('users').where('audixId', '==', audixId).limit(1).get();
      if (snap.empty) return null;
      const doc = snap.docs[0];
      const data = doc.data();
      return {
        uid: doc.id,
        audixId: data.audixId,
        displayName: data.displayName,
        photoURL: data.photoURL,
        level: data.level || 1,
        xp: data.xp || 0,
        isAdmin: this.ADMIN_EMAILS.includes(data.email)
      };
    } catch (e) {
      console.error('[Auth] searchUserByAudixId error:', e);
      return null;
    }
  },

  async sendFriendRequest(targetUid) {
    if (!this.currentUser) throw new Error('Not logged in');
    if (targetUid === this.currentUser.uid) throw new Error('Cannot friend yourself');
    const myUid = this.currentUser.uid;
    const myRef = this.db.collection('users').doc(myUid);
    const targetRef = this.db.collection('users').doc(targetUid);
    const myDoc = await myRef.get();
    const myData = myDoc.data();
    if (myData.friends?.list?.includes(targetUid)) throw new Error('Already friends');
    if (myData.friends?.outgoing?.includes(targetUid)) throw new Error('Request already sent');
    if (myData.friends?.incoming?.includes(targetUid)) {
      return this.acceptFriendRequest(targetUid);
    }
    await myRef.update({ 'friends.outgoing': firebase.firestore.FieldValue.arrayUnion(targetUid) });
    await targetRef.update({ 'friends.incoming': firebase.firestore.FieldValue.arrayUnion(myUid) });
    if (typeof Utils !== 'undefined') Utils.toast('Friend request sent!', 'success');
  },

  async acceptFriendRequest(targetUid) {
    if (!this.currentUser) throw new Error('Not logged in');
    const myUid = this.currentUser.uid;
    const myRef = this.db.collection('users').doc(myUid);
    const targetRef = this.db.collection('users').doc(targetUid);
    await myRef.update({
      'friends.incoming': firebase.firestore.FieldValue.arrayRemove(targetUid),
      'friends.list': firebase.firestore.FieldValue.arrayUnion(targetUid)
    });
    await targetRef.update({
      'friends.outgoing': firebase.firestore.FieldValue.arrayRemove(myUid),
      'friends.list': firebase.firestore.FieldValue.arrayUnion(myUid)
    });
    if (typeof Utils !== 'undefined') Utils.toast('Friend request accepted!', 'success');
  },

  async rejectFriendRequest(targetUid) {
    if (!this.currentUser) throw new Error('Not logged in');
    const myUid = this.currentUser.uid;
    await this.db.collection('users').doc(myUid).update({
      'friends.incoming': firebase.firestore.FieldValue.arrayRemove(targetUid)
    });
    await this.db.collection('users').doc(targetUid).update({
      'friends.outgoing': firebase.firestore.FieldValue.arrayRemove(myUid)
    });
  },

  async removeFriend(targetUid) {
    if (!this.currentUser) throw new Error('Not logged in');
    const myUid = this.currentUser.uid;
    await this.db.collection('users').doc(myUid).update({
      'friends.list': firebase.firestore.FieldValue.arrayRemove(targetUid)
    });
    await this.db.collection('users').doc(targetUid).update({
      'friends.list': firebase.firestore.FieldValue.arrayRemove(myUid)
    });
    if (typeof Utils !== 'undefined') Utils.toast('Friend removed', 'info');
  },

  async getFriends() {
    if (!this.currentUser) return [];
    const doc = await this.db.collection('users').doc(this.currentUser.uid).get();
    const data = doc.data();
    const friendUids = data.friends?.list || [];
    if (friendUids.length === 0) return [];
    const friends = [];
    for (let i = 0; i < friendUids.length; i += 10) {
      const batch = friendUids.slice(i, i + 10);
      const snap = await this.db.collection('users').where(firebase.firestore.FieldPath.documentId(), 'in', batch).get();
      snap.forEach(d => {
        const f = d.data();
        friends.push({
          uid: d.id,
          audixId: f.audixId,
          displayName: f.displayName,
          photoURL: f.photoURL,
          level: f.level || 1,
          activityStatus: f.activityStatus || null
        });
      });
    }
    return friends;
  },

  async getMutualFriends(otherUid) {
    if (!this.currentUser) return [];
    const myDoc = await this.db.collection('users').doc(this.currentUser.uid).get();
    const theirDoc = await this.db.collection('users').doc(otherUid).get();
    const myFriends = new Set(myDoc.data().friends?.list || []);
    const theirFriends = new Set(theirDoc.data().friends?.list || []);
    return [...myFriends].filter(uid => theirFriends.has(uid));
  },

  async getFriendRequests() {
    if (!this.currentUser) return { incoming: [], outgoing: [] };
    const doc = await this.db.collection('users').doc(this.currentUser.uid).get();
    const data = doc.data();
    const incomingUids = data.friends?.incoming || [];
    const outgoingUids = data.friends?.outgoing || [];
    const incoming = [];
    for (const uid of incomingUids) {
      const d = await this.db.collection('users').doc(uid).get();
      if (d.exists) {
        const u = d.data();
        incoming.push({ uid, audixId: u.audixId, displayName: u.displayName, photoURL: u.photoURL, level: u.level || 1 });
      }
    }
    const outgoing = [];
    for (const uid of outgoingUids) {
      const d = await this.db.collection('users').doc(uid).get();
      if (d.exists) {
        const u = d.data();
        outgoing.push({ uid, audixId: u.audixId, displayName: u.displayName, photoURL: u.photoURL, level: u.level || 1 });
      }
    }
    return { incoming, outgoing };
  },

  // ===================== ACTIVITY STATUS =====================
  async updateActivityStatus(songInfo) {
    if (!this.currentUser) return;
    try {
      await this.db.collection('users').doc(this.currentUser.uid).update({
        'activityStatus.currentlyPlaying': songInfo.title || null,
        'activityStatus.artist': songInfo.artist || null,
        'activityStatus.album': songInfo.album || null,
        'activityStatus.isPlaying': songInfo.isPlaying || false,
        'activityStatus.lastUpdated': firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.error('[Auth] updateActivityStatus error:', e);
    }
  },

  async clearActivityStatus() {
    if (!this.currentUser) return;
    try {
      await this.db.collection('users').doc(this.currentUser.uid).update({
        'activityStatus.currentlyPlaying': null,
        'activityStatus.artist': null,
        'activityStatus.album': null,
        'activityStatus.isPlaying': false,
        'activityStatus.lastUpdated': firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.error('[Auth] clearActivityStatus error:', e);
    }
  },

  async toggleActivityPrivacy(setting) {
    if (!this.currentUser) return;
    const valid = ['public', 'friends', 'private'];
    if (!valid.includes(setting)) return;
    await this.db.collection('users').doc(this.currentUser.uid).update({
      'activityStatus.privacy': setting
    });
    if (typeof Utils !== 'undefined') Utils.toast(`Activity status set to ${setting}`, 'success');
  },

  // ===================== INVENTORY & COINS =====================
  async getInventory() {
    if (!this.currentUser) return null;
    const doc = await this.db.collection('users').doc(this.currentUser.uid).get();
    const data = doc.data();
    if (!data || !data.inventory) {
      return {
        frames: [], backgrounds: [], avatarBorders: [], nameEffects: [],
        badges: [], animatedAvatars: [], themes: [],
        equipped: { frame: null, background: null, avatarBorder: null, nameEffect: null, badge: null, animatedAvatar: null, theme: null }
      };
    }
    return data.inventory;
  },

  async equipItem(itemId, slot) {
    if (!this.currentUser) return;
    const validSlots = ['frame', 'background', 'avatarBorder', 'nameEffect', 'badge', 'animatedAvatar', 'theme'];
    if (!validSlots.includes(slot)) return;
    const path = `inventory.equipped.${slot}`;
    await this.db.collection('users').doc(this.currentUser.uid).update({ [path]: itemId });
    if (typeof Utils !== 'undefined') Utils.toast(`${slot} equipped!`, 'success');
  },

  async unequipItem(slot) {
    if (!this.currentUser) return;
    const validSlots = ['frame', 'background', 'avatarBorder', 'nameEffect', 'badge', 'animatedAvatar', 'theme'];
    if (!validSlots.includes(slot)) return;
    const path = `inventory.equipped.${slot}`;
    await this.db.collection('users').doc(this.currentUser.uid).update({ [path]: null });
  },

  async addItemToInventory(item) {
    if (!this.currentUser) return;
    const categoryMap = {
      'frame': 'inventory.frames',
      'background': 'inventory.backgrounds',
      'avatarBorder': 'inventory.avatarBorders',
      'nameEffect': 'inventory.nameEffects',
      'badge': 'inventory.badges',
      'animatedAvatar': 'inventory.animatedAvatars',
      'theme': 'inventory.themes'
    };
    const path = categoryMap[item.type];
    if (!path) return;
    await this.db.collection('users').doc(this.currentUser.uid).update({
      [path]: firebase.firestore.FieldValue.arrayUnion(item)
    });
  },

  async addCoins(amount) {
    if (!this.currentUser || amount <= 0) return;
    await this.db.collection('users').doc(this.currentUser.uid).update({
      coins: firebase.firestore.FieldValue.increment(amount)
    });
    if (typeof Utils !== 'undefined') Utils.toast(`+${amount} coins!`, 'success');
  },

  async getCoins() {
    if (!this.currentUser) return 0;
    const doc = await this.db.collection('users').doc(this.currentUser.uid).get();
    return doc.data()?.coins || 0;
  },

  // ===================== TAG SYSTEM =====================
  async updateTag(tag) {
    if (!this.currentUser) return;
    const cleanTag = String(tag || '').trim().slice(0, 25);
    await this.db.collection('users').doc(this.currentUser.uid).update({ tag: cleanTag });
    if (typeof Utils !== 'undefined') Utils.toast('Tag updated!', 'success');
    this.broadcastProfileUpdate();
  },

  // ===================== PFP UPLOAD =====================
  async uploadProfilePicture(file) {
    if (!this.currentUser) throw new Error('Not logged in');
    if (!file) throw new Error('No file provided');

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid image format. Use JPG, PNG, or WEBP.');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image too large. Max 5MB.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target.result;
        try {
          await this.updateProfile(this.currentUser.uid, {
            customPhotoURL: dataUrl,
            photoURL: dataUrl
          });
          this.currentUser.photoURL = dataUrl;
          this.updateUI();
          this.broadcastProfileUpdate();
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
    });
  },

  // ===================== ADMIN PROFILE =====================
  async ensureAdminInventory() {
    if (!this.currentUser || !this.isAdmin()) return;
    try {
      const doc = await this.db.collection('users').doc(this.currentUser.uid).get();
      const data = doc.data();
      if (!data.inventory) {
        await this.db.collection('users').doc(this.currentUser.uid).update({
          inventory: {
            frames: [], backgrounds: [], avatarBorders: [], nameEffects: [],
            badges: [], animatedAvatars: [], themes: [],
            equipped: { frame: null, background: null, avatarBorder: null, nameEffect: null, badge: null, animatedAvatar: null, theme: null }
          }
        });
      }
      const inv = data.inventory || { equipped: {} };
      const adminItems = [
        { id: 'admin_frame_gold', type: 'frame', name: 'Gold Admin Frame', rarity: 'admin', animated: true },
        { id: 'admin_badge_crown', type: 'badge', name: 'Admin Crown', rarity: 'admin', animated: true },
        { id: 'admin_border_verified', type: 'avatarBorder', name: 'Verified Border', rarity: 'admin', animated: true },
        { id: 'admin_effect_shimmer', type: 'nameEffect', name: 'Shimmer Name', rarity: 'admin', animated: true },
        { id: 'admin_theme_exclusive', type: 'theme', name: 'Admin Exclusive', rarity: 'admin', animated: false }
      ];
      for (const item of adminItems) {
        const list = inv[item.type + 's'] || [];
        if (!list.find(i => i.id === item.id)) {
          await this.addItemToInventory(item);
        }
      }
      const equipped = inv.equipped || {};
      const updates = {};
      if (!equipped.frame) updates['inventory.equipped.frame'] = 'admin_frame_gold';
      if (!equipped.badge) updates['inventory.equipped.badge'] = 'admin_badge_crown';
      if (!equipped.avatarBorder) updates['inventory.equipped.avatarBorder'] = 'admin_border_verified';
      if (!equipped.nameEffect) updates['inventory.equipped.nameEffect'] = 'admin_effect_shimmer';
      if (!equipped.theme) updates['inventory.equipped.theme'] = 'admin_theme_exclusive';
      if (Object.keys(updates).length > 0) {
        await this.db.collection('users').doc(this.currentUser.uid).update(updates);
      }
      console.log('[Auth] Admin inventory ensured');
    } catch (e) {
      console.error('[Auth] ensureAdminInventory failed:', e);
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

      this.currentUser = result.user;
      await this.ensureUserProfile(result.user);
      this.hideLoginModal();
      this.updateUI();
      this.loadUserData();
      this.broadcastProfileUpdate();

      if (typeof Utils !== 'undefined') Utils.toast('Welcome, ' + (result.user.displayName || 'User') + '!');

      // Post-login maintenance redirect
      setTimeout(() => this._postLoginRedirect(), 150);

    } catch (error) {
      console.error('[Auth] Google login failed:', error.code, error.message);

      let message = 'Google login failed';
      let isPopupBlocked = false;

      if (error.code === 'auth/invalid-api-key' || error.message.includes('API key')) {
        message = 'Firebase API key is suspended. Please contact the developer to generate a new key in Firebase Console.';
      } else

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
      // Clear local gamification cache for privacy
      const userId = this.currentUser ? this.currentUser.uid : 'guest';
      this.currentUser = null;

      // Reset UI immediately
      this.updateUI();

      // Clear admin perks from DOM
      document.querySelectorAll('.theme-btn, .btn-preset').forEach(btn => {
        if (btn.title && btn.title.includes('Admin')) {
          btn.classList.remove('unlocked');
          btn.classList.add('reward-locked');
        }
      });

      // Hide admin nav
      const adminNav = document.querySelector('.nav-link[data-page="admin"]');
      if (adminNav) adminNav.classList.add('hidden');
      const adminDivider = document.querySelector('.admin-nav-divider');
      if (adminDivider) adminDivider.classList.add('hidden');

      // Show login modal
      this.showLoginModal();

      // Redirect to home
      window.location.hash = 'home';
      if (typeof App !== 'undefined') App.showPage('home');

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
      if (updates.tag !== undefined) {
        await userRef.update({ tag: updates.tag });
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

  isAdmin() {
    return this.currentUser && this.ADMIN_EMAILS.includes(this.currentUser.email);
  },

  updateUI() {
    const isLoggedIn = !!this.currentUser;
    const user = this.currentUser;
    const isAdmin = this.isAdmin();

    console.log('[Auth] updateUI() — isLoggedIn:', isLoggedIn, 'isAdmin:', isAdmin, 'user:', user ? user.uid : 'null');

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

    const adminNav = document.querySelector('.nav-link[data-page="admin"]');
    if (adminNav) {
      adminNav.classList.toggle('hidden', !isAdmin);
      console.log('[Auth] Admin nav visibility:', isAdmin ? 'visible' : 'hidden');
    }
    const adminDivider = document.querySelector('.admin-nav-divider');
    if (adminDivider) adminDivider.classList.toggle('hidden', !isAdmin);

    if (isAdmin && typeof Admin !== 'undefined') {
      Admin.applyAdminPerks();
    }

    const sidebarAdminBadge = document.getElementById('sidebarAdminBadge');
    if (sidebarAdminBadge) sidebarAdminBadge.classList.toggle('hidden', !isAdmin);

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


  // ===================== EMAIL/PASSWORD AUTH =====================
  async registerWithEmail(email, password, displayName) {
    if (!this.firebaseReady || window._firebaseSuspended) {
      this.showError('Firebase not available. Cannot create account.');
      return;
    }
    try {
      const result = await firebase.auth().createUserWithEmailAndPassword(email, password);
      this.currentUser = result.user;
      await result.user.updateProfile({ displayName: displayName || 'User' });
      await this.ensureUserProfile(result.user);
      this.hideLoginModal();
      this.updateUI();
      this.loadUserData();
      this.broadcastProfileUpdate();
      if (typeof Utils !== 'undefined') Utils.toast('Account created! Welcome, ' + (displayName || 'User') + '!', 'success');

      // Post-login maintenance redirect
      setTimeout(() => this._postLoginRedirect(), 150);

    } catch (error) {
      console.error('[Auth] Email registration failed:', error.code, error.message);
      let message = 'Registration failed';
      if (error.code === 'auth/email-already-in-use') message = 'This email is already registered. Try logging in instead.';
      else if (error.code === 'auth/invalid-email') message = 'Invalid email address.';
      else if (error.code === 'auth/weak-password') message = 'Password is too weak. Use at least 6 characters.';
      else if (error.code === 'auth/invalid-api-key') message = 'Firebase API key is suspended. Contact developer.';
      else message = error.message || 'Unknown error';
      this.showError(message);
    }
  },

  async loginWithEmail(email, password) {
    if (!this.firebaseReady || window._firebaseSuspended) {
      this.showError('Firebase not available. Cannot sign in.');
      return;
    }
    try {
      const result = await firebase.auth().signInWithEmailAndPassword(email, password);
      this.currentUser = result.user;
      await this.ensureUserProfile(result.user);
      this.hideLoginModal();
      this.updateUI();
      this.loadUserData();
      this.broadcastProfileUpdate();
      if (typeof Utils !== 'undefined') Utils.toast('Welcome back, ' + (result.user.displayName || 'User') + '!', 'success');

      // Post-login maintenance redirect
      setTimeout(() => this._postLoginRedirect(), 150);

    } catch (error) {
      console.error('[Auth] Email login failed:', error.code, error.message);
      let message = 'Login failed';
      if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
      else if (error.code === 'auth/wrong-password') message = 'Incorrect password.';
      else if (error.code === 'auth/invalid-email') message = 'Invalid email address.';
      else if (error.code === 'auth/invalid-api-key') message = 'Firebase API key is suspended. Contact developer.';
      else if (error.code === 'auth/too-many-requests') message = 'Too many failed attempts. Try again later.';
      else message = error.message || 'Unknown error';
      this.showError(message);
    }
  },

  async sendPasswordReset(email) {
    if (!this.firebaseReady || window._firebaseSuspended) {
      this.showError('Firebase not available.');
      return;
    }
    try {
      await firebase.auth().sendPasswordResetEmail(email);
      if (typeof Utils !== 'undefined') Utils.toast('Password reset email sent!', 'success');
    } catch (error) {
      let message = 'Failed to send reset email';
      if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
      else if (error.code === 'auth/invalid-email') message = 'Invalid email address.';
      else message = error.message;
      this.showError(message);
    }
  },

  switchAuthMode(mode) {
    const loginPanel = document.getElementById('loginPanel');
    const registerPanel = document.getElementById('registerPanel');
    const forgotPanel = document.getElementById('forgotPanel');
    if (loginPanel) loginPanel.style.display = mode === 'login' ? 'block' : 'none';
    if (registerPanel) registerPanel.style.display = mode === 'register' ? 'block' : 'none';
    if (forgotPanel) forgotPanel.style.display = mode === 'forgot' ? 'block' : 'none';

    // Clear any previous errors
    const errEl = document.getElementById('auth-error-msg');
    if (errEl) errEl.textContent = '';
    const retryBtn = document.getElementById('auth-retry-btn');
    if (retryBtn) retryBtn.remove();
  },
  _postLoginRedirect() {
    if (typeof Admin !== 'undefined' && Admin.checkMaintenance()) {
      // Maintenance is on and user is NOT admin → show maintenance page
      console.log('[Auth] Post-login: maintenance active, user is not admin → redirecting to maintenance');
      window.location.hash = 'maintenance';
      if (typeof App !== 'undefined') App.showPage('maintenance');
    } else {
      // Maintenance off OR user is admin → go to home
      console.log('[Auth] Post-login: redirecting to home');
      window.location.hash = 'home';
      if (typeof App !== 'undefined') App.showPage('home');
    }
  },

  getUserId() {
    return this.currentUser ? this.currentUser.uid : null;
  }
};
