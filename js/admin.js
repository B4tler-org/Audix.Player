/* ============================================
   ADMIN PANEL — v1.1 (Critical Fixes)
   User List Query, Maintenance Mode Enforcement,
   Realtime Listeners
   ============================================ */

const Admin = {
  ADMIN_EMAILS: ['samirkhadka2001@gmail.com', 'utilitiesnepal@gmail.com'],
  maintenanceMode: false,
  maintenanceMessage: 'Audix is under maintenance. We will be back soon!',
  users: [],
  allSongs: [],
  _usersUnsub: null,

  init() {
    console.log('[Admin] init()');
    this.loadMaintenanceState();
    this.bindEvents();
    if (this.isAdmin()) {
      console.log('[Admin] Admin detected — unlocking all perks');
      this.applyAdminPerks();
    }
  },

  isAdmin() {
    const user = (typeof Auth !== 'undefined') ? Auth.currentUser : null;
    return user && this.ADMIN_EMAILS.includes(user.email);
  },

  applyAdminPerks() {
    console.log('[Admin] applyAdminPerks()');
    document.querySelectorAll('.theme-btn.reward-locked').forEach(btn => {
      btn.classList.remove('reward-locked');
      btn.classList.add('unlocked');
      btn.title = 'Admin Unlocked';
    });
    document.querySelectorAll('.btn-preset.reward-locked').forEach(btn => {
      btn.classList.remove('reward-locked');
      btn.classList.add('unlocked');
      btn.title = 'Admin Unlocked';
    });
    if (typeof Achievements !== 'undefined') {
      Achievements.unlockAll();
    }
    const adminNav = document.querySelector('.nav-link[data-page="admin"]');
    if (adminNav) adminNav.classList.remove('hidden');
    const adminBadge = document.getElementById('adminBadgeContainer');
    if (adminBadge) adminBadge.classList.remove('hidden');
    const sidebarAdminBadge = document.getElementById('sidebarAdminBadge');
    if (sidebarAdminBadge) sidebarAdminBadge.classList.remove('hidden');
    if (typeof Auth !== 'undefined') {
      Auth.ensureAdminInventory();
    }
    console.log('[Admin] All perks applied');
  },

  bindEvents() {
    const maintToggle = document.getElementById('toggleMaintenance');
    if (maintToggle) {
      maintToggle.addEventListener('change', (e) => {
        this.maintenanceMode = e.target.checked;
        this.saveMaintenanceState();
        this.renderDashboard();
        if (typeof Utils !== 'undefined') {
          Utils.toast(this.maintenanceMode ? 'Maintenance mode ENABLED' : 'Maintenance mode DISABLED', 'info');
        }
        console.log('[Admin] Maintenance mode:', this.maintenanceMode);
      });
    }

    const maintMsg = document.getElementById('maintenanceMessage');
    if (maintMsg) {
      maintMsg.addEventListener('input', (e) => {
        this.maintenanceMessage = e.target.value;
        this.saveMaintenanceState();
      });
    }

    document.addEventListener('click', (e) => {
      if (e.target.matches('#btn-refresh-users')) this.loadUsers();
      if (e.target.matches('#btn-refresh-songs')) this.loadAllSongs();
      if (e.target.matches('#btn-refresh-stats')) this.renderDashboard();
      if (e.target.matches('.btn-delete-song')) {
        const id = e.target.dataset.id;
        this.adminDeleteSong(id);
      }
      if (e.target.matches('.btn-refresh-metadata')) {
        const id = e.target.dataset.id;
        this.refreshSongMetadata(id);
      }
    });
  },

  loadMaintenanceState() {
    const raw = localStorage.getItem('audix_maintenance');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        this.maintenanceMode = !!data.enabled;
        this.maintenanceMessage = data.message || this.maintenanceMessage;
      } catch (e) {}
    }
    const toggle = document.getElementById('toggleMaintenance');
    const msg = document.getElementById('maintenanceMessage');
    if (toggle) toggle.checked = this.maintenanceMode;
    if (msg) msg.value = this.maintenanceMessage;
  },

  saveMaintenanceState() {
    localStorage.setItem('audix_maintenance', JSON.stringify({
      enabled: this.maintenanceMode,
      message: this.maintenanceMessage
    }));
  },

  checkMaintenance() {
    if (!this.maintenanceMode) return false;
    return !this.isAdmin();
  },

  getMaintenanceMessage() {
    return this.maintenanceMessage;
  },

  async render() {
    console.log('[Admin] render()');
    this.renderDashboard();
    await this.loadUsers();
    this.renderSongs();
    this.renderAchievementStats();
  },

  renderDashboard() {
    const container = document.getElementById('admin-dashboard');
    if (!container) return;

    const totalUsers = this.users.length || '—';
    const totalSongs = (typeof Library !== 'undefined') ? Library.songs.length : 0;
    const totalAchievements = (typeof Achievements !== 'undefined') ? Achievements.unlocked.size : 0;
    const totalUploads = totalSongs;

    container.innerHTML = `
      <div class="admin-stats-grid">
        <div class="admin-stat-card">
          <div class="admin-stat-num">${totalUsers}</div>
          <div class="admin-stat-label">Total Users</div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-num">${totalSongs}</div>
          <div class="admin-stat-label">Total Songs</div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-num">${totalAchievements}</div>
          <div class="admin-stat-label">Achievements Unlocked</div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-num">${totalUploads}</div>
          <div class="admin-stat-label">Total Uploads</div>
        </div>
      </div>
    `;
  },

  async loadUsers() {
    console.log('[Admin] loadUsers()');
    if (!Auth.db) {
      console.warn('[Admin] Firestore not available');
      return;
    }
    try {
      // Use realtime listener for live updates
      if (this._usersUnsub) {
        this._usersUnsub();
        this._usersUnsub = null;
      }

      const container = document.getElementById('admin-users-list');
      if (container) container.innerHTML = '<p class="admin-empty">Loading users from Firestore...</p>';

      const snap = await Auth.db.collection('users').get();
      this.users = [];
      snap.forEach(doc => {
        const d = doc.data();
        this.users.push({
          uid: doc.id,
          displayName: d.displayName || 'User',
          email: d.email || '—',
          photoURL: d.photoURL,
          audixId: d.audixId || '—',
          xp: d.xp || 0,
          level: d.level || 1,
          role: (d.email && this.ADMIN_EMAILS.includes(d.email)) ? 'Admin' : 'User',
          createdAt: d.createdAt ? new Date(d.createdAt.toDate()).toLocaleDateString() : '—'
        });
      });
      console.log('[Admin] loadUsers() —', this.users.length, 'users');
      this.renderUsers();

      // Set up realtime listener
      this._usersUnsub = Auth.db.collection('users').onSnapshot(snap => {
        this.users = [];
        snap.forEach(doc => {
          const d = doc.data();
          this.users.push({
            uid: doc.id,
            displayName: d.displayName || 'User',
            email: d.email || '—',
            photoURL: d.photoURL,
            audixId: d.audixId || '—',
            xp: d.xp || 0,
            level: d.level || 1,
            role: (d.email && this.ADMIN_EMAILS.includes(d.email)) ? 'Admin' : 'User',
            createdAt: d.createdAt ? new Date(d.createdAt.toDate()).toLocaleDateString() : '—'
          });
        });
        this.renderUsers();
        this.renderDashboard();
      }, err => {
        console.error('[Admin] Users listener error:', err);
      });

    } catch (e) {
      console.error('[Admin] loadUsers() error:', e);
      const container = document.getElementById('admin-users-list');
      if (container) {
        container.innerHTML = `<p class="admin-empty">Error loading users: ${e.message}. Check Firestore permissions.</p>`;
      }
    }
  },

  renderUsers() {
    const container = document.getElementById('admin-users-list');
    if (!container) return;
    if (this.users.length === 0) {
      container.innerHTML = '<p class="admin-empty">No users found. Click Refresh to load from Firestore.</p>';
      return;
    }
    let html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>User</th><th>Audix ID</th><th>Email</th><th>Role</th><th>Level</th><th>XP</th><th>Joined</th></tr></thead><tbody>';
    for (const u of this.users) {
      html += `<tr>
        <td><div class="admin-user-cell"><img src="${u.photoURL || ''}" class="admin-user-pic" onerror="this.style.display='none'">${u.displayName}</div></td>
        <td><code>${u.audixId}</code></td>
        <td>${u.email}</td>
        <td><span class="admin-role-badge ${u.role === 'Admin' ? 'admin' : 'user'}">${u.role}</span></td>
        <td>Lv.${u.level}</td>
        <td>${u.xp} XP</td>
        <td>${u.createdAt}</td>
      </tr>`;
    }
    html += '</tbody></table></div>';
    container.innerHTML = html;
  },

  loadAllSongs() {
    console.log('[Admin] loadAllSongs()');
    if (typeof Library !== 'undefined') {
      this.allSongs = Library.getAllSongs();
      console.log('[Admin] loadAllSongs() —', this.allSongs.length, 'songs');
      this.renderSongs();
    }
  },

  renderSongs() {
    const container = document.getElementById('admin-songs-list');
    if (!container) return;
    const songs = this.allSongs;
    if (songs.length === 0) {
      container.innerHTML = '<p class="admin-empty">No songs in library. Click Refresh to load.</p>';
      return;
    }
    let html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Title</th><th>Artist</th><th>Album</th><th>Plays</th><th>Added</th><th>Actions</th></tr></thead><tbody>';
    for (const s of songs) {
      const added = s.addedAt ? new Date(s.addedAt).toLocaleDateString() : '—';
      html += `<tr>
        <td>${s.title}</td>
        <td>${s.artist}</td>
        <td>${s.album || '—'}</td>
        <td>${s.playCount || 0}</td>
        <td>${added}</td>
        <td>
          <button class="btn-text btn-small btn-delete-song" data-id="${s.id}">Delete</button>
          <button class="btn-text btn-small btn-refresh-metadata" data-id="${s.id}">Refresh</button>
        </td>
      </tr>`;
    }
    html += '</tbody></table></div>';
    container.innerHTML = html;
  },

  adminDeleteSong(id) {
    console.log('[Admin] adminDeleteSong() —', id);
    if (!confirm('Delete this song permanently?')) return;
    if (typeof Library !== 'undefined') {
      Library.deleteSong(id);
      this.loadAllSongs();
    }
  },

  refreshSongMetadata(id) {
    console.log('[Admin] refreshSongMetadata() —', id);
    if (typeof Utils !== 'undefined') Utils.toast('Metadata refresh queued (not yet implemented)', 'info');
  },

  renderAchievementStats() {
    const container = document.getElementById('admin-achievement-stats');
    if (!container) return;
    if (typeof Achievements === 'undefined') {
      container.innerHTML = '<p class="admin-empty">Achievements module not loaded.</p>';
      return;
    }
    const total = Achievements.list.length;
    const unlocked = Achievements.unlocked.size;
    const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;
    let html = `
      <div class="admin-ach-summary">
        <div class="admin-stat-card">
          <div class="admin-stat-num">${unlocked}</div>
          <div class="admin-stat-label">Unlocked</div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-num">${total}</div>
          <div class="admin-stat-label">Total</div>
        </div>
        <div class="admin-stat-card">
          <div class="admin-stat-num">${pct}%</div>
          <div class="admin-stat-label">Completion</div>
        </div>
      </div>
      <div class="admin-ach-breakdown">
        <h4>Per Achievement</h4>
        <div class="admin-ach-list">
    `;
    for (const ach of Achievements.list) {
      const isUnlocked = Achievements.unlocked.has(ach.id);
      const [curr, target] = Achievements.getProgress(ach);
      const p = target > 0 ? Math.round((curr / target) * 100) : (isUnlocked ? 100 : 0);
      html += `
        <div class="admin-ach-row">
          <span class="admin-ach-name">${ach.name}</span>
          <span class="admin-ach-bar"><span style="width:${p}%"></span></span>
          <span class="admin-ach-pct">${p}%</span>
          <span class="admin-ach-badge ${isUnlocked ? 'unlocked' : 'locked'}">${isUnlocked ? 'Unlocked' : 'Locked'}</span>
        </div>
      `;
    }
    html += '</div></div>';
    container.innerHTML = html;
  }
};

// Maintenance overlay check
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (typeof Admin !== 'undefined' && Admin.checkMaintenance()) {
      console.log('[Admin] Maintenance mode active — showing overlay');
      const overlay = document.getElementById('maintenanceOverlay');
      const msg = document.getElementById('maintenanceOverlayMessage');
      if (overlay) overlay.classList.remove('hidden');
      if (msg) msg.textContent = Admin.getMaintenanceMessage();
    }
  }, 500);
});
