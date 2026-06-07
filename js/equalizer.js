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

  init() {
    this.bindEvents();
    this.renderVisualizer();
  },

  bindEvents() {
    const vocal = document.getElementById('vocal-boost');
    const bass = document.getElementById('bass-boost');
    const treble = document.getElementById('treble-boost');

    if (vocal) vocal.addEventListener('input', (e) => this.setFilter('vocal', e.target.value));
    if (bass) bass.addEventListener('input', (e) => this.setFilter('bass', e.target.value));
    if (treble) treble.addEventListener('input', (e) => this.setFilter('treble', e.target.value));

    document.querySelectorAll('.btn-preset').forEach(btn => {
      btn.addEventListener('click', () => this.applyPreset(btn.dataset.preset));
    });
  },

  setup(audioEl) {
    if (this.connected) return;
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
      this.startVisualizer();
    } catch (e) {
      console.error('Web Audio API setup failed', e);
    }
  },

  setFilter(type, value) {
    if (!this.ctx) return;
    const val = parseFloat(value);
    const dB = val;

    if (type === 'bass') {
      this.bassFilter.gain.value = dB;
      document.getElementById('bass-value').textContent = `${val} dB`;
      if (val >= 15) Achievements.track('maxBassUsed');
    } else if (type === 'treble') {
      this.trebleFilter.gain.value = dB;
      document.getElementById('treble-value').textContent = `${val} dB`;
      if (val >= 15) Achievements.track('maxTrebleUsed');
    } else if (type === 'vocal') {
      this.vocalFilter.gain.value = dB;
      document.getElementById('vocal-value').textContent = `${val} dB`;
      if (val >= 15) Achievements.track('maxVocalUsed');
    }

    Achievements.track('eqAdjustments');
    Achievements.set('eqAdjusted', (Achievements.state.eqAdjusted || 0) + 1);
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

    document.getElementById('bass-boost').value = p.bass;
    document.getElementById('vocal-boost').value = p.vocal;
    document.getElementById('treble-boost').value = p.treble;

    this.setFilter('bass', p.bass);
    this.setFilter('vocal', p.vocal);
    this.setFilter('treble', p.treble);

    document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-preset="${name}"]`)?.classList.add('active');
  },

  startVisualizer() {
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
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
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

  renderVisualizer() {
    // Static render until audio starts
    const canvas = document.getElementById('eq-visualizer');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
};
