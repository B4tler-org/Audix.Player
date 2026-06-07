/* ============================================
   EQUALIZER & VISUALIZER (Web Audio API)
   ============================================ */

const Equalizer = {
  ctx: null,
  source: null,
  analyser: null,
  bassFilter: null,
  trebleFilter: null,
  vocalFilter: null,
  gainNode: null,
  connected: false,
  animationId: null,
  defaults: { bass: 0, vocal: 0, treble: 0 },

  init() {
    this.loadSettings();
    this.bindEvents();
    this.renderVisualizer();
    this.startIdleVisualizer();
  },

  loadSettings() {
    try {
      const raw = localStorage.getItem('audix_eq');
      if (raw) this.defaults = JSON.parse(raw);
    } catch (e) {}
    // Apply loaded settings to UI
    const vocal = document.getElementById('vocal-boost');
    const bass = document.getElementById('bass-boost');
    const treble = document.getElementById('treble-boost');
    if (vocal) vocal.value = this.defaults.vocal || 0;
    if (bass) bass.value = this.defaults.bass || 0;
    if (treble) treble.value = this.defaults.treble || 0;
    this.updateLabels();
  },

  saveSettings() {
    const vocal = document.getElementById('vocal-boost');
    const bass = document.getElementById('bass-boost');
    const treble = document.getElementById('treble-boost');
    this.defaults = {
      vocal: parseInt(vocal ? vocal.value : 0),
      bass: parseInt(bass ? bass.value : 0),
      treble: parseInt(treble ? treble.value : 0)
    };
    localStorage.setItem('audix_eq', JSON.stringify(this.defaults));
  },

  updateLabels() {
    const vocal = document.getElementById('vocal-boost');
    const bass = document.getElementById('bass-boost');
    const treble = document.getElementById('treble-boost');
    const vVal = document.getElementById('vocal-value');
    const bVal = document.getElementById('bass-value');
    const tVal = document.getElementById('treble-value');
    if (vVal && vocal) vVal.textContent = `${vocal.value} dB`;
    if (bVal && bass) bVal.textContent = `${bass.value} dB`;
    if (tVal && treble) tVal.textContent = `${treble.value} dB`;
  },

  bindEvents() {
    const vocal = document.getElementById('vocal-boost');
    const bass = document.getElementById('bass-boost');
    const treble = document.getElementById('treble-boost');

    if (vocal) vocal.addEventListener('input', (e) => { this.setFilter('vocal', e.target.value); this.saveSettings(); });
    if (bass) bass.addEventListener('input', (e) => { this.setFilter('bass', e.target.value); this.saveSettings(); });
    if (treble) treble.addEventListener('input', (e) => { this.setFilter('treble', e.target.value); this.saveSettings(); });

    document.querySelectorAll('.btn-preset').forEach(btn => {
      btn.addEventListener('click', () => this.applyPreset(btn.dataset.preset));
    });
  },

  setup(audioEl) {
    if (this.connected) {
      // Re-apply current filter values
      this.applyCurrentValues();
      return;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.source = this.ctx.createMediaElementSource(audioEl);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;

      // Filters
      this.bassFilter = this.ctx.createBiquadFilter();
      this.bassFilter.type = 'lowshelf';
      this.bassFilter.frequency.value = 150;

      this.trebleFilter = this.ctx.createBiquadFilter();
      this.trebleFilter.type = 'highshelf';
      this.trebleFilter.frequency.value = 3000;

      this.vocalFilter = this.ctx.createBiquadFilter();
      this.vocalFilter.type = 'peaking';
      this.vocalFilter.frequency.value = 1000;
      this.vocalFilter.Q.value = 1;

      this.gainNode = this.ctx.createGain();

      // Chain: source -> bass -> vocal -> treble -> gain -> analyser -> destination
      this.source.connect(this.bassFilter);
      this.bassFilter.connect(this.vocalFilter);
      this.vocalFilter.connect(this.trebleFilter);
      this.trebleFilter.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.connected = true;
      this.applyCurrentValues();
      this.startVisualizer();
    } catch (e) {
      console.error('Web Audio API setup failed', e);
    }
  },

  applyCurrentValues() {
    const vocal = document.getElementById('vocal-boost');
    const bass = document.getElementById('bass-boost');
    const treble = document.getElementById('treble-boost');
    if (this.vocalFilter && vocal) this.vocalFilter.gain.value = parseFloat(vocal.value);
    if (this.bassFilter && bass) this.bassFilter.gain.value = parseFloat(bass.value);
    if (this.trebleFilter && treble) this.trebleFilter.gain.value = parseFloat(treble.value);
  },

  setFilter(type, value) {
    if (!this.ctx) {
      // Store value for when audio starts
      this.saveSettings();
    }
    const val = parseFloat(value);
    this.updateLabels();

    if (type === 'bass' && this.bassFilter) {
      this.bassFilter.gain.value = val;
      if (val >= 15 && typeof Achievements !== 'undefined') Achievements.track('maxBassUsed');
    } else if (type === 'treble' && this.trebleFilter) {
      this.trebleFilter.gain.value = val;
      if (val >= 15 && typeof Achievements !== 'undefined') Achievements.track('maxTrebleUsed');
    } else if (type === 'vocal' && this.vocalFilter) {
      this.vocalFilter.gain.value = val;
      if (val >= 15 && typeof Achievements !== 'undefined') Achievements.track('maxVocalUsed');
    }

    if (typeof Achievements !== 'undefined') {
      Achievements.track('eqAdjustments');
      Achievements.set('eqAdjusted', (Achievements.state.eqAdjusted || 0) + 1);
    }
  },

  applyPreset(name) {
    const presets = {
      flat: { bass: 0, vocal: 0, treble: 0 },
      bass: { bass: 12, vocal: 0, treble: -2 },
      vocal: { bass: -2, vocal: 10, treble: 2 },
      treble: { bass: -4, vocal: 0, treble: 12 }
    };
    const p = presets[name];
    if (!p) return;

    const bassEl = document.getElementById('bass-boost');
    const vocalEl = document.getElementById('vocal-boost');
    const trebleEl = document.getElementById('treble-boost');
    if (bassEl) bassEl.value = p.bass;
    if (vocalEl) vocalEl.value = p.vocal;
    if (trebleEl) trebleEl.value = p.treble;

    this.setFilter('bass', p.bass);
    this.setFilter('vocal', p.vocal);
    this.setFilter('treble', p.treble);
    this.saveSettings();

    document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-preset="${name}"]`);
    if (activeBtn) activeBtn.classList.add('active');
  },

  startVisualizer() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    const canvas = document.getElementById('eq-visualizer');
    if (!canvas || !this.analyser) return;
    const ctx = canvas.getContext('2d');
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      this.animationId = requestAnimationFrame(draw);
      this.analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgba(10, 10, 18, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;
        const r = barHeight + 25;
        const g = 50 + i * 2;
        const b = 200;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  },

  startIdleVisualizer() {
    // Shows a gentle animated visualizer even when no audio is playing
    const canvas = document.getElementById('eq-visualizer');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let time = 0;

    const drawIdle = () => {
      if (this.connected && this.analyser) {
        // Audio is active, let startVisualizer take over
        return;
      }
      this.animationId = requestAnimationFrame(drawIdle);
      time += 0.02;

      ctx.fillStyle = 'rgba(10, 10, 18, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const bars = 64;
      const barWidth = canvas.width / bars;
      for (let i = 0; i < bars; i++) {
        const height = Math.abs(Math.sin(time + i * 0.2)) * 60 + 10;
        const hue = (i * 5 + time * 20) % 360;
        ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.6)`;
        ctx.fillRect(i * barWidth, canvas.height - height, barWidth - 2, height);
      }
    };
    drawIdle();
  },

  renderVisualizer() {
    const canvas = document.getElementById('eq-visualizer');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
};
