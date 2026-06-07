/* ============================================
   PROFILE MANAGER — v3.1 (Firebase Auth)
   NO STORAGE — Profile pics stored in Firestore as base64
   XP/Level Display Integration
   ============================================ */

const Profile = {
  init() {
    this.bindEvents();
    this.updateDisplay();
  },

  bindEvents() {
    const pfpInput = document.getElementById('pfp-input');
    if (pfpInput) {
      pfpInput.addEventListener('change', (e) => this.changePfp(e.target.files[0]));
    }

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (typeof Auth !== 'undefined') Auth.logout();
      });
    }
  },

  async changePfp(file) {
    if (!file || !file.type.startsWith('image/')) {
      if (typeof Utils !== 'undefined') Utils.toast('Please select an image file', 'error');
      return;
    }
    if (typeof Auth === 'undefined' || !Auth.currentUser) {
      if (typeof Utils !== 'undefined') Utils.toast('Please log in first', 'error');
      return;
    }
    try {
      // Convert image to base64 data URL (compressed/resized for Firestore 1MB limit)
      const dataUrl = await this.resizeAndCompressImage(file, 400, 400, 0.8);
      const uid = Auth.currentUser.uid;

      // Update Firestore profile with base64 image
      await Auth.updateProfile(uid, { customPhotoURL: dataUrl, photoURL: dataUrl, profilePic: dataUrl });

      // Update Firebase Auth profile
      await Auth.currentUser.updateProfile({ photoURL: dataUrl });

      this.updateDisplay();
      Auth.broadcastProfileUpdate();
      if (typeof Utils !== 'undefined') Utils.toast('Profile picture updated');
    } catch (err) {
      console.error('[Profile] changePfp error:', err);
      if (typeof Utils !== 'undefined') Utils.toast('Failed to update picture', 'error');
    }
  },

  resizeAndCompressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
      reader.onerror = reject;
      reader.readAsDataURL(file);

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round(width * (maxHeight / height));
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
    });
  },

  updateDisplay() {
    const user = (typeof Auth !== 'undefined') ? Auth.currentUser : null;
    const pfpImg = document.getElementById('profilePfp');
    const placeholder = document.getElementById('avatarPlaceholder');
    const usernameEl = document.getElementById('profileUsername');
    const emailEl = document.getElementById('profileEmail');
    const joinedEl = document.getElementById('profileJoined');
    const songCountEl = document.getElementById('profileSongCount');
    const achieveCountEl = document.getElementById('profileAchieveCount');
    const listenTimeEl = document.getElementById('profileListenTime');

    if (!user) {
      if (pfpImg) pfpImg.classList.add('hidden');
      if (placeholder) { placeholder.classList.remove('hidden'); placeholder.textContent = '👤'; }
      if (usernameEl) usernameEl.textContent = 'Guest';
      if (emailEl) emailEl.textContent = '—';
      if (joinedEl) joinedEl.textContent = '—';
      if (songCountEl) songCountEl.textContent = '0';
      if (achieveCountEl) achieveCountEl.textContent = '0 / 50';
      if (listenTimeEl) listenTimeEl.textContent = '0 min';
      return;
    }

    // Use customPhotoURL if available, otherwise Google photoURL
    const photoUrl = user.photoURL || null;

    if (pfpImg && photoUrl) {
      pfpImg.src = photoUrl;
      pfpImg.classList.remove('hidden');
      if (placeholder) placeholder.classList.add('hidden');
    } else {
      if (pfpImg) pfpImg.classList.add('hidden');
      if (placeholder) {
        placeholder.classList.remove('hidden');
        placeholder.textContent = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
      }
    }

    if (usernameEl) usernameEl.textContent = user.displayName || 'User';
    if (emailEl) emailEl.textContent = user.email || '—';
    if (joinedEl) {
      const date = user.metadata && user.metadata.creationTime
        ? new Date(user.metadata.creationTime)
        : new Date();
      joinedEl.textContent = date.toLocaleDateString();
    }
    if (songCountEl) {
      const songs = (typeof Library !== 'undefined' && Library.songs) ? Library.songs.length : 0;
      songCountEl.textContent = songs;
    }
    if (achieveCountEl) {
      const unlocked = (typeof Achievements !== 'undefined' && Achievements.unlocked) ? Achievements.unlocked.size : 0;
      achieveCountEl.textContent = `${unlocked} / 50`;
    }
    if (listenTimeEl) {
      const mins = (typeof Player !== 'undefined') ? Math.floor(Player.totalListened) : 0;
      listenTimeEl.textContent = mins >= 60 ? `${Math.floor(mins/60)}h ${mins%60}m` : `${mins} min`;
    }

    if (typeof Gamification !== 'undefined') Gamification.updateUI();
  }
};
