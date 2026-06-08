/* ============================================
   ACHIEVEMENTS SYSTEM — v4.0
   50 Achievements, reward linking, details view,
   filters, progress bars, debug logging
   ============================================ */

const Achievements = {
  unlocked: new Set(),
  progress: {},
  stats: {},
  sfxEnabled: true,

  // 50 Achievement definitions with reward linking
  list: [
    { id: 'first_open', name: 'First Steps', desc: 'Open Audix for the first time.', xp: 10, reward: null, condition: (s) => true },
    { id: 'first_song', name: 'First Song', desc: 'Upload your first song to the library.', xp: 50, reward: null, condition: (s) => (s.songsUploaded || 0) >= 1 },
    { id: 'upload_5', name: 'Growing Collection', desc: 'Upload 5 songs.', xp: 100, reward: null, condition: (s) => (s.songsUploaded || 0) >= 5 },
    { id: 'upload_10', name: 'Music Hoarder', desc: 'Upload 10 songs.', xp: 150, reward: { type: 'theme', value: 'dark', label: 'Theme: Dark' }, condition: (s) => (s.songsUploaded || 0) >= 10 },
    { id: 'upload_25', name: 'Library Builder', desc: 'Upload 25 songs.', xp: 200, reward: null, condition: (s) => (s.songsUploaded || 0) >= 25 },
    { id: 'upload_50', name: 'Ultimate Collector', desc: 'Upload 50 songs.', xp: 300, reward: null, condition: (s) => (s.songsUploaded || 0) >= 50 },
    { id: 'upload_100', name: 'Century Club', desc: 'Upload 100 songs.', xp: 500, reward: { type: 'theme', value: 'glass', label: 'Theme: Glass' }, condition: (s) => (s.songsUploaded || 0) >= 100 },
    { id: 'first_play', name: 'First Play', desc: 'Play your first song.', xp: 25, reward: null, condition: (s) => (s.songsPlayed || 0) >= 1 },
    { id: 'play_10', name: 'Getting Groovy', desc: 'Play 10 songs.', xp: 50, reward: null, condition: (s) => (s.songsPlayed || 0) >= 10 },
    { id: 'play_50', name: 'Playlist Warrior', desc: 'Play 50 songs.', xp: 100, reward: null, condition: (s) => (s.songsPlayed || 0) >= 50 },
    { id: 'play_100', name: 'Non-Stop Hits', desc: 'Play 100 songs.', xp: 200, reward: { type: 'theme', value: 'neon', label: 'Theme: Neon' }, condition: (s) => (s.songsPlayed || 0) >= 100 },
    { id: 'play_500', name: 'Marathon Listener', desc: 'Play 500 songs.', xp: 500, reward: null, condition: (s) => (s.songsPlayed || 0) >= 500 },
    { id: 'play_1000', name: 'Legendary Player', desc: 'Play 1,000 songs.', xp: 1000, reward: { type: 'theme', value: 'gradient', label: 'Theme: Gradient' }, condition: (s) => (s.songsPlayed || 0) >= 1000 },
    { id: 'listen_1m', name: 'Newbie Listener', desc: 'Listen for 1 minute.', xp: 10, reward: null, condition: (s) => (s.listenMinutes || 0) >= 1 },
    { id: 'listen_10m', name: 'Short Session', desc: 'Listen for 10 minutes.', xp: 25, reward: null, condition: (s) => (s.listenMinutes || 0) >= 10 },
    { id: 'listen_1h', name: 'Hour Long', desc: 'Listen for 1 hour.', xp: 50, reward: null, condition: (s) => (s.listenMinutes || 0) >= 60 },
    { id: 'listen_5h', name: 'Deep Dive', desc: 'Listen for 5 hours.', xp: 100, reward: { type: 'eq_preset', value: 'night', label: 'EQ Preset: Night Mode' }, condition: (s) => (s.listenMinutes || 0) >= 300 },
    { id: 'listen_12h', name: 'Half Day', desc: 'Listen for 12 hours.', xp: 200, reward: null, condition: (s) => (s.listenMinutes || 0) >= 720 },
    { id: 'listen_24h', name: 'Full Day', desc: 'Listen for 24 hours.', xp: 500, reward: { type: 'eq_preset', value: 'concert', label: 'EQ Preset: Concert' }, condition: (s) => (s.listenMinutes || 0) >= 1440 },
    { id: 'listen_100h', name: 'Century Hours', desc: 'Listen for 100 hours.', xp: 1000, reward: null, condition: (s) => (s.listenMinutes || 0) >= 6000 },
    { id: 'quiz_play', name: 'Quiz Novice', desc: 'Play the music quiz once.', xp: 25, reward: null, condition: (s) => (s.quizPlayed || 0) >= 1 },
    { id: 'quiz_win', name: 'Quiz Winner', desc: 'Win a quiz game.', xp: 50, reward: null, condition: (s) => (s.quizWon || 0) >= 1 },
    { id: 'quiz_win_5', name: 'Quiz Master', desc: 'Win 5 quiz games.', xp: 100, reward: { type: 'theme', value: 'neon', label: 'Theme: Neon' }, condition: (s) => (s.quizWon || 0) >= 5 },
    { id: 'quiz_win_10', name: 'Quiz Legend', desc: 'Win 10 quiz games.', xp: 200, reward: { type: 'eq_preset', value: 'night', label: 'EQ Preset: Night Mode' }, condition: (s) => (s.quizWon || 0) >= 10 },
    { id: 'streak_3', name: 'On Fire', desc: 'Maintain a 3-day quiz streak.', xp: 75, reward: null, condition: (s) => (s.quizStreak || 0) >= 3 },
    { id: 'streak_7', name: 'Unstoppable', desc: 'Maintain a 7-day quiz streak.', xp: 150, reward: { type: 'eq_preset', value: 'concert', label: 'EQ Preset: Concert' }, condition: (s) => (s.quizStreak || 0) >= 7 },
    { id: 'visit_all', name: 'Explorer', desc: 'Visit every page in the app.', xp: 50, reward: null, condition: (s) => (s.pagesVisited || 0) >= 10 },
    { id: 'home_10', name: 'Home Sweet Home', desc: 'Visit the Home page 10 times.', xp: 25, reward: null, condition: (s) => (s.homeOpens || 0) >= 10 },
    { id: 'use_eq', name: 'Sound Shaper', desc: 'Use the equalizer.', xp: 25, reward: null, condition: (s) => (s.eqUsed || 0) >= 1 },
    { id: 'eq_bass', name: 'Bass Head', desc: 'Use the Bass Boost preset.', xp: 50, reward: null, condition: (s) => (s.eqBassUsed || 0) >= 1 },
    { id: 'eq_vocal', name: 'Vocal Master', desc: 'Use the Vocal Boost preset.', xp: 50, reward: null, condition: (s) => (s.eqVocalUsed || 0) >= 1 },
    { id: 'radio_1', name: 'Radio Star', desc: 'Listen to your first radio station.', xp: 25, reward: null, condition: (s) => (s.radioListened || 0) >= 1 },
    { id: 'radio_5', name: 'World Tour', desc: 'Listen to 5 different radio stations.', xp: 50, reward: null, condition: (s) => (s.radioListened || 0) >= 5 },
    { id: 'radio_10', name: 'Global Listener', desc: 'Listen to 10 different radio stations.', xp: 100, reward: null, condition: (s) => (s.radioListened || 0) >= 10 },
    { id: 'share_1', name: 'Social Butterfly', desc: 'Share a song.', xp: 25, reward: null, condition: (s) => (s.shares || 0) >= 1 },
    { id: 'share_5', name: 'Sharer', desc: 'Share 5 songs.', xp: 50, reward: null, condition: (s) => (s.shares || 0) >= 5 },
    { id: 'share_10', name: 'Influencer', desc: 'Share 10 songs.', xp: 100, reward: null, condition: (s) => (s.shares || 0) >= 10 },
    { id: 'download_cover', name: 'Cover Art', desc: 'Download a cover art image.', xp: 25, reward: null, condition: (s) => (s.coversDownloaded || 0) >= 1 },
    { id: 'toggle_lyrics', name: 'Lyric Lover', desc: 'Toggle the lyrics panel.', xp: 25, reward: null, condition: (s) => (s.lyricsToggled || 0) >= 1 },
    { id: 'toggle_karaoke', name: 'Karaoke King', desc: 'Toggle karaoke mode.', xp: 50, reward: null, condition: (s) => (s.karaokeToggled || 0) >= 1 },
    { id: 'change_pfp', name: 'Profile Setup', desc: 'Change your profile picture.', xp: 25, reward: null, condition: (s) => (s.pfpChanged || 0) >= 1 },
    { id: 'change_username', name: 'Identity', desc: 'Change your username.', xp: 25, reward: null, condition: (s) => (s.usernameChanged || 0) >= 1 },
    { id: 'day_1', name: 'Day 1', desc: 'Use Audix for 1 day.', xp: 10, reward: null, condition: (s) => (s.uniqueDays || 0) >= 1 },
    { id: 'day_7', name: 'Week Warrior', desc: 'Use Audix for 7 days.', xp: 50, reward: { type: 'theme', value: 'glass', label: 'Theme: Glass' }, condition: (s) => (s.uniqueDays || 0) >= 7 },
    { id: 'day_30', name: 'Monthly Muse', desc: 'Use Audix for 30 days.', xp: 100, reward: { type: 'theme', value: 'gradient', label: 'Theme: Gradient' }, condition: (s) => (s.uniqueDays || 0) >= 30 },
    { id: 'day_100', name: 'Centurion', desc: 'Use Audix for 100 days.', xp: 500, reward: null, condition: (s) => (s.uniqueDays || 0) >= 100 },
    { id: 'id3_full', name: 'ID3 Master', desc: 'Upload a song with complete metadata.', xp: 25, reward: null, condition: (s) => (s.fullMetadata || 0) >= 1 },
    { id: 'night_owl', name: 'Night Owl', desc: 'Use Audix after midnight.', xp: 25, reward: null, condition: (s) => (s.nightOwl || 0) >= 1 },
    { id: 'early_bird', name: 'Early Bird', desc: 'Use Audix before 6 AM.', xp: 25, reward: null, condition: (s) => (s.earlyBird || 0) >= 1 },
    { id: 'admin_access', name: 'Admin Access', desc: 'Access the admin panel.', xp: 100, reward: { type: 'cosmetic', value: 'admin_crown', label: 'Admin Crown' }, condition: (s) => (s.adminAccess || 0) >= 1, adminOnly: true }
  ],

  init() {
    console.log('[Achievements] init()');
    this.load();
    this.checkAll();
    this.checkMilestoneRewards(); // Retroactive check for existing users
    this.render();
    this.renderRewards();
    console.log('[Achievements] init complete —', this.unlocked.size, 'unlocked');
  },

  // Track an event and check achievements
  track(event, value = 1) {
    console.log(`[Achievements] track("${event}", ${value})`);
    if (typeof value === 'number') {
      this.stats[event] = Math.max(this.stats[event] || 0, value);
    } else {
      this.stats[event] = (this.stats[event] || 0) + 1;
    }
    this.checkAll();
    this.save();
  },

  set(key, value) {
    console.log(`[Achievements] set("${key}", ${value})`);
    this.stats[key] = value;
    this.checkAll();
    this.save();
  },

  checkAll() {
    const isAdmin = (typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin());
    let newlyUnlocked = 0;
    for (const ach of this.list) {
      if (this.unlocked.has(ach.id)) continue;
      if (ach.adminOnly && !isAdmin) continue;
      if (ach.condition(this.stats)) {
        this.unlock(ach.id, false);
        newlyUnlocked++;
      }
    }
    if (newlyUnlocked > 0) {
      this.save();
      this.render();
      this.renderRewards();
      this.checkMilestoneRewards();
    }
  },

  unlock(id, save = true) {
    if (this.unlocked.has(id)) return;
    const ach = this.list.find(a => a.id === id);
    if (!ach) return;
    this.unlocked.add(id);
    console.log(`[Achievements] UNLOCKED: ${ach.name} (+${ach.xp} XP)`);
    if (typeof Utils !== 'undefined') {
      Utils.toast(`Achievement Unlocked: ${ach.name} (+${ach.xp} XP)`, 'success');
    }
    if (typeof Gamification !== 'undefined') {
      Gamification.addXP(ach.xp, 'achievement: ' + ach.name);
    }
    if (ach.reward) {
      this.grantReward(ach.reward);
    }
    if (save) this.save();
  },

  grantReward(reward) {
    console.log(`[Achievements] Granting reward: ${reward.label}`);
    if (typeof Utils !== 'undefined') {
      Utils.toast(`Reward Unlocked: ${reward.label}`, 'success');
    }
    // Unlock theme buttons
    if (reward.type === 'theme') {
      const btn = document.querySelector(`.theme-btn[data-theme="${reward.value}"]`);
      if (btn) {
        btn.classList.remove('reward-locked');
        btn.classList.add('unlocked');
        btn.title = 'Unlocked via Achievement';
      }
    }
    // Unlock EQ preset buttons
    if (reward.type === 'eq_preset') {
      const btn = document.querySelector(`.btn-preset[data-preset="${reward.value}"]`);
      if (btn) {
        btn.classList.remove('reward-locked');
        btn.classList.add('unlocked');
        btn.title = 'Unlocked via Achievement';
      }
    }
  },

  // Admin perk: unlock all
  unlockAll() {
    console.log('[Achievements] unlockAll() — Admin perk');
    for (const ach of this.list) {
      if (!this.unlocked.has(ach.id)) {
        this.unlocked.add(ach.id);
        if (ach.reward) this.grantReward(ach.reward);
      }
    }
    this.save();
    this.render();
    this.renderRewards();
  },

  getProgress(ach) {
    // Return current / target for progressable achievements
    const s = this.stats;
    const map = {
      'first_song': () => [s.songsUploaded || 0, 1],
      'upload_5': () => [s.songsUploaded || 0, 5],
      'upload_10': () => [s.songsUploaded || 0, 10],
      'upload_25': () => [s.songsUploaded || 0, 25],
      'upload_50': () => [s.songsUploaded || 0, 50],
      'upload_100': () => [s.songsUploaded || 0, 100],
      'first_play': () => [s.songsPlayed || 0, 1],
      'play_10': () => [s.songsPlayed || 0, 10],
      'play_50': () => [s.songsPlayed || 0, 50],
      'play_100': () => [s.songsPlayed || 0, 100],
      'play_500': () => [s.songsPlayed || 0, 500],
      'play_1000': () => [s.songsPlayed || 0, 1000],
      'listen_1m': () => [s.listenMinutes || 0, 1],
      'listen_10m': () => [s.listenMinutes || 0, 10],
      'listen_1h': () => [s.listenMinutes || 0, 60],
      'listen_5h': () => [s.listenMinutes || 0, 300],
      'listen_12h': () => [s.listenMinutes || 0, 720],
      'listen_24h': () => [s.listenMinutes || 0, 1440],
      'listen_100h': () => [s.listenMinutes || 0, 6000],
      'quiz_win': () => [s.quizWon || 0, 1],
      'quiz_win_5': () => [s.quizWon || 0, 5],
      'quiz_win_10': () => [s.quizWon || 0, 10],
      'streak_3': () => [s.quizStreak || 0, 3],
      'streak_7': () => [s.quizStreak || 0, 7],
      'visit_all': () => [s.pagesVisited || 0, 10],
      'home_10': () => [s.homeOpens || 0, 10],
      'radio_5': () => [s.radioListened || 0, 5],
      'radio_10': () => [s.radioListened || 0, 10],
      'share_5': () => [s.shares || 0, 5],
      'share_10': () => [s.shares || 0, 10],
      'day_7': () => [s.uniqueDays || 0, 7],
      'day_30': () => [s.uniqueDays || 0, 30],
      'day_100': () => [s.uniqueDays || 0, 100],
    };
    if (map[ach.id]) return map[ach.id]();
    return [this.unlocked.has(ach.id) ? 1 : 0, 1];
  },

  checkMilestoneRewards() {
    const unlockedCount = this.unlocked.size;
    if (unlockedCount === 0) return;
    const milestones = {
      5: { id: 'milestone_5', type: 'frame', name: 'Bronze Frame', rarity: 'common' },
      10: { id: 'milestone_10', type: 'background', name: 'Silver Background', rarity: 'common' },
      15: { id: 'milestone_15', type: 'avatarBorder', name: 'Gold Border', rarity: 'rare' },
      20: { id: 'milestone_20', type: 'nameEffect', name: 'Animated Glow', rarity: 'rare', animated: true },
      25: { id: 'milestone_25', type: 'animatedAvatar', name: 'Animated Avatar Frame', rarity: 'epic', animated: true },
      30: { id: 'milestone_30', type: 'theme', name: 'Rare Profile Theme', rarity: 'epic' },
      35: { id: 'milestone_35', type: 'frame', name: 'Visualizer Frame', rarity: 'epic', animated: true },
      40: { id: 'milestone_40', type: 'background', name: 'Premium Banner', rarity: 'legendary' },
      45: { id: 'milestone_45', type: 'badge', name: 'Exclusive Badge', rarity: 'legendary' },
      50: { id: 'milestone_50', type: 'theme', name: 'Nitro Premium Package', rarity: 'mythic' }
    };
    const userId = (typeof Auth !== 'undefined' && Auth.getUserId) ? Auth.getUserId() : 'guest';
    const granted = JSON.parse(localStorage.getItem('audix_milestones_' + userId) || '[]');
    let newRewards = 0;
    for (const [count, reward] of Object.entries(milestones)) {
      if (unlockedCount >= parseInt(count) && !granted.includes(count)) {
        granted.push(count);
        if (typeof Auth !== 'undefined' && Auth.addItemToInventory) {
          try {
            Auth.addItemToInventory(reward);
          } catch (e) {
            console.warn('[Achievements] Failed to add milestone item:', e);
          }
        }
        if (typeof Utils !== 'undefined') Utils.toast(`🏆 Milestone Reward: ${reward.name} unlocked!`, 'success');
        newRewards++;
      }
    }
    if (newRewards > 0) {
      localStorage.setItem('audix_milestones_' + userId, JSON.stringify(granted));
      console.log('[Achievements] Granted', newRewards, 'milestone rewards');
    }
  },

  render() {
    const grid = document.getElementById('achievements-grid');
    if (!grid) return;
    const filter = (grid.dataset.filter || 'all');
    let html = '';
    for (const ach of this.list) {
      const isUnlocked = this.unlocked.has(ach.id);
      if (filter === 'unlocked' && !isUnlocked) continue;
      if (filter === 'locked' && isUnlocked) continue;
      const [curr, target] = this.getProgress(ach);
      const pct = target > 0 ? Math.min(100, Math.round((curr / target) * 100)) : (isUnlocked ? 100 : 0);
      const nearCompletion = !isUnlocked && pct >= 75;
      if (filter === 'near' && !nearCompletion) continue;
      const statusClass = isUnlocked ? 'unlocked' : 'locked';
      const statusText = isUnlocked ? 'Unlocked' : 'Locked';
      const rewardHtml = ach.reward ? `<div class="ach-reward">${ach.reward.label}</div>` : '';
      html += `
        <div class="achievement-card ${statusClass}" data-id="${ach.id}" onclick="Achievements.showDetails('${ach.id}')">
          <div class="ach-icon">${isUnlocked ? '🏆' : '🔒'}</div>
          <div class="ach-info">
            <h4>${ach.name}</h4>
            <p>${ach.desc}</p>
            <div class="ach-meta">
              <span class="ach-xp">+${ach.xp} XP</span>
              <span class="ach-status ${statusClass}">${statusText}</span>
            </div>
            ${rewardHtml}
            <div class="ach-progress-bar"><div class="ach-progress-fill" style="width:${pct}%"></div></div>
            <div class="ach-progress-text">${curr} / ${target}</div>
          </div>
        </div>
      `;
    }
    grid.innerHTML = html || '<p class="empty-achievements">No achievements match this filter.</p>';
    this.updateStats();
    console.log('[Achievements] render() complete — filter:', filter);
  },

  renderRewards() {
    const list = document.getElementById('rewardsList');
    if (!list) return;
    let html = '';
    for (const ach of this.list) {
      if (ach.reward && this.unlocked.has(ach.id)) {
        html += `<span class="reward-badge">${ach.reward.label}</span>`;
      }
    }
    if (typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin()) {
      html += `<span class="reward-badge admin">All Admin Perks</span>`;
    }
    list.innerHTML = html || '<span class="no-rewards">No rewards yet — keep listening!</span>';
  },

  updateStats() {
    const unlockedEl = document.getElementById('achieve-unlocked');
    const totalXpEl = document.getElementById('total-xp');
    if (unlockedEl) unlockedEl.textContent = this.unlocked.size;
    let totalXp = 0;
    for (const id of this.unlocked) {
      const ach = this.list.find(a => a.id === id);
      if (ach) totalXp += ach.xp;
    }
    if (totalXpEl) totalXpEl.textContent = totalXp;
  },

  showDetails(id) {
    const ach = this.list.find(a => a.id === id);
    if (!ach) return;
    const isUnlocked = this.unlocked.has(id);
    const [curr, target] = this.getProgress(ach);
    const pct = target > 0 ? Math.min(100, Math.round((curr / target) * 100)) : 100;
    const date = isUnlocked ? new Date().toLocaleDateString() : '—';
    const rewardHtml = ach.reward
      ? `<div class="detail-reward"><strong>Reward:</strong> ${ach.reward.label}</div>`
      : '<div class="detail-reward"><strong>Reward:</strong> None</div>';

    const modal = document.getElementById('achievementDetailModal');
    const content = document.getElementById('achievementDetailContent');
    if (!modal || !content) {
      // Fallback alert if modal not in DOM
      alert(`${ach.name}\\n${ach.desc}\\nXP: ${ach.xp}\\nStatus: ${isUnlocked ? 'Unlocked' : 'Locked'}\\nProgress: ${curr}/${target}`);
      return;
    }

    content.innerHTML = `
      <div class="detail-header">
        <div class="detail-icon">${isUnlocked ? '🏆' : '🔒'}</div>
        <h2>${ach.name}</h2>
        <span class="detail-status ${isUnlocked ? 'unlocked' : 'locked'}">${isUnlocked ? 'Unlocked' : 'Locked'}</span>
      </div>
      <p class="detail-desc">${ach.desc}</p>
      <div class="detail-stats">
        <div><strong>XP Reward:</strong> ${ach.xp}</div>
        ${rewardHtml}
        <div><strong>Date Achieved:</strong> ${date}</div>
        <div><strong>Progress:</strong> ${curr} / ${target} (${pct}%)</div>
      </div>
      <div class="detail-progress-bar"><div class="detail-progress-fill" style="width:${pct}%"></div></div>
    `;
    modal.classList.remove('hidden');
  },

  closeDetails() {
    const modal = document.getElementById('achievementDetailModal');
    if (modal) modal.classList.add('hidden');
  },

  setFilter(filter) {
    const grid = document.getElementById('achievements-grid');
    if (grid) {
      grid.dataset.filter = filter;
      this.render();
    }
  },

  async save() {
    try {
    const userId = (typeof Auth !== 'undefined' && Auth.getUserId) ? Auth.getUserId() : 'guest';
    const data = {
      unlocked: Array.from(this.unlocked),
      stats: this.stats,
      progress: this.progress
    };
    localStorage.setItem('audix_achievements_' + userId, JSON.stringify(data));
    // Also save to Firestore if logged in
    if (typeof Auth !== 'undefined' && Auth.currentUser && Auth.db) {
      try {
        await Auth.db.collection('users').doc(Auth.currentUser.uid).update({
          achievements: data.unlocked,
          achievementStats: data.stats
        });
      } catch (e) {
        console.warn('[Achievements] Firestore save failed:', e);
      }
    }
    console.log('[Achievements] saved —', this.unlocked.size, 'unlocked');
    } catch (e) {
      console.error('[Achievements] save failed:', e);
    }
  },

  async load() {
    const userId = (typeof Auth !== 'undefined' && Auth.getUserId) ? Auth.getUserId() : 'guest';
    const raw = localStorage.getItem('audix_achievements_' + userId);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        this.unlocked = new Set(data.unlocked || []);
        this.stats = data.stats || {};
        this.progress = data.progress || {};
      } catch (e) {
        console.error('[Achievements] load error:', e);
      }
    }
    // Load from Firestore if logged in
    if (typeof Auth !== 'undefined' && Auth.currentUser && Auth.db) {
      try {
        const doc = await Auth.db.collection('users').doc(Auth.currentUser.uid).get();
        if (doc.exists) {
          const d = doc.data();
          if (d.achievements) this.unlocked = new Set(d.achievements);
          if (d.achievementStats) this.stats = { ...this.stats, ...d.achievementStats };
        }
      } catch (e) {
        console.warn('[Achievements] Firestore load failed:', e);
      }
    }
    console.log('[Achievements] loaded —', this.unlocked.size, 'unlocked');
  },

  async loadUserAchievements() {
    console.log('[Achievements] loadUserAchievements()');
    await this.load();
    this.checkAll();
    this.render();
    this.renderRewards();
  }
};

// Global filter handler
document.addEventListener('click', (e) => {
  if (e.target.matches('.ach-filter-btn')) {
    document.querySelectorAll('.ach-filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    Achievements.setFilter(e.target.dataset.filter);
  }
  if (e.target.matches('.ach-close-detail') || e.target.matches('#achievementDetailModal')) {
    Achievements.closeDetails();
  }
});
