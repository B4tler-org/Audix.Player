/* ============================================
   RADIO STREAMING
   ============================================ */

const Radio = {
  stations: [],
  currentStation: null,
  audio: null,
  filterCountry: 'all',
  customStations: [],

  init() {
    console.log('[Radio] init()');
    this.audio = document.getElementById('audio-player');
    this.loadCustomStations();
    this.mergeStations();
    this.render();
    this.bindEvents();
    this.updateNowPlaying();
  },

  loadCustomStations() {
    try {
      const raw = localStorage.getItem('audix_custom_stations');
      if (raw) this.customStations = JSON.parse(raw);
    } catch (e) { this.customStations = []; }
  },

  saveCustomStations() {
    localStorage.setItem('audix_custom_stations', JSON.stringify(this.customStations));
  },

  mergeStations() {
    const defaults = (typeof DEFAULT_RADIO_STATIONS !== 'undefined') ? DEFAULT_RADIO_STATIONS : [];
    this.stations = [...defaults, ...this.customStations];
    console.log('[Radio] Merged', this.stations.length, 'stations');
  },

  bindEvents() {
    document.querySelectorAll('.country-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.country-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterCountry = btn.dataset.country;
        this.render();
      });
    });

    const addBtn = document.getElementById('btn-add-station');
    if (addBtn) addBtn.addEventListener('click', () => this.openModal());

    const cancelBtn = document.getElementById('btn-cancel-station');
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());

    const saveBtn = document.getElementById('btn-save-station');
    if (saveBtn) saveBtn.addEventListener('click', () => this.saveStation());
  },

  openModal() {
    const modal = document.getElementById('station-modal');
    if (modal) modal.classList.remove('hidden');
  },

  closeModal() {
    const modal = document.getElementById('station-modal');
    if (modal) modal.classList.add('hidden');
    document.querySelectorAll('#station-modal input').forEach(i => i.value = '');
  },

  saveStation() {
    const name = document.getElementById('station-name');
    const url = document.getElementById('station-url');
    const genre = document.getElementById('station-genre');
    const country = document.getElementById('station-country');
    const format = document.getElementById('station-format');

    const nameVal = name ? name.value.trim() : '';
    const urlVal = url ? url.value.trim() : '';
    const genreVal = genre ? genre.value.trim() : 'Unknown';
    const countryVal = country ? country.value : 'Nepal';
    const formatVal = format ? format.value.trim() : 'MP3';

    if (!nameVal || !urlVal) {
      if (typeof Utils !== 'undefined') Utils.toast('Name and URL are required', 'error');
      return;
    }

    this.customStations.push({ name: nameVal, url: urlVal, genre: genreVal, country: countryVal, format: formatVal });
    this.saveCustomStations();
    this.mergeStations();
    this.render();
    this.closeModal();
    if (typeof Utils !== 'undefined') Utils.toast('Station added successfully');
    if (typeof Achievements !== 'undefined') Achievements.track('customStationsAdded');
  },

  render() {
    const grid = document.getElementById('station-grid');
    if (!grid) return;

    const filtered = this.filterCountry === 'all'
      ? this.stations
      : this.stations.filter(s => s.country === this.filterCountry);

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"></path><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"></path>
            <circle cx="12" cy="12" r="2"></circle><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"></path><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"></path>
          </svg>
          <p>No stations available.</p>
          <span>${this.filterCountry === 'all' ? 'Add a custom station to get started.' : 'Try selecting a different country.'}</span>
        </div>`;
      return;
    }

    grid.innerHTML = filtered.map((station) => `
      <div class="station-card ${this.currentStation && this.currentStation.url === station.url ? 'playing' : ''}" data-url="${station.url}">
        <div class="station-name">${station.name}</div>
        <div class="station-meta">
          <span class="station-tag">${station.country}</span>
          <span class="station-tag">${station.genre}</span>
          <span class="station-tag">${station.format}</span>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.station-card').forEach(el => {
      el.addEventListener('click', () => {
        const url = el.dataset.url;
        const station = this.stations.find(s => s.url === url);
        if (station) this.play(station);
      });
    });
  },

  play(station) {
    if (!this.audio) return;

    if (this.currentStation && this.currentStation.url === station.url && !this.audio.paused) {
      this.audio.pause();
      this.currentStation = null;
      this.render();
      this.updateNowPlaying();
      return;
    }

    if (typeof Player !== 'undefined' && Player.isPlaying) {
      Player.pause();
    }

    this.audio.src = station.url;
    this.audio.play().then(() => {
      this.currentStation = station;
      if (typeof Utils !== 'undefined') Utils.toast(`Playing: ${station.name}`);
      this.render();
      this.updateNowPlaying();
      if (typeof Achievements !== 'undefined') {
        Achievements.track('uniqueStations');
        const countries = new Set(this.stations.filter(s => s.played).map(s => s.country));
        countries.add(station.country);
        Achievements.set('uniqueCountries', countries.size);
      }
      station.played = true;
    }).catch(err => {
      console.error('[Radio] Play error:', err);
      if (typeof Utils !== 'undefined') Utils.toast('Failed to play station. The stream may be offline or blocked by CORS.', 'error');
    });
  },

  updateNowPlaying() {
    const bar = document.getElementById('radio-now-playing');
    if (!bar) return;
    if (this.currentStation && this.audio && !this.audio.paused) {
      bar.innerHTML = `<span class="radio-status">▶ ${this.currentStation.name} — ${this.currentStation.country}</span>`;
      bar.classList.add('playing');
    } else {
      bar.innerHTML = `<span class="radio-status">Select a station to play</span>`;
      bar.classList.remove('playing');
    }
  }
};
