/* ============================================
   ACHIEVEMENTS SYSTEM — Per-User Storage
   Prevents reset after refresh
   ============================================ */

const Achievements = {
  list: [
    { id: 'first_song', title: 'First Note', desc: 'Play your first song', icon: '🎵', condition: (s) => s.plays >= 1 },
    { id: 'ten_plays', title: 'Decade', desc: 'Play 10 songs', icon: '🔟', condition: (s) => s.plays >= 10 },
    { id: 'hundred_plays', title: 'Century', desc: 'Play 100 songs', icon: '💯', condition: (s) => s.plays >= 100 },
    { id: 'night_owl', title: 'Night Owl', desc: 'Play music after midnight', icon: '🌙', condition: (s) => s.nightPlays >= 1 },
    { id: 'early_bird', title: 'Early Bird', desc: 'Play music before 6 AM', icon: '🐦', condition: (s) => s.earlyPlays >= 1 },
    { id: 'repeat_offender', title: 'On Repeat', desc: 'Use repeat mode 5 times', icon: '🔁', condition: (s) => s.repeatUses >= 5 },
    { id: 'shuffler', title: 'Shuffler', desc: 'Use shuffle mode 5 times', icon: '🔀', condition: (s) => s.shuffleUses >= 5 },
    { id: 'lyric_lover', title: 'Lyric Lover', desc: 'Open lyrics 10 times', icon: '📜', condition: (s) => s.lyricOpens >= 10 },
    { id: 'cover_downloader', title: 'Art Collector', desc: 'Download 3 covers', icon: '🖼️', condition: (s) => s.coversDownloaded >= 3 },
    { id: 'sharer', title: 'Spread the Word', desc: 'Share a song', icon: '📢', condition: (s) => s.shares >= 1 },
    { id: 'librarian', title: 'Librarian', desc: 'Add 5 songs to library', icon: '📚', condition: (s) => s.songsAdded >= 5 },
    { id: 'archivist', title: 'Archivist', desc: 'Add 50 songs to library', icon: '🗃️', condition: (s) => s.songsAdded >= 50 },
    { id: 'quiz_novice', title: 'Quiz Novice', desc: 'Complete your first quiz', icon: '🎓', condition: (s) => s.quizzesCompleted >= 1 },
    { id: 'quiz_pro', title: 'Quiz Pro', desc: 'Score perfect in a quiz', icon: '🏆', condition: (s) => s.perfectQuizzes >= 1 },
    { id: 'quiz_addict', title: 'Quiz Addict', desc: 'Complete 10 quizzes', icon: '🧠', condition: (s) => s.quizzesCompleted >= 10 },
    { id: 'speed_demon', title: 'Speed Demon', desc: 'Answer correctly under 5 seconds', icon: '⚡', condition: (s) => s.fastAnswers >= 1 },
    { id: 'radio_explorer', title: 'Radio Explorer', desc: 'Play 3 different radio stations', icon: '📻', condition: (s) => s.uniqueStations >= 3 },
    { id: 'world_traveler', title: 'World Traveler', desc: 'Play stations from 5 countries', icon: '🌍', condition: (s) => s.uniqueCountries >= 5 },
    { id: 'custom_station', title: 'Broadcaster', desc: 'Add a custom radio station', icon: '📡', condition: (s) => s.customStationsAdded >= 1 },
    { id: 'bass_head', title: 'Bass Head', desc: 'Max out bass boost', icon: '🔊', condition: (s) => s.maxBassUsed >= 1 },
    { id: 'treble_head', title: 'Treble Head', desc: 'Max out treble boost', icon: '🎶', condition: (s) => s.maxTrebleUsed >= 1 },
    { id: 'vocal_head', title: 'Vocal Head', desc: 'Max out vocal boost', icon: '🎤', condition: (s) => s.maxVocalUsed >= 1 },
    { id: 'eq_master', title: 'EQ Master', desc: 'Use all 3 equalizer sliders', icon: '🎚️', condition: (s) => s.eqAdjusted >= 3 },
    { id: 'hour_listener', title: 'Marathon', desc: 'Listen for 1 hour total', icon: '⏱️', condition: (s) => s.listenMinutes >= 60 },
    { id: 'day_listener', title: 'Day Long', desc: 'Listen for 24 hours total', icon: '🕰️', condition: (s) => s.listenMinutes >= 1440 },
    { id: 'id3_hunter', title: 'ID3 Hunter', desc: 'Play a song with full ID3 tags', icon: '🏷️', condition: (s) => s.id3Plays >= 1 },
    { id: 'lyrics_found', title: 'Poet', desc: 'Successfully load lyrics', icon: '✍️', condition: (s) => s.lyricsLoaded >= 1 },
    { id: 'equalizer_open', title: 'Sound Engineer', desc: 'Open the equalizer page', icon: '🎛️', condition: (s) => s.eqOpens >= 1 },
    { id: 'library_open', title: 'Organizer', desc: 'Open the library page', icon: '📂', condition: (s) => s.libraryOpens >= 1 },
    { id: 'radio_open', title: 'Tuner', desc: 'Open the radio page', icon: '📻', condition: (s) => s.radioOpens >= 1 },
    { id: 'quiz_open', title: 'Gamer', desc: 'Open the quiz page', icon: '🎮', condition: (s) => s.quizOpens >= 1 },
    { id: 'support_open', title: 'Patron', desc: 'Visit the support page', icon: '❤️', condition: (s) => s.supportOpens >= 1 },
    { id: 'about_open', title: 'Curious', desc: 'Read the about page', icon: '🔍', condition: (s) => s.aboutOpens >= 1 },
    { id: 'privacy_open', title: 'Privacy Aware', desc: 'Read the privacy policy', icon: '🔒', condition: (s) => s.privacyOpens >= 1 },
    { id: 'contact_open', title: 'Reach Out', desc: 'Visit contact page', icon: '📧', condition: (s) => s.contactOpens >= 1 },
    { id: 'achievements_open', title: 'Trophy Hunter', desc: 'Open achievements page', icon: '🏅', condition: (s) => s.achievementsOpens >= 1 },
    { id: 'five_countries', title: 'Globetrotter', desc: 'Play radio from 5 countries', icon: '✈️', condition: (s) => s.uniqueCountries >= 5 },
    { id: 'ten_countries', title: 'Jet Setter', desc: 'Play radio from 7 countries', icon: '🚀', condition: (s) => s.uniqueCountries >= 7 },
    { id: 'searcher', title: 'Searcher', desc: 'Use library search', icon: '🔎', condition: (s) => s.searches >= 1 },
    { id: 'power_user', title: 'Power User', desc: 'Use every feature once', icon: '⚙️', condition: (s) => s.featuresUsed >= 10 },
    { id: 'dedicated', title: 'Dedicated', desc: 'Use Audix on 3 different days', icon: '📅', condition: (s) => s.uniqueDays >= 3 },
    { id: 'veteran', title: 'Veteran', desc: 'Use Audix on 7 different days', icon: '🎖️', condition: (s) => s.uniqueDays >= 7 },
    { id: 'collector', title: 'Collector', desc: 'Add 10 songs', icon: '💿', condition: (s) => s.songsAdded >= 10 },
    { id: 'audiophile', title: 'Audiophile', desc: 'Adjust equalizer 10 times', icon: '🎧', condition: (s) => s.eqAdjustments >= 10 },
    { id: 'explorer', title: 'Explorer', desc: 'Visit every page', icon: '🧭', condition: (s) => s.pagesVisited >= 10 },
    { id: 'quiz_winner', title: 'Quiz Winner', desc: 'Win 5 quizzes', icon: '🥇', condition: (s) => s.quizzesWon >= 5 },
    { id: 'radio_marathon', title: 'Radio Marathon', desc: 'Listen to radio for 30 min', icon: '📡', condition: (s) => s.radioMinutes >= 30 },
    { id: 'full_house', title: 'Full House', desc: 'Unlock 25 achievements', icon: '🎰', condition: (s) => s.unlockedCount >= 25 },
    { id: 'completionist', title: 'Completionist', desc: 'Unlock all 50 achievements', icon: '👑', condition: (s) => s.unlockedCount >= 50 }
  ],

  state: {},
  unlocked: new Set(),
  sfxEnabled: true,
  db: null,

  async init() {
    this.db = (typeof Auth !== 'undefined' && Auth.db) ? Auth.db : null;
    await this.loadUserAchievements();
    this.render();
  },

  async loadUserAchievements() {
    const userId = (typeof Auth !== 'undefined') ? Auth.getUserId() : null;
    console.log('[Achievements] loadUserAchievements for userId:', userId);

    if (!userId) {
      // Guest mode: load from localStorage
      const raw = localStorage.getItem('audix_achievements_guest');
      if (raw) {
        try {
          const data = JSON.parse(raw);
          this.state = data.state || {};
          this.unlocked = new Set(data.unlocked || []);
        } catch (e) {}
      }
      this.state.unlockedCount = this.unlocked.size;
      console.log('[Achievements] Guest loaded:', this.unlocked.size, 'unlocked');
      return;
    }

    // Load from IndexedDB per-user
    return new Promise((resolve) => {
      if (!this.db) { resolve(); return; }
      const tx = this.db.transaction('userAchievements', 'readonly');
      const store = tx.objectStore('userAchievements');
      const req = store.get(userId);
      req.onsuccess = () => {
        if (req.result) {
          this.state = req.result.state || {};
          this.unlocked = new Set(req.result.unlocked || []);
          this.state.unlockedCount = this.unlocked.size;
          console.log('[Achievements] Loaded from DB:', this.unlocked.size, 'unlocked');
        } else {
          console.log('[Achievements] No DB data found, starting fresh');
          this.state = {};
          this.unlocked = new Set();
        }
        resolve();
      };
      req.onerror = () => { console.error('[Achievements] DB load error'); resolve(); };
    });
  },

  async saveUserAchievements() {
    const userId = (typeof Auth !== 'undefined') ? Auth.getUserId() : null;
    this.state.unlockedCount = this.unlocked.size;

    if (!userId) {
      // Guest mode: save to localStorage
      localStorage.setItem('audix_achievements_guest', JSON.stringify({
        state: this.state,
        unlocked: Array.from(this.unlocked)
      }));
      return;
    }

    if (!this.db) return;
    const tx = this.db.transaction('userAchievements', 'readwrite');
    const store = tx.objectStore('userAchievements');
    store.put({
      userId,
      state: this.state,
      unlocked: Array.from(this.unlocked),
      updatedAt: Date.now()
    });
  },

  track(key, value = 1) {
    this.state[key] = (this.state[key] || 0) + value;
    this.check();
    this.saveUserAchievements();
  },

  set(key, value) {
    this.state[key] = value;
    this.check();
    this.saveUserAchievements();
  },

  check() {
    this.state.unlockedCount = this.unlocked.size;
    let newUnlock = false;
    this.list.forEach(ach => {
      if (!this.unlocked.has(ach.id) && ach.condition(this.state)) {
        this.unlocked.add(ach.id);
        this.showUnlock(ach);
        newUnlock = true;
      }
    });
    if (newUnlock) {
      this.state.unlockedCount = this.unlocked.size;
      this.saveUserAchievements();
      this.render();
    }
  },

  showUnlock(ach) {
    if (this.sfxEnabled) {
      try {
        if (typeof SFX !== 'undefined' && SFX.unlock) SFX.unlock();
      } catch (e) { console.warn('Achievement SFX failed:', e); }
    }
    if (typeof Utils !== 'undefined' && Utils.toast) {
      Utils.toast(`🏆 Achievement Unlocked: ${ach.title}!`, 'success');
    }
  },

  render() {
    const grid = document.getElementById('achievements-grid');
    if (!grid) return;
    const unlockedCount = document.getElementById('achieve-unlocked');
    if (unlockedCount) unlockedCount.textContent = this.unlocked.size;

    grid.innerHTML = this.list.map(ach => {
      const isUnlocked = this.unlocked.has(ach.id);
      return `
        <div class="achievement-card ${isUnlocked ? 'unlocked' : ''}">
          <div class="ach-icon">${ach.icon}</div>
          <div class="ach-title">${ach.title}</div>
          <div class="ach-desc">${ach.desc}</div>
          ${!isUnlocked ? '<div class="ach-lock">🔒</div>' : ''}
        </div>
      `;
    }).join('');
  }
};
