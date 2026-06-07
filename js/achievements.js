/* ============================================
   ACHIEVEMENTS SYSTEM v3.0 — Firebase Firestore
   ============================================ */

import { db } from './auth.js';
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const Achievements = {
  list: [
    { id: 'first_song', title: 'First Note', desc: 'Play your first song', icon: '🎵', xpReward: 10, rewardType: 'functional', rewardId: 'hint', condition: (s) => s.plays >= 1 },
    { id: 'ten_plays', title: 'Decade', desc: 'Play 10 songs', icon: '🔟', xpReward: 20, rewardType: 'cosmetic', rewardId: 'neon_theme', condition: (s) => s.plays >= 10 },
    { id: 'hundred_plays', title: 'Century', desc: 'Play 100 songs', icon: '💯', xpReward: 50, rewardType: 'functional', rewardId: 'fifty_fifty', condition: (s) => s.plays >= 100 },
    { id: 'night_owl', title: 'Night Owl', desc: 'Play music after midnight', icon: '🌙', xpReward: 15, rewardType: 'cosmetic', rewardId: 'dark_theme', condition: (s) => s.nightPlays >= 1 },
    { id: 'early_bird', title: 'Early Bird', desc: 'Play music before 6 AM', icon: '🐦', xpReward: 15, rewardType: 'content', rewardId: 'hidden_playlist_1', condition: (s) => s.earlyPlays >= 1 },
    { id: 'repeat_offender', title: 'On Repeat', desc: 'Use repeat mode 5 times', icon: '🔁', xpReward: 10, rewardType: 'functional', rewardId: 'skip_question', condition: (s) => s.repeatUses >= 5 },
    { id: 'shuffler', title: 'Shuffler', desc: 'Use shuffle mode 5 times', icon: '🔀', xpReward: 10, rewardType: 'cosmetic', rewardId: 'glass_theme', condition: (s) => s.shuffleUses >= 5 },
    { id: 'lyric_lover', title: 'Lyric Lover', desc: 'Open lyrics 10 times', icon: '📜', xpReward: 15, rewardType: 'content', rewardId: 'karaoke_effect_1', condition: (s) => s.lyricOpens >= 10 },
    { id: 'cover_downloader', title: 'Art Collector', desc: 'Download 3 covers', icon: '🖼️', xpReward: 15, rewardType: 'cosmetic', rewardId: 'badge_style_1', condition: (s) => s.coversDownloaded >= 3 },
    { id: 'sharer', title: 'Spread the Word', desc: 'Share a song', icon: '📢', xpReward: 10, rewardType: 'functional', rewardId: 'extra_station_1', condition: (s) => s.shares >= 1 },
    { id: 'librarian', title: 'Librarian', desc: 'Add 5 songs to library', icon: '📚', xpReward: 20, rewardType: 'functional', rewardId: 'advanced_search', condition: (s) => s.songsAdded >= 5 },
    { id: 'archivist', title: 'Archivist', desc: 'Add 50 songs to library', icon: '🗃️', xpReward: 50, rewardType: 'content', rewardId: 'secret_song_1', condition: (s) => s.songsAdded >= 50 },
    { id: 'quiz_novice', title: 'Quiz Novice', desc: 'Complete your first quiz', icon: '🎓', xpReward: 15, rewardType: 'functional', rewardId: 'quiz_hint', condition: (s) => s.quizzesCompleted >= 1 },
    { id: 'quiz_pro', title: 'Quiz Pro', desc: 'Score perfect in a quiz', icon: '🏆', xpReward: 30, rewardType: 'cosmetic', rewardId: 'profile_frame_1', condition: (s) => s.perfectQuizzes >= 1 },
    { id: 'quiz_addict', title: 'Quiz Addict', desc: 'Complete 10 quizzes', icon: '🧠', xpReward: 40, rewardType: 'functional', rewardId: 'fifty_fifty', condition: (s) => s.quizzesCompleted >= 10 },
    { id: 'speed_demon', title: 'Speed Demon', desc: 'Answer correctly under 5 seconds', icon: '⚡', xpReward: 20, rewardType: 'content', rewardId: 'lyric_theme_1', condition: (s) => s.fastAnswers >= 1 },
    { id: 'radio_explorer', title: 'Radio Explorer', desc: 'Play 3 different radio stations', icon: '📻', xpReward: 15, rewardType: 'functional', rewardId: 'extra_station_2', condition: (s) => s.uniqueStations >= 3 },
    { id: 'world_traveler', title: 'World Traveler', desc: 'Play stations from 5 countries', icon: '🌍', xpReward: 25, rewardType: 'cosmetic', rewardId: 'gradient_theme', condition: (s) => s.uniqueCountries >= 5 },
    { id: 'custom_station', title: 'Broadcaster', desc: 'Add a custom radio station', icon: '📡', xpReward: 15, rewardType: 'functional', rewardId: 'extra_station_3', condition: (s) => s.customStationsAdded >= 1 },
    { id: 'bass_head', title: 'Bass Head', desc: 'Max out bass boost', icon: '🔊', xpReward: 15, rewardType: 'functional', rewardId: 'night_mode_eq', condition: (s) => s.maxBassUsed >= 1 },
    { id: 'treble_head', title: 'Treble Head', desc: 'Max out treble boost', icon: '🎶', xpReward: 15, rewardType: 'functional', rewardId: 'concert_eq', condition: (s) => s.maxTrebleUsed >= 1 },
    { id: 'vocal_head', title: 'Vocal Head', desc: 'Max out vocal boost', icon: '🎤', xpReward: 15, rewardType: 'cosmetic', rewardId: 'player_skin_1', condition: (s) => s.maxVocalUsed >= 1 },
    { id: 'eq_master', title: 'EQ Master', desc: 'Use all 3 equalizer sliders', icon: '🎚️', xpReward: 20, rewardType: 'functional', rewardId: 'advanced_eq', condition: (s) => s.eqAdjusted >= 3 },
    { id: 'hour_listener', title: 'Marathon', desc: 'Listen for 1 hour total', icon: '⏱️', xpReward: 25, rewardType: 'content', rewardId: 'hidden_playlist_2', condition: (s) => s.listenMinutes >= 60 },
    { id: 'day_listener', title: 'Day Long', desc: 'Listen for 24 hours total', icon: '🕰️', xpReward: 50, rewardType: 'cosmetic', rewardId: 'animated_frame', condition: (s) => s.listenMinutes >= 1440 },
    { id: 'id3_hunter', title: 'ID3 Hunter', desc: 'Play a song with full ID3 tags', icon: '🏷️', xpReward: 10, rewardType: 'functional', rewardId: 'ai_cleaner_v2', condition: (s) => s.id3Plays >= 1 },
    { id: 'lyrics_found', title: 'Poet', desc: 'Successfully load lyrics', icon: '✍️', xpReward: 15, rewardType: 'content', rewardId: 'exclusive_lyric_theme', condition: (s) => s.lyricsLoaded >= 1 },
    { id: 'equalizer_open', title: 'Sound Engineer', desc: 'Open the equalizer page', icon: '🎛️', xpReward: 10, rewardType: 'functional', rewardId: 'bass_boost_eq', condition: (s) => s.eqOpens >= 1 },
    { id: 'library_open', title: 'Organizer', desc: 'Open the library page', icon: '📂', xpReward: 10, rewardType: 'functional', rewardId: 'smart_playlist', condition: (s) => s.libraryOpens >= 1 },
    { id: 'radio_open', title: 'Tuner', desc: 'Open the radio page', icon: '📻', xpReward: 10, rewardType: 'functional', rewardId: 'extra_station_1', condition: (s) => s.radioOpens >= 1 },
    { id: 'quiz_open', title: 'Gamer', desc: 'Open the quiz page', icon: '🎮', xpReward: 10, rewardType: 'functional', rewardId: 'quiz_easy_mode', condition: (s) => s.quizOpens >= 1 },
    { id: 'support_open', title: 'Patron', desc: 'Visit the support page', icon: '❤️', xpReward: 10, rewardType: 'cosmetic', rewardId: 'supporter_badge', condition: (s) => s.supportOpens >= 1 },
    { id: 'about_open', title: 'Curious', desc: 'Read the about page', icon: '🔍', xpReward: 10, rewardType: 'content', rewardId: 'secret_song_2', condition: (s) => s.aboutOpens >= 1 },
    { id: 'privacy_open', title: 'Privacy Aware', desc: 'Read the privacy policy', icon: '🔒', xpReward: 10, rewardType: 'cosmetic', rewardId: 'privacy_badge', condition: (s) => s.privacyOpens >= 1 },
    { id: 'contact_open', title: 'Reach Out', desc: 'Visit contact page', icon: '📧', xpReward: 10, rewardType: 'functional', rewardId: 'feedback_feature', condition: (s) => s.contactOpens >= 1 },
    { id: 'achievements_open', title: 'Trophy Hunter', desc: 'Open achievements page', icon: '🏅', xpReward: 10, rewardType: 'cosmetic', rewardId: 'trophy_frame', condition: (s) => s.achievementsOpens >= 1 },
    { id: 'five_countries', title: 'Globetrotter', desc: 'Play radio from 5 countries', icon: '✈️', xpReward: 25, rewardType: 'functional', rewardId: 'world_map_feature', condition: (s) => s.uniqueCountries >= 5 },
    { id: 'ten_countries', title: 'Jet Setter', desc: 'Play radio from 7 countries', icon: '🚀', xpReward: 35, rewardType: 'content', rewardId: 'secret_station', condition: (s) => s.uniqueCountries >= 7 },
    { id: 'searcher', title: 'Searcher', desc: 'Use library search', icon: '🔎', xpReward: 10, rewardType: 'functional', rewardId: 'search_filter', condition: (s) => s.searches >= 1 },
    { id: 'power_user', title: 'Power User', desc: 'Use every feature once', icon: '⚙️', xpReward: 30, rewardType: 'cosmetic', rewardId: 'power_badge', condition: (s) => s.featuresUsed >= 10 },
    { id: 'dedicated', title: 'Dedicated', desc: 'Use Audix on 3 different days', icon: '📅', xpReward: 20, rewardType: 'content', rewardId: 'daily_mix', condition: (s) => s.uniqueDays >= 3 },
    { id: 'veteran', title: 'Veteran', desc: 'Use Audix on 7 different days', icon: '🎖️', xpReward: 40, rewardType: 'cosmetic', rewardId: 'veteran_frame', condition: (s) => s.uniqueDays >= 7 },
    { id: 'collector', title: 'Collector', desc: 'Add 10 songs', icon: '💿', xpReward: 25, rewardType: 'functional', rewardId: 'batch_upload', condition: (s) => s.songsAdded >= 10 },
    { id: 'audiophile', title: 'Audiophile', desc: 'Adjust equalizer 10 times', icon: '🎧', xpReward: 25, rewardType: 'functional', rewardId: 'preset_share', condition: (s) => s.eqAdjustments >= 10 },
    { id: 'explorer', title: 'Explorer', desc: 'Visit every page', icon: '🧭', xpReward: 30, rewardType: 'content', rewardId: 'explorer_playlist', condition: (s) => s.pagesVisited >= 10 },
    { id: 'quiz_winner', title: 'Quiz Winner', desc: 'Win 5 quizzes', icon: '🥇', xpReward: 35, rewardType: 'functional', rewardId: 'quiz_hard_mode', condition: (s) => s.quizzesWon >= 5 },
    { id: 'radio_marathon', title: 'Radio Marathon', desc: 'Listen to radio for 30 min', icon: '📡', xpReward: 25, rewardType: 'content', rewardId: 'radio_recording', condition: (s) => s.radioMinutes >= 30 },
    { id: 'full_house', title: 'Full House', desc: 'Unlock 25 achievements', icon: '🎰', xpReward: 50, rewardType: 'cosmetic', rewardId: 'full_house_badge', condition: (s) => s.unlockedCount >= 25 },
    { id: 'completionist', title: 'Completionist', desc: 'Unlock all 50 achievements', icon: '👑', xpReward: 100, rewardType: 'cosmetic', rewardId: 'crown_frame', condition: (s) => s.unlockedCount >= 50 }
  ],

  state: {},
  unlocked: new Set(),
  unlockedRewards: new Set(),
  sfxEnabled: true,

  async init() {
    await this.loadUserAchievements();
    this.render();
    this.updateRewardsUI();
  },

  async loadUserAchievements() {
    const userId = (typeof Auth !== 'undefined') ? Auth.getUserId() : null;

    if (!userId) {
      // Guest: use localStorage
      const raw = localStorage.getItem('audix_achievements_guest');
      if (raw) {
        try {
          const data = JSON.parse(raw);
          this.state = data.state || {};
          this.unlocked = new Set(data.unlocked || []);
          this.unlockedRewards = new Set(data.unlockedRewards || []);
        } catch (e) {}
      }
      this.state.unlockedCount = this.unlocked.size;
      return;
    }

    // Logged in: use Firestore
    try {
      const ref = doc(db, 'achievements', userId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        this.state = data.state || {};
        this.unlocked = new Set(data.unlocked || []);
        this.unlockedRewards = new Set(data.unlockedRewards || []);
        this.state.unlockedCount = this.unlocked.size;
      } else {
        this.state = {};
        this.unlocked = new Set();
        this.unlockedRewards = new Set();
      }
    } catch (e) {
      console.error('[Achievements] Firestore load error:', e);
    }
  },

  async saveUserAchievements() {
    const userId = (typeof Auth !== 'undefined') ? Auth.getUserId() : null;

    if (!userId) {
      localStorage.setItem('audix_achievements_guest', JSON.stringify({
        state: this.state,
        unlocked: Array.from(this.unlocked),
        unlockedRewards: Array.from(this.unlockedRewards)
      }));
      return;
    }

    try {
      const ref = doc(db, 'achievements', userId);
      await setDoc(ref, {
        state: this.state,
        unlocked: Array.from(this.unlocked),
        unlockedRewards: Array.from(this.unlockedRewards)
      }, { merge: true });
    } catch (e) {
      console.error('[Achievements] Firestore save error:', e);
    }
  },

  async track(statKey, value = 1) {
    this.state[statKey] = (this.state[statKey] || 0) + value;
    this.state.unlockedCount = this.unlocked.size;
    await this.checkUnlocks();
    await this.saveUserAchievements();
  },

  async checkUnlocks() {
    for (const ach of this.list) {
      if (!this.unlocked.has(ach.id) && ach.condition(this.state)) {
        this.unlocked.add(ach.id);
        this.unlockedRewards.add(ach.rewardId);
        this.showUnlock(ach);
        // Award XP
        if (typeof Auth !== 'undefined' && Auth.userData) {
          const newXp = (Auth.userData.xp || 0) + ach.xpReward;
          await Auth.updateProfile({ xp: newXp });
        }
      }
    }
    this.state.unlockedCount = this.unlocked.size;
    this.render();
    this.updateRewardsUI();
  },

  getRewardName(rewardId) {
    const names = {
      'hint': 'Hint Power-Up', 'neon_theme': 'Neon Theme', 'fifty_fifty': '50/50 Power-Up',
      'dark_theme': 'Dark Theme', 'hidden_playlist_1': 'Hidden Playlist 1',
      'skip_question': 'Skip Question', 'glass_theme': 'Glass Theme',
      'karaoke_effect_1': 'Karaoke Effect', 'badge_style_1': 'Badge Style',
      'extra_station_1': 'Extra Station', 'advanced_search': 'Advanced Search',
      'secret_song_1': 'Secret Song', 'quiz_hint': 'Quiz Hint',
      'profile_frame_1': 'Profile Frame', 'lyric_theme_1': 'Lyric Theme',
      'extra_station_2': 'Extra Station 2', 'gradient_theme': 'Gradient Theme',
      'extra_station_3': 'Extra Station 3', 'night_mode_eq': 'Night Mode EQ',
      'concert_eq': 'Concert EQ', 'player_skin_1': 'Player Skin',
      'advanced_eq': 'Advanced EQ', 'hidden_playlist_2': 'Hidden Playlist 2',
      'animated_frame': 'Animated Frame', 'ai_cleaner_v2': 'AI Cleaner v2',
      'exclusive_lyric_theme': 'Exclusive Lyric Theme', 'bass_boost_eq': 'Bass Boost EQ',
      'smart_playlist': 'Smart Playlist', 'quiz_easy_mode': 'Easy Quiz Mode',
      'supporter_badge': 'Supporter Badge', 'secret_song_2': 'Secret Song 2',
      'privacy_badge': 'Privacy Badge', 'feedback_feature': 'Feedback Feature',
      'trophy_frame': 'Trophy Frame', 'world_map_feature': 'World Map',
      'secret_station': 'Secret Station', 'search_filter': 'Search Filter',
      'power_badge': 'Power Badge', 'daily_mix': 'Daily Mix',
      'veteran_frame': 'Veteran Frame', 'batch_upload': 'Batch Upload',
      'preset_share': 'Preset Share', 'explorer_playlist': 'Explorer Playlist',
      'quiz_hard_mode': 'Hard Quiz Mode', 'radio_recording': 'Radio Recording',
      'full_house_badge': 'Full House Badge', 'crown_frame': 'Crown Frame'
    };
    return names[rewardId] || rewardId;
  },

  hasReward(rewardId) {
    return this.unlockedRewards.has(rewardId);
  },

  showUnlock(ach) {
    if (this.sfxEnabled) {
      try { if (typeof SFX !== 'undefined' && SFX.unlock) SFX.unlock(); } catch (e) {}
    }
    if (typeof Utils !== 'undefined' && Utils.toast) {
      Utils.toast(`🏆 Achievement Unlocked: ${ach.title}! +${ach.xpReward} XP`, 'success');
    }
    if (typeof Utils !== 'undefined' && Utils.achievementToast) {
      Utils.achievementToast(`🏆 ${ach.title} — ${ach.desc}`);
    }
  },

  render() {
    const grid = document.getElementById('achievements-grid');
    if (!grid) return;
    const unlockedCount = document.getElementById('achieve-unlocked');
    if (unlockedCount) unlockedCount.textContent = this.unlocked.size;
    const totalXp = document.getElementById('total-xp');
    if (totalXp) {
      let xp = 0;
      this.list.forEach(ach => { if (this.unlocked.has(ach.id)) xp += (ach.xpReward || 0); });
      totalXp.textContent = xp;
    }
    grid.innerHTML = this.list.map(ach => {
      const isUnlocked = this.unlocked.has(ach.id);
      return `<div class="achievement-card ${isUnlocked ? 'unlocked' : ''}">
        <div class="ach-icon">${ach.icon}</div>
        <div class="ach-title">${ach.title}</div>
        <div class="ach-desc">${ach.desc}</div>
        <div class="ach-xp">+${ach.xpReward} XP</div>
        ${!isUnlocked ? '<div class="ach-lock">🔒</div>' : ''}
      </div>`;
    }).join('');
  },

  updateRewardsUI() {
    const rewardsList = document.getElementById('rewardsList');
    if (!rewardsList) return;
    if (this.unlockedRewards.size === 0) {
      rewardsList.innerHTML = '<span style="color:var(--text-secondary);font-size:0.8rem;">Complete achievements to unlock rewards!</span>';
      return;
    }
    rewardsList.innerHTML = Array.from(this.unlockedRewards).map(rid =>
      `<div class="reward-tag">✨ ${this.getRewardName(rid)}</div>`
    ).join('');
    this.applyRewardUnlocks();
  },

  applyRewardUnlocks() {
    if (this.hasReward('night_mode_eq')) { const b = document.getElementById('preset-night'); if (b) b.classList.add('unlocked'); }
    if (this.hasReward('concert_eq')) { const b = document.getElementById('preset-concert'); if (b) b.classList.add('unlocked'); }
    if (this.hasReward('quiz_hint')) { const b = document.getElementById('btn-hint'); if (b) b.classList.remove('hidden'); }
    if (this.hasReward('fifty_fifty')) { const b = document.getElementById('btn-fifty'); if (b) b.classList.remove('hidden'); }
    if (this.hasReward('skip_question')) { const b = document.getElementById('btn-skip'); if (b) b.classList.remove('hidden'); }
    if (this.hasReward('neon_theme')) { const b = document.getElementById('theme-neon'); if (b) b.classList.add('unlocked'); }
    if (this.hasReward('dark_theme')) { const b = document.getElementById('theme-dark'); if (b) b.classList.add('unlocked'); }
    if (this.hasReward('glass_theme')) { const b = document.getElementById('theme-glass'); if (b) b.classList.add('unlocked'); }
    if (this.hasReward('gradient_theme')) { const b = document.getElementById('theme-gradient'); if (b) b.classList.add('unlocked'); }
  }
};

window.Achievements = Achievements;
export default Achievements;
