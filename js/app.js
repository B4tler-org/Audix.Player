/* ============================================
   APP ROUTER & INITIALIZER — v2.0
   Gamification, Daily Activity, XP System
   ============================================ */

const Gamification = {
  xp: 0,
  level: 1,
  dailyStreak: 0,
  lastActiveDate: null,
  totalListenTime: 0,
  quizStats: { played: 0, won: 0, streak: 0, lastDate: null },

  // Level configuration
  levelTitles: {
    1: 'Beginner Listener',
    10: 'Music Explorer',
    25: 'Sound Master',
    50: 'Legendary Audiophile'
  },

  init() {
    this.load();
    this.checkDailyStreak();
    this.updateUI();
  },

  getXPForLevel(level) {
    // Exponential curve: level 1 = 0, level 2 = 100, level 3 = 220, etc.
    return Math.floor(100 * Math.pow(level - 1, 1.5));
  },

  getCurrentLevelXP() {
    return this.getXPForLevel(this.level);
  },

  getNextLevelXP() {
    return this.getXPForLevel(this.level + 1);
  },

  addXP(amount, source = 'general') {
    if (!amount || amount <= 0) return;
    const oldLevel = this.level;
    this.xp += amount;

    // Check level up
    while (this.xp >= this.getNextLevelXP() && this.level < 50) {
      this.level++;
    }

    // Show XP toast
    if (typeof Utils !== 'undefined') {
      Utils.xpToast(`+${amount} XP (${source})`);
    }

    // Level up notification
    if (this.level > oldLevel) {
      const title = this.getLevelTitle();
      if (typeof Utils !== 'undefined') Utils.levelUpToast(this.level, title);
      if (typeof SFX !== 'undefined') SFX.levelup();
    }

    this.updateUI();
    this.save();
  },

  getLevelTitle() {
    // Find the highest defined title at or below current level
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

    if (this.lastActiveDate === today) {
      // Already active today
      return;
    }

    if (this.lastActiveDate === yesterday) {
      // Consecutive day
      this.dailyStreak++;
      this.addXP(10 + (this.dailyStreak * 2), 'daily streak'); // Bonus for streak
      if (typeof Utils !== 'undefined') Utils.toast(`🔥 ${this.dailyStreak} day streak! +${10 + this.dailyStreak * 2} XP`, 'success');
    } else {
      // Streak broken or first time
      if (this.lastActiveDate && this.lastActiveDate !== today) {
        this.dailyStreak = 1;
        if (typeof Utils !== 'undefined') Utils.toast('Daily streak started! +10 XP', 'success');
        this.addXP(10, 'daily');
      } else {
        this.dailyStreak = 1;
        this.addXP(10, 'daily');
      }
    }

    this.lastActiveDate = today;
    this.save();
  },

  updateUI() {
    // Sidebar XP bar
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

    // Profile page
    const profileLevel = document.getElementById('profileLevel');
    const profileLevelName = document.getElementById('profileLevelName');
    const profileXpFill = document.getElementById('profileXpFill');
    const profileXpText = document.getElementById('profileXpText');
    const profileTotalXp = document.getElementById('profileTotalXp');

    if (profileLevel) profileLevel.textContent = this.level;
    if (profileLevelName) profileLevelName.textContent = this.getLevelTitle();
    if (profileXpFill) profileXpFill.style.width = progress + '%';
    if (profileXpText) profileXpText.textContent = `${this.xp - currentLevelBase} / ${nextLevelBase - currentLevelBase} XP`;
    if (profileTotalXp) profileTotalXp.textContent = `${this.xp} XP Total`;
  },

  save() {
    const data = {
      xp: this.xp,
      level: this.level,
      dailyStreak: this.dailyStreak,
      lastActiveDate: this.lastActiveDate,
      totalListenTime: this.totalListenTime,
      quizStats: this.quizStats
    };
    const userId = (typeof Auth !== 'undefined') ? Auth.getUserId() : 'guest';
    localStorage.setItem('audix_gamification_' + userId, JSON.stringify(data));
  },

  load() {
    const userId = (typeof Auth !== 'undefined') ? Auth.getUserId() : 'guest';
    const raw = localStorage.getItem('audix_gamification_' + userId);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        this.xp = data.xp || 0;
        this.level = data.level || 1;
        this.dailyStreak = data.dailyStreak || 0;
        this.lastActiveDate = data.lastActiveDate || null;
        this.totalListenTime = data.totalListenTime || 0;
        this.quizStats = data.quizStats || { played: 0, won: 0, streak: 0, lastDate: null };
      } catch (e) {}
    }
  }
};

const App = {
  currentPage: 'home',

  async init() {
    console.log('[App] init()');
    this.bindNav();
    this.bindMobileMenu();

    // Auth FIRST (creates DB, restores session)
    if (typeof Auth !== 'undefined') {
      await Auth.init();
    }

    // Initialize gamification
    if (typeof Gamification !== 'undefined') {
      Gamification.init();
    }

    // Initialize all modules
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

    window.addEventListener('hashchange', () => this.handleRoute());
    console.log('[App] init() complete');
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
    this.currentPage = page;

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));

    const map = {
      home: 'homeOpens', equalizer: 'eqOpens', quiz: 'quizOpens', library: 'libraryOpens',
      radio: 'radioOpens', support: 'supportOpens', achievements: 'achievementsOpens',
      about: 'aboutOpens', privacy: 'privacyOpens', contact: 'contactOpens',
      profile: 'profileOpens', settings: 'settingsOpens'
    };
    if (map[page] && typeof Achievements !== 'undefined') {
      Achievements.track(map[page]);
    }

    if (page === 'achievements' && typeof Achievements !== 'undefined') Achievements.render();
    if (page === 'radio' && typeof Radio !== 'undefined') Radio.render();
    if (page === 'quiz' && typeof Quiz !== 'undefined') Quiz.updateUI('start');
    if (page === 'library' && typeof Library !== 'undefined') Library.render();
    if (page === 'profile' && typeof Profile !== 'undefined') Profile.updateDisplay();
    if (page === 'settings' && typeof Settings !== 'undefined') Settings.applyToUI();

    document.querySelector('.main-content')?.scrollTo(0, 0);
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
