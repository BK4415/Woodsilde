Action: file_editor create /app/public_game/js/icons.js --file-text "/* Wood Puzzle — SVG icon library.
   Renders inline SVGs into any element with class=\"svg-slot\" and data-icon=\"<name>\". */
(function () {
  'use strict';

  const ICONS = {
    info: '<circle cx=\"12\" cy=\"12\" r=\"9\"/><line x1=\"12\" y1=\"10\" x2=\"12\" y2=\"17\"/><circle cx=\"12\" cy=\"7\" r=\"1.2\" fill=\"currentColor\" stroke=\"none\"/>',
    dashboard: '<rect x=\"3\" y=\"3\" width=\"7\" height=\"9\" rx=\"1.5\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"5\" rx=\"1.5\"/><rect x=\"14\" y=\"10\" width=\"7\" height=\"11\" rx=\"1.5\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"1.5\"/>',
    close: '<line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/><line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/>',
    prev: '<polyline points=\"15 6 9 12 15 18\"/>',
    next: '<polyline points=\"9 6 15 12 9 18\"/>',
    play: '<polygon points=\"7 5 19 12 7 19 7 5\" fill=\"currentColor\" stroke=\"none\"/>',
    pause: '<rect x=\"6\" y=\"5\" width=\"4\" height=\"14\" rx=\"1\" fill=\"currentColor\" stroke=\"none\"/><rect x=\"14\" y=\"5\" width=\"4\" height=\"14\" rx=\"1\" fill=\"currentColor\" stroke=\"none\"/>',
    resume: '<polygon points=\"7 5 19 12 7 19 7 5\" fill=\"currentColor\" stroke=\"none\"/>',
    home: '<path d=\"M3 11 12 3l9 8\"/><path d=\"M5 10v10h5v-6h4v6h5V10\"/>',
    settings: '<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z\"/>',
    share: '<circle cx=\"18\" cy=\"5\" r=\"3\"/><circle cx=\"6\" cy=\"12\" r=\"3\"/><circle cx=\"18\" cy=\"19\" r=\"3\"/><line x1=\"8.6\" y1=\"13.5\" x2=\"15.4\" y2=\"17.5\"/><line x1=\"15.4\" y1=\"6.5\" x2=\"8.6\" y2=\"10.5\"/>',
    trophy: '<path d=\"M8 21h8\"/><path d=\"M12 17v4\"/><path d=\"M7 4h10v4a5 5 0 0 1-10 0V4z\"/><path d=\"M17 4h3v3a3 3 0 0 1-3 3\"/><path d=\"M7 4H4v3a3 3 0 0 0 3 3\"/>',
    hint: '<path d=\"M9 18h6\"/><path d=\"M10 21h4\"/><path d=\"M12 3a6 6 0 0 0-4 10.5c.8.7 1.5 1.5 1.5 2.5h5c0-1 .7-1.8 1.5-2.5A6 6 0 0 0 12 3z\"/>',
    upload: '<path d=\"M12 16V4\"/><polyline points=\"7 9 12 4 17 9\"/><path d=\"M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3\"/>',
    timer: '<circle cx=\"12\" cy=\"13\" r=\"8\"/><line x1=\"12\" y1=\"13\" x2=\"12\" y2=\"8\"/><line x1=\"12\" y1=\"13\" x2=\"15.5\" y2=\"13\"/><line x1=\"9\" y1=\"2\" x2=\"15\" y2=\"2\"/><line x1=\"12\" y1=\"2\" x2=\"12\" y2=\"5\"/>',
    moves: '<polyline points=\"4 12 9 7 9 11 15 11 15 7 20 12 15 17 15 13 9 13 9 17 4 12\" fill=\"currentColor\" stroke=\"none\"/>',
    back: '<polyline points=\"15 6 9 12 15 18\"/>',
    shuffle: '<polyline points=\"16 3 21 3 21 8\"/><polyline points=\"3 16 3 21 8 21\"/><path d=\"M21 3l-9 9\"/><path d=\"M3 21l6-6\"/><path d=\"M21 16v5h-5\"/><path d=\"M21 21l-7-7\"/>',
    undo: '<polyline points=\"9 14 4 9 9 4\"/><path d=\"M4 9h11a5 5 0 0 1 0 10h-4\"/>',
    redo: '<polyline points=\"15 14 20 9 15 4\"/><path d=\"M20 9H9a5 5 0 0 0 0 10h4\"/>',
    sound: '<polygon points=\"4 9 8 9 13 5 13 19 8 15 4 15 4 9\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M16 8a5 5 0 0 1 0 8\"/><path d=\"M19 5a9 9 0 0 1 0 14\"/>',
    vibration: '<rect x=\"9\" y=\"3\" width=\"6\" height=\"18\" rx=\"1.5\"/><line x1=\"3\" y1=\"9\" x2=\"3\" y2=\"15\"/><line x1=\"6\" y1=\"7\" x2=\"6\" y2=\"17\"/><line x1=\"18\" y1=\"7\" x2=\"18\" y2=\"17\"/><line x1=\"21\" y1=\"9\" x2=\"21\" y2=\"15\"/>',
    star: '<polygon points=\"12 2 15.1 9 22 9.5 16.5 14.2 18.3 21 12 17.3 5.7 21 7.5 14.2 2 9.5 8.9 9 12 2\" fill=\"currentColor\" stroke=\"none\"/>'
  };

  function svgWrap(inner, opts) {
    opts = opts || {};
    const stroke = opts.stroke || 2;
    return (
      '<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"100%\" height=\"100%\" ' +
      'fill=\"none\" stroke=\"currentColor\" stroke-width=\"' + stroke + '\" ' +
      'stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\">' +
      inner + '</svg>'
    );
  }

  function get(name) {
    const inner = ICONS[name];
    if (!inner) return '';
    return svgWrap(inner);
  }

  function replaceAll(root) {
    root = root || document;
    const slots = root.querySelectorAll('.svg-slot[data-icon]');
    slots.forEach((el) => {
      const name = el.getAttribute('data-icon');
      if (el.dataset.iconRendered === name) return;
      const svg = get(name);
      if (svg) {
        el.innerHTML = svg;
        el.dataset.iconRendered = name;
      }
    });
  }

  window.WPIcons = { get, replaceAll, ICONS };

  // Auto-replace on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => replaceAll());
  } else {
    replaceAll();
  }
})();
"
Observation: Create successful: /app/public_game/js/icons.js
