/* ============================================
   SETTINGS MANAGER
   ============================================ */

const Settings = {
  prefs: {
    sfxEnabled: true,
    autoplayOnUpload: true
  },

  init() {
    this.load();
    this.bindEvents();
    this.applyToUI();
  },

  load() {
    const raw = localStorage.getItem('audix_settings');
    if (raw) {
      try { this.prefs = JSON.parse(raw); } catch (e) {}
    }
  },

  save() {
    localStorage.setItem('audix_settings', JSON.stringify(this.prefs));
    if (typeof Achievements !== 'undefined') {
      Achievements.sfxEnabled = this.prefs.sfxEnabled;
    }
  },

  bindEvents() {
    const saveUsername = document.getElementById('btn-save-username');
    if (saveUsername) {
      saveUsername.addEventListener('click', () => this.changeUsername());
    }

    const savePassword = document.getElementById('btn-save-password');
    if (savePassword) {
      savePassword.addEventListener('click', () => this.changePassword());
    }

    const toggleSfx = document.getElementById('toggleSfx');
    if (toggleSfx) {
      toggleSfx.addEventListener('change', (e) => {
        this.prefs.sfxEnabled = e.target.checked;
        this.save();
      });
    }

    const toggleAutoplay = document.getElementById('toggleAutoplay');
    if (toggleAutoplay) {
      toggleAutoplay.addEventListener('change', (e) => {
        this.prefs.autoplayOnUpload = e.target.checked;
        this.save();
      });
    }

    const deleteAccount = document.getElementById('btn-delete-account');
    if (deleteAccount) {
      deleteAccount.addEventListener('click', () => this.confirmDeleteAccount());
    }
  },

  applyToUI() {
    const toggleSfx = document.getElementById('toggleSfx');
    const toggleAutoplay = document.getElementById('toggleAutoplay');
    if (toggleSfx) toggleSfx.checked = this.prefs.sfxEnabled;
    if (toggleAutoplay) toggleAutoplay.checked = this.prefs.autoplayOnUpload;
  },

  async changeUsername() {
    const input = document.getElementById('settingsUsername');
    if (!input) return;
    const username = input.value.trim();
    if (!username || username.length < 3) {
      if (typeof Utils !== 'undefined') Utils.toast('Username must be at least 3 characters', 'error');
      return;
    }
    if (typeof Auth === 'undefined' || !Auth.currentUser) {
      if (typeof Utils !== 'undefined') Utils.toast('Please log in first', 'error');
      return;
    }
    try {
      await Auth.updateProfile(Auth.currentUser.id, { username });
      input.value = '';

      // Real-time broadcast
      Auth.broadcastProfileUpdate();

      if (typeof Utils !== 'undefined') Utils.toast('Username updated');
    } catch (err) {
      if (typeof Utils !== 'undefined') Utils.toast(err.message, 'error');
    }
  },

  async changePassword() {
    const oldInput = document.getElementById('settingsOldPassword');
    const newInput = document.getElementById('settingsNewPassword');
    if (!oldInput || !newInput) return;
    const oldPassword = oldInput.value;
    const newPassword = newInput.value;
    if (typeof Auth === 'undefined' || !Auth.currentUser) {
      if (typeof Utils !== 'undefined') Utils.toast('Please log in first', 'error');
      return;
    }
    try {
      await Auth.changePassword(Auth.currentUser.id, oldPassword, newPassword);
      oldInput.value = '';
      newInput.value = '';
      if (typeof Utils !== 'undefined') Utils.toast('Password updated successfully');
    } catch (err) {
      if (typeof Utils !== 'undefined') Utils.toast(err.message, 'error');
    }
  },

  confirmDeleteAccount() {
    if (typeof Auth === 'undefined' || !Auth.currentUser) {
      if (typeof Utils !== 'undefined') Utils.toast('Please log in first', 'error');
      return;
    }
    const confirmed = confirm('WARNING: This will permanently delete your account and ALL your data (songs, achievements, settings). This cannot be undone. Are you sure?');
    if (confirmed) {
      Auth.deleteAccount().then(() => {
        if (typeof Utils !== 'undefined') Utils.toast('Account deleted');
      }).catch((err) => {
        if (typeof Utils !== 'undefined') Utils.toast(err.message, 'error');
      });
    }
  }
};
