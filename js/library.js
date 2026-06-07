/* ============================================
   LIBRARY MANAGER — SINGLE SOURCE OF TRUTH
   All modules read from Library.songs
   ============================================ */

const Library = {
  db: null,
  songs: [],
  currentFilter: '',

  async init() {
    console.log('[Library] init() starting...');
    await this.openDB();
    await this.loadSongs();
    console.log('[Library] Loaded', this.songs.length, 'songs from IndexedDB');
    this.render();
    this.bindEvents();
    console.log('[Library] init() complete. songs.length:', this.songs.length);
  },

  openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('AudixDB', 1);
      req.onerror = () => { console.error('[Library] DB open error:', req.error); reject(req.error); };
      req.onsuccess = () => { this.db = req.result; console.log('[Library] DB opened successfully'); resolve(); };
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        console.log('[Library] DB upgrade needed, creating object store...');
        if (!db.objectStoreNames.contains('songs')) {
          const store = db.createObjectStore('songs', { keyPath: 'id', autoIncrement: true });
          store.createIndex('title', 'title', { unique: false });
          store.createIndex('artist', 'artist', { unique: false });
        }
      };
    });
  },

  async loadSongs() {
    return new Promise((resolve) => {
      if (!this.db) { console.warn('[Library] DB not ready, songs=[]'); this.songs = []; resolve(); return; }
      const tx = this.db.transaction('songs', 'readonly');
      const store = tx.objectStore('songs');
      const req = store.getAll();
      req.onsuccess = () => {
        this.songs = req.result || [];
        console.log('[Library] loadSongs() — loaded', this.songs.length, 'songs');
        // Re-create blob URLs for any songs that lost them
        this.songs.forEach((song, i) => {
          if (!song.url || song.url === '') {
            console.warn('[Library] Song', i, 'has no URL, attempting recovery...');
            try {
              if (song.blob && song.blob instanceof Blob) {
                song.url = URL.createObjectURL(song.blob);
              }
            } catch (e) {
              console.error('[Library] Failed to recover URL for song', i);
            }
          }
        });
        resolve();
      };
      req.onerror = () => { console.error('[Library] loadSongs error:', req.error); this.songs = []; resolve(); };
    });
  },

  async addFiles(fileList) {
    const files = Array.from(fileList);
    console.log('[Library] addFiles() —', files.length, 'files selected');
    let added = 0;
    for (const file of files) {
      if (!file.type.startsWith('audio/')) {
        console.log('[Library] Skipping non-audio file:', file.name, file.type);
        continue;
      }
      try {
        console.log('[Library] Processing file:', file.name);
        const song = await this.processFile(file);
        await this.saveSong(song);
        console.log('[Library] Saved song:', song.title, 'by', song.artist);
        added++;
      } catch (e) {
        console.error('[Library] Error processing file', file.name, e);
      }
    }
    // Reset file input
    const input = document.getElementById('file-input');
    if (input) input.value = '';

    console.log('[Library] Reloading songs after upload...');
    await this.loadSongs();
    console.log('[Library] After reload, songs.length:', this.songs.length);
    this.render();

    if (typeof Utils !== 'undefined') Utils.toast(`${added} song(s) added to library`);
    if (typeof Achievements !== 'undefined') Achievements.track('songsAdded', added);

    // If player was empty, load first track
    if (typeof Player !== 'undefined') {
      console.log('[Library] Notifying Player — songs now:', Player.songs.length);
      if (Player.currentIndex === -1 && this.songs.length > 0) {
        console.log('[Library] Auto-loading first track into Player');
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
        duration: 0,
        url: url,
        blob: file,
        cover: null,
        addedAt: Date.now()
      };

      if (typeof jsmediatags !== 'undefined') {
        jsmediatags.read(file, {
          onSuccess: (tag) => {
            const t = tag.tags;
            if (t.title) song.title = t.title;
            if (t.artist) song.artist = t.artist;
            if (t.album) song.album = t.album;
            if (t.year) song.year = t.year;
            if (t.track) song.track = t.track;
            if (t.picture) {
              const pic = t.picture;
              const blob = new Blob([pic.data], { type: pic.format });
              song.cover = URL.createObjectURL(blob);
            }
            console.log('[Library] ID3 tags read:', song.title, '-', song.artist);
            resolve(song);
          },
          onError: (err) => {
            console.log('[Library] ID3 read failed for', file.name, '- using filename as title');
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
      const tx = this.db.transaction('songs', 'readwrite');
      const store = tx.objectStore('songs');
      const req = store.add(song);
      req.onsuccess = () => {
        console.log('[Library] saveSong success, id:', req.result);
        resolve(req.result);
      };
      req.onerror = () => { console.error('[Library] saveSong error:', req.error); reject(req.error); };
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
    });
  },

  async deleteSong(id) {
    return new Promise((resolve) => {
      if (!this.db) { resolve(); return; }
      const tx = this.db.transaction('songs', 'readwrite');
      const store = tx.objectStore('songs');
      store.delete(id);
      tx.oncomplete = async () => {
        console.log('[Library] Song deleted, id:', id);
        await this.loadSongs();
        this.render();
        // If player was playing deleted song, stop it
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
          <div class="lib-artist">${song.artist || 'Unknown Artist'}${song.album ? ' — ' + song.album : ''}</div>
        </div>
        <div class="lib-duration">${song.duration ? Utils.formatTime(song.duration) : ''}</div>
      </div>
    `).join('');

    list.querySelectorAll('.library-item').forEach(el => {
      el.addEventListener('click', () => {
        const index = parseInt(el.dataset.index);
        console.log('[Library] Clicked song index:', index);
        if (typeof Player !== 'undefined') {
          Player.playFromLibrary(index);
        }
      });
    });
  }
};
