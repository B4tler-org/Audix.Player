/* ============================================
   MUSIC QUIZ GAME
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

  init() {
    this.bindEvents();
    this.updateUI('start');
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
  },

  start() {
    // FIXED: Check Library.songs directly instead of relying on stale state
    const songs = (typeof Library !== 'undefined' && Library.songs) ? Library.songs : [];
    if (songs.length < 4) {
      if (typeof Utils !== 'undefined') {
        Utils.toast('Add at least 4 songs to your library to play the quiz!', 'error');
      }
      return;
    }

    this.active = true;
    this.round = 0;
    this.score = 0;
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

    document.getElementById('quiz-round-num').textContent = this.round;
    document.getElementById('quiz-score').textContent = this.score;
    document.getElementById('quiz-feedback').classList.add('hidden');
    document.getElementById('btn-next-round').classList.add('hidden');
    document.getElementById('btn-play-snippet').classList.remove('hidden');

    const songs = (typeof Library !== 'undefined' && Library.songs) ? Library.songs : [];
    if (songs.length === 0) {
      this.end();
      return;
    }

    // Pick random song
    const idx = Math.floor(Math.random() * songs.length);
    this.currentSong = songs[idx];

    // Generate 4 options (1 correct + 3 random)
    const others = songs.filter((_, i) => i !== idx);
    const shuffled = others.sort(() => 0.5 - Math.random()).slice(0, 3);
    this.options = [this.currentSong, ...shuffled].sort(() => 0.5 - Math.random());

    this.renderOptions();
    this.resetTimer();
    this.timeLeft = 15;
    this.startTimer();
  },

  renderOptions() {
    const container = document.getElementById('quiz-options');
    if (!container) return;
    container.innerHTML = this.options.map((opt, i) => `
      <button class="quiz-option" data-index="${i}">
        <strong>${String.fromCharCode(65 + i)}.</strong> ${opt.title || 'Unknown'}
      </button>
    `).join('');

    container.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => this.answer(parseInt(btn.dataset.index)));
    });
  },

  playSnippet() {
    if (!this.currentSong || !this.currentSong.url) return;
    const audio = document.getElementById('audio-player');
    if (!audio) return;
    audio.src = this.currentSong.url;
    audio.currentTime = 0;
    audio.play().catch(() => {});

    const progress = document.getElementById('snippet-progress');
    if (progress) progress.style.setProperty('--progress', '0%');

    let elapsed = 0;
    this.snippetTimer = setInterval(() => {
      elapsed += 0.1;
      const pct = (elapsed / this.snippetDuration) * 100;
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
        this.answer(-1); // timeout
      }
    }, 1000);
  },

  resetTimer() {
    clearInterval(this.timer);
    clearInterval(this.snippetTimer);
    const audio = document.getElementById('audio-player');
    if (audio) audio.pause();
  },

  answer(selectedIndex) {
    this.resetTimer();
    const correctIndex = this.options.findIndex(o => o === this.currentSong);
    const isCorrect = selectedIndex === correctIndex;
    const timeTaken = 15 - this.timeLeft;

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
        feedback.textContent = selectedIndex === -1 ? '⏱️ Time's up!' : `❌ Wrong! Answer: ${this.currentSong.title || 'Unknown'}`;
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
      const songs = (typeof Library !== 'undefined' && Library.songs) ? Library.songs : [];
      note.classList.toggle('hidden', songs.length >= 4);
    }
  }
};
