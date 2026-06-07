/* ============================================
   MUSIC QUIZ GAME — v2.0
   Difficulty Modes, Quiz Modes, XP Rewards, Daily Streaks
   ============================================ */

const Quiz = {
  active: false,
  round: 0,
  score: 0,
  currentSong: null,
  options: [],
  timer: null,
  timeLeft: 15,
  snippetDuration: 5,
  roundsTotal: 6,
  snippetTimer: null,
  answerTime: 0,
  difficulty: 'medium', // easy, medium, hard
  mode: 'guess', // guess, clip, lyrics
  usedHint: false,
  usedFifty: false,
  usedSkip: false,

  init() {
    console.log('[Quiz] init()');
    this.bindEvents();
    this.updateUI('start');
    this.loadStreak();
  },

  get songs() {
    return (typeof Library !== 'undefined' && Library.songs) ? Library.songs : [];
  },

  bindEvents() {
    const startBtn = document.getElementById('btn-start-quiz');
    if (startBtn) startBtn.addEventListener('click', () => this.start());

    const nextBtn = document.getElementById('btn-next-round');
    if (nextBtn) nextBtn.addEventListener('click', () => this.nextRound());

    const restartBtn = document.getElementById('btn-restart-quiz');
    if (restartBtn) restartBtn.addEventListener('click', () => this.start());

    const playSnippetBtn = document.getElementById('btn-play-snippet');
    if (playSnippetBtn) playSnippetBtn.addEventListener('click', () => this.playSnippet());

    // Difficulty buttons
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.difficulty = btn.dataset.diff;
        this.updateDifficultySettings();
      });
    });

    // Mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.mode = btn.dataset.mode;
      });
    });

    // Reward tools
    const hintBtn = document.getElementById('btn-hint');
    if (hintBtn) hintBtn.addEventListener('click', () => this.useHint());
    const fiftyBtn = document.getElementById('btn-fifty');
    if (fiftyBtn) fiftyBtn.addEventListener('click', () => this.useFifty());
    const skipBtn = document.getElementById('btn-skip');
    if (skipBtn) skipBtn.addEventListener('click', () => this.useSkip());
  },

  updateDifficultySettings() {
    const settings = {
      easy: { snippet: 8, timer: 20 },
      medium: { snippet: 5, timer: 15 },
      hard: { snippet: 3, timer: 10 }
    };
    const s = settings[this.difficulty];
    this.snippetDuration = s.snippet;
    this.timeLeft = s.timer;
    const rule = document.getElementById('quiz-timer-rule');
    if (rule) rule.textContent = `${s.timer} seconds to answer each`;
  },

  loadStreak() {
    const raw = localStorage.getItem('audix_quiz_streak');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        const today = new Date().toDateString();
        if (data.lastDate === today || data.lastDate === new Date(Date.now() - 86400000).toDateString()) {
          const streakEl = document.getElementById('streakCount');
          if (streakEl) streakEl.textContent = data.streak || 0;
        }
      } catch (e) {}
    }
  },

  saveStreak() {
    const today = new Date().toDateString();
    const raw = localStorage.getItem('audix_quiz_streak');
    let streak = 1;
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (data.lastDate === new Date(Date.now() - 86400000).toDateString()) {
          streak = (data.streak || 0) + 1;
        }
      } catch (e) {}
    }
    localStorage.setItem('audix_quiz_streak', JSON.stringify({ streak, lastDate: today }));
    const streakEl = document.getElementById('streakCount');
    if (streakEl) streakEl.textContent = streak;
    return streak;
  },

  start() {
    const songs = this.songs;
    console.log('[Quiz] start() — songs available:', songs.length, 'mode:', this.mode, 'difficulty:', this.difficulty);
    if (songs.length < 4) {
      console.warn('[Quiz] Not enough songs for quiz:', songs.length);
      if (typeof Utils !== 'undefined') {
        Utils.toast('Add at least 4 songs to your library to play the quiz!', 'error');
      }
      return;
    }

    this.active = true;
    this.round = 0;
    this.score = 0;
    this.usedHint = false;
    this.usedFifty = false;
    this.usedSkip = false;
    this.updateDifficultySettings();
    this.updateUI('game');
    if (typeof Achievements !== 'undefined') Achievements.track('quizOpens');
    this.nextRound();
  },

  nextRound() {
    this.round++;
    if (this.round > this.roundsTotal) {
      this.end();
      return;
    }

    const roundNum = document.getElementById('quiz-round-num');
    const scoreEl = document.getElementById('quiz-score');
    const feedback = document.getElementById('quiz-feedback');
    const nextBtn = document.getElementById('btn-next-round');
    const playBtn = document.getElementById('btn-play-snippet');

    if (roundNum) roundNum.textContent = this.round;
    if (scoreEl) scoreEl.textContent = this.score;
    if (feedback) feedback.classList.add('hidden');
    if (nextBtn) nextBtn.classList.add('hidden');
    if (playBtn) playBtn.classList.remove('hidden');

    const songs = this.songs;
    if (songs.length === 0) {
      console.warn('[Quiz] No songs available during round');
      this.end();
      return;
    }

    // Pick random song
    const idx = Math.floor(Math.random() * songs.length);
    this.currentSong = songs[idx];
    console.log('[Quiz] Round', this.round, '— correct song:', this.currentSong.title);

    // Generate options based on mode
    if (this.mode === 'lyrics') {
      this.generateLyricsQuestion(songs, idx);
    } else {
      this.generateAudioQuestion(songs, idx);
    }

    this.renderOptions();
    this.resetTimer();
    this.timeLeft = this.timeLeft; // Use difficulty setting
    this.startTimer();
  },

  generateAudioQuestion(songs, correctIdx) {
    const others = songs.filter((_, i) => i !== correctIdx);
    const shuffled = others.sort(() => 0.5 - Math.random()).slice(0, 3);
    this.options = [this.currentSong, ...shuffled].sort(() => 0.5 - Math.random());
  },

  generateLyricsQuestion(songs, correctIdx) {
    // For missing lyrics mode, we need songs with lyrics
    const songsWithLyrics = songs.filter((s, i) => i !== correctIdx && s.lyrics && s.lyrics.length > 20);
    const others = songsWithLyrics.length >= 3 
      ? songsWithLyrics.sort(() => 0.5 - Math.random()).slice(0, 3)
      : songs.filter((_, i) => i !== correctIdx).sort(() => 0.5 - Math.random()).slice(0, 3);
    this.options = [this.currentSong, ...others].sort(() => 0.5 - Math.random());
  },

  renderOptions() {
    const container = document.getElementById('quiz-options');
    if (!container) return;

    if (this.mode === 'lyrics' && this.currentSong.lyrics) {
      // Show a snippet of lyrics with a missing word/line
      const lines = this.currentSong.lyrics.split('\n').filter(l => l.trim());
      const randomLine = lines[Math.floor(Math.random() * lines.length)] || 'Unknown';
      container.innerHTML = this.options.map((opt, i) => `
        <button class="quiz-option" data-index="${i}">
          <strong>${String.fromCharCode(65 + i)}.</strong> ${opt.title || 'Unknown'}
          <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:4px;">${opt.artist || 'Unknown'}</div>
        </button>
      `).join('');
    } else {
      container.innerHTML = this.options.map((opt, i) => `
        <button class="quiz-option" data-index="${i}">
          <strong>${String.fromCharCode(65 + i)}.</strong> ${opt.title || 'Unknown'}
        </button>
      `).join('');
    }

    container.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => this.answer(parseInt(btn.dataset.index)));
    });
  },

  playSnippet() {
    if (!this.currentSong || !this.currentSong.url) return;
    const audio = document.getElementById('audio-player');
    if (!audio) return;

    // Pause any current playback first
    if (typeof Player !== 'undefined' && Player.isPlaying) {
      Player.pause();
    }

    audio.pause();
    audio.src = this.currentSong.url;
    audio.currentTime = 0;
    audio.play().catch(() => {});

    const progress = document.getElementById('snippet-progress');
    if (progress) progress.style.setProperty('--progress', '0%');

    let elapsed = 0;
    this.snippetTimer = setInterval(() => {
      elapsed += 0.1;
      const pct = Math.min((elapsed / this.snippetDuration) * 100, 100);
      if (progress) progress.style.setProperty('--progress', pct + '%');
      if (elapsed >= this.snippetDuration) {
        audio.pause();
        clearInterval(this.snippetTimer);
      }
    }, 100);

    const btn = document.getElementById('btn-play-snippet');
    if (btn) btn.classList.add('hidden');
  },

  startTimer() {
    const timerEl = document.getElementById('quiz-timer');
    if (!timerEl) return;
    timerEl.textContent = this.timeLeft;
    timerEl.classList.remove('warning');

    this.timer = setInterval(() => {
      this.timeLeft--;
      timerEl.textContent = this.timeLeft;
      if (this.timeLeft <= 5) {
        timerEl.classList.add('warning');
        if (typeof SFX !== 'undefined') SFX.tick();
      }
      if (this.timeLeft <= 0) {
        this.answer(-1);
      }
    }, 1000);
  },

  resetTimer() {
    clearInterval(this.timer);
    clearInterval(this.snippetTimer);
    const audio = document.getElementById('audio-player');
    if (audio) audio.pause();
  },

  useHint() {
    if (this.usedHint || !Achievements.hasReward('quiz_hint')) return;
    this.usedHint = true;
    const correctIndex = this.options.findIndex(o => o === this.currentSong);
    const btns = document.querySelectorAll('.quiz-option');
    // Highlight the correct answer slightly
    btns[correctIndex].style.borderColor = 'var(--accent-3)';
    if (typeof Utils !== 'undefined') Utils.toast('Hint used! Correct answer highlighted.', 'info');
  },

  useFifty() {
    if (this.usedFifty || !Achievements.hasReward('fifty_fifty')) return;
    this.usedFifty = true;
    const correctIndex = this.options.findIndex(o => o === this.currentSong);
    const btns = document.querySelectorAll('.quiz-option');
    let removed = 0;
    btns.forEach((btn, i) => {
      if (i !== correctIndex && removed < 2) {
        btn.classList.add('hidden');
        removed++;
      }
    });
    if (typeof Utils !== 'undefined') Utils.toast('50/50 used! Two wrong answers removed.', 'info');
  },

  useSkip() {
    if (this.usedSkip || !Achievements.hasReward('skip_question')) return;
    this.usedSkip = true;
    this.resetTimer();
    if (typeof Utils !== 'undefined') Utils.toast('Question skipped!', 'info');
    this.nextRound();
  },

  answer(selectedIndex) {
    this.resetTimer();
    const correctIndex = this.options.findIndex(o => o === this.currentSong);
    const isCorrect = selectedIndex === correctIndex;
    const timeTaken = (this.difficulty === 'easy' ? 20 : this.difficulty === 'medium' ? 15 : 10) - this.timeLeft;

    const btns = document.querySelectorAll('.quiz-option');
    btns.forEach((btn, i) => {
      btn.classList.add('disabled');
      if (i === correctIndex) btn.classList.add('right');
      else if (i === selectedIndex && !isCorrect) btn.classList.add('wrong');
    });

    const feedback = document.getElementById('quiz-feedback');
    if (feedback) {
      feedback.classList.remove('hidden', 'right', 'wrong');
      if (isCorrect) {
        this.score++;
        feedback.textContent = '✅ Correct!';
        feedback.classList.add('right');
        if (typeof SFX !== 'undefined') SFX.success();
        if (timeTaken < 5 && typeof Achievements !== 'undefined') Achievements.track('fastAnswers');
      } else {
        feedback.textContent = selectedIndex === -1 ? "⏱️ Time's up!" : `❌ Wrong! Answer: ${this.currentSong.title || 'Unknown'}`;
        feedback.classList.add('wrong');
        if (typeof SFX !== 'undefined') SFX.error();
      }
    }

    const scoreEl = document.getElementById('quiz-score');
    if (scoreEl) scoreEl.textContent = this.score;

    const nextBtn = document.getElementById('btn-next-round');
    if (nextBtn) nextBtn.classList.remove('hidden');
  },

  end() {
    this.active = false;
    this.updateUI('result');
    const finalScore = document.getElementById('final-score');
    if (finalScore) finalScore.textContent = `${this.score} / ${this.roundsTotal}`;

    // XP calculation
    const baseXP = this.score * 5; // 5 XP per correct answer
    const difficultyBonus = this.difficulty === 'hard' ? 10 : this.difficulty === 'medium' ? 5 : 0;
    const totalXP = baseXP + difficultyBonus;

    const xpEl = document.getElementById('quiz-xp-gained');
    if (xpEl) xpEl.textContent = `+${totalXP} XP earned!`;

    if (typeof Gamification !== 'undefined') Gamification.addXP(totalXP, 'quiz');

    if (typeof Achievements !== 'undefined') {
      Achievements.track('quizzesCompleted');
      if (this.score === this.roundsTotal) {
        Achievements.track('perfectQuizzes');
        const achEl = document.getElementById('quiz-achievement');
        if (achEl) {
          achEl.textContent = '🏆 Perfect Score! Quiz Master unlocked!';
          achEl.classList.remove('hidden');
        }
      }
      if (this.score >= 4) Achievements.track('quizzesWon');
    }

    // Save streak
    if (this.score >= 4) {
      this.saveStreak();
    }
  },

  updateUI(state) {
    const start = document.getElementById('quiz-start');
    const game = document.getElementById('quiz-game');
    const result = document.getElementById('quiz-result');
    if (start) start.classList.toggle('hidden', state !== 'start');
    if (game) game.classList.toggle('hidden', state !== 'game');
    if (result) result.classList.toggle('hidden', state !== 'result');

    const note = document.getElementById('quiz-lib-note');
    if (note) {
      const songs = this.songs;
      note.classList.toggle('hidden', songs.length >= 4);
    }
  }
};
