/* ============================================
   LIBRARY MANAGER — v2.0
   Smart Playlists, Advanced Search, Mood Detection
   ============================================ */

const Library = {
  db: null,
  songs: [],
  currentFilter: '',
  smartFilter: 'all', // all, most-played, recently-added, favorites, mood
  searchChip: null, // artist, genre, album, lyrics

  async init() {
    console.log('[Library] init()');
    this.db = (typeof Auth !== 'undefined' && Auth.db) ? Auth.db : null;
    await this.loadUserSongs();
    console.log('[Library] Loaded', this.songs.length, 'songs');
    this.render();
    this.bindEvents();
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
        this.songs = userId ? allSongs.filter(s => s.userId === userId) : allSongs;
        console.log('[Library] Raw loaded:', allSongs.length, 'Filtered:', this.songs.length);

        this.songs.forEach((song, i) => {
          let urlRecovered = false;
          if (song.audioData && song.audioData instanceof ArrayBuffer) {
            try {
              const blob = new Blob([song.audioData], { type: song.mimeType || 'audio/mpeg' });
              song.url = URL.createObjectURL(blob);
              console.log('[Library] Recovered audio URL for song', i, song.title);
              urlRecovered = true;
            } catch (e) {
              console.error('[Library] Failed to recover audio URL for song', i, e);
            }
          }
          if (!urlRecovered && song.blobData && song.blobData instanceof ArrayBuffer) {
            try {
              const blob = new Blob([song.blobData], { type: 'audio/mpeg' });
              song.url = URL.createObjectURL(blob);
              console.log('[Library] Recovered audio URL from blobData for song', i);
              urlRecovered = true;
            } catch (e) {
              console.error('[Library] Failed blobData recovery for song', i);
            }
          }
          if (song.coverData && !song.cover) {
            try { song.cover = song.coverData; } catch (e) {}
          }
          if (!urlRecovered) {
            console.warn('[Library] Song', i, song.title, 'has no recoverable audio data');
          }
        });

        resolve();
      };
      req.onerror = () => { console.error('[Library] loadUserSongs error'); this.songs = []; resolve(); };
    });
  },

  async addFiles(fileList) {
    const files = Array.from(fileList);
    console.log('[Library] addFiles() —', files.length, 'files');
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
        song.userId = userId;
        await this.saveSong(song);
        added++;
      } catch (e) {
        console.error('[Library] Error processing', file.name, e);
      }
    }

    const input = document.getElementById('file-input');
    if (input) input.value = '';

    await this.loadUserSongs();
    console.log('[Library] After reload:', this.songs.length, 'songs');
    this.render();

    if (typeof Utils !== 'undefined') Utils.toast(`${added} song(s) added`);
    if (typeof Achievements !== 'undefined') Achievements.track('songsAdded', added);
    if (typeof Gamification !== 'undefined') Gamification.addXP(added * 5, 'upload');

    if (typeof Player !== 'undefined') {
      if (Player.currentIndex === -1 && this.songs.length > 0) {
        console.log('[Library] Auto-loading track 0');
        Player.loadTrack(0);
        if (typeof Settings !== 'undefined' && Settings.prefs.autoplayOnUpload) {
          Player.play();
        }
      }
    }
  },

  processFile(file) {
    return new Promise(async (resolve, reject) => {
      const cleaned = Utils.cleanTitle(file.name);

      const song = {
        title: cleaned.title,
        artist: cleaned.artist,
        album: '',
        year: '',
        genre: '',
        duration: 0,
        url: '',
        audioData: null,
        mimeType: file.type || 'audio/mpeg',
        cover: null,
        coverData: null,
        isFavorite: false,
        lyrics: '',
        userId: null,
        createdAt: Date.now(),
        playCount: 0,
        lastPlayed: 0,
        mood: null
      };

      try {
        song.audioData = await Utils.fileToArrayBuffer(file);
        song.url = Utils.arrayBufferToBlobURL(song.audioData, song.mimeType);
        console.log('[Library] Audio data stored, size:', song.audioData.byteLength);
      } catch (e) {
        console.error('[Library] Failed to read audio data:', e);
        reject(e);
        return;
      }

      if (typeof jsmediatags !== 'undefined') {
        jsmediatags.read(file, {
          onSuccess: async (tag) => {
            const t = tag.tags;
            if (t.title) song.title = t.title;
            if (t.artist) song.artist = t.artist;
            if (t.album) song.album = t.album;
            if (t.year) song.year = t.year;
            if (t.genre) song.genre = t.genre;
            if (t.track) song.track = t.track;

            if (t.picture) {
              try {
                const pic = t.picture;
                const blob = new Blob([pic.data], { type: pic.format });
                song.cover = URL.createObjectURL(blob);
                const picFile = new File([blob], 'cover.jpg', { type: pic.format });
                song.coverData = await Utils.fileToDataURL(picFile);
              } catch (e) {
                console.log('[Library] Cover conversion failed:', e);
              }
            }
            console.log('[Library] ID3 read:', song.title, '-', song.artist);
            resolve(song);
          },
          onError: (err) => {
            console.log('[Library] ID3 failed for', file.name, '- using AI cleaner');
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

  async updateSong(song) {
    return new Promise((resolve, reject) => {
      if (!this.db || !song.id) { reject(new Error('Cannot update')); return; }
      const tx = this.db.transaction('userSongs', 'readwrite');
      const store = tx.objectStore('userSongs');
      store.put(song);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async deleteSong(id) {
    return new Promise((resolve) => {
      if (!this.db) { resolve(); return; }
      const tx = this.db.transaction('userSongs', 'readwrite');
      const store = tx.objectStore('userSongs');
      store.delete(id);
      tx.oncomplete = async () => {
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

    // Smart filter buttons
    document.querySelectorAll('.smart-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.smart-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.smartFilter = btn.dataset.filter;
        this.render();
      });
    });

    // Advanced search chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.toggle('active');
        this.searchChip = chip.classList.contains('active') ? chip.dataset.chip : null;
        this.render();
      });
    });
  },

  getFilteredSongs() {
    let result = this.songs;

    // Smart filter
    if (this.smartFilter === 'most-played') {
      result = [...result].sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
    } else if (this.smartFilter === 'recently-added') {
      result = [...result].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (this.smartFilter === 'favorites') {
      result = result.filter(s => s.isFavorite);
    } else if (this.smartFilter === 'mood') {
      // Group by mood
      const moodGroups = {};
      result.forEach(s => {
        const mood = s.mood || Utils.detectMood(s);
        if (!moodGroups[mood]) moodGroups[mood] = [];
        moodGroups[mood].push(s);
      });
      // Flatten with mood headers
      result = [];
      for (const [mood, songs] of Object.entries(moodGroups)) {
        result.push({ _moodHeader: true, mood, count: songs.length });
        result.push(...songs);
      }
    }

    // Text search
    if (this.currentFilter) {
      const q = this.currentFilter;
      result = result.filter(s => {
        if (s._moodHeader) return true; // Keep headers
        if (!this.searchChip || this.searchChip === 'artist') {
          if (s.artist && s.artist.toLowerCase().includes(q)) return true;
        }
        if (!this.searchChip || this.searchChip === 'genre') {
          if (s.genre && s.genre.toLowerCase().includes(q)) return true;
        }
        if (!this.searchChip || this.searchChip === 'album') {
          if (s.album && s.album.toLowerCase().includes(q)) return true;
        }
        if (!this.searchChip || this.searchChip === 'lyrics') {
          if (s.lyrics && s.lyrics.toLowerCase().includes(q)) return true;
        }
        if (!this.searchChip) {
          if (s.title && s.title.toLowerCase().includes(q)) return true;
        }
        return false;
      });
    }

    return result;
  },

  render() {
    const list = document.getElementById('library-list');
    if (!list) return;

    const filtered = this.getFilteredSongs();

    if (filtered.length === 0) {
      const isEmpty = this.songs.length === 0;
      list.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
          <p>${isEmpty ? 'Your library is empty.' : 'No matches found.'}</p>
          <span>${isEmpty ? 'Add MP3 files from your device to get started.' : 'Try a different search term or filter.'}</span>
        </div>`;
      return;
    }

    list.innerHTML = filtered.map((song, idx) => {
      if (song._moodHeader) {
        return `
          <div class="mood-header" style="padding:12px 16px;background:var(--glass);border-radius:var(--radius-sm);margin-top:8px;">
            <span style="font-weight:700;color:var(--accent-2);">${Utils.getMoodIcon(song.mood)} ${Utils.getMoodLabel(song.mood)}</span>
            <span style="font-size:0.8rem;color:var(--text-secondary);margin-left:8px;">${song.count} songs</span>
          </div>
        `;
      }
      const realIdx = this.songs.indexOf(song);
      return `
        <div class="library-item ${Player && Player.currentIndex === realIdx ? 'active' : ''}" data-index="${realIdx}">
          <div class="lib-thumb">
            ${song.cover ? `<img src="${song.cover}" alt="">` : '&#9836;'}
          </div>
          <div class="lib-info">
            <div class="lib-title">${song.title || 'Unknown'}</div>
            <div class="lib-artist">${song.artist || 'Unknown Artist'}${song.album ? ' — ' + song.album : ''}${song.genre ? ' • ' + song.genre : ''}</div>
          </div>
          <div class="lib-duration">${song.duration ? Utils.formatTime(song.duration) : ''}</div>
          <button class="favorite-btn ${song.isFavorite ? 'active' : ''}" data-index="${realIdx}" title="Favorite">&#9829;</button>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.library-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('favorite-btn')) return;
        const index = parseInt(el.dataset.index);
        if (typeof Player !== 'undefined') Player.playFromLibrary(index);
      });
    });

    list.querySelectorAll('.favorite-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        const song = this.songs[index];
        if (song) {
          song.isFavorite = !song.isFavorite;
          this.updateSong(song);
          this.render();
          if (typeof SFX !== 'undefined') SFX.favorite();
          if (typeof Notifications !== 'undefined') Notifications.updateDisplay();
          if (typeof Gamification !== 'undefined') Gamification.addXP(2, 'favorite');
        }
      });
    });
  }
};
