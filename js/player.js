/* ============================================
   AUDIO PLAYER CORE
   ============================================ */

const Player = {
  audio: null,
  playlist: [],
  currentIndex: -1,
  isPlaying: false,
  repeat: false,
  shuffle: false,
  listenStart: 0,
  totalListened: 0,
  currentCoverBlob: null,

  init() {
    this.audio = document.getElementById('audio-player');
    this.bindEvents();
    this.loadState();
    this.startVibeCanvas();
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
    if (btnRepeat) btnRepeat.addEventListener('click', () => { this.repeat = !this.repeat; btnRepeat.classList.toggle('active', this.repeat); Achievements.track('repeatUses'); });
    if (btnShuffle) btnShuffle.addEventListener('click', () => { this.shuffle = !this.shuffle; btnShuffle.classList.toggle('active', this.shuffle); Achievements.track('shuffleUses'); });
    if (progressBar) progressBar.addEventListener('click', (e) => this.seek(e));
    if (btnDownload) btnDownload.addEventListener('click', () => this.downloadCover());
    if (btnShare) btnShare.addEventListener('click', () => this.share());
    if (btnLyrics) btnLyrics.addEventListener('click', () => this.toggleLyrics());

    this.audio.addEventListener('timeupdate', () => this.updateProgress());
    this.audio.addEventListener('loadedmetadata', () => {
      document.getElementById('duration').textContent = Utils.formatTime(this.audio.duration);
    });
    this.audio.addEventListener('ended', () => this.onEnded());
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.updatePlayIcon();
      document.querySelector('.vinyl-ring')?.classList.add('playing');
      this.listenStart = Date.now();
      Equalizer.setup(this.audio);
    });
    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updatePlayIcon();
      document.querySelector('.vinyl-ring')?.classList.remove('playing');
      if (this.listenStart) {
        const mins = (Date.now() - this.listenStart) / 60000;
        this.totalListened += mins;
        Achievements.track('listenMinutes', Math.floor(mins));
        this.listenStart = 0;
      }
    });
  },

  setPlaylist(songs) {
    this.playlist = songs;
    if (this.currentIndex === -1 && songs.length > 0) {
      this.loadTrack(0);
    }
  },

  playFromLibrary(index) {
    this.playlist = Library.songs;
    this.loadTrack(index);
    this.play();
    Library.render(); // re-render to show active
  },

  loadTrack(index) {
    if (!this.playlist.length) return;
    this.currentIndex = index;
    const song = this.playlist[index];
    this.audio.src = song.url;

    document.getElementById('track-title').textContent = song.title || 'Unknown Title';
    document.getElementById('track-artist').textContent = song.artist || 'Unknown Artist';
    document.getElementById('track-album').textContent = song.album || '';
    document.getElementById('track-year').textContent = song.year || '';

    const coverImg = document.getElementById('cover-art');
    const placeholder = document.getElementById('cover-placeholder');
    if (song.cover) {
      coverImg.src = song.cover;
      coverImg.classList.remove('hidden');
      placeholder.classList.add('hidden');
      this.currentCoverBlob = song.cover;
    } else {
      coverImg.classList.add('hidden');
      placeholder.classList.remove('hidden');
      this.currentCoverBlob = null;
    }

    document.getElementById('id3-badge').classList.toggle('visible', !!(song.artist && song.title && song.title !== 'Unknown Title'));
    document.getElementById('lyrics-content').innerHTML = '<p class="lyrics-placeholder">Loading lyrics...</p>';

    this.fetchLyrics(song.artist, song.title);
    Achievements.track('plays');
    Achievements.track('id3Plays');

    const hour = new Date().getHours();
    if (hour >= 0 && hour < 6) Achievements.track('earlyPlays');
    if (hour >= 0 && hour < 4) Achievements.track('nightPlays');
  },

  play() {
    if (!this.audio.src && this.playlist.length) {
      this.loadTrack(0);
    }
    const promise = this.audio.play();
    if (promise) promise.catch(() => {});
  },

  pause() {
    this.audio.pause();
  },

  togglePlay() {
    if (this.isPlaying) this.pause();
    else this.play();
  },

  updatePlayIcon() {
    document.getElementById('icon-play').classList.toggle('hidden', this.isPlaying);
    document.getElementById('icon-pause').classList.toggle('hidden', !this.isPlaying);
  },

  prev() {
    if (!this.playlist.length) return;
    let idx = this.currentIndex - 1;
    if (idx < 0) idx = this.playlist.length - 1;
    this.loadTrack(idx);
    this.play();
  },

  next() {
    if (!this.playlist.length) return;
    let idx;
    if (this.shuffle) {
      idx = Math.floor(Math.random() * this.playlist.length);
    } else {
      idx = this.currentIndex + 1;
      if (idx >= this.playlist.length) idx = 0;
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
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('current-time').textContent = Utils.formatTime(this.audio.currentTime);
  },

  async fetchLyrics(artist, title) {
    if (!artist || !title || artist === 'Unknown Artist') {
      document.getElementById('lyrics-content').innerHTML = '<p class="lyrics-placeholder">No lyrics available (missing tags).</p>';
      return;
    }
    try {
      const q = encodeURIComponent(`${artist} ${title}`);
      const res = await fetch(`https://lrclib.net/api/search?q=${q}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lyrics = data[0].plainLyrics || data[0].syncedLyrics || 'No lyrics found.';
        document.getElementById('lyrics-content').textContent = lyrics;
        Achievements.track('lyricsLoaded');
      } else {
        document.getElementById('lyrics-content').innerHTML = '<p class="lyrics-placeholder">No lyrics found on LRCLIB.</p>';
      }
    } catch (e) {
      document.getElementById('lyrics-content').innerHTML = '<p class="lyrics-placeholder">Lyrics service unavailable.</p>';
    }
  },

  toggleLyrics() {
    const panel = document.getElementById('lyrics-panel');
    panel.classList.toggle('hidden');
    Achievements.track('lyricOpens');
  },

  downloadCover() {
    if (!this.currentCoverBlob) {
      Utils.toast('No cover art available', 'error');
      return;
    }
    const a = document.createElement('a');
    a.href = this.currentCoverBlob;
    a.download = `cover_${Date.now()}.jpg`;
    a.click();
    Achievements.track('coversDownloaded');
    Utils.toast('Cover downloaded');
  },

  async share() {
    const title = document.getElementById('track-title').textContent;
    const artist = document.getElementById('track-artist').textContent;
    const text = `Listening to "${title}" by ${artist} on Audix Music Player`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Audix Music Player', text });
        Achievements.track('shares');
      } catch (e) {}
    } else {
      await navigator.clipboard.writeText(text);
      Utils.toast('Copied to clipboard');
      Achievements.track('shares');
    }
  },

  startVibeCanvas() {
    const canvas = document.getElementById('vibe-canvas');
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

      // Base gradient shifts with "vibe" (simulated by time)
      const time = Date.now() * 0.0005;
      const hue1 = (time * 10) % 360;
      const hue2 = (hue1 + 60) % 360;
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, `hsla(${hue1}, 60%, 15%, 0.4)`);
      grad.addColorStop(1, `hsla(${hue2}, 60%, 10%, 0.2)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Particles
      particles.forEach(p => {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${(hue1 + p.x) % 360}, 70%, 60%, ${p.alpha})`;
        ctx.fill();
      });

      // If playing, add frequency-reactive pulses
      if (this.isPlaying && Equalizer.analyser) {
        const data = new Uint8Array(Equalizer.analyser.frequencyBinCount);
        Equalizer.analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const intensity = avg / 255;

        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 100 + intensity * 200, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue1}, 80%, 50%, ${intensity * 0.3})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      requestAnimationFrame(draw);
    };
    draw();
  },

  saveState() {
    localStorage.setItem('audix_player', JSON.stringify({
      repeat: this.repeat,
      shuffle: this.shuffle,
      totalListened: this.totalListened
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
        document.getElementById('btn-repeat')?.classList.toggle('active', this.repeat);
        document.getElementById('btn-shuffle')?.classList.toggle('active', this.shuffle);
      }
    } catch (e) {}
  }
};

window.addEventListener('beforeunload', () => Player.saveState());
