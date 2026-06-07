# 🎵 Audix Music Player

A modern, responsive, browser-based music player built with vanilla JavaScript and the Web Audio API. Designed for both desktop and mobile, Audix delivers powerful audio control, intelligent lyrics fetching, gamified listening, and global radio streaming — all running entirely in your browser.

**Live Demo:** [GitHub Pages](https://your-username.github.io/audix-music-player) *(replace with your actual URL)*

---

## ✨ Features

### 🏠 Home Player
- **Media Controls:** Play, pause, previous, next, repeat, and shuffle
- **Cover Art Display:** Rotating vinyl-style animation with ID3 tag recognition
- **Progress Bar:** Click-to-seek with real-time time display
- **Download Cover:** Save album art directly from the player
- **Share:** Native Web Share API or clipboard fallback
- **AI Vibe Background:** Animated canvas that reacts to audio frequency data

### 🎚️ Equalizer
- **3-Band EQ:** Vocal Boost (1 kHz peaking), Bass Boost (150 Hz lowshelf), Treble Boost (3 kHz highshelf)
- **Real-time Visualizer:** Frequency bar graph using Web Audio API AnalyserNode
- **Presets:** Flat, Bass Boost, Vocal Boost, Treble Boost

### 🎮 Music Quiz
- **Guess the Song:** 5-second audio snippet from your library
- **15-Second Timer:** Countdown with visual warning under 5 seconds
- **6 Rounds per Game:** 4 multiple-choice options each round
- **Right/Wrong Feedback:** Green check for correct, red X for wrong with SFX
- **Achievement Unlocks:** Perfect score triggers special badges

### 📚 Library
- **IndexedDB Storage:** Songs persist across browser sessions
- **ID3 Tag Reader:** Automatic metadata extraction (title, artist, album, year, cover art) via jsmediatags
- **Search:** Real-time filter by title, artist, or album
- **Add from Device:** Multi-file MP3 upload support

### 📻 Radio
- **Country-Based Filtering:** Nepal, India, Pakistan, Bangladesh, USA, Brazil, Bhutan
- **Live Streaming:** Pre-loaded working stations + user-added custom stations
- **Custom Station Form:** Add your own stream URLs with genre, format, and country
- **Now Playing Indicator:** Visual status bar with animated "live" dot

### 🏆 Achievements
- **50 Unlockable Badges:** Track listening habits, feature usage, and milestones
- **Local Persistence:** Saved to localStorage with SFX unlock notifications
- **Progress Stats:** Unlocked / Total counter

### ℹ️ Info Pages
- **About:** Project description, version, and tech stack
- **Privacy:** Transparent data policy (local-first, no tracking)
- **Help / Contact:** Support email and GitHub issue links

### ❤️ Support / Donate
- **QR Code Generator:** Auto-generated support QR via QRCode.js
- **Download QR:** Save the generated code as PNG

---

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/audix-music-player.git
cd audix-music-player
```

### 2. Serve Locally (Recommended)
Because the app uses the Web Audio API and file uploads, it must be served over HTTP(S), not opened as a `file://`.

**Option A: Python**
```bash
python -m http.server 8000
# Open http://localhost:8000
```

**Option B: Node.js (npx)**
```bash
npx serve .
# Open http://localhost:3000
```

**Option C: VS Code Live Server**
Install the "Live Server" extension and click "Go Live".

### 3. Add Music
Click **"Add from Device"** on the Library page and select MP3 files from your computer. ID3 tags and cover art will be extracted automatically.

---

## 📁 File Structure

```
audix-music-player/
├── index.html              # Main HTML shell
├── README.md               # This file
├── .gitignore              # Git ignore rules
├── css/
│   └── style.css           # All styles (dark theme, glassmorphism, responsive)
├── js/
│   ├── utils.js            # Constants, SFX generator, helpers, default radio stations
│   ├── achievements.js     # 50-badge achievement system with localStorage
│   ├── library.js          # IndexedDB song storage, ID3 tag reading, search
│   ├── radio.js            # Radio streaming, country filter, custom stations
│   ├── quiz.js             # Music quiz game logic, timer, scoring
│   ├── equalizer.js        # Web Audio API filters + canvas visualizer
│   ├── player.js           # Core audio playback, lyrics, vibe canvas, share
│   └── app.js              # SPA router, mobile menu, page initialization
├── assets/                 # Placeholder for future images/fonts
└── .github/
    └── workflows/            # (Optional) GitHub Actions CI/CD
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Core** | Vanilla JavaScript (ES6+) |
| **Styling** | CSS3 Custom Properties, Flexbox, CSS Grid, Backdrop Filter |
| **Audio** | Web Audio API (BiquadFilter, AnalyserNode, GainNode) |
| **Storage** | IndexedDB (songs), localStorage (achievements, settings, radio) |
| **Metadata** | jsmediatags (ID3 tag extraction) |
| **Lyrics** | LRCLIB API (free, no-auth lyrics database) |
| **QR Codes** | QRCode.js |
| **Icons** | Inline SVG (no icon library dependency) |

---

## 🌐 External APIs & Libraries

All loaded via CDN — no build step required:

- **jsmediatags** `v3.9.5` — ID3 tag reading (`https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js`)
- **QRCode.js** `v1.0.0` — QR generation (`https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js`)
- **LRCLIB** — Free lyrics API (`https://lrclib.net/api/search`)

---

## 📱 Mobile & Desktop

Audix is fully responsive with a **mobile-first** design:
- **Desktop:** Persistent sidebar navigation, wide equalizer sliders, multi-column layouts
- **Mobile:** Hamburger menu with slide-out sidebar, stacked controls, touch-friendly buttons
- **PWA Ready:** Includes a web app manifest for "Add to Home Screen" support

---

## 🎨 Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-deep` | `#0a0a12` | Deepest background |
| `--bg-base` | `#0f0f1a` | Main background |
| `--bg-card` | `#16162a` | Card/sidebar background |
| `--accent` | `#ff6b6b` | Primary brand color |
| `--accent-2` | `#4ecdc4` | Secondary (teal) |
| `--accent-3` | `#ffe66d` | Tertiary (gold) |
| `--glass` | `rgba(255,255,255,0.04)` | Glassmorphism fill |
| `--glass-border` | `rgba(255,255,255,0.08)` | Glassmorphism border |

---

## 🚢 Deploy to GitHub Pages

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: Audix Music Player v1.0"
git branch -M main
git remote add origin https://github.com/your-username/audix-music-player.git
git push -u origin main
```

### Step 2: Enable GitHub Pages
1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under **Source**, select **Deploy from a branch**
4. Select the **`main`** branch and **`/` (root)** folder
5. Click **Save**

### Step 3: Wait & Visit
- GitHub will build and deploy your site (usually takes 1–2 minutes)
- Your site will be live at: `https://your-username.github.io/audix-music-player`

### Optional: Custom Domain
In the **Pages** settings, add your custom domain (e.g., `music.utilitiesnepal.com`) and configure DNS.

---

## 📝 Git Best Practices

The included `.gitignore` prevents committing:
- OS files (`.DS_Store`, `Thumbs.db`)
- Editor files (`.vscode/`, `.idea/`)
- Node modules (if you add any later)
- Log files and temp files

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or pull request on GitHub.

**Support:** help.nebtools@gmail.com  
**Maintainer:** [Utilities Nepal](https://github.com/samir-techer)

---

## 📜 License

MIT License — feel free to use, modify, and distribute.

---

<p align="center">
  <strong>🎵 Audix Music Player</strong><br>
  <em>Powered by Utilities Nepal &copy; 2026</em>
</p>
