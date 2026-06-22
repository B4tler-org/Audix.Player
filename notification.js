/**
 * AUDIX — Music Notification Component  (notification.js)
 *
 * Drop-in companion for index.html.
 * - Add  <link rel="stylesheet" href="notification.css">  in <head>
 * - Add  <script src="notification.js" defer></script>    before </body>
 *
 * This file ONLY manages #music-notification.
 * It does NOT touch any other DOM element or existing Audix function.
 *
 * Public surface used by index.html hooks:
 *   MusicNotification.show(track, artDataUrl, isPlaying)
 *   MusicNotification.updatePlayState(isPlaying)
 *   MusicNotification.hide()
 */

(function (global) {
  'use strict';

  /* ── Constants ──────────────────────────────────────────── */
  const AUTO_DISMISS_MS = 5000;   // hide after 5 s of no interaction
  const PERSIST_ON_HOVER = true;  // pause auto-dismiss while hovered

  /* ── State ──────────────────────────────────────────────── */
  let _dismissTimer = null;
  let _hovered      = false;
  let _currentId    = null;       // track id of what's shown
  let _mounted      = false;

  /* ── Build DOM once ─────────────────────────────────────── */
  function _mount() {
    if (_mounted) return;
    _mounted = true;

    const el = document.createElement('div');
    el.id = 'music-notification';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-label', 'Now Playing');

    el.innerHTML = `
      <div class="mn-card">
        <button class="mn-dismiss" id="mn-dismiss-btn" aria-label="Dismiss">&#x2715;</button>
        <div class="mn-body">
          <div class="mn-art-wrap">
            <div class="mn-art" id="mn-art">🎵</div>
            <div class="mn-art-ring mn-playing" id="mn-ring"></div>
          </div>
          <div class="mn-info">
            <div class="mn-label">
              <span class="mn-label-text">Now Playing</span>
              <div class="mn-eq" id="mn-eq" aria-hidden="true">
                <div class="mn-eq-bar"></div>
                <div class="mn-eq-bar"></div>
                <div class="mn-eq-bar"></div>
                <div class="mn-eq-bar"></div>
                <div class="mn-eq-bar"></div>
              </div>
            </div>
            <div class="mn-title" id="mn-title">—</div>
            <div class="mn-artist" id="mn-artist">—</div>
          </div>
        </div>
        <div class="mn-progress">
          <div class="mn-progress-fill" id="mn-progress-fill"></div>
        </div>
      </div>`;

    document.body.appendChild(el);

    /* Dismiss button */
    el.querySelector('#mn-dismiss-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      MusicNotification.hide();
    });

    /* Hover — pause auto-dismiss */
    if (PERSIST_ON_HOVER) {
      el.addEventListener('mouseenter', function () {
        _hovered = true;
        _clearDismiss();
      });
      el.addEventListener('mouseleave', function () {
        _hovered = false;
        _scheduleDismiss();
      });
    }
  }

  /* ── Helpers ────────────────────────────────────────────── */
  function _el(id) {
    return document.getElementById(id);
  }

  function _clearDismiss() {
    if (_dismissTimer) { clearTimeout(_dismissTimer); _dismissTimer = null; }
    const fill = _el('mn-progress-fill');
    if (fill) {
      fill.classList.remove('mn-countdown');
      /* force reflow so re-adding the class restarts the animation */
      void fill.offsetWidth;
    }
  }

  function _scheduleDismiss() {
    _clearDismiss();
    if (_hovered) return;

    const fill = _el('mn-progress-fill');
    if (fill) {
      fill.style.setProperty('--mn-duration', AUTO_DISMISS_MS + 'ms');
      fill.classList.add('mn-countdown');
    }

    _dismissTimer = setTimeout(function () {
      MusicNotification.hide();
    }, AUTO_DISMISS_MS);
  }

  function _setArt(artDataUrl, emoji) {
    const artEl = _el('mn-art');
    if (!artEl) return;
    if (artDataUrl) {
      artEl.innerHTML = `<img src="${artDataUrl}" alt="Album art">`;
    } else {
      artEl.innerHTML = emoji || '🎵';
    }
  }

  function _setPlayState(isPlaying) {
    const notif = _el('music-notification');
    if (!notif) return;
    notif.classList.toggle('mn-playing', !!isPlaying);
    notif.classList.toggle('mn-paused', !isPlaying);

    const ring = _el('mn-ring');
    if (ring) ring.classList.toggle('mn-playing', !!isPlaying);
  }

  /* ── Public API ─────────────────────────────────────────── */
  const MusicNotification = {

    /**
     * show(track, artDataUrl, isPlaying)
     * Call this whenever a new track starts (or art loads for the current one).
     *
     * @param {object}  track       — track object from Audix state
     * @param {string}  artDataUrl  — base64 data-url or null
     * @param {boolean} isPlaying   — current playback state
     */
    show: function (track, artDataUrl, isPlaying) {
      _mount();

      const notif   = _el('music-notification');
      const titleEl = _el('mn-title');
      const artistEl = _el('mn-artist');
      if (!notif || !titleEl || !artistEl) return;

      /* Update text */
      titleEl.textContent  = (track && track.name)   || 'Unknown Track';
      artistEl.textContent = (track && track.artist) || 'Unknown Artist';

      /* Update art */
      _setArt(artDataUrl, track && track.emoji);

      /* Update play state */
      _setPlayState(isPlaying !== false);

      /* Track identity: only re-animate entry if it's a different track */
      const newId = track && track.id;
      const isNewTrack = (newId !== _currentId);
      _currentId = newId;

      if (isNewTrack || !notif.classList.contains('mn-visible')) {
        /* Briefly add hiding class to re-trigger entry animation on same track */
        notif.classList.remove('mn-visible');
        notif.classList.remove('mn-hiding');
        void notif.offsetWidth; /* force reflow */
        notif.classList.add('mn-visible');
      }

      /* (Re-)schedule auto-dismiss */
      _scheduleDismiss();
    },

    /**
     * updatePlayState(isPlaying)
     * Call this on play/pause without changing the track.
     */
    updatePlayState: function (isPlaying) {
      _setPlayState(isPlaying);
    },

    /**
     * hide()
     * Animate the notification out.
     */
    hide: function () {
      _clearDismiss();
      const notif = _el('music-notification');
      if (!notif) return;
      notif.classList.remove('mn-visible');
      notif.classList.add('mn-hiding');

      /* Clean up class after transition ends */
      notif.addEventListener('transitionend', function cleanup() {
        notif.removeEventListener('transitionend', cleanup);
        notif.classList.remove('mn-hiding');
      });
    },

    /**
     * updateArt(artDataUrl)
     * Call this when album art finishes loading for the current track.
     */
    updateArt: function (artDataUrl) {
      _setArt(artDataUrl, null);
    }
  };

  global.MusicNotification = MusicNotification;

  /* ────────────────────────────────────────────────────────────
     Auto-integration with existing Audix functions.

     We monkey-patch the two Audix functions that update playback
     state, so notification.js works without ANY changes to index.html.
     Both patches are defensive: they always call the original first.
  ──────────────────────────────────────────────────────────── */
  window.addEventListener('DOMContentLoaded', function () {

    /* Wait one tick to ensure Audix's own DOMContentLoaded has run */
    setTimeout(function () {

      /* ── Patch: playTrack ────────────────────────────────── */
      const _origPlayTrack = window.playTrack;
      if (typeof _origPlayTrack === 'function') {
        window.playTrack = function (idx) {
          _origPlayTrack.apply(this, arguments);

          /* Give Audix time to update state & art cache */
          setTimeout(function () {
            try {
              const track = window.state && window.state.tracks
                ? window.state.tracks[typeof idx === 'number' ? idx : window.state.currentIdx]
                : null;
              if (!track) return;

              const artCache = window._artCache;
              const artDataUrl = artCache
                ? (artCache.get(String(track.id)) || artCache.get(track.id) || null)
                : null;

              const isPlaying = window.state ? window.state.isPlaying !== false : true;
              MusicNotification.show(track, artDataUrl, isPlaying);
            } catch (e) {
              /* never break playback */
              console.warn('[MusicNotification] show error:', e);
            }
          }, 80);
        };
      }

      /* ── Patch: togglePlay ───────────────────────────────── */
      const _origTogglePlay = window.togglePlay;
      if (typeof _origTogglePlay === 'function') {
        window.togglePlay = function () {
          _origTogglePlay.apply(this, arguments);

          setTimeout(function () {
            try {
              const isPlaying = window.state ? window.state.isPlaying : true;
              MusicNotification.updatePlayState(isPlaying);
            } catch (e) {
              console.warn('[MusicNotification] updatePlayState error:', e);
            }
          }, 20);
        };
      }

      /* ── Patch: setPlayerArt ─────────────────────────────── */
      /* setPlayerArt is called when album art finishes loading;
         we use it to update the notification art too. */
      const _origSetPlayerArt = window.setPlayerArt;
      if (typeof _origSetPlayerArt === 'function') {
        window.setPlayerArt = function (dataUrl) {
          _origSetPlayerArt.apply(this, arguments);

          try {
            const notif = document.getElementById('music-notification');
            if (notif && notif.classList.contains('mn-visible')) {
              MusicNotification.updateArt(dataUrl);
            }
          } catch (e) { /* silent */ }
        };
      }

    }, 0);
  });

}(window));
