/* ============================================
   PROFILE MANAGER
   ============================================ */

const Profile = {
  init() {
    this.bindEvents();
    this.updateDisplay();
  },

  bindEvents() {
    // PFP upload
    const pfpInput = document.getElementById('pfp-input');
    if (pfpInput) {
      pfpInput.addEventListener('change', (e) => this.changePfp(e.target.files[0]));
    }

    // Logout
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
      const url = URL.createObjectURL(file);
      await Auth.updateProfile(Auth.currentUser.id, { profilePic: url });
      this.updateDisplay();
      if (typeof Auth !== 'undefined') Auth.updateUI();
      if (typeof Utils !== 'undefined') Utils.toast('Profile picture updated');
    } catch (err) {
      if (typeof Utils !== 'undefined') Utils.toast('Failed to update picture', 'error');
    }
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

    if (!user) {
      if (pfpImg) pfpImg.classList.add('hidden');
      if (placeholder) placeholder.classList.remove('hidden');
      if (usernameEl) usernameEl.textContent = 'Guest';
      if (emailEl) emailEl.textContent = '—';
      if (joinedEl) joinedEl.textContent = '—';
      if (songCountEl) songCountEl.textContent = '0';
      if (achieveCountEl) achieveCountEl.textContent = '0 / 50';
      return;
    }

    if (pfpImg && user.profilePic) {
      pfpImg.src = user.profilePic;
      pfpImg.classList.remove('hidden');
      if (placeholder) placeholder.classList.add('hidden');
    } else {
      if (pfpImg) pfpImg.classList.add('hidden');
      if (placeholder) {
        placeholder.classList.remove('hidden');
        placeholder.textContent = user.username.charAt(0).toUpperCase();
      }
    }

    if (usernameEl) usernameEl.textContent = user.username;
    if (emailEl) emailEl.textContent = user.email;
    if (joinedEl) {
      const date = new Date(user.createdAt);
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
  }
};
