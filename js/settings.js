/* ============================================
   SETTINGS MANAGER — v3.0
   Firebase Firestore + localStorage fallback
   ============================================ */

import { db } from './auth.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const Settings = {
  prefs: {
    sfxEnabled: true,
    autoplayOnUpload: true,
    theme: 'default'
  },

  init() {
    this.load();
    this.bindEvents();
    this.applyToUI();
    this.applyTheme();
  },

  async load() {
    const userId = (typeof Auth !== 'undefined') ? Auth.getUserId() : null;

    if (userId) {
      try {
        const ref = doc(db, 'settings', userId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          this.prefs = { ...this.prefs, ...snap.data() };
          this.applyToUI();
          this.applyTheme();
          return;
        }
      } catch (e) {
        console.error('[Settings] Firestore load error:', e);
      }
    }

    // Fallback to localStorage
    const raw = localStorage.getItem('audix_settings');
    if (raw) {
      try { this.prefs = { ...this.prefs, ...JSON.parse(raw) }; } catch (e) {}
    }
  },

  async save() {
    const userId = (typeof Auth !== 'undefined') ? Auth.getUserId() : null;

    if (userId) {
      try {
        await setDoc(doc(db, 'settings', userId), this.prefs, { merge: true });
      } catch (e) {
        console.error('[Settings] Firestore save error:', e);
      }
    }

    // Always also save to localStorage as backup
    localStorage.setItem('audix_settings', JSON.stringify(this.prefs));

    if (typeof Achievements !== 'undefined') {
      Achievements.sfxEnabled = this.prefs.sfxEnabled;
    }
  },

  bindEvents() {
    const saveUsername = document.getElementById('btn-save-username');
    if (saveUsername) saveUsername.addEventListener('click', () => this.changeUsername());

    const savePassword = document.getElementById('btn-save-password');
    if (savePassword) savePassword.addEventListener('click', () => this.changePassword());

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
    if (deleteAccount) deleteAccount.addEventListener('click', () => this.confirmDeleteAccount());

    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('reward-locked') && !btn.classList.contains('unlocked')) {
          if (typeof Utils !== 'undefined') Utils.toast('Unlock this theme by completing achievements!', 'info');
          return;
        }
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.prefs.theme = btn.dataset.theme;
        this.save();
        this.applyTheme();
      });
    });
  },

  applyToUI() {
    const toggleSfx = document.getElementById('toggleSfx');
    const toggleAutoplay = document.getElementById('toggleAutoplay');
    if (toggleSfx) toggleSfx.checked = this.prefs.sfxEnabled;
    if (toggleAutoplay) toggleAutoplay.checked = this.prefs.autoplayOnUpload;
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === this.prefs.theme);
    });
  },

  applyTheme() {
    const themes = {
      default: { '--bg-deep': '#0a0a12', '--bg-base': '#0f0f1a', '--bg-card': '#16162a' },
      neon: { '--accent': '#ff00ff', '--accent-2': '#00ffff', '--accent-3': '#ffff00' },
      dark: { '--bg-deep': '#000000', '--bg-base': '#050505', '--bg-card': '#0a0a0a', '--glass': 'rgba(255,255,255,0.02)' },
      glass: { '--glass': 'rgba(255,255,255,0.1)', '--glass-border': 'rgba(255,255,255,0.15)' },
      gradient: { '--bg-deep': '#1a0a2e', '--bg-base': '#16213e', '--bg-card': '#0f3460' }
    };
    const t = themes[this.prefs.theme];
    if (!t) return;
    for (const [key, val] of Object.entries(t)) {
      document.documentElement.style.setProperty(key, val);
    }
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
      await Auth.updateProfile({ username });
      input.value = '';
      if (typeof Utils !== 'undefined') Utils.toast('Username updated');
    } catch (err) {
      if (typeof Utils !== 'undefined') Utils.toast(err.message, 'error');
    }
  },

  async changePassword() {
    const oldInput = document.getElementById('settingsOldPassword');
    const newInput = document.getElementById('settingsNewPassword');
    if (!oldInput || !newInput) return;
    if (typeof Auth === 'undefined' || !Auth.currentUser) {
      if (typeof Utils !== 'undefined') Utils.toast('Please log in first', 'error');
      return;
    }
    try {
      await Auth.changePassword(oldInput.value, newInput.value);
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
    const confirmed = confirm('WARNING: This will permanently delete your account and ALL your data. This cannot be undone. Are you sure?');
    if (confirmed) {
      Auth.deleteAccount().then(() => {
        if (typeof Utils !== 'undefined') Utils.toast('Account deleted');
      }).catch((err) => {
        if (typeof Utils !== 'undefined') Utils.toast(err.message, 'error');
      });
    }
  }
};

window.Settings = Settings;
export default Settings;
