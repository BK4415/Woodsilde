/* Wood Puzzle — Local storage helpers and game stats. */
(function () {
  'use strict';

  const NS = 'wp:';
  const KEYS = {
    settings: NS + 'settings',
    stats: NS + 'stats',
    bestTimes: NS + 'bestTimes',
    bestMoves: NS + 'bestMoves',
    achievements: NS + 'achievements',
    resume: NS + 'resume',
    customPhoto: NS + 'customPhoto',
    lastConfig: NS + 'lastConfig'
  };

  function safeGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function safeSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { /* quota or private mode */ }
  }

  function getSettings() {
    return safeGet(KEYS.settings, { sound: true, vibration: true });
  }
  function setSettings(s) { safeSet(KEYS.settings, s); }

  function getStats() {
    return safeGet(KEYS.stats, {
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      longestStreak: 0,
      modeCounts: { Classic: 0, Snake: 0, Spiral: 0, 'Upside Down': 0 },
      sizeCounts: {}
    });
  }
  function setStats(s) { safeSet(KEYS.stats, s); }

  function getBest(kind, size, mode) {
    const k = kind === 'time' ? KEYS.bestTimes : KEYS.bestMoves;
    const all = safeGet(k, {});
    const key = size + ':' + mode;
    return all[key];
  }
  function setBest(kind, size, mode, value) {
    const k = kind === 'time' ? KEYS.bestTimes : KEYS.bestMoves;
    const all = safeGet(k, {});
    const key = size + ':' + mode;
    const prev = all[key];
    if (prev == null || value < prev) {
      all[key] = value;
      safeSet(k, all);
      return true;
    }
    return false;
  }

  function getAchievements() { return safeGet(KEYS.achievements, {}); }
  function unlockAchievement(id) {
    const a = getAchievements();
    if (a[id]) return false;
    a[id] = { unlockedAt: Date.now() };
    safeSet(KEYS.achievements, a);
    return true;
  }

  function getResume() { return safeGet(KEYS.resume, null); }
  function setResume(r) { safeSet(KEYS.resume, r); }
  function clearResume() { try { localStorage.removeItem(KEYS.resume); } catch (e) {} }

  function getCustomPhoto() { return safeGet(KEYS.customPhoto, null); }
  function setCustomPhoto(dataUrl) { safeSet(KEYS.customPhoto, dataUrl); }

  function getLastConfig() {
    return safeGet(KEYS.lastConfig, { style: 'Number', photo: 'photo1', size: 4, mode: 'Classic' });
  }
  function setLastConfig(c) { safeSet(KEYS.lastConfig, c); }

  window.WPStore = {
    getSettings, setSettings,
    getStats, setStats,
    getBest, setBest,
    getAchievements, unlockAchievement,
    getResume, setResume, clearResume,
    getCustomPhoto, setCustomPhoto,
    getLastConfig, setLastConfig
  };
})();

