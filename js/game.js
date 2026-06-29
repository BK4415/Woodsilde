
Action: file_editor create /app/public_game/js/game.js --file-text "/* Wood Puzzle — Game page logic. */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);

  /* ---------- Resolve config ---------- */
  let cfg;
  let restoreLayout = null;
  let restoreTime = 0;

  const resume = window.WPStore.getResume();
  if (params.get('resume') === '1' && resume) {
    cfg = {
      size: resume.layout.size,
      mode: resume.layout.mode,
      style: resume.layout.style,
      photoSrc: resume.layout.photoSrc
    };
    restoreLayout = resume.layout;
    restoreTime = resume.timeSec || 0;
  } else {
    const styleParam = params.get('style') || 'Number';
    const photoParam = params.get('photo') || 'photo1';
    const sizeParam = parseInt(params.get('size') || '4', 10);
    const modeParam = params.get('mode') || 'Classic';
    const photoSrc = styleParam === 'Photo'
      ? (photoParam === 'custom' ? window.WPStore.getCustomPhoto() : 'assets/images/' + photoParam + '.jpg')
      : null;
    cfg = { size: sizeParam, mode: modeParam, style: styleParam, photoSrc };
  }

  /* ---------- State ---------- */
  let moves = 0;
  let timeSec = restoreTime;
  let timerActive = false;
  let timerId = null;
  let firstMoveDone = restoreLayout && restoreLayout.moveCount > 0;
  let showNumbers = true;
  let paused = false;
  let initialShuffleAllowed = !restoreLayout;
  let ratingsCache = null;

  /* ---------- Engine ---------- */
  const board = $('game-board');
  const engine = new window.WPEngine(board, {
    size: cfg.size,
    mode: cfg.mode,
    style: cfg.style,
    photoSrc: cfg.photoSrc,
    interactive: true,
    showNumbers: true,
    onChange: handleEngineChange,
    onSolved: handleWin
  });

  // Shuffle on first load (only when not resuming)
  if (restoreLayout) {
    engine.restore(restoreLayout);
    moves = restoreLayout.moveCount || 0;
    if (firstMoveDone) startTimer();
  } else {
    engine.shuffle();
  }

  /* ---------- HUD ---------- */
  $('moves-val').textContent = moves;
  $('timer-val').textContent = formatTime(timeSec);
  $('board-val').textContent = cfg.size + '×' + cfg.size;
  $('game-title').textContent = (cfg.style === 'Photo' ? 'Photo' : cfg.mode);

  // Photo: show number toggle
  if (cfg.style === 'Photo') {
    const t = $('number-toggle');
    t.hidden = false;
    t.addEventListener('click', () => {
      showNumbers = !showNumbers;
      engine.setOptions({ showNumbers });
      $('numbers-state').textContent = showNumbers ? 'ON' : 'OFF';
    });
  }

  /* ---------- Buttons under board ---------- */
  $('shuffle-btn').addEventListener('click', () => {
    if (initialShuffleAllowed) {
      engine.shuffle();
      moves = 0;
      $('moves-val').textContent = 0;
      saveResume();
      return;
    }
    showPopup($('shuffle-popup'));
  });
  $('confirm-shuffle').addEventListener('click', () => {
    hidePopup($('shuffle-popup'));
    stopTimer();
    timeSec = 0;
    $('timer-val').textContent = formatTime(0);
    firstMoveDone = false;
    initialShuffleAllowed = true;
    engine.shuffle();
    moves = 0;
    $('moves-val').textContent = 0;
    saveResume();
  });
  $('cancel-shuffle').addEventListener('click', () => hidePopup($('shuffle-popup')));

  $('hint-btn').addEventListener('click', () => engine.showHint());

  $('undo-btn').addEventListener('click', () => {
    if (engine.undo()) {
      moves = Math.max(0, moves - 1);
      $('moves-val').textContent = moves;
      saveResume();
    }
  });
  $('redo-btn').addEventListener('click', () => {
    if (engine.redo()) {
      moves += 1;
      $('moves-val').textContent = moves;
      saveResume();
    }
  });

  /* ---------- Pause ---------- */
  $('pause-btn').addEventListener('click', pauseGame);
  $('resume-game').addEventListener('click', resumeGame);
  $('quit-game').addEventListener('click', () => { location.href = 'index.html'; });
  $('back-home').addEventListener('click', () => { saveResume(); location.href = 'index.html'; });

  function pauseGame() {
    paused = true;
    stopTimer();
    showPopup($('pause-popup'));
  }
  function resumeGame() {
    paused = false;
    hidePopup($('pause-popup'));
    if (firstMoveDone) startTimer();
  }

  /* ---------- Engine callbacks ---------- */
  function handleEngineChange(ev) {
    if (ev.type === 'move' || ev.type === 'redo' || ev.type === 'undo') {
      moves = ev.type === 'move' ? engine.moveCount : moves;
      if (ev.type === 'move') moves = engine.moveCount;
      $('moves-val').textContent = moves;
      if (!firstMoveDone && ev.type === 'move') {
        firstMoveDone = true;
        initialShuffleAllowed = false;
        startTimer();
        vibrate(8);
      } else if (ev.type === 'move') {
        vibrate(4);
      }
      saveResume();
    } else if (ev.type === 'shuffle') {
      // do nothing extra
    }
  }

  function handleWin() {
    stopTimer();
    saveStats();
    window.WPStore.clearResume();
    fetch('json/ratings.json').then((r) => r.json()).then((j) => {
      ratingsCache = j.ratings;
      showWinPopup();
    }).catch(() => {
      ratingsCache = {};
      showWinPopup();
    });
  }

  function showWinPopup() {
    const stars = computeStars();
    const board = cfg.size + '×' + cfg.size;
    const modeLabel = cfg.style === 'Photo' ? 'Photo' : cfg.mode;

    // Best record check
    const bestTimeImproved = window.WPStore.setBest('time', cfg.size, modeLabel, timeSec);
    const bestMovesImproved = window.WPStore.setBest('moves', cfg.size, modeLabel, moves);
    const newRecord = bestTimeImproved || bestMovesImproved;
    $('win-new-record').hidden = !newRecord;

    $('win-board').textContent = board;
    $('win-mode').textContent = modeLabel;
    $('win-moves').textContent = moves;
    $('win-time').textContent = formatTime(timeSec);

    const starsEl = $('win-stars');
    starsEl.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const span = document.createElement('span');
      span.className = 'svg-slot' + (i < stars ? ' lit' : '');
      span.setAttribute('data-icon', 'star');
      span.style.animationDelay = (i * 120) + 'ms';
      starsEl.appendChild(span);
    }
    window.WPIcons.replaceAll(starsEl);

    showPopup($('win-popup'));
    vibrate([20, 40, 20]);
  }

  function computeStars() {
    if (!ratingsCache) return 1;
    const r = ratingsCache[String(cfg.size)];
    if (!r) return 1;
    const mScore = moves <= r.moves.three ? 3 : moves <= r.moves.two ? 2 : 1;
    const tScore = timeSec <= r.time.three ? 3 : timeSec <= r.time.two ? 2 : 1;
    return Math.min(mScore, tScore);
  }

  function saveStats() {
    const stats = window.WPStore.getStats();
    stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
    stats.gamesWon = (stats.gamesWon || 0) + 1;
    stats.currentStreak = (stats.currentStreak || 0) + 1;
    stats.longestStreak = Math.max(stats.longestStreak || 0, stats.currentStreak);
    const modeLabel = cfg.style === 'Photo' ? 'Photo' : cfg.mode;
    stats.modeCounts = stats.modeCounts || {};
    stats.modeCounts[modeLabel] = (stats.modeCounts[modeLabel] || 0) + 1;
    stats.sizeCounts = stats.sizeCounts || {};
    stats.sizeCounts[cfg.size] = (stats.sizeCounts[cfg.size] || 0) + 1;
    window.WPStore.setStats(stats);

    // Unlock achievements
    window.WPStore.unlockAchievement('first_win');
    window.WPStore.unlockAchievement('solve_' + cfg.size + 'x' + cfg.size);
    if (computeStars() === 3) window.WPStore.unlockAchievement('three_stars');
    if (cfg.mode === 'Snake') window.WPStore.unlockAchievement('snake_solver');
    if (cfg.mode === 'Spiral') window.WPStore.unlockAchievement('spiral_solver');
    if (cfg.mode === 'Upside Down') window.WPStore.unlockAchievement('upside_solver');
    if (cfg.style === 'Photo') window.WPStore.unlockAchievement('photo_solver');
    if (stats.currentStreak >= 3) window.WPStore.unlockAchievement('streak_3');
    if (stats.currentStreak >= 10) window.WPStore.unlockAchievement('streak_10');
  }

  /* ---------- Win popup actions ---------- */
  $('play-again').addEventListener('click', () => {
    hidePopup($('win-popup'));
    timeSec = 0; moves = 0; firstMoveDone = false; initialShuffleAllowed = true;
    $('timer-val').textContent = formatTime(0);
    $('moves-val').textContent = 0;
    engine.locked = false;
    engine.solved = false;
    engine.shuffle();
  });
  $('go-home').addEventListener('click', () => { location.href = 'index.html'; });
  $('share-btn').addEventListener('click', shareGame);

  /* ---------- Share — generate composite image ---------- */
  function shareGame() {
    const canvas = $('share-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 900; canvas.height = 1200;
    // Background — warm wood gradient
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#3d2817'); g.addColorStop(1, '#1a1208');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#e6b35a';
    ctx.font = 'bold 64px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('WOOD PUZZLE', canvas.width / 2, 100);
    ctx.fillStyle = '#f5e6c8';
    ctx.font = '32px Georgia, serif';
    ctx.fillText('Congratulations!', canvas.width / 2, 160);

    // Draw the solved board (re-render snapshot via current engine state)
    const boardSize = 700;
    const bx = (canvas.width - boardSize) / 2;
    const by = 200;
    drawSolvedBoardOnCanvas(ctx, bx, by, boardSize);

    // Stats block
    const stars = computeStars();
    ctx.fillStyle = '#e6b35a';
    ctx.font = 'bold 40px Georgia, serif';
    ctx.fillText('★'.repeat(stars) + '☆'.repeat(3 - stars), canvas.width / 2, by + boardSize + 80);

    ctx.fillStyle = '#f5e6c8';
    ctx.font = '28px Georgia, serif';
    const modeLabel = cfg.style === 'Photo' ? 'Photo' : cfg.mode;
    const line = cfg.size + '×' + cfg.size + '   •   ' + modeLabel +
      '   •   ' + moves + ' moves   •   ' + formatTime(timeSec);
    ctx.fillText(line, canvas.width / 2, by + boardSize + 140);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'wood-puzzle.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'Wood Puzzle', text: 'I solved Wood Puzzle!' }).catch(() => {});
      } else {
        // Fallback: download
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'wood-puzzle.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
    });
  }

  function drawSolvedBoardOnCanvas(ctx, bx, by, boardSize) {
    const size = cfg.size;
    const pad = 14;
    const gap = cfg.style === 'Photo' ? 2 : 8;
    const inner = boardSize - pad * 2 - gap * (size - 1);
    const tile = inner / size;

    // Board frame
    ctx.fillStyle = '#5d3a1a';
    ctx.fillRect(bx, by, boardSize, boardSize);
    // Inner background
    const g = ctx.createLinearGradient(bx, by, bx + boardSize, by + boardSize);
    g.addColorStop(0, '#9c6b3b'); g.addColorStop(1, '#5d3a1a');
    ctx.fillStyle = g;
    ctx.fillRect(bx + 6, by + 6, boardSize - 12, boardSize - 12);

    // Render solved configuration (engine is solved when this is called)
    for (let v = 1; v <= size * size - 1; v++) {
      const goal = engine.goal.positionOfValue[v];
      const tx = bx + pad + goal.x * (tile + gap);
      const ty = by + pad + goal.y * (tile + gap);
      // Tile background
      const tg = ctx.createLinearGradient(tx, ty, tx, ty + tile);
      tg.addColorStop(0, '#d8b287'); tg.addColorStop(1, '#9c6b3b');
      ctx.fillStyle = tg;
      ctx.fillRect(tx, ty, tile, tile);
      // Number or photo segment
      if (cfg.style === 'Photo' && cfg.photoSrc) {
        // We can't synchronously draw arbitrary external image in this stub;
        // draw a placeholder block (the photo will simply show colored tiles in share card).
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(tx + 4, ty + 4, tile - 8, tile - 8);
      }
      ctx.fillStyle = '#2b1407';
      ctx.font = 'bold ' + Math.floor(tile * 0.42) + 'px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(v), tx + tile / 2, ty + tile / 2);
    }
  }

  /* ---------- Helpers ---------- */
  function formatTime(s) {
    s = Math.floor(s);
    const m = (s / 60) | 0;
    const ss = s % 60;
    return String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
  }
  function startTimer() {
    if (timerActive) return;
    timerActive = true;
    timerId = setInterval(() => {
      timeSec += 1;
      $('timer-val').textContent = formatTime(timeSec);
      // periodic resume save
      if (timeSec % 5 === 0) saveResume();
    }, 1000);
  }
  function stopTimer() {
    timerActive = false;
    if (timerId) { clearInterval(timerId); timerId = null; }
  }

  function showPopup(el) { el.hidden = false; }
  function hidePopup(el) { el.hidden = true; }

  function vibrate(pattern) {
    const s = window.WPStore.getSettings();
    if (!s.vibration) return;
    if (navigator.vibrate) try { navigator.vibrate(pattern); } catch (e) {}
  }

  function saveResume() {
    if (engine.solved) return;
    const layout = engine.serialize();
    window.WPStore.setResume({
      layout: { ...layout, photoSrc: cfg.photoSrc },
      timeSec
    });
  }

  // Image security
  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.tile, img, .board')) e.preventDefault();
  });
  document.addEventListener('dragstart', (e) => e.preventDefault());

  // Hide loading screen
  setTimeout(() => {
    const loader = $('loading-screen');
    if (loader) loader.classList.add('hidden');
  }, 300);
  setTimeout(() => {
    const loader = $('loading-screen');
    if (loader) loader.classList.add('hidden');
  }, 1500);

  // Rebuild on resize
  let resizeT = null;
  window.addEventListener('resize', () => {
    if (resizeT) clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      const snap = engine.serialize();
      const cfgSnap = { ...cfg };
      engine.destroy();
      const newEngine = new window.WPEngine(board, {
        size: cfgSnap.size, mode: cfgSnap.mode, style: cfgSnap.style,
        photoSrc: cfgSnap.photoSrc, interactive: true, showNumbers,
        onChange: handleEngineChange, onSolved: handleWin
      });
      newEngine.restore(snap);
      // Replace global reference
      Object.setPrototypeOf(engine, Object.getPrototypeOf(newEngine));
      Object.assign(engine, newEngine);
    }, 150);
  });

  // Save on unload
  window.addEventListener('beforeunload', () => { saveResume(); });
})();
"
Observation: Create successful: /app/public_game/js/game.js
