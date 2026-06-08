/* ============================================
   APP ROUTER & INITIALIZER — v3.2 (Critical Fixes)
   Maintenance Mode, Player Activity, Share System,
   Lyrics Fetch, XP Recalc, Title Cleaner
   ============================================ */

const Gamification = {
  xp: 0,
  level: 1,
  dailyStreak: 0,
  lastActiveDate: null,
  totalListenTime: 0,
  quizStats: { played: 0, won: 0, streak: 0, bestStreak: 0, roundsCompleted: 0, lastDate: null },
  coins: 0,

  levelTitles: {
    1: 'Beginner Listener',
    5: 'Music Enthusiast',
    10: 'Music Explorer',
    15: 'Rhythm Seeker',
    20: 'Melody Master',
    25: 'Sound Master',
    30: 'Harmony Hero',
    35: 'Beat Legend',
    40: 'Audio Emperor',
    45: 'Sonic Sage',
    50: 'Legendary Audiophile'
  },

  init() {
    this.load();
    this.recalculateLevel();
    this.checkDailyStreak();
    this.updateUI();
  },

  recalculateLevel() {
    // Ensure level matches total XP
    let calculatedLevel = 1;
    let xpNeeded = this.getXPForLevel(2);
    while (calculatedLevel < 50 && this.xp >= xpNeeded) {
      calculatedLevel++;
      xpNeeded = this.getXPForLevel(calculatedLevel + 1);
    }
    if (calculatedLevel !== this.level) {
      console.log(`[Gamification] Level corrected: ${this.level} -> ${calculatedLevel} (XP: ${this.xp})`);
      this.level = calculatedLevel;
      this.save();
    }
  },

  getLevelRequirement(level) {
    if (level < 15) {
      return 100 + (level - 1) * 40;
    } else {
      return 100 + 14 * 40 + (level - 15) * 60;
    }
  },

  getXPForLevel(level) {
    if (level <= 1) return 0;
    let total = 0;
    for (let l = 1; l < level; l++) {
      total += this.getLevelRequirement(l);
    }
    return total;
  },

  getCurrentLevelXP() {
    return this.getXPForLevel(this.level);
  },

  getNextLevelXP() {
    return this.getXPForLevel(this.level + 1);
  },

  getXPToNextLevel() {
    return this.getNextLevelXP() - this.xp;
  },

  addXP(amount, source = 'general') {
    if (!amount || amount <= 0) return;
    const oldLevel = this.level;
    this.xp += amount;

    while (this.level < 50 && this.xp >= this.getNextLevelXP()) {
      this.level++;
    }

    if (typeof Utils !== 'undefined') {
      Utils.xpToast(`+${amount} XP (${source})`);
    }

    if (this.level > oldLevel) {
      const title = this.getLevelTitle();
      if (typeof Utils !== 'undefined') Utils.levelUpToast(this.level, title);
      if (typeof SFX !== 'undefined') SFX.levelup();
      const coinReward = this.level * 10;
      this.coins += coinReward;
      if (typeof Auth !== 'undefined') Auth.addCoins(coinReward);
    }

    this.updateUI();
    this.save();
  },

  getLevelTitle() {
    const levels = Object.keys(this.levelTitles).map(Number).sort((a, b) => a - b);
    let title = this.levelTitles[1];
    for (const lvl of levels) {
      if (this.level >= lvl) title = this.levelTitles[lvl];
    }
    return title;
  },

  checkDailyStreak() {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (this.lastActiveDate === today) return;

    if (this.lastActiveDate === yesterday) {
      this.dailyStreak++;
      this.addXP(10 + (this.dailyStreak * 2), 'daily streak');
      if (typeof Utils !== 'undefined') Utils.toast(`🔥 ${this.dailyStreak} day streak! +${10 + this.dailyStreak * 2} XP`, 'success');
    } else {
      this.dailyStreak = 1;
      this.addXP(10, 'daily');
      if (typeof Utils !== 'undefined') Utils.toast('Daily streak started! +10 XP', 'success');
    }

    this.lastActiveDate = today;
    this.save();
  },

  updateUI() {
    const xpFill = document.getElementById('xpFill');
    const currentXpEl = document.getElementById('currentXp');
    const nextLevelXpEl = document.getElementById('nextLevelXp');
    const levelTitleEl = document.getElementById('levelTitle');
    const headerXpFill = document.getElementById('headerXpFill');
    const headerLevelBadge = document.getElementById('headerLevelBadge');

    const currentLevelBase = this.getCurrentLevelXP();
    const nextLevelBase = this.getNextLevelXP();
    const progress = nextLevelBase > currentLevelBase
      ? ((this.xp - currentLevelBase) / (nextLevelBase - currentLevelBase)) * 100
      : 100;

    if (xpFill) xpFill.style.width = progress + '%';
    if (currentXpEl) currentXpEl.textContent = this.xp - currentLevelBase;
    if (nextLevelXpEl) nextLevelXpEl.textContent = nextLevelBase - currentLevelBase;
    if (levelTitleEl) levelTitleEl.textContent = this.getLevelTitle();
    if (headerXpFill) headerXpFill.style.width = progress + '%';
    if (headerLevelBadge) headerLevelBadge.textContent = 'Lv.' + this.level;

    const profileLevel = document.getElementById('profileLevel');
    const profileLevelName = document.getElementById('profileLevelName');
    const profileXpFill = document.getElementById('profileXpFill');
    const profileXpText = document.getElementById('profileXpText');
    const profileTotalXp = document.getElementById('profileTotalXp');
    const profileNextXp = document.getElementById('profileNextXp');
    const profileCoins = document.getElementById('profileCoins');

    if (profileLevel) profileLevel.textContent = this.level;
    if (profileLevelName) profileLevelName.textContent = this.getLevelTitle();
    if (profileXpFill) profileXpFill.style.width = progress + '%';
    if (profileXpText) profileXpText.textContent = `${this.xp - currentLevelBase} / ${nextLevelBase - currentLevelBase} XP`;
    if (profileTotalXp) profileTotalXp.textContent = `${this.xp} XP Total`;
    if (profileNextXp) profileNextXp.textContent = `${this.getXPToNextLevel()} XP to next level`;
    if (profileCoins) profileCoins.textContent = this.coins + ' Coins';
  },

  trackQuizResult(won, rounds = 1) {
    this.quizStats.played = (this.quizStats.played || 0) + 1;
    this.quizStats.roundsCompleted = (this.quizStats.roundsCompleted || 0) + rounds;
    if (won) {
      this.quizStats.won = (this.quizStats.won || 0) + 1;
      this.quizStats.streak = (this.quizStats.streak || 0) + 1;
      if (this.quizStats.streak > (this.quizStats.bestStreak || 0)) {
        this.quizStats.bestStreak = this.quizStats.streak;
      }
    } else {
      this.quizStats.streak = 0;
    }
    QuizRewards.checkStreakRewards(this.quizStats.streak);
    QuizRewards.checkRoundRewards(this.quizStats.roundsCompleted);
    this.save();
  },

  save() {
    const data = {
      xp: this.xp,
      level: this.level,
      coins: this.coins,
      dailyStreak: this.dailyStreak,
      lastActiveDate: this.lastActiveDate,
      totalListenTime: this.totalListenTime,
      quizStats: this.quizStats
    };
    const userId = (typeof Auth !== 'undefined') ? Auth.getUserId() : 'guest';
    localStorage.setItem('audix_gamification_' + userId, JSON.stringify(data));
    if (typeof Auth !== 'undefined' && Auth.currentUser && Auth.db) {
      Auth.db.collection('users').doc(Auth.currentUser.uid).update({
        xp: this.xp,
        level: this.level,
        coins: this.coins
      }).catch(e => console.warn('[Gamification] Firestore sync failed:', e));
    }
  },

  load() {
    const userId = (typeof Auth !== 'undefined') ? Auth.getUserId() : 'guest';
    const raw = localStorage.getItem('audix_gamification_' + userId);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        this.xp = data.xp || 0;
        this.level = data.level || 1;
        this.coins = data.coins || 0;
        this.dailyStreak = data.dailyStreak || 0;
        this.lastActiveDate = data.lastActiveDate || null;
        this.totalListenTime = data.totalListenTime || 0;
        this.quizStats = data.quizStats || { played: 0, won: 0, streak: 0, bestStreak: 0, roundsCompleted: 0, lastDate: null };
      } catch (e) {}
    }
  }
};


const QuizRewards = {
  checkStreakRewards(streak) {
    const rewards = {
      3: { xp: 50, coins: 20, item: { id: 'streak_badge_3', type: 'badge', name: '3-Win Streak', rarity: 'rare' } },
      5: { xp: 100, coins: 50, item: { id: 'streak_badge_5', type: 'badge', name: '5-Win Streak', rarity: 'epic' } },
      10: { xp: 250, coins: 100, item: { id: 'streak_badge_10', type: 'badge', name: '10-Win Streak', rarity: 'legendary' } },
      20: { xp: 500, coins: 250, item: { id: 'streak_badge_20', type: 'badge', name: '20-Win Streak', rarity: 'mythic' } }
    };
    if (rewards[streak]) {
      this.grantReward(rewards[streak], `Quiz Streak ${streak}!`);
    }
  },

  checkRoundRewards(rounds) {
    const rewards = {
      1: { xp: 25, coins: 10 },
      10: { xp: 100, coins: 30, item: { id: 'round_badge_10', type: 'badge', name: '10 Rounds', rarity: 'common' } },
      25: { xp: 200, coins: 60, item: { id: 'round_badge_25', type: 'badge', name: '25 Rounds', rarity: 'rare' } },
      50: { xp: 350, coins: 100, item: { id: 'round_badge_50', type: 'badge', name: '50 Rounds', rarity: 'epic' } },
      100: { xp: 600, coins: 200, item: { id: 'round_badge_100', type: 'badge', name: '100 Rounds', rarity: 'legendary' } }
    };
    if (rewards[rounds]) {
      this.grantReward(rewards[rounds], `${rounds} Rounds Completed!`);
    }
  },

  grantReward(reward, message) {
    if (reward.xp && typeof Gamification !== 'undefined') {
      Gamification.addXP(reward.xp, message);
    }
    if (reward.coins && typeof Auth !== 'undefined') {
      Auth.addCoins(reward.coins);
    }
    if (reward.item && typeof Auth !== 'undefined') {
      Auth.addItemToInventory(reward.item);
    }
    if (typeof Utils !== 'undefined') {
      Utils.toast(`🎉 ${message} +${reward.xp || 0} XP +${reward.coins || 0} Coins`, 'success');
    }
    const quizRewardsEl = document.getElementById('quiz-rewards');
    if (quizRewardsEl) {
      const div = document.createElement('div');
      div.className = 'quiz-reward-item';
      div.innerHTML = `🏆 ${message}: +${reward.xp || 0} XP, +${reward.coins || 0} Coins${reward.item ? ', ' + reward.item.name : ''}`;
      quizRewardsEl.appendChild(div);
      quizRewardsEl.classList.remove('hidden');
    }
  }
};


const App = {
  currentPage: 'home',

  async init() {
    console.log('[App] init()');
    this.bindNav();
    this.bindMobileMenu();

    if (typeof Auth !== 'undefined') {
      await Auth.init();
    }

    if (typeof Gamification !== 'undefined') {
      Gamification.init();
    }

    this.initModules();
    this.handleRoute();

    // Track day usage
    const today = new Date().toDateString();
    const days = JSON.parse(localStorage.getItem('audix_days') || '[]');
    if (!days.includes(today)) {
      days.push(today);
      localStorage.setItem('audix_days', JSON.stringify(days));
    }
    if (typeof Achievements !== 'undefined') {
      Achievements.set('uniqueDays', days.length);
    }

    const hour = new Date().getHours();
    if (hour >= 0 && hour < 6) {
      if (typeof Achievements !== 'undefined') Achievements.track('earlyBird');
    }
    if (hour >= 0 && hour < 3) {
      if (typeof Achievements !== 'undefined') Achievements.track('nightOwl');
    }

    if (typeof Admin !== 'undefined') {
      Admin.init();
    }

    // FIXED: Player activity uses actual audio element
    const audioPlayer = document.getElementById('audio-player');
    if (audioPlayer) {
      audioPlayer.addEventListener('play', () => {
        this.updateActivityFromAudio(true);
      });
      audioPlayer.addEventListener('pause', () => {
        this.updateActivityFromAudio(false);
      });
      audioPlayer.addEventListener('ended', () => {
        if (typeof Auth !== 'undefined') Auth.clearActivityStatus();
      });
    }

    if (typeof Profile !== 'undefined' && Profile.bindEvents) {
      Profile.bindEvents();
    }

    window.addEventListener('hashchange', () => this.handleRoute());
    console.log('[App] init() complete');
  },

  updateActivityFromAudio(isPlaying) {
    // Get current track info from DOM (updated by player.js)
    const title = document.getElementById('track-title')?.textContent || 'Unknown';
    const artist = document.getElementById('track-artist')?.textContent || '';
    const album = document.getElementById('track-album')?.textContent || '';
    if (typeof Auth !== 'undefined') {
      Auth.updateActivityStatus({ title, artist, album, isPlaying });
    }
  },

  initModules() {
    console.log('[App] initModules()');

    if (typeof Library !== 'undefined') {
      Library.init().then(() => {
        console.log('[App] Library ready:', Library.songs.length, 'songs');
        if (typeof Player !== 'undefined') {
          Player.init();
          if (Library.songs.length > 0 && Player.currentIndex === -1) {
            console.log('[App] Auto-loading first track');
            Player.loadTrack(0);
          }
        }
      });
    }

    if (typeof Equalizer !== 'undefined') Equalizer.init();
    if (typeof Quiz !== 'undefined') Quiz.init();
    if (typeof Radio !== 'undefined') Radio.init();
    if (typeof Achievements !== 'undefined') Achievements.init();
    if (typeof Profile !== 'undefined') Profile.init();
    if (typeof Settings !== 'undefined') Settings.init();
    if (typeof Notifications !== 'undefined') Notifications.init();
  },

  bindNav() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        window.location.hash = page;
        this.showPage(page);
        this.closeMobileMenu();
      });
    });
  },

  bindMobileMenu() {
    const toggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    if (toggle) {
      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => this.closeMobileMenu());
    }
  },

  closeMobileMenu() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('overlay')?.classList.remove('active');
  },

  handleRoute() {
    let page = window.location.hash.replace('#', '') || 'home';
    if (!document.getElementById(`page-${page}`)) page = 'home';
    this.showPage(page);
  },

  showPage(page) {
    // FIXED: Maintenance mode check — allow login modal to work, block pages after login
    const isLoggedIn = (typeof Auth !== 'undefined' && Auth.currentUser);
    const isAdmin = (typeof Admin !== 'undefined' && Admin.isAdmin());
    const maintenanceActive = (typeof Admin !== 'undefined' && Admin.maintenanceMode);

    if (maintenanceActive && isLoggedIn && !isAdmin && page !== 'maintenance') {
      console.log('[App] Maintenance mode active — redirecting non-admin to maintenance');
      page = 'maintenance';
    }

    this.currentPage = page;

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));

    const map = {
      home: 'homeOpens', equalizer: 'eqOpens', quiz: 'quizOpens', library: 'libraryOpens',
      radio: 'radioOpens', support: 'supportOpens', achievements: 'achievementsOpens',
      about: 'aboutOpens', privacy: 'privacyOpens', contact: 'contactOpens',
      profile: 'profileOpens', settings: 'settingsOpens', admin: 'adminOpens'
    };
    if (map[page] && typeof Achievements !== 'undefined') {
      Achievements.track(map[page]);
    }
    if (typeof Achievements !== 'undefined') {
      const visited = new Set();
      for (const key in map) visited.add(key);
      Achievements.set('pagesVisited', visited.size);
    }

    if (page === 'achievements' && typeof Achievements !== 'undefined') Achievements.render();
    if (page === 'radio' && typeof Radio !== 'undefined') Radio.render();
    if (page === 'quiz' && typeof Quiz !== 'undefined') Quiz.updateUI('start');
    if (page === 'library' && typeof Library !== 'undefined') Library.render();
    if (page === 'profile' && typeof Profile !== 'undefined') Profile.updateDisplay();
    if (page === 'settings' && typeof Settings !== 'undefined') Settings.applyToUI();
    if (page === 'admin' && typeof Admin !== 'undefined') Admin.render();

    document.querySelector('.main-content')?.scrollTo(0, 0);
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
