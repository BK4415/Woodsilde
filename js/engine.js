
Action: file_editor create /app/public_game/js/engine.js --file-text "/* =========================================================
   Wood Puzzle Engine — premium multi-tile sliding puzzle.
   - Supports Classic / Snake / Spiral / Upside Down modes
   - Number or Photo tile rendering
   - Multi-tile drag with momentum + tap-to-slide
   - Undo / Redo / Hint / Shuffle (always solvable)
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Goal layout per mode ---------- */
  function buildModeGoal(mode, size) {
    const total = size * size;
    const order = [];

    if (mode === 'Classic') {
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) order.push({ x, y });
    } else if (mode === 'Snake') {
      for (let y = 0; y < size; y++) {
        if (y % 2 === 0) {
          for (let x = 0; x < size; x++) order.push({ x, y });
        } else {
          for (let x = size - 1; x >= 0; x--) order.push({ x, y });
        }
      }
    } else if (mode === 'Spiral') {
      let top = 0, bottom = size - 1, left = 0, right = size - 1;
      while (top <= bottom && left <= right) {
        for (let x = left; x <= right; x++) order.push({ x, y: top });
        top++;
        for (let y = top; y <= bottom; y++) order.push({ x: right, y });
        right--;
        if (top <= bottom) {
          for (let x = right; x >= left; x--) order.push({ x, y: bottom });
          bottom--;
        }
        if (left <= right) {
          for (let y = bottom; y >= top; y--) order.push({ x: left, y });
          left++;
        }
      }
    } else if (mode === 'Upside Down') {
      for (let p = 0; p < total; p++) {
        order.push({ x: p % size, y: Math.floor(p / size) });
      }
    } else {
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) order.push({ x, y });
    }

    const positionOfValue = {};
    let emptyPos;
    if (mode === 'Upside Down') {
      emptyPos = order[0];
      for (let v = 1; v <= total - 1; v++) positionOfValue[v] = order[total - v];
    } else {
      emptyPos = order[total - 1];
      for (let v = 1; v <= total - 1; v++) positionOfValue[v] = order[v - 1];
    }
    return { positionOfValue, emptyPos };
  }

  /* ---------- Engine ---------- */
  class WPEngine {
    constructor(container, opts) {
      opts = opts || {};
      this.container = container;
      this.size = opts.size || 4;
      this.mode = opts.mode || 'Classic';
      this.style = opts.style || 'Number';
      this.photoSrc = opts.photoSrc || null;
      this.interactive = opts.interactive !== false;
      this.showNumbers = opts.showNumbers !== false;
      this.onChange = opts.onChange || function () {};
      this.onSolved = opts.onSolved || function () {};

      this.tiles = [];
      this.emptyPos = { x: 0, y: 0 };
      this.goal = null;
      this.tileSize = 0;
      this.gap = 6;
      this.padding = 12;

      this.moveCount = 0;
      this.history = [];
      this.future = [];
      this.solved = false;
      this.locked = false; // prevents input while animating completion

      this.isDragging = false;
      this.drag = null;
      this._rafBound = this._rafLoop.bind(this);
      this._rafId = null;

      if (this.interactive) this._bindEvents();
      this.build();
      this._rafId = requestAnimationFrame(this._rafBound);
    }

    /* ---------- Public API ---------- */

    setOptions(opts) {
      let needsRebuild = false;
      if (opts.size != null && opts.size !== this.size) { this.size = opts.size; needsRebuild = true; }
      if (opts.mode && opts.mode !== this.mode) { this.mode = opts.mode; needsRebuild = true; }
      if (opts.style && opts.style !== this.style) { this.style = opts.style; needsRebuild = true; }
      if (opts.photoSrc !== undefined && opts.photoSrc !== this.photoSrc) { this.photoSrc = opts.photoSrc; needsRebuild = true; }
      if (opts.showNumbers != null) {
        this.showNumbers = opts.showNumbers;
        this._applyNumberVisibility();
      }
      if (needsRebuild) this.build();
    }

    build() {
      this.container.innerHTML = '';
      this.tiles = [];
      this.moveCount = 0;
      this.history = [];
      this.future = [];
      this.solved = false;
      this.container.style.setProperty('--grid-size', this.size);

      this._measure();
      this.goal = buildModeGoal(this.mode, this.size);
      this.emptyPos = { x: this.goal.emptyPos.x, y: this.goal.emptyPos.y };

      // Slots
      for (let y = 0; y < this.size; y++) {
        for (let x = 0; x < this.size; x++) {
          this._createSlot(x, y);
        }
      }

      // Tiles in solved positions for current mode
      const total = this.size * this.size;
      for (let v = 1; v <= total - 1; v++) {
        const pos = this.goal.positionOfValue[v];
        this._createTile(v, pos.x, pos.y);
      }
      this._refreshPhotoBackgrounds();
      this._applyNumberVisibility();
    }

    /** Restore a previously-saved layout. tilesLayout = [{value,x,y}, ...] plus emptyPos */
    restore(layout) {
      this.build();
      const map = {};
      this.tiles.forEach((t) => { map[t.value] = t; });
      layout.tiles.forEach((rec) => {
        const t = map[rec.value];
        if (t) {
          t.x = rec.x; t.y = rec.y;
          const p = this._pixelPos(t.x, t.y);
          t.currentVisualX = p.left; t.currentVisualY = p.top;
          t.offsetX = 0; t.offsetY = 0;
          this._applyTransform(t);
        }
      });
      this.emptyPos = { x: layout.emptyPos.x, y: layout.emptyPos.y };
      this.moveCount = layout.moveCount || 0;
      this.history = [];
      this.future = [];
      this.solved = this._checkSolved();
    }

    serialize() {
      return {
        size: this.size,
        mode: this.mode,
        style: this.style,
        photoSrc: this.photoSrc,
        moveCount: this.moveCount,
        emptyPos: { x: this.emptyPos.x, y: this.emptyPos.y },
        tiles: this.tiles.map((t) => ({ value: t.value, x: t.x, y: t.y }))
      };
    }

    /** Random valid moves — keeps solvability and avoids immediate undo. */
    shuffle(steps) {
      if (!steps) steps = Math.max(60, this.size * this.size * 12);
      let lastVal = null;
      for (let i = 0; i < steps; i++) {
        const neighbors = this.tiles.filter((t) => this._areNeighbors(t, this.emptyPos));
        const choices = neighbors.filter((t) => t.value !== lastVal);
        const pick = choices.length ? choices : neighbors;
        const tile = pick[(Math.random() * pick.length) | 0];
        lastVal = tile.value;
        const tx = tile.x, ty = tile.y;
        tile.x = this.emptyPos.x; tile.y = this.emptyPos.y;
        this.emptyPos.x = tx; this.emptyPos.y = ty;
      }
      this.history = [];
      this.future = [];
      this.moveCount = 0;
      this.solved = this._checkSolved();
      // If by random chance it's solved, perform one extra random move
      if (this.solved) {
        const n = this.tiles.filter((t) => this._areNeighbors(t, this.emptyPos))[0];
        if (n) {
          const tx = n.x, ty = n.y;
          n.x = this.emptyPos.x; n.y = this.emptyPos.y;
          this.emptyPos = { x: tx, y: ty };
        }
        this.solved = false;
      }
      this.onChange({ type: 'shuffle' });
    }

    undo() {
      if (!this.history.length) return false;
      const m = this.history.pop();
      this._applyMove(m, true);
      this.future.push(m);
      this.moveCount = Math.max(0, this.moveCount - 1);
      this.onChange({ type: 'undo' });
      return true;
    }
    redo() {
      if (!this.future.length) return false;
      const m = this.future.pop();
      this._applyMove(m, false);
      this.history.push(m);
      this.moveCount += 1;
      this.onChange({ type: 'redo' });
      this._maybeWin();
      return true;
    }

    /** Returns a tile that should be moved next (very simple heuristic). */
    getHint() {
      // Find a movable tile whose goal position is currently the empty position,
      // or whose current position differs from goal. Prefer the former.
      const movable = this.tiles.filter((t) => this._sameRowOrCol(t, this.emptyPos));
      if (!movable.length) return null;
      // Prefer tiles whose goal position equals the empty position
      for (const t of movable) {
        const g = this.goal.positionOfValue[t.value];
        if (g.x === this.emptyPos.x && g.y === this.emptyPos.y) return t;
      }
      // Otherwise any misplaced movable
      for (const t of movable) {
        const g = this.goal.positionOfValue[t.value];
        if (g.x !== t.x || g.y !== t.y) return t;
      }
      return movable[0];
    }

    showHint() {
      const t = this.getHint();
      if (!t) return;
      t.el.classList.remove('hint-pulse');
      // restart animation
      void t.el.offsetWidth;
      t.el.classList.add('hint-pulse');
      setTimeout(() => t.el.classList.remove('hint-pulse'), 2000);
    }

    destroy() {
      if (this._rafId) cancelAnimationFrame(this._rafId);
      this._unbindEvents();
      this.container.innerHTML = '';
    }

    /* ---------- Internal ---------- */

    _measure() {
      const rect = this.container.getBoundingClientRect();
      const cs = getComputedStyle(this.container);
      this.padding = parseFloat(cs.paddingLeft) || 12;
      this.gap = parseFloat(cs.getPropertyValue('--tile-gap')) || 6;
      // adjust gap for photo mode (tighter for image continuity)
      if (this.style === 'Photo') this.gap = 2;
      const inner = rect.width - this.padding * 2 - this.gap * (this.size - 1);
      this.tileSize = inner / this.size;
      this.boardInner = this.size * this.tileSize + (this.size - 1) * this.gap;
    }

    _pixelPos(x, y) {
      return {
        left: this.padding + x * (this.tileSize + this.gap),
        top: this.padding + y * (this.tileSize + this.gap)
      };
    }

    _createSlot(x, y) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.style.width = this.tileSize + 'px';
      slot.style.height = this.tileSize + 'px';
      const p = this._pixelPos(x, y);
      slot.style.left = p.left + 'px';
      slot.style.top = p.top + 'px';
      this.container.appendChild(slot);
    }

    _createTile(value, x, y) {
      const el = document.createElement('div');
      el.className = 'tile';
      if (this.style === 'Photo') el.classList.add('photo');
      el.style.width = this.tileSize + 'px';
      el.style.height = this.tileSize + 'px';
      el.style.fontSize = Math.floor(this.tileSize * 0.42) + 'px';

      const numberEl = document.createElement('div');
      numberEl.className = 'tile-number';
      numberEl.textContent = value;
      el.appendChild(numberEl);

      const tile = {
        el, value, x, y,
        offsetX: 0, offsetY: 0,
        currentVisualX: 0, currentVisualY: 0,
        targetVisualX: 0, targetVisualY: 0
      };
      const p = this._pixelPos(x, y);
      tile.currentVisualX = p.left;
      tile.currentVisualY = p.top;
      tile.targetVisualX = p.left;
      tile.targetVisualY = p.top;
      this._applyTransform(tile);

      this.tiles.push(tile);
      this.container.appendChild(el);
    }

    _refreshPhotoBackgrounds() {
      if (this.style !== 'Photo' || !this.photoSrc) return;
      const bgSize = this.boardInner + 'px ' + this.boardInner + 'px';
      this.tiles.forEach((t) => {
        // Classic goal position for tile value (since Photo only allows Classic)
        const cx = (t.value - 1) % this.size;
        const cy = ((t.value - 1) / this.size) | 0;
        t.el.style.backgroundImage = 'url(\"' + this.photoSrc + '\")';
        t.el.style.backgroundSize = bgSize;
        t.el.style.backgroundPosition =
          '-' + (cx * (this.tileSize + this.gap)) + 'px -' + (cy * (this.tileSize + this.gap)) + 'px';
      });
    }

    _applyNumberVisibility() {
      const hide = this.style === 'Photo' && !this.showNumbers;
      this.tiles.forEach((t) => {
        t.el.classList.toggle('hide-number', hide);
      });
    }

    _applyTransform(tile) {
      tile.el.style.transform =
        'translate3d(' + tile.currentVisualX + 'px,' + tile.currentVisualY + 'px,0)';
    }

    _areNeighbors(a, b) {
      return (Math.abs(a.x - b.x) === 1 && a.y === b.y) ||
             (Math.abs(a.y - b.y) === 1 && a.x === b.x);
    }
    _sameRowOrCol(t, p) { return t.x === p.x || t.y === p.y; }

    _getAffectedTiles(clickedTile) {
      let affected = [];
      if (clickedTile.y === this.emptyPos.y) {
        const min = Math.min(clickedTile.x, this.emptyPos.x);
        const max = Math.max(clickedTile.x, this.emptyPos.x);
        affected = this.tiles.filter((t) =>
          t.y === clickedTile.y && t.x >= min && t.x <= max
        );
      } else if (clickedTile.x === this.emptyPos.x) {
        const min = Math.min(clickedTile.y, this.emptyPos.y);
        const max = Math.max(clickedTile.y, this.emptyPos.y);
        affected = this.tiles.filter((t) =>
          t.x === clickedTile.x && t.y >= min && t.y <= max
        );
      }
      return affected;
    }

    /* ---------- Events ---------- */
    _bindEvents() {
      this._onDown = this._onDown.bind(this);
      this._onMove = this._onMove.bind(this);
      this._onUp = this._onUp.bind(this);
      this.container.addEventListener('pointerdown', this._onDown);
      window.addEventListener('pointermove', this._onMove, { passive: false });
      window.addEventListener('pointerup', this._onUp);
      window.addEventListener('pointercancel', this._onUp);
    }
    _unbindEvents() {
      if (!this._onDown) return;
      this.container.removeEventListener('pointerdown', this._onDown);
      window.removeEventListener('pointermove', this._onMove);
      window.removeEventListener('pointerup', this._onUp);
      window.removeEventListener('pointercancel', this._onUp);
    }

    _onDown(e) {
      if (this.locked) return;
      const tileEl = e.target.closest('.tile');
      if (!tileEl || !this.container.contains(tileEl)) return;
      const tile = this.tiles.find((t) => t.el === tileEl);
      if (!tile) return;
      const canMoveX = tile.y === this.emptyPos.y;
      const canMoveY = tile.x === this.emptyPos.x;
      if (!canMoveX && !canMoveY) return;

      e.preventDefault();
      this.isDragging = true;
      this.drag = {
        tile,
        startX: e.clientX, startY: e.clientY,
        currentX: e.clientX, currentY: e.clientY,
        axis: null, direction: 0,
        maxDelta: this.tileSize + this.gap,
        startTime: performance.now(),
        affected: this._getAffectedTiles(tile),
        moved: false
      };
      if (canMoveX) {
        this.drag.axis = 'x';
        this.drag.direction = tile.x < this.emptyPos.x ? 1 : -1;
      } else {
        this.drag.axis = 'y';
        this.drag.direction = tile.y < this.emptyPos.y ? 1 : -1;
      }
      try { tileEl.setPointerCapture(e.pointerId); } catch (err) {}
    }

    _onMove(e) {
      if (!this.isDragging) return;
      e.preventDefault();
      this.drag.currentX = e.clientX;
      this.drag.currentY = e.clientY;
      let delta = this.drag.axis === 'x'
        ? (this.drag.currentX - this.drag.startX)
        : (this.drag.currentY - this.drag.startY);
      if (this.drag.direction === 1) {
        delta = Math.max(0, Math.min(delta, this.drag.maxDelta));
      } else {
        delta = Math.min(0, Math.max(delta, -this.drag.maxDelta));
      }
      if (Math.abs(delta) > 3) this.drag.moved = true;
      this.drag.affected.forEach((t) => {
        if (this.drag.axis === 'x') t.offsetX = delta;
        else t.offsetY = delta;
      });
    }

    _onUp() {
      if (!this.isDragging) return;
      const d = this.drag;
      this.isDragging = false;
      this.drag = null;
      const time = performance.now() - d.startTime;
      const delta = d.axis === 'x' ? (d.currentX - d.startX) : (d.currentY - d.startY);
      const velocity = Math.abs(delta) / Math.max(1, time);
      const threshold = d.maxDelta * 0.4;
      const flick = velocity > 0.5;
      const past = Math.abs(delta) > threshold;
      const correct = (delta * d.direction) > 0;

      // If barely moved -> treat as tap
      if (!d.moved) {
        this._commitMove(d.tile, d.axis, d.direction, d.affected);
        return;
      }

      if ((flick || past) && correct) {
        this._commitMove(d.tile, d.axis, d.direction, d.affected);
      } else {
        // Snap back
        d.affected.forEach((t) => { t.offsetX = 0; t.offsetY = 0; });
      }
    }

    /* ---------- Move execution ---------- */
    _commitMove(originTile, axis, direction, affected) {
      const prevEmpty = { x: this.emptyPos.x, y: this.emptyPos.y };
      const movedValues = affected.map((t) => t.value);

      if (axis === 'x') {
        this.emptyPos.x = direction === 1
          ? Math.min.apply(null, affected.map((t) => t.x))
          : Math.max.apply(null, affected.map((t) => t.x));
        affected.forEach((t) => { t.x += direction; t.offsetX = 0; });
      } else {
        this.emptyPos.y = direction === 1
          ? Math.min.apply(null, affected.map((t) => t.y))
          : Math.max.apply(null, affected.map((t) => t.y));
        affected.forEach((t) => { t.y += direction; t.offsetY = 0; });
      }

      this.moveCount += 1;
      this.history.push({ axis, direction, values: movedValues, prevEmpty });
      this.future = [];
      this.onChange({ type: 'move', count: this.moveCount });
      this._maybeWin();
    }

    _applyMove(m, reverse) {
      // m: {axis, direction, values, prevEmpty}
      const dir = reverse ? -m.direction : m.direction;
      const affected = m.values.map((v) => this.tiles.find((t) => t.value === v));
      if (reverse) {
        // Move tiles back to their previous positions
        if (m.axis === 'x') affected.forEach((t) => { t.x -= m.direction; });
        else affected.forEach((t) => { t.y -= m.direction; });
        this.emptyPos = { x: m.prevEmpty.x, y: m.prevEmpty.y };
      } else {
        if (m.axis === 'x') {
          this.emptyPos.x = m.direction === 1
            ? Math.min.apply(null, affected.map((t) => t.x))
            : Math.max.apply(null, affected.map((t) => t.x));
          affected.forEach((t) => { t.x += m.direction; });
        } else {
          this.emptyPos.y = m.direction === 1
            ? Math.min.apply(null, affected.map((t) => t.y))
            : Math.max.apply(null, affected.map((t) => t.y));
          affected.forEach((t) => { t.y += m.direction; });
        }
      }
    }

    _checkSolved() {
      for (let i = 0; i < this.tiles.length; i++) {
        const t = this.tiles[i];
        const g = this.goal.positionOfValue[t.value];
        if (t.x !== g.x || t.y !== g.y) return false;
      }
      return this.emptyPos.x === this.goal.emptyPos.x && this.emptyPos.y === this.goal.emptyPos.y;
    }

    _maybeWin() {
      if (this.solved) return;
      if (this._checkSolved()) {
        this.solved = true;
        // brief lock to play any animation; consumer can unlock by rebuilding
        this.locked = true;
        setTimeout(() => { this.onSolved(); }, 250);
      }
    }

    /* ---------- Animation loop ---------- */
    _rafLoop() {
      for (let i = 0; i < this.tiles.length; i++) {
        const t = this.tiles[i];
        const base = this._pixelPos(t.x, t.y);
        const targetX = base.left + t.offsetX;
        const targetY = base.top + t.offsetY;
        // Use stronger lerp for snapping, lighter during drag for finger-tracking
        const k = this.isDragging ? 0.55 : 0.28;
        t.currentVisualX += (targetX - t.currentVisualX) * k;
        t.currentVisualY += (targetY - t.currentVisualY) * k;
        if (Math.abs(t.currentVisualX - targetX) < 0.2) t.currentVisualX = targetX;
        if (Math.abs(t.currentVisualY - targetY) < 0.2) t.currentVisualY = targetY;
        this._applyTransform(t);
      }
      this._rafId = requestAnimationFrame(this._rafBound);
    }
  }

  window.WPEngine = WPEngine;
  window.WPBuildGoal = buildModeGoal;
})();
"
Observation: Create successful: /app/public_game/js/engine.js
