/* ============================================
   AUDIO PLAYER CORE
   Reads from Library.songs as single source of truth
   ============================================ */

const Player = {
  audio: null,
  currentIndex: -1,
  isPlaying: false,
  repeat: false,
  shuffle: false,
  listenStart: 0,
  totalListened: 0,
  currentCoverBlob: null,
  lyricsOpen: false,

  init() {
    console.log('[Player] init() starting...');
    this.audio = document.getElementById('audio-player');
    this.bindEvents();
    this.loadState();
    this.startVibeCanvas();
    console.log('[Player] init() complete. currentIndex:', this.currentIndex);
  },

  // Centralized song access — always reads from Library.songs
  get songs() {
    return (typeof Library !== 'undefined' && Library.songs) ? Library.songs : [];
  },

  bindEvents() {
    const btnPlay = document.getElementById('btn-play');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnRepeat = document.getElementById('btn-repeat');
    const btnShuffle = document.getElementById('btn-shuffle');
    const progressBar = document.getElementById('progress-bar');
    const btnDownload = document.getElementById('btn-download-cover');
    const btnShare = document.getElementById('btn-share');
    const btnLyrics = document.getElementById('btn-lyrics-toggle');

    if (btnPlay) btnPlay.addEventListener('click', () => this.togglePlay());
    if (btnPrev) btnPrev.addEventListener('click', () => this.prev());
    if (btnNext) btnNext.addEventListener('click', () => this.next());
    if (btnRepeat) btnRepeat.addEventListener('click', () => { this.repeat = !this.repeat; btnRepeat.classList.toggle('active', this.repeat); if (typeof Achievements !== 'undefined') Achievements.track('repeatUses'); });
    if (btnShuffle) btnShuffle.addEventListener('click', () => { this.shuffle = !this.shuffle; btnShuffle.classList.toggle('active', this.shuffle); if (typeof Achievements !== 'undefined') Achievements.track('shuffleUses'); });
    if (progressBar) progressBar.addEventListener('click', (e) => this.seek(e));
    if (btnDownload) btnDownload.addEventListener('click', () => this.downloadCover());
    if (btnShare) btnShare.addEventListener('click', () => this.share());
    if (btnLyrics) btnLyrics.addEventListener('click', () => this.toggleLyrics());

    this.audio.addEventListener('timeupdate', () => this.updateProgress());
    this.audio.addEventListener('loadedmetadata', () => {
      document.getElementById('duration').textContent = Utils.formatTime(this.audio.duration);
      if (this.currentIndex >= 0 && this.songs[this.currentIndex]) {
        this.songs[this.currentIndex].duration = this.audio.duration;
      }
    });
    this.audio.addEventListener('ended', () => this.onEnded());
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.updatePlayIcon();
      const vinyl = document.querySelector('.vinyl-ring');
      if (vinyl) vinyl.classList.add('playing');
      this.listenStart = Date.now();
      if (typeof Equalizer !== 'undefined') Equalizer.setup(this.audio);
    });
    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updatePlayIcon();
      const vinyl = document.querySelector('.vinyl-ring');
      if (vinyl) vinyl.classList.remove('playing');
      if (this.listenStart) {
        const mins = (Date.now() - this.listenStart) / 60000;
        this.totalListened += mins;
        if (typeof Achievements !== 'undefined') Achievements.track('listenMinutes', Math.floor(mins));
        this.listenStart = 0;
      }
    });
    this.audio.addEventListener('error', (e) => {
      console.error('[Player] Audio error:', e);
      if (typeof Utils !== 'undefined') Utils.toast('Error playing audio', 'error');
    });
  },

  playFromLibrary(index) {
    console.log('[Player] playFromLibrary called with index:', index, 'songs count:', this.songs.length);
    if (index < 0 || index >= this.songs.length) {
      console.warn('[Player] Invalid index:', index, 'songs.length:', this.songs.length);
      return;
    }
    this.currentIndex = index;
    this.loadTrack(index);
    this.play();
    if (typeof Library !== 'undefined') Library.render();
  },

  loadTrack(index) {
    const songs = this.songs;
    console.log('[Player] loadTrack(', index, ') — songs available:', songs.length);
    if (!songs.length || index < 0 || index >= songs.length) {
      console.warn('[Player] Cannot load track — invalid index or empty library');
      return;
    }
    this.currentIndex = index;
    const song = songs[index];
    if (!song || !song.url) {
      console.warn('[Player] Song at index', index, 'has no URL');
      return;
    }

    this.audio.src = song.url;

    const titleEl = document.getElementById('track-title');
    const artistEl = document.getElementById('track-artist');
    const albumEl = document.getElementById('track-album');
    const yearEl = document.getElementById('track-year');

    if (titleEl) titleEl.textContent = song.title || 'Unknown Title';
    if (artistEl) artistEl.textContent = song.artist || 'Unknown Artist';
    if (albumEl) albumEl.textContent = song.album || '';
    if (yearEl) yearEl.textContent = song.year || '';

    const coverImg = document.getElementById('cover-art');
    const placeholder = document.getElementById('cover-placeholder');
    if (song.cover) {
      if (coverImg) { coverImg.src = song.cover; coverImg.classList.remove('hidden'); }
      if (placeholder) placeholder.classList.add('hidden');
      this.currentCoverBlob = song.cover;
    } else {
      if (coverImg) coverImg.classList.add('hidden');
      if (placeholder) placeholder.classList.remove('hidden');
      this.currentCoverBlob = null;
    }

    const id3Badge = document.getElementById('id3-badge');
    if (id3Badge) {
      id3Badge.classList.toggle('visible', !!(song.artist && song.title && song.title !== 'Unknown Title'));
    }

    const lyricsContent = document.getElementById('lyrics-content');
    if (lyricsContent) lyricsContent.innerHTML = '<p class="lyrics-placeholder">Loading lyrics...</p>';

    this.fetchLyrics(song.artist, song.title);
    if (typeof Achievements !== 'undefined') {
      Achievements.track('plays');
      Achievements.track('id3Plays');
    }

    const hour = new Date().getHours();
    if (hour >= 0 && hour < 6 && typeof Achievements !== 'undefined') {
      Achievements.track('earlyPlays');
      Achievements.track('nightPlays');
    }
  },

  play() {
    const songs = this.songs;
    if (!this.audio.src && songs.length) {
      this.loadTrack(0);
    }
    if (this.audio.src) {
      const promise = this.audio.play();
      if (promise) promise.catch((e) => {
        console.warn('[Player] Play failed:', e);
        if (typeof Utils !== 'undefined') Utils.toast('Tap play again to start audio', 'error');
      });
    }
  },

  pause() {
    this.audio.pause();
  },

  togglePlay() {
    if (this.isPlaying) this.pause();
    else this.play();
  },

  updatePlayIcon() {
    const playIcon = document.getElementById('icon-play');
    const pauseIcon = document.getElementById('icon-pause');
    if (playIcon) playIcon.classList.toggle('hidden', this.isPlaying);
    if (pauseIcon) pauseIcon.classList.toggle('hidden', !this.isPlaying);
  },

  prev() {
    const songs = this.songs;
    if (!songs.length) return;
    let idx = this.currentIndex - 1;
    if (idx < 0) idx = songs.length - 1;
    this.loadTrack(idx);
    this.play();
  },

  next() {
    const songs = this.songs;
    if (!songs.length) return;
    let idx;
    if (this.shuffle) {
      idx = Math.floor(Math.random() * songs.length);
    } else {
      idx = this.currentIndex + 1;
      if (idx >= songs.length) idx = 0;
    }
    this.loadTrack(idx);
    this.play();
  },

  onEnded() {
    if (this.repeat) {
      this.audio.currentTime = 0;
      this.play();
    } else {
      this.next();
    }
  },

  seek(e) {
    if (!this.audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    this.audio.currentTime = pct * this.audio.duration;
  },

  updateProgress() {
    if (!this.audio.duration) return;
    const pct = (this.audio.currentTime / this.audio.duration) * 100;
    const fill = document.getElementById('progress-fill');
    if (fill) fill.style.width = pct + '%';
    const currentTime = document.getElementById('current-time');
    if (currentTime) currentTime.textContent = Utils.formatTime(this.audio.currentTime);
  },

  async fetchLyrics(artist, title) {
    const lyricsContent = document.getElementById('lyrics-content');
    if (!lyricsContent) return;

    if (!artist || !title || artist === 'Unknown Artist') {
      lyricsContent.innerHTML = '<p class="lyrics-placeholder">No lyrics available (missing tags).</p>';
      return;
    }
    try {
      const q = encodeURIComponent(`${artist} ${title}`);
      const res = await fetch(`https://lrclib.net/api/search?q=${q}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lyrics = data[0].plainLyrics || data[0].syncedLyrics || 'No lyrics found.';
        lyricsContent.textContent = lyrics;
        if (typeof Achievements !== 'undefined') Achievements.track('lyricsLoaded');
      } else {
        lyricsContent.innerHTML = '<p class="lyrics-placeholder">No lyrics found on LRCLIB.</p>';
      }
    } catch (e) {
      lyricsContent.innerHTML = '<p class="lyrics-placeholder">Lyrics service unavailable.</p>';
    }
  },

  toggleLyrics() {
    const panel = document.getElementById('lyrics-panel');
    if (!panel) return;
    this.lyricsOpen = !this.lyricsOpen;
    panel.classList.toggle('hidden', !this.lyricsOpen);
    if (typeof Achievements !== 'undefined') Achievements.track('lyricOpens');
  },

  downloadCover() {
    if (!this.currentCoverBlob) {
      if (typeof Utils !== 'undefined') Utils.toast('No cover art available', 'error');
      return;
    }
    const a = document.createElement('a');
    a.href = this.currentCoverBlob;
    a.download = `cover_${Date.now()}.jpg`;
    a.click();
    if (typeof Achievements !== 'undefined') Achievements.track('coversDownloaded');
    if (typeof Utils !== 'undefined') Utils.toast('Cover downloaded');
  },

  async share() {
    const title = document.getElementById('track-title')?.textContent || 'Unknown';
    const artist = document.getElementById('track-artist')?.textContent || 'Unknown Artist';
    const text = `Listening to "${title}" by ${artist} on Audix Music Player`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Audix Music Player', text });
        if (typeof Achievements !== 'undefined') Achievements.track('shares');
      } catch (e) {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        if (typeof Utils !== 'undefined') Utils.toast('Copied to clipboard');
        if (typeof Achievements !== 'undefined') Achievements.track('shares');
      } catch (e) {}
    }
  },

  startVibeCanvas() {
    const canvas = document.getElementById('vibe-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 3 + 1,
      dx: (Math.random() - 0.5) * 0.5,
      dy: (Math.random() - 0.5) * 0.5,
      alpha: Math.random() * 0.5 + 0.1
    }));

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const time = Date.now() * 0.0005;
      const hue1 = (time * 10) % 360;
      const hue2 = (hue1 + 60) % 360;
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, `hsla(${hue1}, 60%, 15%, 0.4)`);
      grad.addColorStop(1, `hsla(${hue2}, 60%, 10%, 0.2)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      particles.forEach(p => {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${(hue1 + p.x) % 360}, 70%, 60%, ${p.alpha})`;
        ctx.fill();
      });

      if (this.isPlaying && typeof Equalizer !== 'undefined' && Equalizer.analyser) {
        try {
          const data = new Uint8Array(Equalizer.analyser.frequencyBinCount);
          Equalizer.analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          const intensity = avg / 255;
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, 100 + intensity * 200, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${hue1}, 80%, 50%, ${intensity * 0.3})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        } catch (e) {}
      }
      requestAnimationFrame(draw);
    };
    draw();
  },

  saveState() {
    localStorage.setItem('audix_player', JSON.stringify({
      repeat: this.repeat,
      shuffle: this.shuffle,
      totalListened: this.totalListened,
      currentIndex: this.currentIndex
    }));
  },

  loadState() {
    try {
      const raw = localStorage.getItem('audix_player');
      if (raw) {
        const data = JSON.parse(raw);
        this.repeat = data.repeat || false;
        this.shuffle = data.shuffle || false;
        this.totalListened = data.totalListened || 0;
        this.currentIndex = data.currentIndex || -1;
        const btnRepeat = document.getElementById('btn-repeat');
        const btnShuffle = document.getElementById('btn-shuffle');
        if (btnRepeat) btnRepeat.classList.toggle('active', this.repeat);
        if (btnShuffle) btnShuffle.classList.toggle('active', this.shuffle);
      }
    } catch (e) {}
  }
};

window.addEventListener('beforeunload', () => Player.saveState());
