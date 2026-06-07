/* ============================================
   UTILS & CONSTANTS
   ============================================ */

const Utils = {
  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  },

  async function generateSFX(type) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523, t);
      osc.frequency.setValueAtTime(659, t + 0.1);
      osc.frequency.setValueAtTime(784, t + 0.2);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.linearRampToValueAtTime(100, t + 0.3);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    } else if (type === 'unlock') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.setValueAtTime(554, t + 0.1);
      osc.frequency.setValueAtTime(659, t + 0.2);
      osc.frequency.setValueAtTime(880, t + 0.3);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(t);
      osc.stop(t + 0.6);
    } else if (type === 'tick') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, t);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.start(t);
      osc.stop(t + 0.05);
    }
  },

  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  },

  generateQR(text) {
    const container = document.getElementById('qrcode');
    container.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      new QRCode(container, {
        text: text || 'https://github.com/',
        width: 180,
        height: 180,
        colorDark: '#0f0f1a',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    }
  },

  debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }
};

const SFX = {
  play: (type) => Utils.generateSFX(type),
  success: () => Utils.generateSFX('success'),
  error: () => Utils.generateSFX('error'),
  unlock: () => Utils.generateSFX('unlock'),
  tick: () => Utils.generateSFX('tick')
};

const DEFAULT_RADIO_STATIONS = [
  { name: 'Radio Paradise', url: 'https://stream.radioparadise.com/aac-320', country: 'USA', genre: 'Eclectic', format: 'AAC' },
  { name: 'SomaFM Groove Salad', url: 'https://ice4.somafm.com/groovesalad-128-mp3', country: 'USA', genre: 'Chillout', format: 'MP3' },
  { name: 'BBC Radio 1', url: 'https://stream.live.vc.bbcmedia.co.uk/bbc_radio_one', country: 'USA', genre: 'Pop', format: 'MP3' },
  { name: 'Radio Nepal', url: 'http://radionepal.gov.np:40100/stream', country: 'Nepal', genre: 'News/Music', format: 'MP3' },
  { name: 'Kantipur FM', url: 'https://radio-broadcast.ekantipur.com/stream', country: 'Nepal', genre: 'Pop', format: 'MP3' },
  { name: 'Radio City India', url: 'https://prclive4.listenon.in/City', country: 'India', genre: 'Bollywood', format: 'MP3' },
  { name: 'All India Radio', url: 'https://airhlspush.pc.cdn.bitgravity.com/airhls/live.m3u8', country: 'India', genre: 'Classical', format: 'HLS' },
  { name: 'Radio Dhoni', url: 'http://radiodhoni.radioca.st:8372/stream', country: 'Bangladesh', genre: 'Talk', format: 'MP3' },
  { name: 'Radio Bhumi', url: 'https://radiobhumi.radioca.st:8372/stream', country: 'Bangladesh', genre: 'Music', format: 'MP3' },
  { name: 'Radio Pakistan', url: 'https://radio.gov.pk/live', country: 'Pakistan', genre: 'News', format: 'MP3' },
  { name: 'City 101.6', url: 'https://cityfm101-6.radioca.st:8372/stream', country: 'Pakistan', genre: 'Pop', format: 'MP3' },
  { name: 'Radio Bhutan', url: 'https://www.bbs.bt/stream', country: 'Bhutan', genre: 'Folk', format: 'MP3' },
  { name: 'Radio Tupi', url: 'https://8925.brasilstream.com.br/stream', country: 'Brazil', genre: 'Samba', format: 'MP3' },
  { name: 'Antena 1', url: 'https://antena1.newradio.it/stream', country: 'Brazil', genre: 'MPB', format: 'MP3' }
];
