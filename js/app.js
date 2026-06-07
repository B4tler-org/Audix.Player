/* ============================================
   APP ROUTER & INITIALIZER
   Auth-first initialization
   ============================================ */

const App = {
  currentPage: 'home',

  async init() {
    console.log('[App] init() starting...');
    this.bindNav();
    this.bindMobileMenu();

    // Initialize Auth FIRST (creates DB, restores session)
    if (typeof Auth !== 'undefined') {
      await Auth.init();
    }

    // Then initialize all other modules
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

    // Library depends on Auth.db being ready
    if (typeof Library !== 'undefined') {
      Library.init().then(() => {
        console.log('[App] Library ready with', Library.songs.length, 'songs');
        // Player reads from Library.songs
        if (typeof Player !== 'undefined') {
          Player.init();
          if (Library.songs.length > 0) {
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

    // Track achievements
    const map = {
      home: 'homeOpens', equalizer: 'eqOpens', quiz: 'quizOpens', library: 'libraryOpens',
      radio: 'radioOpens', support: 'supportOpens', achievements: 'achievementsOpens',
      about: 'aboutOpens', privacy: 'privacyOpens', contact: 'contactOpens',
      profile: 'profileOpens', settings: 'settingsOpens'
    };
    if (map[page] && typeof Achievements !== 'undefined') {
      Achievements.track(map[page]);
    }

    // Page-specific init
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
