/* ============================================
   NOTIFICATIONS PANEL
   Real-time sync with player
   ============================================ */

const Notifications = {
  panel: null,
  toggleBtn: null,
  isOpen: false,

  init() {
    this.panel = document.getElementById('notificationsPanel');
    this.toggleBtn = document.getElementById('notificationsToggleBtn');
    this.bindEvents();
    this.updateDisplay();
  },

  bindEvents() {
    const toggleBtn = document.getElementById('notificationsToggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }

    const closeBtn = document.getElementById('notifClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    const prevBtn = document.getElementById('notifPrev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (typeof Player !== 'undefined') Player.prev();
      });
    }

    const playBtn = document.getElementById('notifPlay');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (typeof Player !== 'undefined') Player.togglePlay();
      });
    }

    const nextBtn = document.getElementById('notifNext');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (typeof Player !== 'undefined') Player.next();
      });
    }

    const shuffleBtn = document.getElementById('notifShuffle');
    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', () => {
        if (typeof Player !== 'undefined') {
          Player.shuffle = !Player.shuffle;
          document.getElementById('btn-shuffle')?.classList.toggle('active', Player.shuffle);
          this.updateDisplay();
        }
      });
    }

    const repeatBtn = document.getElementById('notifRepeat');
    if (repeatBtn) {
      repeatBtn.addEventListener('click', () => {
        if (typeof Player !== 'undefined') {
          Player.repeat = !Player.repeat;
          document.getElementById('btn-repeat')?.classList.toggle('active', Player.repeat);
          this.updateDisplay();
        }
      });
    }

    const favoriteBtn = document.getElementById('notifFavorite');
    if (favoriteBtn) {
      favoriteBtn.addEventListener('click', () => this.toggleFavorite());
    }
  },

  toggle() {
    this.isOpen = !this.isOpen;
    this.panel?.classList.toggle('open', this.isOpen);
  },

  close() {
    this.isOpen = false;
    this.panel?.classList.remove('open');
  },

  toggleFavorite() {
    const songs = (typeof Library !== 'undefined') ? Library.songs : [];
    const currentIndex = (typeof Player !== 'undefined') ? Player.currentIndex : -1;
    if (currentIndex < 0 || currentIndex >= songs.length) return;

    const song = songs[currentIndex];
    song.isFavorite = !song.isFavorite;

    // Save to DB
    if (typeof Library !== 'undefined' && Library.db && song.id) {
      const tx = Library.db.transaction('userSongs', 'readwrite');
      const store = tx.objectStore('userSongs');
      store.put(song);
    }

    this.updateDisplay();
    if (typeof SFX !== 'undefined') SFX.favorite();
    if (typeof Utils !== 'undefined') {
      Utils.toast(song.isFavorite ? 'Added to favorites' : 'Removed from favorites');
    }
  },

  updateDisplay() {
    const songs = (typeof Library !== 'undefined') ? Library.songs : [];
    const currentIndex = (typeof Player !== 'undefined') ? Player.currentIndex : -1;
    const isPlaying = (typeof Player !== 'undefined') ? Player.isPlaying : false;
    const shuffle = (typeof Player !== 'undefined') ? Player.shuffle : false;
    const repeat = (typeof Player !== 'undefined') ? Player.repeat : false;

    const titleEl = document.getElementById('notifTitle');
    const artistEl = document.getElementById('notifArtist');
    const coverEl = document.getElementById('notifCover');
    const coverPlaceholder = document.getElementById('notifCoverPlaceholder');
    const playBtn = document.getElementById('notifPlay');
    const shuffleBtn = document.getElementById('notifShuffle');
    const repeatBtn = document.getElementById('notifRepeat');
    const favoriteBtn = document.getElementById('notifFavorite');

    if (currentIndex >= 0 && currentIndex < songs.length) {
      const song = songs[currentIndex];
      if (titleEl) titleEl.textContent = song.title || 'Unknown';
      if (artistEl) artistEl.textContent = song.artist || 'Unknown Artist';

      if (coverEl && coverPlaceholder) {
        if (song.cover) {
          coverEl.src = song.cover;
          coverEl.classList.remove('hidden');
          coverPlaceholder.classList.add('hidden');
        } else {
          coverEl.classList.add('hidden');
          coverPlaceholder.classList.remove('hidden');
        }
      }

      if (favoriteBtn) {
        favoriteBtn.classList.toggle('active', !!song.isFavorite);
      }
    } else {
      if (titleEl) titleEl.textContent = 'Not Playing';
      if (artistEl) artistEl.textContent = '—';
      if (coverEl) coverEl.classList.add('hidden');
      if (coverPlaceholder) coverPlaceholder.classList.remove('hidden');
      if (favoriteBtn) favoriteBtn.classList.remove('active');
    }

    if (playBtn) {
      playBtn.innerHTML = isPlaying ? '&#10074;&#10074;' : '&#9658;';
    }
    if (shuffleBtn) {
      shuffleBtn.classList.toggle('active', shuffle);
    }
    if (repeatBtn) {
      repeatBtn.classList.toggle('active', repeat);
    }
  },

  updateProfileInfo() {
    // Called when profile changes to update any user-related display
    this.updateDisplay();
  }
};
