/* ============================================
   LIBRARY MANAGER — v3.1 (Critical Fixes)
   Audio Format Support, Title Cleaner, Lyrics Cache
   ============================================ */

const Library = {
  songs: [],
  currentFilter: 'all',
  searchQuery: '',
  SUPPORTED_FORMATS: ['mp3', 'm4a', 'wav', 'ogg', 'aac', 'flac', 'webm'],
  SUPPORTED_MIME_TYPES: [
    'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a',
    'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/aac',
    'audio/x-aac', 'audio/flac', 'audio/webm', 'audio/x-ms-wma'
  ],

  isValidAudioFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const mimeType = (file.type || '').toLowerCase();
    // Check extension first
    if (this.SUPPORTED_FORMATS.includes(ext)) return true;
    // Check MIME type
    if (this.SUPPORTED_MIME_TYPES.includes(mimeType)) return true;
    // Fallback: if it has audio/ prefix, accept it
    if (mimeType.startsWith('audio/')) return true;
    return false;
  },

  getMimeType(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const mimeMap = {
      'mp3': 'audio/mpeg',
      'm4a': 'audio/mp4',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'aac': 'audio/aac',
      'flac': 'audio/flac',
      'webm': 'audio/webm',
      'wma': 'audio/x-ms-wma'
    };
    if (mimeMap[ext]) return mimeMap[ext];
    if (file.type && file.type.startsWith('audio/')) return file.type;
    return 'audio/mpeg'; // safe fallback
  },

  async init() {
    console.log('[Library] init() starting...');
    this.bindEvents();
    await this.loadUserSongs();
    this.render();
    console.log('[Library] init() complete —', this.songs.length, 'songs loaded');
  },

  bindEvents() {
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        console.log('[Library] File input change —', e.target.files.length, 'files');
        this.handleUpload(e.target.files);
      });
    }

    const searchInput = document.getElementById('library-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        this.render();
      });
    }

    document.querySelectorAll('.smart-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.smart-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.render();
      });
    });
  },

  async handleUpload(files) {
    if (!files || files.length === 0) {
      console.warn('[Library] No files selected');
      return;
    }
    console.log('[Library] handleUpload() — processing', files.length, 'files');

    let addedCount = 0;
    let skippedCount = 0;
    for (const file of files) {
      if (!this.isValidAudioFile(file)) {
        skippedCount++;
        if (typeof Utils !== 'undefined') Utils.toast(`Unsupported format: ${file.name}. Supported: MP3, M4A, WAV, OGG, AAC`, 'error');
        continue;
      }
      await this.processFile(file);
      addedCount++;
    }

    this.render();
    console.log('[Library] handleUpload() complete — total songs:', this.songs.length);

    if (typeof Achievements !== 'undefined') {
      Achievements.track('songsUploaded', this.songs.length);
    }

    if (addedCount > 0) {
      if (typeof Settings !== 'undefined' && Settings.prefs.autoplayOnUpload && this.songs.length > 0) {
        const lastIndex = this.songs.length - 1;
        console.log('[Library] Auto-play enabled — loading track', lastIndex);
        if (typeof Player !== 'undefined') {
          Player.loadTrack(lastIndex);
          Player.play();
        }
      }
      if (typeof Utils !== 'undefined') {
        Utils.toast(`${addedCount} song(s) added to Library${skippedCount > 0 ? `, ${skippedCount} skipped` : ''}`, 'success');
      }
    } else if (skippedCount > 0) {
      if (typeof Utils !== 'undefined') {
        Utils.toast(`${skippedCount} file(s) skipped — unsupported format`, 'error');
      }
    }
  },

  // Title cleaner
  localCleanTitle(rawName) {
    let s = rawName.replace(/_/g, ' ');
    s = s.replace(/\s*\(\d{1,3}\)\s*$/, '');
    s = s.replace(/[\[(][^\])]*(lyrics?|audio|video|hd|hq|4k|vevo|official|music\s*video|lyric\s*video|visualizer|remaster(ed)?|\d+k(bps)?|\d{3,4}p|slowed|reverb|sped\s*up|nightcore|clean|explicit|radio\s*edit|extended|instrumental)[^\])]*[\])]/gi, '');
    s = s.replace(/\(?\b(official\s*(audio|video|music\s*video|lyric\s*video|visualizer|hd|4k|hq))\b\)?/gi, '');
    s = s.replace(/\b(youtube|vevo|spotify|soundcloud)\b/gi, '');
    s = s.replace(/^\d{1,3}[\s.\-_]+/, '');
    s = s.replace(/\s+\b(lyrics?|lyric\s*video|official\s*audio|official\s*video|official|audio|video|hd|hq|4k|vevo|visualizer|remaster(ed)?|slowed|reverb|nightcore|explicit|clean)\b(\s+\b(lyrics?|audio|video|hd|hq|4k|official)\b)*\s*$/gi, '');
    s = s.replace(/[\[(]\s*[\])]/g, '');
    s = s.replace(/\s{2,}/g, ' ').trim().replace(/[\s\-]+$/, '').trim();
    const sepMatch = s.match(/^(.+?)\s+[-\u2013\u2014]\s+(.+)$/);
    if (sepMatch) return { artist: sepMatch[1].trim(), title: sepMatch[2].trim(), _source: 'local' };
    return { artist: '', title: s.trim(), _source: 'local' };
  },

  async processFile(file) {
    console.log('[Library] processFile() —', file.name, this.getMimeType(file), file.size);
    const id = 'song_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    let metadata = {
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'Unknown Artist',
      album: '',
      year: '',
      genre: '',
      cover: null,
      hasFullMetadata: false
    };

    // Clean title first
    const cleaned = this.localCleanTitle(file.name.replace(/\.[^/.]+$/, ''));
    if (cleaned.title) metadata.title = cleaned.title;
    if (cleaned.artist) metadata.artist = cleaned.artist;

    try {
      if (typeof jsmediatags !== 'undefined') {
        await new Promise((resolve) => {
          jsmediatags.read(file, {
            onSuccess: (tag) => {
              const t = tag.tags;
              if (t.title) metadata.title = t.title;
              if (t.artist) metadata.artist = t.artist;
              if (t.album) metadata.album = t.album;
              if (t.year) metadata.year = t.year;
              if (t.genre) metadata.genre = t.genre;
              if (t.picture) {
                const { data, format } = t.picture;
                let base64 = '';
                for (let i = 0; i < data.length; i++) {
                  base64 += String.fromCharCode(data[i]);
                }
                metadata.cover = `data:${format};base64,${window.btoa(base64)}`;
              }
              if (t.title && t.artist && t.album) metadata.hasFullMetadata = true;
              console.log('[Library] Metadata extracted for', file.name);
              resolve();
            },
            onError: (err) => {
              console.warn('[Library] jsmediatags error for', file.name, err);
              resolve();
            }
          });
        });
      } else {
        console.warn('[Library] jsmediatags not available');
      }
    } catch (e) {
      console.error('[Library] Metadata extraction failed:', e);
    }

    let arrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
      console.log('[Library] File read as ArrayBuffer —', arrayBuffer.byteLength, 'bytes');
    } catch (e) {
      console.error('[Library] Failed to read file:', e);
      if (typeof Utils !== 'undefined') Utils.toast('Failed to read file: ' + file.name, 'error');
      return;
    }

    const song = {
      id,
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      year: metadata.year,
      genre: metadata.genre,
      cover: metadata.cover,
      data: arrayBuffer,
      fileType: this.getMimeType(file),
      fileName: file.name,
      addedAt: Date.now(),
      playCount: 0,
      favorite: false,
      lastPlayed: null
    };

    try {
      await this.saveSongToIDB(song);
      console.log('[Library] Song saved to IDB:', song.title);
    } catch (e) {
      console.error('[Library] IDB save failed:', e);
      if (typeof Utils !== 'undefined') Utils.toast('Failed to save song to storage', 'error');
      return;
    }

    this.songs.push(song);

    if (metadata.hasFullMetadata && typeof Achievements !== 'undefined') {
      Achievements.track('fullMetadata');
    }
  },

  saveSongToIDB(song) {
    return new Promise((resolve, reject) => {
      if (!Auth.idb) {
        console.error('[Library] IndexedDB not available (Auth.idb is null)');
        reject(new Error('IDB not ready'));
        return;
      }
      const tx = Auth.idb.transaction('userSongs', 'readwrite');
      const store = tx.objectStore('userSongs');
      const req = store.put(song);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => console.log('[Library] IDB transaction complete for', song.id);
      tx.onerror = () => reject(tx.error);
    });
  },

  async loadUserSongs() {
    console.log('[Library] loadUserSongs()');
    return new Promise((resolve) => {
      if (!Auth.idb) {
        console.warn('[Library] Auth.idb not ready — retrying in 500ms');
        setTimeout(() => this.loadUserSongs().then(resolve), 500);
        return;
      }
      const tx = Auth.idb.transaction('userSongs', 'readonly');
      const store = tx.objectStore('userSongs');
      const req = store.getAll();
      req.onsuccess = () => {
        this.songs = req.result || [];
        console.log('[Library] loadUserSongs() success —', this.songs.length, 'songs from IDB');
        resolve();
      };
      req.onerror = () => {
        console.error('[Library] loadUserSongs() failed:', req.error);
        this.songs = [];
        resolve();
      };
    });
  },

  getSongUrl(song) {
    if (!song || !song.data) {
      console.error('[Library] getSongUrl() — no data for song', song?.id);
      return '';
    }
    try {
      let buffer = song.data;

      if (buffer instanceof Uint8Array) {
        buffer = buffer.buffer;
      } else if (Array.isArray(buffer)) {
        buffer = new Uint8Array(buffer).buffer;
      } else if (typeof buffer === 'object' && buffer !== null) {
        if (typeof buffer.byteLength === 'number') {
          const keys = Object.keys(buffer).map(Number).filter(k => !isNaN(k)).sort((a,b) => a-b);
          if (keys.length > 0 && keys.length === buffer.byteLength) {
            const arr = keys.map(k => buffer[k]);
            buffer = new Uint8Array(arr).buffer;
          } else if (buffer.byteLength > 0) {
            buffer = new Uint8Array(Object.values(buffer)).buffer;
          }
        }
      }

      if (!(buffer instanceof ArrayBuffer)) {
        console.error('[Library] Could not convert song data to ArrayBuffer for', song.id, 'type:', typeof buffer);
        return '';
      }

      let mimeType = song.fileType;
      if (!mimeType || mimeType === 'application/octet-stream') {
        const ext = (song.fileName || '').split('.').pop().toLowerCase();
        const mimeMap = {
          'mp3': 'audio/mpeg',
          'm4a': 'audio/mp4',
          'wav': 'audio/wav',
          'ogg': 'audio/ogg',
          'aac': 'audio/aac',
          'flac': 'audio/flac',
          'webm': 'audio/webm'
        };
        mimeType = mimeMap[ext] || 'audio/mpeg';
      }

      const blob = new Blob([buffer], { type: mimeType });
      const url = URL.createObjectURL(blob);
      console.log('[Library] Created blob URL for', song.title, 'type:', mimeType, 'size:', blob.size);
      return url;
    } catch (e) {
      console.error('[Library] getSongUrl() blob creation failed:', e);
      return '';
    }
  },

  getFilteredSongs() {
    let result = [...this.songs];

    if (this.searchQuery) {
      const q = this.searchQuery;
      result = result.filter(s =>
        (s.title && s.title.toLowerCase().includes(q)) ||
        (s.artist && s.artist.toLowerCase().includes(q)) ||
        (s.album && s.album.toLowerCase().includes(q)) ||
        (s.genre && s.genre.toLowerCase().includes(q))
      );
    }

    switch (this.currentFilter) {
      case 'most-played':
        result.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
        break;
      case 'recently-added':
        result.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
        break;
      case 'favorites':
        result = result.filter(s => s.favorite);
        break;
      case 'mood':
        result.sort((a, b) => (a.genre || '').localeCompare(b.genre || ''));
        break;
      default:
        break;
    }

    return result;
  },

  render() {
    const container = document.getElementById('library-list');
    if (!container) {
      console.warn('[Library] render() — container #library-list not found');
      return;
    }

    const songs = this.getFilteredSongs();
    console.log('[Library] render() — showing', songs.length, 'of', this.songs.length, 'songs (filter:', this.currentFilter, ')');

    if (songs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
          <p>${this.songs.length === 0 ? 'Your library is empty.' : 'No songs match your filter.'}</p>
          <span>${this.songs.length === 0 ? 'Add MP3 files from your device to get started.' : 'Try a different search or filter.'}</span>
        </div>
      `;
      return;
    }

    let html = '<div class="song-list">';
    songs.forEach((song, index) => {
      const originalIndex = this.songs.indexOf(song);
      const coverHtml = song.cover
        ? `<img src="${song.cover}" alt="cover" class="song-thumb">`
        : `<div class="song-thumb-placeholder">&#9836;</div>`;
      html += `
        <div class="song-item" data-index="${originalIndex}" data-id="${song.id}">
          <div class="song-thumb-wrap">${coverHtml}</div>
          <div class="song-info">
            <div class="song-title">${song.title}</div>
            <div class="song-artist">${song.artist}${song.album ? ' — ' + song.album : ''}</div>
          </div>
          <div class="song-actions">
            <button class="btn-icon btn-favorite" data-id="${song.id}" title="Favorite">
              ${song.favorite ? '&#9829;' : '&#9825;'}
            </button>
            <button class="btn-icon btn-share-song" data-id="${song.id}" title="Share">&#128172;</button>
            <button class="btn-icon btn-delete" data-id="${song.id}" title="Delete">&#128465;</button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.song-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.btn-icon')) return;
        const idx = parseInt(item.dataset.index);
        console.log('[Library] Song clicked — index:', idx, 'title:', this.songs[idx]?.title);
        if (typeof Player !== 'undefined') {
          Player.loadTrack(idx);
          Player.play();
        }
      });
    });

    container.querySelectorAll('.btn-favorite').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const song = this.songs.find(s => s.id === id);
        if (song) {
          song.favorite = !song.favorite;
          this.saveSongToIDB(song).then(() => this.render());
        }
      });
    });

    container.querySelectorAll('.btn-share-song').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const song = this.songs.find(s => s.id === id);
        if (song) this.shareSong(song);
      });
    });

    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (confirm('Delete this song from your library?')) {
          this.deleteSong(id);
        }
      });
    });
  },

  async shareSong(song) {
    const shareData = {
      title: song.title,
      text: `Listen to "${song.title}" by ${song.artist} on Audix`,
      url: window.location.href
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (e) {}
    } else {
      const text = `"${song.title}" by ${song.artist} — Audix`;
      navigator.clipboard.writeText(text).then(() => {
        if (typeof Utils !== 'undefined') Utils.toast('Song info copied!', 'success');
      });
    }
  },

  async deleteSong(id) {
    console.log('[Library] deleteSong() —', id);
    const idx = this.songs.findIndex(s => s.id === id);
    if (idx === -1) return;
    this.songs.splice(idx, 1);

    try {
      const tx = Auth.idb.transaction('userSongs', 'readwrite');
      const store = tx.objectStore('userSongs');
      await new Promise((resolve, reject) => {
        const req = store.delete(id);
        req.onsuccess = resolve;
        req.onerror = reject;
      });
      console.log('[Library] Song deleted from IDB:', id);
    } catch (e) {
      console.error('[Library] Failed to delete from IDB:', e);
    }

    this.render();
    if (typeof Utils !== 'undefined') Utils.toast('Song deleted', 'info');
  },

  getAllSongs() {
    return this.songs;
  }
};
