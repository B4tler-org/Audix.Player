/* ============================================
   APP ROUTER & INITIALIZER
   ============================================ */

const App = {
  currentPage: 'home',

  init() {
    this.bindNav();
    this.bindMobileMenu();
    this.handleRoute();
    this.initModules();
    this.setupQR();

    // Track day usage
    const today = new Date().toDateString();
    const days = JSON.parse(localStorage.getItem('audix_days') || '[]');
    if (!days.includes(today)) {
      days.push(today);
      localStorage.setItem('audix_days', JSON.stringify(days));
    }
    Achievements.set('uniqueDays', days.length);

    // Hash route listener
    window.addEventListener('hashchange', () => this.handleRoute());
  },

  initModules() {
    Library.init().then(() => {
      Player.setPlaylist(Library.songs);
    });
    Equalizer.init();
    Quiz.init();
    Radio.init();
    Achievements.init();
    Player.init();
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
    if (map[page]) Achievements.track(map[page]);
    Achievements.set('pagesVisited', new Set(Object.keys(map).filter(k => Achievements.state[map[k]] > 0)).size);
    Achievements.set('featuresUsed', Object.values(Achievements.state).filter(v => v > 0).length);

    // Page-specific init
    if (page === 'achievements') Achievements.render();
    if (page === 'radio') Radio.render();
    if (page === 'quiz') Quiz.updateUI('start');
    if (page === 'library') Library.render();
    if (page === 'support') this.setupQR();

    // Scroll to top
    document.querySelector('.main-content')?.scrollTo(0, 0);
  },

  setupQR() {
    Utils.generateQR('https://github.com/');
    const btn = document.getElementById('btn-download-qr');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const qr = document.querySelector('#qrcode img');
        if (qr) {
          const a = document.createElement('a');
          a.href = qr.src;
          a.download = 'audix-support-qr.png';
          a.click();
        }
      });
    }
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
