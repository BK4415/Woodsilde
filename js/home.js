/* Wood Puzzle — Home page logic. */
(function () {
  'use strict';

  const STYLES = ['Number', 'Photo'];
  const MODES = ['Classic', 'Snake', 'Spiral', 'Upside Down'];
  const PHOTOS = ['photo1', 'photo2', 'photo3', 'photo4', 'photo5', 'custom'];
  const SIZES = [3, 4, 5, 6, 7];

  const state = Object.assign(
    { style: 'Number', photo: 'photo1', size: 4, mode: 'Classic' },
    window.WPStore.getLastConfig()
  );

  /* ---------- DOM refs ---------- */
  const $ = (id) => document.getElementById(id);
  const previewBoard = $('preview-board');
  const styleVal = $('style-val');
  const photoVal = $('photo-val');
  const sizeVal = $('size-val');
  const modeVal = $('mode-val');
  const photoPicker = $('photo-picker');
  const modeRow = $('mode-row');

  let previewEngine = null;

  /* ---------- Helpers ---------- */
  function cycle(arr, current, dir) {
    const i = arr.indexOf(current);
    const n = (i + dir + arr.length) % arr.length;
    return arr[n];
  }

  function getPhotoSrc(name) {
    if (name === 'custom') {
      return window.WPStore.getCustomPhoto();
    }
    return 'assets/images/' + name + '.jpg';
  }

  function updateLabels() {
    styleVal.textContent = state.style;
    photoVal.textContent = state.photo === 'custom' ? 'Custom' : state.photo;
    sizeVal.textContent = state.size + '×' + state.size;
    modeVal.textContent = state.mode;

    photoPicker.hidden = state.style !== 'Photo';

    if (state.style === 'Photo') {
      modeRow.hidden = true;
      state.mode = 'Classic';
    } else {
      modeRow.hidden = false;
    }
  }

  function rebuildPreview() {
    if (previewEngine) previewEngine.destroy();
    previewEngine = new window.WPEngine(previewBoard, {
      size: state.size,
      mode: state.mode,
      style: state.style,
      photoSrc: state.style === 'Photo' ? getPhotoSrc(state.photo) : null,
      interactive: false,
      showNumbers: true
    });
  }

  function persist() {
    window.WPStore.setLastConfig(state);
  }

  /* ---------- Selector handlers ---------- */
  $('style-prev').addEventListener('click', () => {
    state.style = cycle(STYLES, state.style, -1);
    updateLabels(); rebuildPreview(); persist();
  });
  $('style-next').addEventListener('click', () => {
    state.style = cycle(STYLES, state.style, +1);
    updateLabels(); rebuildPreview(); persist();
  });

  $('photo-prev').addEventListener('click', () => {
    const list = window.WPStore.getCustomPhoto() ? PHOTOS : PHOTOS.filter((p) => p !== 'custom');
    state.photo = cycle(list, list.includes(state.photo) ? state.photo : list[0], -1);
    updateLabels(); rebuildPreview(); persist();
  });
  $('photo-next').addEventListener('click', () => {
    const list = window.WPStore.getCustomPhoto() ? PHOTOS : PHOTOS.filter((p) => p !== 'custom');
    state.photo = cycle(list, list.includes(state.photo) ? state.photo : list[0], +1);
    updateLabels(); rebuildPreview(); persist();
  });

  $('size-prev').addEventListener('click', () => {
    state.size = cycle(SIZES, state.size, -1);
    updateLabels(); rebuildPreview(); persist();
  });
  $('size-next').addEventListener('click', () => {
    state.size = cycle(SIZES, state.size, +1);
    updateLabels(); rebuildPreview(); persist();
  });

  $('mode-prev').addEventListener('click', () => {
    state.mode = cycle(MODES, state.mode, -1);
    updateLabels(); rebuildPreview(); persist();
  });
  $('mode-next').addEventListener('click', () => {
    state.mode = cycle(MODES, state.mode, +1);
    updateLabels(); rebuildPreview(); persist();
  });

  /* ---------- Photo upload (center-crop, downscale) ---------- */
  $('upload-btn').addEventListener('click', () => $('upload-input').click());
  $('upload-input').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // Center-crop to a square, downscale to 900x900 for storage efficiency
        const TARGET = 900;
        const minSide = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - minSide) / 2;
        const sy = (img.naturalHeight - minSide) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = TARGET; canvas.height = TARGET;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, TARGET, TARGET);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        window.WPStore.setCustomPhoto(dataUrl);
        state.photo = 'custom';
        state.style = 'Photo';
        updateLabels(); rebuildPreview(); persist();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(f);
  });

  /* ---------- Play / Resume ---------- */
  $('play-btn').addEventListener('click', () => {
    // Clear any prior resume — starting fresh
    window.WPStore.clearResume();
    persist();
    const qs = new URLSearchParams({
      style: state.style,
      photo: state.photo,
      size: state.size,
      mode: state.mode,
      fresh: '1'
    });
    location.href = 'game.html?' + qs.toString();
  });

  const resumeData = window.WPStore.getResume();
  const resumeWrap = $('resume-wrap');
  const resumeMeta = $('resume-meta');
  if (resumeData && resumeData.layout) {
    resumeWrap.hidden = false;
    const t = resumeData;
    const time = formatTime(t.timeSec || 0);
    const label = (t.layout.style === 'Photo' ? 'Photo' : t.layout.mode) +
      ' • ' + t.layout.size + '×' + t.layout.size +
      ' • ' + time + ' • ' + (t.layout.moveCount || 0) + ' moves';
    resumeMeta.textContent = label;
    $('resume-btn').addEventListener('click', () => {
      location.href = 'game.html?resume=1';
    });
  }

  function formatTime(s) {
    const m = (s / 60) | 0;
    const ss = (s % 60) | 0;
    return String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
  }

  /* ---------- Panels (Info + Dashboard) ---------- */
  const infoPanel = $('info-panel');
  const dashPanel = $('dashboard-panel');
  const scrim = $('scrim');

  function openPanel(panel) {
    closePanels();
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    scrim.classList.add('open');
  }
  function closePanels() {
    infoPanel.classList.remove('open');
    dashPanel.classList.remove('open');
    infoPanel.setAttribute('aria-hidden', 'true');
    dashPanel.setAttribute('aria-hidden', 'true');
    scrim.classList.remove('open');
  }

  $('open-info').addEventListener('click', () => openPanel(infoPanel));
  $('close-info').addEventListener('click', closePanels);
  $('open-dashboard').addEventListener('click', () => {
    populateDashboard();
    openPanel(dashPanel);
  });
  $('close-dashboard').addEventListener('click', closePanels);
  scrim.addEventListener('click', closePanels);

  /* Edge swipe for panels */
  let swipeStart = null;
  document.addEventListener('pointerdown', (e) => {
    // Only react to touch-style swipes, ignore clicks on tiles/buttons
    if (e.target.closest('button, a, input, .board')) return;
    const w = window.innerWidth;
    const fromLeft = e.clientX < 24;
    const fromRight = e.clientX > w - 24;
    if (!fromLeft && !fromRight) return;
    swipeStart = { x: e.clientX, y: e.clientY, fromLeft, fromRight };
  }, { passive: true });
  document.addEventListener('pointerup', (e) => {
    if (!swipeStart) return;
    const dx = e.clientX - swipeStart.x;
    if (swipeStart.fromLeft && dx > 40) openPanel(infoPanel);
    else if (swipeStart.fromRight && -dx > 40) { populateDashboard(); openPanel(dashPanel); }
    swipeStart = null;
  }, { passive: true });

  /* ---------- Settings toggles ---------- */
  const settings = window.WPStore.getSettings();
  const tSound = $('toggle-sound');
  const tVib = $('toggle-vibration');
  tSound.checked = !!settings.sound;
  tVib.checked = !!settings.vibration;
  tSound.addEventListener('change', () => {
    settings.sound = tSound.checked; window.WPStore.setSettings(settings);
  });
  tVib.addEventListener('change', () => {
    settings.vibration = tVib.checked; window.WPStore.setSettings(settings);
  });

  /* ---------- Dashboard population ---------- */
  function populateDashboard() {
    const body = $('dashboard-body');
    const stats = window.WPStore.getStats();
    const ach = window.WPStore.getAchievements();
    const bestTimes = JSON.parse(localStorage.getItem('wp:bestTimes') || '{}');
    const bestMoves = JSON.parse(localStorage.getItem('wp:bestMoves') || '{}');

    const bestTimeVals = Object.values(bestTimes);
    const bestMovesVals = Object.values(bestMoves);
    const bestTime = bestTimeVals.length ? Math.min.apply(null, bestTimeVals) : null;
    const bestMov = bestMovesVals.length ? Math.min.apply(null, bestMovesVals) : null;

    const favMode = pickTop(stats.modeCounts);
    const favSize = pickTop(stats.sizeCounts);
    const completion = stats.gamesPlayed
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0;

    body.innerHTML =
      '<div class=\"stat-grid\">' +
        statCard('Best Time', bestTime != null ? formatTime(bestTime) : '—') +
        statCard('Best Moves', bestMov != null ? bestMov : '—') +
        statCard('Games', stats.gamesPlayed || 0) +
        statCard('Wins', stats.gamesWon || 0) +
        statCard('Completion', completion + '%') +
        statCard('Streak', stats.currentStreak || 0) +
        statCard('Longest Streak', stats.longestStreak || 0) +
        statCard('Favourite Mode', favMode || '—') +
        statCard('Favourite Board', favSize ? favSize + '×' + favSize : '—') +
      '</div>' +
      '<div class=\"panel-section\">Achievements</div>' +
      '<div class=\"ach-list\" id=\"ach-list\"></div>';

    fetch('json/achievements.json').then((r) => r.json()).then((j) => {
      const list = document.getElementById('ach-list');
      if (!list) return;
      list.innerHTML = j.achievements.map((a) => achRow(a, !!ach[a.id])).join('');
      window.WPIcons.replaceAll(list);
    }).catch(() => {});
    window.WPIcons.replaceAll(body);
  }
  function statCard(cap, val) {
    return '<div class=\"stat-card\"><div class=\"cap\">' + cap + '</div><div class=\"val\">' + val + '</div></div>';
  }
  function achRow(a, unlocked) {
    return '<div class=\"ach-row' + (unlocked ? ' unlocked' : '') + '\">' +
      '<div class=\"ach-icon\"><span class=\"svg-slot\" data-icon=\"trophy\"></span></div>' +
      '<div><div class=\"ach-name\">' + a.name + '</div>' +
      '<div class=\"ach-desc\">' + a.desc + '</div></div></div>';
  }
  function pickTop(obj) {
    if (!obj) return null;
    let best = null, max = -1;
    Object.keys(obj).forEach((k) => {
      if (obj[k] > max) { max = obj[k]; best = k; }
    });
    return best;
  }

  /* ---------- Boot ---------- */
  function boot() {
    updateLabels();
    rebuildPreview();
    // Always-hide loading screen — never get stuck
    const loader = $('loading-screen');
    if (loader) {
      // small delay so users see the brand briefly
      setTimeout(() => loader.classList.add('hidden'), 250);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Safety: force-hide loading after 1.2s no matter what
  setTimeout(() => {
    const loader = document.getElementById('loading-screen');
    if (loader) loader.classList.add('hidden');
  }, 1200);

  // Prevent context menu, drag, copy across the app (image security)
  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.tile, .brand-logo, .loading-logo, img')) e.preventDefault();
  });
  document.addEventListener('dragstart', (e) => e.preventDefault());

  // Rebuild preview on resize (debounced)
  let resizeT = null;
  window.addEventListener('resize', () => {
    if (resizeT) clearTimeout(resizeT);
    resizeT = setTimeout(rebuildPreview, 120);
  });
})();
