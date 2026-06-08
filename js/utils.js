/* ============================================
   UTILITIES — v1.0
   Toast, helpers, debug logger
   ============================================ */

const Utils = {
  toast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.classList.add('fade-out'), 2500);
    setTimeout(() => el.remove(), 3000);
    console.log(`[Toast] ${type}: ${msg}`);
  },

  xpToast(msg) {
    const container = document.getElementById('xp-toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast toast-xp';
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.classList.add('fade-out'), 1500);
    setTimeout(() => el.remove(), 2000);
    console.log(`[XPToast] ${msg}`);
  },

  levelUpToast(level, title) {
    const container = document.getElementById('achievement-toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast toast-levelup';
    el.innerHTML = `<strong>Level ${level}!</strong><br>${title}`;
    container.appendChild(el);
    setTimeout(() => el.classList.add('fade-out'), 3500);
    setTimeout(() => el.remove(), 4000);
    console.log(`[LevelUp] Level ${level} — ${title}`);
  },

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  },

  debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    ,

  async share(data) {
    if (navigator.share) {
      try {
        await navigator.share(data);
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  },

  copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.toast('Copied to clipboard!', 'success');
      }).catch(() => {
        this.toast('Failed to copy', 'error');
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.toast('Copied to clipboard!', 'success');
    }
  }
};
  }
,

  async share(data) {
    if (navigator.share) {
      try {
        await navigator.share(data);
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  },

  copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.toast('Copied to clipboard!', 'success');
      }).catch(() => {
        this.toast('Failed to copy', 'error');
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.toast('Copied to clipboard!', 'success');
    }
  }
};
