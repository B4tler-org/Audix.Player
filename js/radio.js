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
    this.audio = document.getElementById('audio-player');
    this.loadCustomStations();
    this.mergeStations();
    this.render();
    this.bindEvents();
  },

  loadCustomStations() {
    try {
      const raw = localStorage.getItem('audix_custom_stations');
      if (raw) this.customStations = JSON.parse(raw);
    } catch (e) {}
  },

  saveCustomStations() {
    localStorage.setItem('audix_custom_stations', JSON.stringify(this.customStations));
  },

  mergeStations() {
    this.stations = [...DEFAULT_RADIO_STATIONS, ...this.customStations];
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
    const name = document.getElementById('station-name').value.trim();
    const url = document.getElementById('station-url').value.trim();
    const genre = document.getElementById('station-genre').value.trim() || 'Unknown';
    const country = document.getElementById('station-country').value;
    const format = document.getElementById('station-format').value.trim() || 'MP3';

    if (!name || !url) {
      Utils.toast('Name and URL are required', 'error');
      return;
    }

    this.customStations.push({ name, url, genre, country, format });
    this.saveCustomStations();
    this.mergeStations();
    this.render();
    this.closeModal();
    Utils.toast('Station added successfully');
    Achievements.track('customStationsAdded');
  },

  render() {
    const grid = document.getElementById('station-grid');
    if (!grid) return;

    const filtered = this.filterCountry === 'all'
      ? this.stations
      : this.stations.filter(s => s.country === this.filterCountry);

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>No stations available for this country.</p></div>`;
      return;
    }

    grid.innerHTML = filtered.map((station, idx) => `
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
    if (this.currentStation && this.currentStation.url === station.url && !this.audio.paused) {
      this.audio.pause();
      this.currentStation = null;
      this.render();
      this.updateNowPlaying();
      return;
    }

    this.audio.src = station.url;
    this.audio.play().then(() => {
      this.currentStation = station;
      Utils.toast(`Playing: ${station.name}`);
      this.render();
      this.updateNowPlaying();
      Achievements.track('uniqueStations');
      Achievements.set('uniqueCountries', new Set(this.stations.filter(s => s.played).map(s => s.country)).size);
    }).catch(err => {
      Utils.toast('Failed to play station. CORS or stream issue.', 'error');
      console.error(err);
    });
  },

  updateNowPlaying() {
    const bar = document.getElementById('radio-now-playing');
    if (!bar) return;
    if (this.currentStation && !this.audio.paused) {
      bar.innerHTML = `<span class="radio-status">▶ ${this.currentStation.name} — ${this.currentStation.country}</span>`;
      bar.classList.add('playing');
    } else {
      bar.innerHTML = `<span class="radio-status">Select a station to play</span>`;
      bar.classList.remove('playing');
    }
  }
};
