/* ============================================
   LIBRARY MANAGER (IndexedDB + ID3)
   ============================================ */

const Library = {
  db: null,
  songs: [],
  currentFilter: '',

  async init() {
    await this.openDB();
    await this.loadSongs();
    this.render();
    this.bindEvents();
  },

  openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('AudixDB', 1);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => { this.db = req.result; resolve(); };
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('songs')) {
          db.createObjectStore('songs', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  },

  async loadSongs() {
    return new Promise((resolve) => {
      const tx = this.db.transaction('songs', 'readonly');
      const store = tx.objectStore('songs');
      const req = store.getAll();
      req.onsuccess = () => {
        this.songs = req.result || [];
        resolve();
      };
    });
  },

  async addFiles(fileList) {
    const files = Array.from(fileList);
    let added = 0;
    for (const file of files) {
      if (!file.type.startsWith('audio/')) continue;
      try {
        const song = await this.processFile(file);
        await this.saveSong(song);
        added++;
      } catch (e) {
        console.error('Error processing file', file.name, e);
      }
    }
    await this.loadSongs();
    this.render();
    Utils.toast(`${added} song(s) added to library`);
    Achievements.track('songsAdded', added);
    if (added > 0) Player.setPlaylist(this.songs);
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

      // Read ID3 tags
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
            resolve(song);
          },
          onError: () => resolve(song)
        });
      } else {
        resolve(song);
      }
    });
  },

  saveSong(song) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('songs', 'readwrite');
      const store = tx.objectStore('songs');
      const req = store.add(song);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async deleteSong(id) {
    return new Promise((resolve) => {
      const tx = this.db.transaction('songs', 'readwrite');
      const store = tx.objectStore('songs');
      store.delete(id);
      tx.oncomplete = async () => {
        await this.loadSongs();
        this.render();
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
        Achievements.track('searches');
      }, 300));
    }
  },

  render() {
    const list = document.getElementById('library-list');
    if (!list) return;

    const filtered = this.songs.filter(s => {
      const q = this.currentFilter;
      return !q ||
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        (s.album && s.album.toLowerCase().includes(q));
    });

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
          <p>${this.songs.length === 0 ? 'Your library is empty.' : 'No matches found.'}</p>
          <span>${this.songs.length === 0 ? 'Add MP3 files from your device to get started.' : 'Try a different search term.'}</span>
        </div>`;
      return;
    }

    list.innerHTML = filtered.map((song, idx) => `
      <div class="library-item ${Player.currentIndex === idx ? 'active' : ''}" data-index="${idx}">
        <div class="lib-thumb">
          ${song.cover ? `<img src="${song.cover}" alt="">` : '&#9836;'}
        </div>
        <div class="lib-info">
          <div class="lib-title">${song.title}</div>
          <div class="lib-artist">${song.artist}${song.album ? ' — ' + song.album : ''}</div>
        </div>
        <div class="lib-duration">${song.duration ? Utils.formatTime(song.duration) : ''}</div>
      </div>
    `).join('');

    list.querySelectorAll('.library-item').forEach(el => {
      el.addEventListener('click', () => {
        const index = parseInt(el.dataset.index);
        Player.playFromLibrary(index);
      });
    });
  }
};
