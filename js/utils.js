/* ============================================
   UTILS, CONSTANTS, AI TITLE CLEANER & MOOD DETECTION
   ============================================ */

const Utils = {
  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  },

  async generateSFX(type) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') await ctx.resume();
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
        osc.start(t); osc.stop(t + 0.4);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.linearRampToValueAtTime(100, t + 0.3);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t); osc.stop(t + 0.3);
      } else if (type === 'unlock') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.setValueAtTime(554, t + 0.1);
        osc.frequency.setValueAtTime(659, t + 0.2);
        osc.frequency.setValueAtTime(880, t + 0.3);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.start(t); osc.stop(t + 0.6);
      } else if (type === 'tick') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, t);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.start(t); osc.stop(t + 0.05);
      } else if (type === 'favorite') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.start(t); osc.stop(t + 0.15);
      } else if (type === 'levelup') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, t);
        osc.frequency.setValueAtTime(659, t + 0.1);
        osc.frequency.setValueAtTime(784, t + 0.2);
        osc.frequency.setValueAtTime(1047, t + 0.3);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.start(t); osc.stop(t + 0.5);
      } else if (type === 'xp') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, t);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.start(t); osc.stop(t + 0.1);
      }
    } catch (e) {
      console.warn('SFX failed:', e);
    }
  },

  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  },

  xpToast(message) {
    const container = document.getElementById('xp-toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast xp';
    el.textContent = message;
    container.appendChild(el);
    if (typeof SFX !== 'undefined') SFX.xp();
    setTimeout(() => el.remove(), 2500);
  },

  achievementToast(message) {
    const container = document.getElementById('achievement-toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast reward';
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  },

  levelUpToast(level, title) {
    const container = document.getElementById('achievement-toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast levelup';
    el.innerHTML = `🎉 Level ${level}! ${title}`;
    container.appendChild(el);
    if (typeof SFX !== 'undefined') SFX.levelup();
    setTimeout(() => el.remove(), 5000);
  },

  debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  },

  // ============================================
  // AI TITLE CLEANER v2
  // ============================================
  cleanTitle(filename) {
    // Remove file extension
    let name = filename.replace(/\.[^/.]+$/, '');

    // Remove track numbers: "01. ", "1 - ", "01 -", "1.", "01)", "(1)"
    name = name.replace(/^(\d+[.\)\-\s]+)+/, '');
    name = name.replace(/^\(\d+\)\s*/, '');

    // Remove common suffixes/tags
    const suffixes = [
      /\s*\[\d{3}kbps\]/gi,
      /\s*\[\d{3}\s*Kbps\]/gi,
      /\s*\(Official\)/gi,
      /\s*\(Official Video\)/gi,
      /\s*\(Official Audio\)/gi,
      /\s*\(Lyrics\)/gi,
      /\s*\(Lyric Video\)/gi,
      /\s*\(Audio\)/gi,
      /\s*\(Video\)/gi,
      /\s*\(HD\)/gi,
      /\s*\(HQ\)/gi,
      /\s*\(Remix\)/gi,
      /\s*\(Cover\)/gi,
      /\s*\(Live\)/gi,
      /\s*\(Acoustic\)/gi,
      /\s*\(Instrumental\)/gi,
      /\s*\(Extended\)/gi,
      /\s*\(Radio Edit\)/gi,
      /\s*\[Explicit\]/gi,
      /\s*\[Clean\]/gi,
      /\s*\(feat\..*?\)/gi,
      /\s*\(ft\..*?\)/gi,
      /\s*\[.*?\]/g,
    ];
    suffixes.forEach(rx => { name = name.replace(rx, ''); });

    // Trim whitespace
    name = name.trim();

    // Try to split by " - " or " – " or " — "
    const separators = [' - ', ' – ', ' — ', ' _ ', ' | ', ' • '];
    let artist = '';
    let title = name;

    for (const sep of separators) {
      const idx = name.indexOf(sep);
      if (idx > 0) {
        artist = name.substring(0, idx).trim();
        title = name.substring(idx + sep.length).trim();
        break;
      }
    }

    // If no separator found, try "Artist -Title" (no space after dash)
    if (!artist && name.includes('-')) {
      const parts = name.split('-');
      if (parts.length === 2) {
        artist = parts[0].trim();
        title = parts[1].trim();
      }
    }

    return {
      title: title || name,
      artist: artist || 'Unknown Artist',
      raw: name
    };
  },

  // ============================================
  // MOOD DETECTION
  // ============================================
  detectMood(song) {
    const text = `${song.title || ''} ${song.artist || ''} ${song.genre || ''} ${song.album || ''}`.toLowerCase();

    const moods = {
      happy: ['happy', 'joy', 'upbeat', 'dance', 'pop', 'party', 'fun', 'smile', 'summer', 'bright', 'cheer', 'celebr'],
      sad: ['sad', 'melancholy', 'blue', 'cry', 'tear', 'somber', 'grief', 'sorrow', 'depress', 'heartbreak', 'lonely', 'downtempo'],
      chill: ['chill', 'relax', 'calm', 'peace', 'ambient', 'lofi', 'soft', 'smooth', 'mellow', 'acoustic', 'sleep', 'meditation'],
      energetic: ['energetic', 'rock', 'metal', 'punk', 'hard', 'fast', 'intense', 'power', 'aggressive', 'dubstep', 'trap', ' workout']
    };

    let scores = { happy: 0, sad: 0, chill: 0, energetic: 0 };

    for (const [mood, keywords] of Object.entries(moods)) {
      for (const kw of keywords) {
        if (text.includes(kw)) scores[mood]++;
      }
    }

    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return 'chill';

    return Object.keys(scores).find(key => scores[key] === maxScore) || 'chill';
  },

  getMoodIcon(mood) {
    const icons = { happy: '😊', sad: '😢', chill: '😌', energetic: '⚡' };
    return icons[mood] || '🎵';
  },

  getMoodLabel(mood) {
    const labels = { happy: 'Happy', sad: 'Sad', chill: 'Chill', energetic: 'Energetic' };
    return labels[mood] || 'Unknown';
  },

  // File to ArrayBuffer helper
  fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  },

  // ArrayBuffer to Blob URL
  arrayBufferToBlobURL(arrayBuffer, type = 'audio/mpeg') {
    if (!arrayBuffer) return null;
    const blob = new Blob([arrayBuffer], { type });
    return URL.createObjectURL(blob);
  },

  // Image file to base64 data URL
  fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
};

const SFX = {
  play: (type) => Utils.generateSFX(type),
  success: () => Utils.generateSFX('success'),
  error: () => Utils.generateSFX('error'),
  unlock: () => Utils.generateSFX('unlock'),
  tick: () => Utils.generateSFX('tick'),
  favorite: () => Utils.generateSFX('favorite'),
  levelup: () => Utils.generateSFX('levelup'),
  xp: () => Utils.generateSFX('xp')
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

// Extra radio stations unlocked as rewards
const EXTRA_RADIO_STATIONS = [
  { name: 'Jazz Cafe', url: 'https://streaming.radio.co/sf2f7a8e00/listen', country: 'USA', genre: 'Jazz', format: 'MP3', unlockLevel: 3 },
  { name: 'Classical FM', url: 'https://stream.classicalfm.ca/classicalfm', country: 'USA', genre: 'Classical', format: 'MP3', unlockLevel: 5 },
  { name: 'Electronic Dance', url: 'https://stream.edmradio.com/edm', country: 'USA', genre: 'EDM', format: 'MP3', unlockLevel: 7 },
  { name: 'Hindi Retro', url: 'https://retrohindi.stream.com', country: 'India', genre: 'Retro', format: 'MP3', unlockLevel: 10 }
];
