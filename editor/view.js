'use strict';
/* ---------------- The canvas: camera, loop and overlays ----------------
   The preview is the GAME's renderer, not a diagram of the level. R.draw()
   reads Cam, World and MAPW/MAPH by bare name and has no idea it is being
   driven by an editor, so the walls, the light pools, the worktops and the
   doorway leaves are all exactly what the player will see.

   Zoom is the one thing that had to be arranged rather than asked for. R.draw()
   sets its transform from R.dpr and clears Cam.w × Cam.h, so drawing the world
   at 2× is a matter of handing it twice the device ratio and half the visible
   span. R.dpr is put back immediately afterwards, because R.resize() sizes the
   canvas backing store from it and a zoomed value there would grow the canvas
   on every resize until the tab fell over. */

/* What is selected, if anything. One thing at a time, addressed the way the doc
   addresses it: an index into a list, or an entry's name. */
const Sel = { kind: null, i: -1, name: null };

const View = {
  x: 0, y: 0, zoom: 1,
  /* The floor is low enough that fit() can actually fit. The fourth floor is
     64×44 tiles — 2048px — and a phone is 390 of them, so the whole level needs
     about 0.19 and the old floor of 0.25 meant "see all of it" was a thing the
     button could not do on the device that most needs it. */
  MIN: 0.1, MAX: 3,
  /* Where the pointer is, in tiles, or null when it is off the canvas. */
  hover: null,
  /* A rectangle being dragged out by the room or counter tool. */
  band: null,
  grid: true, plan: true, faults: true, wps: false,
  last: 0,

  dpr() { return Math.min(2, window.devicePixelRatio || 1); },

  init() {
    R.init();
    /* R.resize() reads the canvas's laid-out size, so the stylesheet has had
       its say by now and the editor only has to keep the camera honest. */
    window.addEventListener('resize', () => this.clamp());
    this.fit();
  },

  /* ---- the loop ----
     Always running: the game's own idle animation (breathing, a ringing phone,
     the light on a monitor) is part of what you are judging. */
  loop(now) {
    const dt = Math.min(0.05, (now - (View.last || now)) / 1000);
    View.last = now;
    try { View.frame(dt); } catch (e) { console.error(e); }
    requestAnimationFrame(View.loop);
  },
  frame(dt) {
    const d = this.dpr();
    R.dpr = d * this.zoom;
    Cam.w = R.cv.width / R.dpr;
    Cam.h = R.cv.height / R.dpr;
    Cam.x = this.x; Cam.y = this.y;
    R.draw(dt);
    this.overlay();
    /* Back to the true ratio before anything can resize the canvas from it. */
    R.dpr = d;
  },

  /* ---- camera ---- */

  /* World span the canvas shows, in pixels. */
  spanW() { return R.cv.width / (this.dpr() * this.zoom); },
  spanH() { return R.cv.height / (this.dpr() * this.zoom); },
  clamp() {
    const w = this.spanW(), h = this.spanH();
    const mw = MAPW * TILE, mh = MAPH * TILE;
    /* Centre a map smaller than the window rather than pinning it to a corner,
       which is what the game's own camera does for the same reason. */
    this.x = mw <= w ? (mw - w) / 2 : clamp(this.x, -TILE, mw - w + TILE);
    this.y = mh <= h ? (mh - h) / 2 : clamp(this.y, -TILE, mh - h + TILE);
  },
  pan(dxCss, dyCss) {
    this.x -= dxCss / this.zoom;
    this.y -= dyCss / this.zoom;
    this.clamp();
  },
  /* Zoom about a point on the canvas, so the tile under the pointer stays under
     the pointer. Anything else feels like the map is running away. */
  zoomAt(f, cssX, cssY) {
    const before = this.toWorld(cssX, cssY);
    this.zoom = clamp(this.zoom * f, this.MIN, this.MAX);
    const after = this.toWorld(cssX, cssY);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
    this.clamp();
    Side.zoomLabel();
  },
  setZoom(z, keepCentre) {
    const cx = R.cv.clientWidth / 2, cy = R.cv.clientHeight / 2;
    const before = keepCentre === false ? null : this.toWorld(cx, cy);
    this.zoom = clamp(z, this.MIN, this.MAX);
    if (before) {
      const after = this.toWorld(cx, cy);
      this.x += before.x - after.x;
      this.y += before.y - after.y;
    }
    this.clamp();
    Side.zoomLabel();
  },
  /* The whole level, with a tile of air round it. */
  fit() {
    const cw = R.cv.clientWidth || 800, ch = R.cv.clientHeight || 600;
    const z = Math.min(cw / ((MAPW + 2) * TILE), ch / ((MAPH + 2) * TILE));
    this.zoom = clamp(z, this.MIN, this.MAX);
    this.x = (MAPW * TILE - this.spanW()) / 2;
    this.y = (MAPH * TILE - this.spanH()) / 2;
    this.clamp();
    Side.zoomLabel();
  },

  /* CSS pixels on the canvas → world pixels. The device ratio cancels: the
     transform is dpr×zoom and the backing store is dpr× the CSS size. */
  toWorld(cssX, cssY) {
    return { x: this.x + cssX / this.zoom, y: this.y + cssY / this.zoom };
  },
  toTile(cssX, cssY) {
    const w = this.toWorld(cssX, cssY);
    return { x: Math.floor(w.x / TILE), y: Math.floor(w.y / TILE) };
  },
  inMap(t) { return t.x >= 0 && t.y >= 0 && t.x < MAPW && t.y < MAPH; },

  /* ---- overlays ----
     Drawn in world space under the same transform R.draw() used, with every
     stroke width and font divided by the zoom so they stay the size of a line
     on the screen rather than the size of a line on the floor. */
  overlay() {
    const c = R.ctx, z = this.zoom;
    c.save();
    c.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    c.translate(-Math.round(this.x), -Math.round(this.y));
    c.lineWidth = 1 / z;

    const x0 = Math.max(0, Math.floor(this.x / TILE));
    const y0 = Math.max(0, Math.floor(this.y / TILE));
    const x1 = Math.min(MAPW - 1, Math.ceil((this.x + this.spanW()) / TILE));
    const y1 = Math.min(MAPH - 1, Math.ceil((this.y + this.spanH()) / TILE));

    if (this.grid && z > 0.35) this.drawGrid(c, x0, y0, x1, y1);
    if (this.faults) this.drawFaults(c);
    if (this.plan) this.drawPlan(c, z);
    if (this.wps) this.drawWaypoints(c, z);
    this.drawSelection(c, z);
    if (this.band) this.drawBand(c, z);
    if (this.hover) this.drawHover(c, z);

    c.restore();
  },

  drawGrid(c, x0, y0, x1, y1) {
    c.strokeStyle = 'rgba(180,205,255,.10)';
    c.beginPath();
    for (let x = x0; x <= x1 + 1; x++) {
      c.moveTo(x * TILE, y0 * TILE); c.lineTo(x * TILE, (y1 + 1) * TILE);
    }
    for (let y = y0; y <= y1 + 1; y++) {
      c.moveTo(x0 * TILE, y * TILE); c.lineTo((x1 + 1) * TILE, y * TILE);
    }
    c.stroke();
  },

  drawFaults(c) {
    Check.tiles.forEach((level, k) => {
      const [x, y] = k.split(',').map(Number);
      c.fillStyle = level === 'error' ? 'rgba(255,95,86,.30)' : 'rgba(255,179,71,.26)';
      c.fillRect(x * TILE, y * TILE, TILE, TILE);
      c.strokeStyle = level === 'error' ? 'rgba(255,95,86,.9)' : 'rgba(255,179,71,.85)';
      c.strokeRect(x * TILE + .5, y * TILE + .5, TILE - 1, TILE - 1);
    });
  },

  /* Rooms, doors, counters and arrival points: the things that are structure
     rather than furniture, and that the rendered floor deliberately hides. */
  drawPlan(c, z) {
    c.font = Math.round(11 / z) + 'px ui-monospace,monospace';
    c.textBaseline = 'top'; c.textAlign = 'left';
    /* Every label on this layer sits over the drawn floor, which is a texture
       rather than a flat colour — so each one is knocked out against a dark
       stroke or it reads as noise on the carpet. */
    const label = (t, x, y, colour) => {
      c.lineWidth = 3 / z; c.strokeStyle = 'rgba(0,0,0,.75)';
      c.strokeText(t, x, y);
      c.fillStyle = colour; c.fillText(t, x, y);
      c.lineWidth = 1 / z;
    };
    this.label = label;

    Doc.rooms.forEach(rm => {
      const [ax, ay, bx, by] = rm.r;
      const tint = (ZONES[rm.z] || {}).tint || '#8d9bb5';
      c.strokeStyle = tint; c.globalAlpha = .55;
      c.strokeRect(ax * TILE + .5, ay * TILE + .5, (bx - ax + 1) * TILE - 1, (by - ay + 1) * TILE - 1);
      c.globalAlpha = 1;
      label((ZONES[rm.z] || {}).name || rm.z, ax * TILE + 3 / z, ay * TILE + 3 / z, tint);
    });

    Doc.doors.forEach(d => {
      c.fillStyle = d.locked ? '#ff5f56' : '#5ad48a';
      c.beginPath();
      c.moveTo((d.x + .5) * TILE, d.y * TILE + 4 / z);
      c.lineTo((d.x + 1) * TILE - 4 / z, (d.y + .5) * TILE);
      c.lineTo((d.x + .5) * TILE, (d.y + 1) * TILE - 4 / z);
      c.lineTo(d.x * TILE + 4 / z, (d.y + .5) * TILE);
      c.closePath(); c.fill();
    });

    Doc.counters.forEach(t => {
      c.strokeStyle = '#ffb347'; c.globalAlpha = .8;
      c.strokeRect(t.x * TILE + .5, t.y * TILE + .5, t.w * TILE - 1, TILE - 1);
      c.globalAlpha = 1;
    });

    for (const k in Doc.entries) {
      const e = Doc.entries[k];
      const wx = e[0] * TILE, wy = e[1] * TILE;
      c.fillStyle = '#4da3ff';
      c.beginPath(); c.arc(wx, wy, 5 / z, 0, 6.3); c.fill();
      c.strokeStyle = '#4da3ff';
      c.beginPath(); c.moveTo(wx, wy); c.lineTo(wx, wy - 16 / z);
      c.lineTo(wx + 12 / z, wy - 12 / z); c.lineTo(wx, wy - 8 / z); c.stroke();
      this.label(k, wx + 7 / z, wy + 4 / z, '#4da3ff');
    }
  },

  /* Where the colleagues are sent. Their own layer, because there are thirty of
     them on the hub and drawn with the rooms they bury the floor plan. */
  drawWaypoints(c, z) {
    for (const k in Doc.waypoints) {
      const w = Doc.waypoints[k];
      const wx = (w[0] + .5) * TILE, wy = (w[1] + .5) * TILE;
      c.strokeStyle = '#b48cff'; c.lineWidth = 1.5 / z;
      c.beginPath(); c.arc(wx, wy, TILE * .3, 0, 6.3); c.stroke();
      c.beginPath();
      c.moveTo(wx - 4 / z, wy); c.lineTo(wx + 4 / z, wy);
      c.moveTo(wx, wy - 4 / z); c.lineTo(wx, wy + 4 / z);
      c.stroke();
      c.lineWidth = 1 / z;
      if (z > 0.6) this.label(k, wx + TILE * .34, wy - 5 / z, '#b48cff');
    }
  },

  drawSelection(c, z) {
    const box = (x, y, w, h, colour) => {
      c.save();
      c.strokeStyle = colour; c.lineWidth = 2 / z;
      c.setLineDash([6 / z, 4 / z]);
      c.strokeRect(x * TILE - 1, y * TILE - 1, w * TILE + 2, h * TILE + 2);
      c.restore();
    };
    if (Sel.kind === 'object') {
      const o = Doc.objects[Sel.i];
      if (o) box(o.x, o.y, 1, 1, '#4da3ff');
    } else if (Sel.kind === 'room') {
      const rm = Doc.rooms[Sel.i];
      if (rm) box(rm.r[0], rm.r[1], rm.r[2] - rm.r[0] + 1, rm.r[3] - rm.r[1] + 1, '#b48cff');
    } else if (Sel.kind === 'door') {
      const d = Doc.doors[Sel.i];
      if (d) box(d.x, d.y, 1, 1, '#5ad48a');
    } else if (Sel.kind === 'counter') {
      const t = Doc.counters[Sel.i];
      if (t) box(t.x, t.y, t.w, 1, '#ffb347');
    } else if (Sel.kind === 'entry') {
      const e = Doc.entries[Sel.name];
      if (e) box(Math.floor(e[0]), Math.floor(e[1]), 1, 1, '#4da3ff');
    } else if (Sel.kind === 'wp') {
      const w = Doc.waypoints[Sel.name];
      if (w) box(w[0], w[1], 1, 1, '#b48cff');
    }
  },

  drawBand(c, z) {
    const b = this.band;
    const x = Math.min(b.x0, b.x1), y = Math.min(b.y0, b.y1);
    const w = Math.abs(b.x1 - b.x0) + 1, h = Math.abs(b.y1 - b.y0) + 1;
    c.save();
    c.fillStyle = 'rgba(77,163,255,.18)';
    c.fillRect(x * TILE, y * TILE, w * TILE, h * TILE);
    c.strokeStyle = '#4da3ff'; c.lineWidth = 2 / z;
    c.strokeRect(x * TILE + .5, y * TILE + .5, w * TILE - 1, h * TILE - 1);
    c.restore();
  },

  drawHover(c, z) {
    const t = this.hover;
    c.strokeStyle = 'rgba(255,255,255,.55)';
    c.lineWidth = 1.5 / z;
    c.strokeRect(t.x * TILE + .5, t.y * TILE + .5, TILE - 1, TILE - 1);
  }
};
