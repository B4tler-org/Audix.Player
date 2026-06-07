/* ============================================
   APP ROUTER & INITIALIZER
   ============================================ */

const App = {
  currentPage: 'home',

  init() {
    console.log('[App] init() starting...');
    this.bindNav();
    this.bindMobileMenu();
    this.handleRoute();
    this.initModules();

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

    // Hash route listener
    window.addEventListener('hashchange', () => this.handleRoute());
    console.log('[App] init() complete');
  },

  initModules() {
    console.log('[App] initModules() starting...');
    // Initialize in dependency order: Library first (data source), then others
    Library.init().then(() => {
      console.log('[App] Library initialized with', Library.songs.length, 'songs');
      // Now init Player (reads from Library.songs)
      Player.init();
      console.log('[App] Player initialized');
      // If songs exist, load first track into player UI
      if (Library.songs.length > 0) {
        console.log('[App] Auto-loading first track into Player UI');
        Player.loadTrack(0);
      }
    });
    Equalizer.init();
    Quiz.init();
    Radio.init();
    Achievements.init();
    console.log('[App] All modules initialized');
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

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');

    // Update nav active state
    document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));

    // Track page visits for achievements
    const map = {
      home: 'homeOpens', equalizer: 'eqOpens', quiz: 'quizOpens', library: 'libraryOpens',
      radio: 'radioOpens', support: 'supportOpens', achievements: 'achievementsOpens',
      about: 'aboutOpens', privacy: 'privacyOpens', contact: 'contactOpens'
    };
    if (map[page] && typeof Achievements !== 'undefined') {
      Achievements.track(map[page]);
      Achievements.set('pagesVisited', new Set(Object.keys(map).filter(k => Achievements.state[map[k]] > 0)).size);
      Achievements.set('featuresUsed', Object.values(Achievements.state).filter(v => v > 0).length);
    }

    // Page-specific init
    if (page === 'achievements' && typeof Achievements !== 'undefined') Achievements.render();
    if (page === 'radio' && typeof Radio !== 'undefined') Radio.render();
    if (page === 'quiz' && typeof Quiz !== 'undefined') Quiz.updateUI('start');
    if (page === 'library' && typeof Library !== 'undefined') Library.render();

    // Scroll to top
    document.querySelector('.main-content')?.scrollTo(0, 0);
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
