/* ============================================
   AUDIO PLAYER CORE — v2.0
   CRITICAL AUDIO BUG FIX + GAMIFICATION
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
  karaokeMode: false,
  audioContext: null,
  userInteraction: false,
  playRetryCount: 0,
  maxRetries: 2,

  init() {
    console.log('[Player] init()');
    this.audio = document.getElementById('audio-player');
    this.bindEvents();
    this.loadState();
    this.initAudioContext();
    this.startVibeCanvas();

    // CRITICAL FIX: After refresh recovery — rebind audio source if valid index exists
    if (this.currentIndex >= 0 && this.songs.length > this.currentIndex) {
      console.log('[Player] Refresh recovery: rebinding track', this.currentIndex);
      this.loadTrack(this.currentIndex, false); // false = don't autoplay on refresh
    }
  },

  get songs() {
    return (typeof Library !== 'undefined' && Library.songs) ? Library.songs : [];
  },

  /* ============================================
     CRITICAL AUDIO BUG FIX — AudioContext Handling
     ============================================ */
  initAudioContext() {
    // Browsers require user interaction before AudioContext can play
    // We listen for first click/touch/keydown and resume the context
    const resumeAudio = (e) => {
      if (this.userInteraction) return;
      this.userInteraction = true;
      console.log('[Player] User interaction detected:', e.type);

      // Resume our own AudioContext if suspended
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          console.log('[Player] AudioContext resumed after user interaction');
        }).catch(err => console.error('[Player] AudioContext resume failed:', err));
      }

      // Resume Equalizer's AudioContext if different instance
      if (typeof Equalizer !== 'undefined' && Equalizer.ctx && Equalizer.ctx.state === 'suspended') {
        Equalizer.ctx.resume().catch(() => {});
      }

      // If we were waiting to play, try now
      if (this.audio && this.audio.src && !this.isPlaying && this.playRetryCount > 0) {
        console.log('[Player] Retrying playback after user interaction');
        this.playRetryCount = 0;
        this.play();
      }
    };

    // Use {once: false} to catch multiple interactions, but flag prevents duplicate work
    document.addEventListener('click', resumeAudio);
    document.addEventListener('touchstart', resumeAudio);
    document.addEventListener('keydown', resumeAudio);
  },

  ensureAudioContext() {
    // Create AudioContext if not exists
    if (!this.audioContext) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
        console.log('[Player] AudioContext created, state:', this.audioContext.state);
      } catch (e) {
        console.error('[Player] AudioContext creation failed:', e);
      }
    }
    // Resume if suspended
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        console.log('[Player] AudioContext resumed programmatically');
      }).catch(err => console.warn('[Player] Programmatic resume failed:', err));
    }
  },

  validateAudioSource() {
    const song = this.songs[this.currentIndex];
    if (!song) {
      console.warn('[Player] No song at index', this.currentIndex);
      return false;
    }
    if (!song.url) {
      console.warn('[Player] Song has no URL:', song.title);
      return false;
    }
    // Accept blob URLs (recovered from ArrayBuffer) and http URLs
    if (typeof song.url === 'string' && (song.url.startsWith('blob:') || song.url.startsWith('http'))) {
      return true;
    }
    console.warn('[Player] Invalid URL format:', song.url);
    return false;
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
    const btnEditLyrics = document.getElementById('btn-edit-lyrics');
    const btnKaraoke = document.getElementById('btn-karaoke-toggle');

    if (btnPlay) btnPlay.addEventListener('click', () => this.togglePlay());
    if (btnPrev) btnPrev.addEventListener('click', () => this.prev());
    if (btnNext) btnNext.addEventListener('click', () => this.next());
    if (btnRepeat) btnRepeat.addEventListener('click', () => { 
      this.repeat = !this.repeat; 
      btnRepeat.classList.toggle('active', this.repeat); 
      if (typeof Achievements !== 'undefined') Achievements.track('repeatUses'); 
    });
    if (btnShuffle) btnShuffle.addEventListener('click', () => { 
      this.shuffle = !this.shuffle; 
      btnShuffle.classList.toggle('active', this.shuffle); 
      if (typeof Achievements !== 'undefined') Achievements.track('shuffleUses'); 
    });
    if (progressBar) progressBar.addEventListener('click', (e) => this.seek(e));
    if (btnDownload) btnDownload.addEventListener('click', () => this.downloadCover());
    if (btnShare) btnShare.addEventListener('click', () => this.share());
    if (btnLyrics) btnLyrics.addEventListener('click', () => this.toggleLyrics());
    if (btnEditLyrics) btnEditLyrics.addEventListener('click', () => this.editLyrics());
    if (btnKaraoke) btnKaraoke.addEventListener('click', () => this.toggleKaraoke());

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
      this.playRetryCount = 0;
      this.updatePlayIcon();
      const vinyl = document.querySelector('.vinyl-ring');
      if (vinyl) vinyl.classList.add('playing');
      this.listenStart = Date.now();
      if (typeof Equalizer !== 'undefined') Equalizer.setup(this.audio);
      if (typeof Notifications !== 'undefined') Notifications.updateDisplay();
      // Karaoke sync
      if (this.karaokeMode) this.syncKaraoke();
    });
    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updatePlayIcon();
      const vinyl = document.querySelector('.vinyl-ring');
      if (vinyl) vinyl.classList.remove('playing');
      if (this.listenStart) {
        const mins = (Date.now() - this.listenStart) / 60000;
        this.totalListened += mins;
        // XP for listening: 1 XP per minute
        if (typeof Gamification !== 'undefined') Gamification.addXP(Math.floor(mins), 'listening');
        if (typeof Achievements !== 'undefined') Achievements.track('listenMinutes', Math.floor(mins));
        this.listenStart = 0;
      }
      if (typeof Notifications !== 'undefined') Notifications.updateDisplay();
    });
    this.audio.addEventListener('error', (e) => {
      console.error('[Player] Audio error:', e, 'Code:', this.audio.error?.code, 'Message:', this.audio.error?.message);
      const errorMessages = {
        1: 'Audio download aborted. Check your connection.',
        2: 'Network error. Failed to load audio.',
        3: 'Audio decoding error. File may be corrupted.',
        4: 'Audio format not supported by your browser.'
      };
      const msg = errorMessages[this.audio.error?.code] || 'Error playing audio';
      if (typeof Utils !== 'undefined') Utils.toast(msg, 'error');
    });
  },

  playFromLibrary(index) {
    console.log('[Player] playFromLibrary(', index, ')');
    if (index < 0 || index >= this.songs.length) {
      console.warn('[Player] Invalid index:', index);
      return;
    }
    this.currentIndex = index;
    this.loadTrack(index);
    this.play();
    if (typeof Library !== 'undefined') Library.render();
  },

  loadTrack(index, autoplay = true) {
    const songs = this.songs;
    console.log('[Player] loadTrack(', index, ', autoplay=', autoplay, ') — songs:', songs.length);
    if (!songs.length || index < 0 || index >= songs.length) return;
    this.currentIndex = index;
    const song = songs[index];
    if (!song || !song.url) {
      console.warn('[Player] Song has no URL');
      if (typeof Utils !== 'undefined') Utils.toast('Cannot play: audio data missing', 'error');
      return;
    }

    this.audio.src = song.url;
    this.audio.load(); // Explicitly load to ensure source is bound

    const titleEl = document.getElementById('track-title');
    const artistEl = document.getElementById('track-artist');
    const albumEl = document.getElementById('track-album');
    const yearEl = document.getElementById('track-year');
    const moodEl = document.getElementById('track-mood');

    if (titleEl) titleEl.textContent = song.title || 'Unknown Title';
    if (artistEl) artistEl.textContent = song.artist || 'Unknown Artist';
    if (albumEl) albumEl.textContent = song.album || '';
    if (yearEl) yearEl.textContent = song.year || '';

    // Mood detection
    if (moodEl) {
      const mood = Utils.detectMood(song);
      song.mood = mood;
      moodEl.textContent = Utils.getMoodIcon(mood) + ' ' + Utils.getMoodLabel(mood);
    }

    // Mood badge
    const moodBadge = document.getElementById('mood-badge');
    if (moodBadge) {
      const mood = song.mood || Utils.detectMood(song);
      moodBadge.textContent = Utils.getMoodIcon(mood);
      moodBadge.classList.toggle('visible', true);
    }

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

    // Load lyrics
    const lyricsContent = document.getElementById('lyrics-content');
    if (lyricsContent) {
      if (song.lyrics) {
        this.renderLyrics(song.lyrics);
      } else {
        lyricsContent.innerHTML = '<p class="lyrics-placeholder">Loading lyrics...</p>';
        this.fetchLyrics(song.artist, song.title, song);
      }
    }

    // Track play count for smart playlists
    song.playCount = (song.playCount || 0) + 1;
    song.lastPlayed = Date.now();
    if (typeof Library !== 'undefined' && Library.db && song.id) {
      Library.updateSong(song).catch(() => {});
    }

    if (typeof Achievements !== 'undefined') {
      Achievements.track('plays');
      Achievements.track('id3Plays');
    }

    const hour = new Date().getHours();
    if (hour >= 0 && hour < 6 && typeof Achievements !== 'undefined') {
      Achievements.track('earlyPlays');
      Achievements.track('nightPlays');
    }

    // Update notifications
    if (typeof Notifications !== 'undefined') Notifications.updateDisplay();

    // Save state for refresh recovery
    this.saveState();

    // Autoplay
    if (autoplay) {
      // Small delay to ensure audio element is ready
      setTimeout(() => this.play(), 50);
    }
  },

  /* ============================================
     CRITICAL FIX: Playback with AudioContext & Retry
     ============================================ */
  play() {
    if (!this.audio.src && this.songs.length) {
      this.loadTrack(0);
      return;
    }
    if (!this.audio.src) {
      console.warn('[Player] No audio source available');
      return;
    }

    // Validate source
    if (!this.validateAudioSource()) {
      console.error('[Player] Audio source validation failed');
      if (typeof Utils !== 'undefined') Utils.toast('Audio file unavailable. Please re-add the song.', 'error');
      return;
    }

    // Ensure AudioContext is ready BEFORE playing
    this.ensureAudioContext();

    const promise = this.audio.play();
    if (promise) {
      promise.then(() => {
        console.log('[Player] Playback started successfully');
        this.playRetryCount = 0;
      }).catch((e) => {
        console.error('[Player] Play failed:', e.name, e.message);

        if (e.name === 'NotAllowedError') {
          // Autoplay blocked — need user interaction
          this.playRetryCount++;
          if (!this.userInteraction) {
            console.log('[Player] Waiting for user interaction to enable audio');
            // Show a one-time helpful message, not an error
            if (this.playRetryCount === 1 && typeof Utils !== 'undefined') {
              Utils.toast('Tap anywhere on the page to enable audio, then press play', 'info');
            }
          } else {
            // Already interacted but still blocked — retry with context resume
            console.log('[Player] Retrying after ensuring AudioContext...');
            this.ensureAudioContext();
            if (this.playRetryCount <= this.maxRetries) {
              setTimeout(() => {
                this.audio.play().catch(err => {
                  console.error('[Player] Retry failed:', err);
                  if (typeof Utils !== 'undefined') Utils.toast('Unable to play audio. Try selecting the song again.', 'error');
                });
              }, 150);
            } else {
              if (typeof Utils !== 'undefined') Utils.toast('Playback blocked by browser. Please interact with the page first.', 'error');
            }
          }
        } else if (e.name === 'NotSupportedError') {
          if (typeof Utils !== 'undefined') Utils.toast('Audio format not supported by this browser', 'error');
        } else {
          if (typeof Utils !== 'undefined') Utils.toast('Playback error: ' + e.message, 'error');
        }
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

    // Karaoke sync during playback
    if (this.karaokeMode && this.isPlaying) {
      this.syncKaraoke();
    }
  },

  async fetchLyrics(artist, title, song) {
    const lyricsContent = document.getElementById('lyrics-content');
    if (!lyricsContent) return;

    if (!artist || !title || artist === 'Unknown Artist') {
      lyricsContent.innerHTML = '<p class="lyrics-placeholder">No lyrics available (missing tags).</p>';
      return;
    }

    // Try LRCLIB first
    try {
      const q = encodeURIComponent(`${artist} ${title}`);
      const res = await fetch(`https://lrclib.net/api/search?q=${q}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lyrics = data[0].plainLyrics || data[0].syncedLyrics || 'No lyrics found.';
        this.renderLyrics(lyrics);
        song.lyrics = lyrics;
        if (typeof Library !== 'undefined') Library.updateSong(song);
        if (typeof Achievements !== 'undefined') Achievements.track('lyricsLoaded');
        return;
      }
    } catch (e) {}

    lyricsContent.innerHTML = '<p class="lyrics-placeholder">No lyrics found. Click Edit to add manually.</p>';
  },

  renderLyrics(text) {
    const lyricsContent = document.getElementById('lyrics-content');
    if (!lyricsContent) return;
    if (this.karaokeMode) {
      // Split into lines for karaoke
      const lines = text.split('\n').map((line, i) => 
        `<div class="lyric-line" data-index="${i}">${line}</div>`
      ).join('');
      lyricsContent.innerHTML = `<div class="karaoke-lyrics">${lines}</div>`;
      lyricsContent.classList.add('karaoke-mode');
    } else {
      lyricsContent.textContent = text;
      lyricsContent.classList.remove('karaoke-mode');
    }
  },

  syncKaraoke() {
    if (!this.audio.duration) return;
    const lyricsContent = document.getElementById('lyrics-content');
    if (!lyricsContent) return;
    const lines = lyricsContent.querySelectorAll('.lyric-line');
    if (!lines.length) return;

    const progress = this.audio.currentTime / this.audio.duration;
    const targetIndex = Math.floor(progress * lines.length);

    lines.forEach((line, i) => {
      line.classList.toggle('active', i === targetIndex);
    });

    // Scroll active line into view
    const active = lines[targetIndex];
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  },

  editLyrics() {
    const song = this.songs[this.currentIndex];
    if (!song) return;

    const lyricsContent = document.getElementById('lyrics-content');
    const btnEdit = document.getElementById('btn-edit-lyrics');
    if (!lyricsContent || !btnEdit) return;

    if (btnEdit.textContent === 'Edit') {
      const currentText = song.lyrics || lyricsContent.textContent || '';
      lyricsContent.innerHTML = `
        <div class="lyrics-edit">
          <textarea id="lyrics-textarea">${currentText.replace(/</g, '&lt;')}</textarea>
          <button class="btn-primary btn-small" id="btn-save-lyrics">Save Lyrics</button>
        </div>
      `;
      btnEdit.textContent = 'Cancel';

      document.getElementById('btn-save-lyrics')?.addEventListener('click', () => {
        const textarea = document.getElementById('lyrics-textarea');
        if (textarea) {
          song.lyrics = textarea.value;
          if (typeof Library !== 'undefined') Library.updateSong(song);
          this.renderLyrics(song.lyrics);
          btnEdit.textContent = 'Edit';
          if (typeof Utils !== 'undefined') Utils.toast('Lyrics saved');
        }
      });
    } else {
      if (song.lyrics) {
        this.renderLyrics(song.lyrics);
      } else {
        lyricsContent.innerHTML = '<p class="lyrics-placeholder">Play a song to load lyrics...</p>';
        lyricsContent.classList.remove('karaoke-mode');
      }
      btnEdit.textContent = 'Edit';
    }
  },

  toggleLyrics() {
    const panel = document.getElementById('lyrics-panel');
    if (!panel) return;
    this.lyricsOpen = !this.lyricsOpen;
    panel.classList.toggle('hidden', !this.lyricsOpen);
    if (typeof Achievements !== 'undefined') Achievements.track('lyricOpens');
  },

  toggleKaraoke() {
    this.karaokeMode = !this.karaokeMode;
    const song = this.songs[this.currentIndex];
    if (song && song.lyrics) {
      this.renderLyrics(song.lyrics);
    }
    if (typeof Utils !== 'undefined') {
      Utils.toast(this.karaokeMode ? 'Karaoke mode ON' : 'Karaoke mode OFF');
    }
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
    const data = {
      repeat: this.repeat,
      shuffle: this.shuffle,
      totalListened: this.totalListened,
      currentIndex: this.currentIndex,
      karaokeMode: this.karaokeMode
    };
    localStorage.setItem('audix_player', JSON.stringify(data));
    console.log('[Player] State saved:', data);
  },

  loadState() {
    try {
      const raw = localStorage.getItem('audix_player');
      if (raw) {
        const data = JSON.parse(raw);
        this.repeat = data.repeat || false;
        this.shuffle = data.shuffle || false;
        this.totalListened = data.totalListened || 0;
        this.currentIndex = (typeof data.currentIndex === 'number') ? data.currentIndex : -1;
        this.karaokeMode = data.karaokeMode || false;
        const btnRepeat = document.getElementById('btn-repeat');
        const btnShuffle = document.getElementById('btn-shuffle');
        if (btnRepeat) btnRepeat.classList.toggle('active', this.repeat);
        if (btnShuffle) btnShuffle.classList.toggle('active', this.shuffle);
        console.log('[Player] State loaded:', data);
      }
    } catch (e) {
      console.error('[Player] loadState error:', e);
    }
  }
};

window.addEventListener('beforeunload', () => Player.saveState());
