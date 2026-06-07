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
    if (Library.songs.length < 4) {
      Utils.toast('Add at least 4 songs to your library to play the quiz!', 'error');
      return;
    }

    this.active = true;
    this.round = 0;
    this.score = 0;
    this.updateUI('game');
    Achievements.track('quizOpens');
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

    // Pick random song
    const idx = Math.floor(Math.random() * Library.songs.length);
    this.currentSong = Library.songs[idx];

    // Generate 4 options (1 correct + 3 random)
    const others = Library.songs.filter((_, i) => i !== idx);
    const shuffled = others.sort(() => 0.5 - Math.random()).slice(0, 3);
    this.options = [this.currentSong, ...shuffled].sort(() => 0.5 - Math.random());

    this.renderOptions();
    this.resetTimer();
    this.timeLeft = 15;
    this.startTimer();
  },

  renderOptions() {
    const container = document.getElementById('quiz-options');
    container.innerHTML = this.options.map((opt, i) => `
      <button class="quiz-option" data-index="${i}">
        <strong>${String.fromCharCode(65 + i)}.</strong> ${opt.title}
      </button>
    `).join('');

    container.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => this.answer(parseInt(btn.dataset.index)));
    });
  },

  playSnippet() {
    if (!this.currentSong) return;
    const audio = document.getElementById('audio-player');
    audio.src = this.currentSong.url;
    audio.currentTime = 0;
    audio.play();

    const progress = document.getElementById('snippet-progress');
    progress.style.setProperty('--progress', '0%');

    let elapsed = 0;
    this.snippetTimer = setInterval(() => {
      elapsed += 0.1;
      const pct = (elapsed / this.snippetDuration) * 100;
      progress.style.setProperty('--progress', pct + '%');
      if (elapsed >= this.snippetDuration) {
        audio.pause();
        clearInterval(this.snippetTimer);
      }
    }, 100);

    document.getElementById('btn-play-snippet').classList.add('hidden');
  },

  startTimer() {
    const timerEl = document.getElementById('quiz-timer');
    timerEl.textContent = this.timeLeft;
    timerEl.classList.remove('warning');

    this.timer = setInterval(() => {
      this.timeLeft--;
      timerEl.textContent = this.timeLeft;
      if (this.timeLeft <= 5) {
        timerEl.classList.add('warning');
        SFX.tick();
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
    audio.pause();
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
    feedback.classList.remove('hidden', 'right', 'wrong');

    if (isCorrect) {
      this.score++;
      feedback.textContent = '✅ Correct!';
      feedback.classList.add('right');
      SFX.success();
      if (timeTaken < 5) Achievements.track('fastAnswers');
    } else {
      feedback.textContent = selectedIndex === -1 ? '⏱️ Time's up!' : `❌ Wrong! Answer: ${this.currentSong.title}`;
      feedback.classList.add('wrong');
      SFX.error();
    }

    document.getElementById('quiz-score').textContent = this.score;
    document.getElementById('btn-next-round').classList.remove('hidden');
  },

  end() {
    this.active = false;
    this.updateUI('result');
    document.getElementById('final-score').textContent = `${this.score} / ${this.roundsTotal}`;
    Achievements.track('quizzesCompleted');
    if (this.score === this.roundsTotal) {
      Achievements.track('perfectQuizzes');
      document.getElementById('quiz-achievement').textContent = '🏆 Perfect Score! Quiz Master unlocked!';
      document.getElementById('quiz-achievement').classList.remove('hidden');
    }
    if (this.score >= 4) Achievements.track('quizzesWon');
  },

  updateUI(state) {
    document.getElementById('quiz-start').classList.toggle('hidden', state !== 'start');
    document.getElementById('quiz-game').classList.toggle('hidden', state !== 'game');
    document.getElementById('quiz-result').classList.toggle('hidden', state !== 'result');

    const note = document.getElementById('quiz-lib-note');
    if (note) note.classList.toggle('hidden', Library.songs.length >= 4);
  }
};
