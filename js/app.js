/* ============================================
   APP ROUTER & INITIALIZER
   Auth-first, then all modules
   ============================================ */

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
