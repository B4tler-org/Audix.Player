/* ============================================
   LIBRARY MANAGER — SINGLE SOURCE OF TRUTH
   Per-user song storage with URL recovery
   ============================================ */

const Library = {
  db: null,
  songs: [],
  currentFilter: '',

  async init() {
    console.log('[Library] init() starting...');
    this.db = Auth.db || null; // Use Auth's DB instance
    await this.loadUserSongs();
    console.log('[Library] Loaded', this.songs.length, 'songs');
    this.render();
    this.bindEvents();
    console.log('[Library] init() complete');
  },

  async loadUserSongs() {
    const userId = (typeof Auth !== 'undefined') ? Auth.getUserId() : null;
    console.log('[Library] loadUserSongs() for userId:', userId);

    return new Promise((resolve) => {
      if (!this.db) { this.songs = []; resolve(); return; }

      const tx = this.db.transaction('userSongs', 'readonly');
      const store = tx.objectStore('userSongs');
      const req = store.getAll();

      req.onsuccess = () => {
        const allSongs = req.result || [];
        if (userId) {
          this.songs = allSongs.filter(s => s.userId === userId);
        } else {
          // Guest mode: show all songs (backward compat)
          this.songs = allSongs;
        }
        console.log('[Library] Filtered', this.songs.length, 'songs for user');

        // Recover blob URLs for stored songs
        this.songs.forEach((song, i) => {
          if (!song.url || song.url === '' || song.url.startsWith('blob:') === false) {
            console.warn('[Library] Song', i, 'needs URL recovery');
            try {
              if (song.blobData && song.blobData instanceof ArrayBuffer) {
                const blob = new Blob([song.blobData], { type: 'audio/mpeg' });
                song.url = URL.createObjectURL(blob);
                console.log('[Library] Recovered URL for song', i);
              }
            } catch (e) {
              console.error('[Library] URL recovery failed for song', i, e);
            }
          }
        });
        resolve();
      };
      req.onerror = () => { console.error('[Library] loadUserSongs error:', req.error); this.songs = []; resolve(); };
    });
  },

  async addFiles(fileList) {
    const files = Array.from(fileList);
    console.log('[Library] addFiles() —', files.length, 'files selected');
    const userId = (typeof Auth !== 'undefined') ? Auth.getUserId() : null;
    let added = 0;

    for (const file of files) {
      if (!file.type.startsWith('audio/')) {
        console.log('[Library] Skipping non-audio:', file.name);
        continue;
      }
      try {
        console.log('[Library] Processing:', file.name);
        const song = await this.processFile(file);
        song.userId = userId; // Tag with user ID
        await this.saveSong(song);
        added++;
      } catch (e) {
        console.error('[Library] Error processing', file.name, e);
      }
    }

    // Reset file input
    const input = document.getElementById('file-input');
    if (input) input.value = '';

    console.log('[Library] Reloading after upload...');
    await this.loadUserSongs();
    console.log('[Library] After reload:', this.songs.length, 'songs');
    this.render();

    if (typeof Utils !== 'undefined') Utils.toast(`${added} song(s) added`);
    if (typeof Achievements !== 'undefined') Achievements.track('songsAdded', added);

    // Auto-load first track if player is empty
    if (typeof Player !== 'undefined') {
      console.log('[Library] Notifying Player, songs:', Player.songs.length);
      if (Player.currentIndex === -1 && this.songs.length > 0) {
        console.log('[Library] Auto-loading track 0');
        Player.loadTrack(0);
      }
    }
  },

  processFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const song = {
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'Unknown Artist',
        album: '',
        year: '',
        genre: '',
        duration: 0,
        url: url,
        blobData: null, // Will store ArrayBuffer for persistence
        cover: null,
        addedAt: Date.now()
      };

      // Read file as ArrayBuffer for storage
      const reader = new FileReader();
      reader.onload = () => {
        song.blobData = reader.result;
      };
      reader.readAsArrayBuffer(file);

      // Read ID3 tags
      if (typeof jsmediatags !== 'undefined') {
        jsmediatags.read(file, {
          onSuccess: (tag) => {
            const t = tag.tags;
            if (t.title) song.title = t.title;
            if (t.artist) song.artist = t.artist;
            if (t.album) song.album = t.album;
            if (t.year) song.year = t.year;
            if (t.genre) song.genre = t.genre;
            if (t.track) song.track = t.track;
            if (t.picture) {
              const pic = t.picture;
              const blob = new Blob([pic.data], { type: pic.format });
              song.cover = URL.createObjectURL(blob);
            }
            console.log('[Library] ID3 read:', song.title, '-', song.artist, 'genre:', song.genre);
            resolve(song);
          },
          onError: (err) => {
            console.log('[Library] ID3 failed for', file.name, '- using filename');
            resolve(song);
          }
        });
      } else {
        console.warn('[Library] jsmediatags not available');
        resolve(song);
      }
    });
  },

  saveSong(song) {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject(new Error('DB not ready')); return; }
      const tx = this.db.transaction('userSongs', 'readwrite');
      const store = tx.objectStore('userSongs');
      const req = store.add(song);
      req.onsuccess = () => {
        console.log('[Library] saveSong success, id:', req.result);
        resolve(req.result);
      };
      req.onerror = () => { console.error('[Library] saveSong error:', req.error); reject(req.error); };
    });
  },

  async deleteSong(id) {
    return new Promise((resolve) => {
      if (!this.db) { resolve(); return; }
      const tx = this.db.transaction('userSongs', 'readwrite');
      const store = tx.objectStore('userSongs');
      store.delete(id);
      tx.oncomplete = async () => {
        console.log('[Library] Deleted song', id);
        await this.loadUserSongs();
        this.render();
        if (typeof Player !== 'undefined') {
          const currentSong = Player.songs[Player.currentIndex];
          if (!currentSong || currentSong.id === id) {
            Player.pause();
            Player.currentIndex = -1;
            document.getElementById('track-title').textContent = 'Select a song';
            document.getElementById('track-artist').textContent = 'Your Library is empty';
          }
        }
        resolve();
      };
    });
  },

  bindEvents() {
    const input = document.getElementById('file-input');
    if (input) {
      input.addEventListener('change', (e) => this.addFiles(e.target.files));
    }

    const search = document.getElementById('library-search');
    if (search) {
      search.addEventListener('input', Utils.debounce((e) => {
        this.currentFilter = e.target.value.toLowerCase();
        this.render();
        if (typeof Achievements !== 'undefined') Achievements.track('searches');
      }, 300));
    }
  },

  render() {
    const list = document.getElementById('library-list');
    if (!list) return;

    const filtered = this.songs.filter(s => {
      const q = this.currentFilter;
      if (!q) return true;
      return (s.title && s.title.toLowerCase().includes(q)) ||
             (s.artist && s.artist.toLowerCase().includes(q)) ||
             (s.album && s.album.toLowerCase().includes(q));
    });

    if (filtered.length === 0) {
      const isEmpty = this.songs.length === 0;
      list.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
          <p>${isEmpty ? 'Your library is empty.' : 'No matches found.'}</p>
          <span>${isEmpty ? 'Add MP3 files from your device to get started.' : 'Try a different search term.'}</span>
        </div>`;
      return;
    }

    list.innerHTML = filtered.map((song, idx) => `
      <div class="library-item ${Player && Player.currentIndex === idx ? 'active' : ''}" data-index="${idx}">
        <div class="lib-thumb">
          ${song.cover ? `<img src="${song.cover}" alt="">` : '&#9836;'}
        </div>
        <div class="lib-info">
          <div class="lib-title">${song.title || 'Unknown'}</div>
          <div class="lib-artist">${song.artist || 'Unknown Artist'}${song.album ? ' — ' + song.album : ''}${song.genre ? ' • ' + song.genre : ''}</div>
        </div>
        <div class="lib-duration">${song.duration ? Utils.formatTime(song.duration) : ''}</div>
      </div>
    `).join('');

    list.querySelectorAll('.library-item').forEach(el => {
      el.addEventListener('click', () => {
        const index = parseInt(el.dataset.index);
        console.log('[Library] Clicked index:', index);
        if (typeof Player !== 'undefined') Player.playFromLibrary(index);
      });
    });
  }
};
