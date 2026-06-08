const Profile = {
  init() {
    this.bindEvents();
    this.updateDisplay();
  },

  async updateDisplay() {
    if (typeof Auth === 'undefined' || !Auth.currentUser) return;
    const user = Auth.currentUser;
    const doc = await Auth.db.collection('users').doc(user.uid).get();
    const data = doc.data();
    if (!data) return;

    // Audix ID
    const audixIdEl = document.getElementById('profileAudixId');
    if (audixIdEl) audixIdEl.textContent = data.audixId || '—';

    // Username
    const profileUsername = document.getElementById('profileUsername');
    if (profileUsername) profileUsername.textContent = data.displayName || user.displayName || 'User';

    // Email
    const profileEmail = document.getElementById('profileEmail');
    if (profileEmail) profileEmail.textContent = data.email || user.email || '—';

    // Joined date
    const profileJoined = document.getElementById('profileJoined');
    if (profileJoined && data.createdAt) {
      const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      profileJoined.textContent = date.toLocaleDateString();
    } else if (profileJoined) {
      profileJoined.textContent = '—';
    }

    // Profile Picture - FIXED
    const profilePfp = document.getElementById('profilePfp');
    const avatarPlaceholder = document.getElementById('avatarPlaceholder');
    const pfpUrl = data.customPhotoURL || data.photoURL || user.photoURL || null;

    if (profilePfp) {
      if (pfpUrl) {
        profilePfp.src = pfpUrl;
        profilePfp.classList.remove('hidden');
        if (avatarPlaceholder) avatarPlaceholder.classList.add('hidden');
      } else {
        profilePfp.classList.add('hidden');
        if (avatarPlaceholder) avatarPlaceholder.classList.remove('hidden');
      }
    }

    // Tag display
    const tagEl = document.getElementById('profileTag');
    if (tagEl) tagEl.textContent = data.tag || '';
    const tagInput = document.getElementById('tagInput');
    if (tagInput) tagInput.value = data.tag || '';

    // Admin badge with SVG
    const profileUsernameRow = document.getElementById('profileUsername')?.closest('.info-row');
    if (profileUsernameRow && Auth.isAdmin()) {
      let tick = profileUsernameRow.querySelector('.admin-verified-tick');
      if (!tick) {
        tick = document.createElement('span');
        tick.className = 'admin-verified-tick';
        tick.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3498db" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        tick.style.marginLeft = '6px';
        tick.style.display = 'inline-flex';
        tick.style.verticalAlign = 'middle';
        profileUsernameRow.appendChild(tick);
      }
    }

    const adminBadgeContainer = document.getElementById('adminBadgeContainer');
    if (adminBadgeContainer) adminBadgeContainer.classList.toggle('hidden', !Auth.isAdmin());

    // Activity Status
    const activityCard = document.getElementById('activityStatusCard');
    const activitySong = document.getElementById('activitySong');
    const activityArtist = document.getElementById('activityArtist');
    if (activityCard && data.activityStatus) {
      if (data.activityStatus.isPlaying && data.activityStatus.currentlyPlaying) {
        activityCard.classList.remove('hidden');
        activitySong.textContent = data.activityStatus.currentlyPlaying;
        activityArtist.textContent = data.activityStatus.artist || '';
      } else {
        activityCard.classList.add('hidden');
      }
    }

    // Stats
    const songCountEl = document.getElementById('profileSongCount');
    if (songCountEl) songCountEl.textContent = (typeof Library !== 'undefined') ? Library.songs.length : 0;

    const achieveCountEl = document.getElementById('profileAchieveCount');
    if (achieveCountEl && typeof Achievements !== 'undefined') {
      achieveCountEl.textContent = `${Achievements.unlocked.size} / 50`;
    }

    const listenTimeEl = document.getElementById('profileListenTime');
    if (listenTimeEl && typeof Gamification !== 'undefined') {
      listenTimeEl.textContent = Math.floor(Gamification.totalListenTime / 60) + ' min';
    }

    const coinsEl = document.getElementById('profileCoins');
    if (coinsEl) coinsEl.textContent = (data.coins || 0) + ' Coins';

    // Apply equipped frame visually
    this.applyEquippedFrame(data);

    this.renderFriends();
    this.renderFriendRequests();
    this.renderInventory();
  },

  applyEquippedFrame(data) {
    const avatarWrap = document.getElementById('profileAvatar');
    if (!avatarWrap) return;

    // Remove old frame
    const oldFrame = avatarWrap.querySelector('.avatar-frame');
    if (oldFrame) oldFrame.remove();

    const inv = data.inventory || {};
    const equipped = inv.equipped || {};
    const frameId = equipped.frame;
    if (!frameId) return;

    const frameItem = (inv.frames || []).find(f => f.id === frameId);
    if (!frameItem) return;

    const frame = document.createElement('div');
    frame.className = 'avatar-frame';
    frame.style.cssText = `
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      pointer-events: none;
      z-index: 2;
    `;

    if (frameItem.id === 'admin_frame_gold') {
      frame.style.border = '3px solid #f1c40f';
      frame.style.boxShadow = '0 0 12px rgba(241,196,15,0.6), inset 0 0 8px rgba(241,196,15,0.3)';
    } else if (frameItem.animated) {
      frame.style.border = '3px solid var(--accent)';
      frame.style.boxShadow = '0 0 12px var(--accent)';
      frame.style.animation = 'framePulse 2s ease-in-out infinite';
    } else {
      frame.style.border = '3px solid var(--accent)';
      frame.style.boxShadow = '0 0 8px var(--accent)';
    }

    avatarWrap.style.position = 'relative';
    avatarWrap.appendChild(frame);
  },

  async renderFriends() {
    const container = document.getElementById('friendListContainer');
    if (!container) return;
    const friends = await Auth.getFriends();
    if (friends.length === 0) {
      container.innerHTML = '<p class="empty-friends">No friends yet. Search for users to add!</p>';
      return;
    }
    let html = '';
    for (const f of friends) {
      const activity = f.activityStatus?.isPlaying ? `🎵 ${f.activityStatus.currentlyPlaying}` : 'Offline';
      html += `<div class="friend-item"><img src="${f.photoURL || ''}" class="friend-pic" onerror="this.style.display='none'"><div class="friend-info"><span class="friend-name">${f.displayName}</span><span class="friend-id">${f.audixId}</span><span class="friend-activity">${activity}</span></div><button class="btn-text btn-small btn-remove-friend" data-uid="${f.uid}">Remove</button></div>`;
    }
    container.innerHTML = html;
    container.querySelectorAll('.btn-remove-friend').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        await Auth.removeFriend(e.target.dataset.uid);
        this.renderFriends();
      });
    });
  },

  async renderFriendRequests() {
    const container = document.getElementById('friendRequestsList');
    if (!container) return;
    const { incoming, outgoing } = await Auth.getFriendRequests();
    let html = '';
    if (incoming.length === 0 && outgoing.length === 0) {
      html = '<p class="empty-requests">No pending requests</p>';
    } else {
      for (const req of incoming) {
        html += `<div class="friend-request"><img src="${req.photoURL || ''}" class="friend-pic" onerror="this.style.display='none'"><div class="friend-info"><span class="friend-name">${req.displayName}</span><span class="friend-id">${req.audixId}</span></div><button class="btn-primary btn-small btn-accept-request" data-uid="${req.uid}">Accept</button><button class="btn-text btn-small btn-reject-request" data-uid="${req.uid}">Reject</button></div>`;
      }
      for (const req of outgoing) {
        html += `<div class="friend-request outgoing"><img src="${req.photoURL || ''}" class="friend-pic" onerror="this.style.display='none'"><div class="friend-info"><span class="friend-name">${req.displayName}</span><span class="friend-id">${req.audixId}</span><span class="request-status">Request sent</span></div></div>`;
      }
    }
    container.innerHTML = html;
    container.querySelectorAll('.btn-accept-request').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        await Auth.acceptFriendRequest(e.target.dataset.uid);
        this.renderFriendRequests();
        this.renderFriends();
      });
    });
    container.querySelectorAll('.btn-reject-request').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        await Auth.rejectFriendRequest(e.target.dataset.uid);
        this.renderFriendRequests();
      });
    });
  },

  async renderInventory() {
    const grid = document.getElementById('inventoryGrid');
    if (!grid) return;
    const tab = grid.dataset.tab || 'frames';
    const tabNames = { 'frames': 'Profile Frames', 'backgrounds': 'Backgrounds', 'borders': 'Avatar Borders', 'badges': 'Badges', 'effects': 'Name Effects', 'avatars': 'Animated Avatars', 'themes': 'Themes' };

    let inventory;
    try {
      inventory = await Auth.getInventory();
    } catch (e) {
      console.error('[Profile] getInventory failed:', e);
      inventory = null;
    }

    if (!inventory) {
      grid.innerHTML = `<p class="empty-inventory">No items yet in <strong>${tabNames[tab]}</strong>.<br>Unlock achievements to earn rewards!</p>`;
      return;
    }
    const map = {
      'frames': 'frames',
      'backgrounds': 'backgrounds',
      'borders': 'avatarBorders',
      'badges': 'badges',
      'effects': 'nameEffects',
      'avatars': 'animatedAvatars',
      'themes': 'themes'
    };
    const items = inventory[map[tab]] || [];
    const equipped = inventory.equipped || {};
    const slotMap = { 'frames': 'frame', 'backgrounds': 'background', 'borders': 'avatarBorder', 'badges': 'badge', 'effects': 'nameEffect', 'avatars': 'animatedAvatar', 'themes': 'theme' };
    const slot = slotMap[tab];
    let html = '';
    for (const item of items) {
      const isEquipped = equipped[slot] === item.id;
      const equipClass = isEquipped ? 'equipped' : '';
      html += `<div class="inventory-item ${equipClass}" data-id="${item.id}" data-type="${item.type}"><div class="inv-icon">${item.animated ? '✨' : '🎁'}</div><div class="inv-name">${item.name}</div><div class="inv-rarity">${item.rarity}</div><button class="btn-equip">${isEquipped ? 'Unequip' : 'Equip'}</button></div>`;
    }
    grid.innerHTML = html || `<p class="empty-inventory">No <strong>${tabNames[tab]}</strong> items yet.<br>Keep unlocking achievements!</p>`;
    grid.querySelectorAll('.btn-equip').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = e.target.closest('.inventory-item');
        const id = item.dataset.id;
        const type = item.dataset.type;
        const isEquipped = item.classList.contains('equipped');
        if (isEquipped) await Auth.unequipItem(type);
        else await Auth.equipItem(id, type);
        await this.renderInventory();
        await this.updateDisplay(); // refresh frame visual
      });
    });
  },

  bindEvents() {
    // Inventory tabs
    document.body.addEventListener('click', (e) => {
      if (e.target.matches('.inv-tab')) {
        document.querySelectorAll('.inv-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        const grid = document.getElementById('inventoryGrid');
        if (grid) { grid.dataset.tab = e.target.dataset.tab; this.renderInventory(); }
      }
    });

    // Friend search
    const searchBtn = document.getElementById('btn-search-friend');
    const searchInput = document.getElementById('friendSearchInput');
    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', () => this.searchFriend(searchInput.value));
      searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.searchFriend(searchInput.value); });
    }

    // Copy ID
    const copyBtn = document.getElementById('btn-copy-id');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const id = document.getElementById('profileAudixId')?.textContent;
        if (id && id !== '—') {
          navigator.clipboard.writeText(id).then(() => {
            if (typeof Utils !== 'undefined') Utils.toast('Audix ID copied!', 'success');
          });
        }
      });
    }

    // Privacy
    const privacySelect = document.getElementById('activityPrivacy');
    if (privacySelect) {
      privacySelect.addEventListener('change', (e) => {
        if (typeof Auth !== 'undefined') Auth.toggleActivityPrivacy(e.target.value);
      });
    }

    // PFP Upload - FIXED
    const pfpInput = document.getElementById('pfp-input');
    if (pfpInput) {
      pfpInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          if (typeof Utils !== 'undefined') Utils.toast('Uploading profile picture...', 'info');
          await Auth.uploadProfilePicture(file);
          if (typeof Utils !== 'undefined') Utils.toast('Profile picture updated!', 'success');
          await this.updateDisplay();
        } catch (err) {
          console.error('[Profile] PFP upload error:', err);
          if (typeof Utils !== 'undefined') Utils.toast(err.message || 'Upload failed', 'error');
        }
        pfpInput.value = '';
      });
    }

    // Tag edit
    const tagBtn = document.getElementById('btn-save-tag');
    const tagInput = document.getElementById('tagInput');
    if (tagBtn && tagInput) {
      tagBtn.addEventListener('click', async () => {
        const tag = tagInput.value.trim();
        if (tag.length > 25) {
          if (typeof Utils !== 'undefined') Utils.toast('Tag must be 25 characters or less', 'error');
          return;
        }
        await Auth.updateTag(tag);
        await this.updateDisplay();
      });
    }

    // Logout
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (typeof Auth !== 'undefined') Auth.logout();
      });
    }

    // Share profile
    const shareProfileBtn = document.getElementById('btn-share-profile');
    if (shareProfileBtn) {
      shareProfileBtn.addEventListener('click', () => this.shareProfile());
    }
  },

  async searchFriend(query) {
    if (!query) return;
    const results = document.getElementById('friendSearchResults');
    if (!results) return;
    results.innerHTML = '<p>Searching...</p>';
    const user = await Auth.searchUserByAudixId(query.trim());
    if (!user) { results.innerHTML = '<p class="empty-results">User not found</p>'; return; }
    const isFriend = await this.isFriend(user.uid);
    results.innerHTML = `<div class="friend-result"><img src="${user.photoURL || ''}" class="friend-pic" onerror="this.style.display='none'"><div class="friend-info"><span class="friend-name">${user.displayName}</span><span class="friend-id">${user.audixId}</span><span class="friend-level">Lv.${user.level}</span></div><button class="btn-primary btn-small" id="btn-add-searched-friend" data-uid="${user.uid}" ${isFriend ? 'disabled' : ''}>${isFriend ? 'Friends' : 'Add Friend'}</button></div>`;
    document.getElementById('btn-add-searched-friend')?.addEventListener('click', async (e) => {
      await Auth.sendFriendRequest(e.target.dataset.uid);
      e.target.textContent = 'Request Sent';
      e.target.disabled = true;
    });
  },

  async isFriend(uid) {
    if (!Auth.currentUser) return false;
    const doc = await Auth.db.collection('users').doc(Auth.currentUser.uid).get();
    return doc.data()?.friends?.list?.includes(uid) || false;
  },

  async shareProfile() {
    const audixId = document.getElementById('profileAudixId')?.textContent;
    const username = document.getElementById('profileUsername')?.textContent;
    const shareData = {
      title: `Audix Profile: ${username}`,
      text: `Check out my Audix profile! ID: ${audixId}`,
      url: window.location.href
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (e) { /* cancelled */ }
    } else {
      // Fallback: copy to clipboard
      const text = `Audix Profile: ${username} — ID: ${audixId}`;
      navigator.clipboard.writeText(text).then(() => {
        if (typeof Utils !== 'undefined') Utils.toast('Profile link copied!', 'success');
      });
    }
  }
};
