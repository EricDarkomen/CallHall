'use strict';
/* Character sprites: Liberated Pixel Cup art, built by tools/build-sprites.mjs.
   Third-party, OGA-BY 3.0, NOT covered by this file's licence — see LICENSE
   part 2 and art/CREDITS.md.

   Several SHEETS rather than one atlas: a sheet is a PNG plus the geometry to
   read it, so a second one can come from another project in another style and
   the renderer need not know. Sprites.rows maps a person to their sheet.

   Never read pixels back here. The PNGs sit beside index.html and a file://
   page taints a canvas it draws them into — harmless until something calls
   getImageData, which would break opening the game off disk. Missing or broken
   sheets fall back to emoji per person, gated by has(). */

/* typeof, because a copy opened without art/ never loads the manifest at all
   and the const is simply never declared. */
function atlasSheets() {
  if (typeof SPRITE_ATLAS === 'undefined') return [];
  const list = SPRITE_ATLAS && SPRITE_ATLAS.sheets;
  return Array.isArray(list) ? list : [];
}

const Sprites = {
  ready: false, sheets: [], rows: new Map(),
  /* Where the feet sit relative to the drawing origin — the same offset the
     shadow uses, so a sprite stands on its own shadow. */
  FOOT: 13,
  load() {
    const list = atlasSheets();
    if (!list.length) return;
    list.forEach(s => {
      if (!s || !s.src || !Array.isArray(s.ids)) return;   /* not a roster sheet */
      const sh = { id: s.id, src: s.src, fw: s.fw, fh: s.fh, frames: s.frames,
        sit: s.sit, dirs: s.dirs, ids: s.ids, img: null, ok: false,
        /* Named cycles the sheet may or may not carry. A pack built before
           these existed simply has neither, and everybody stands still and
           walks exactly as they did. */
        breath: Array.isArray(s.breath) ? s.breath : null,
        run: Array.isArray(s.run) ? s.run : null };
      this.sheets.push(sh);
      /* First sheet to claim a person wins, so a sheet added later cannot
         silently repaint somebody who is already drawn. */
      s.ids.forEach((id, row) => { if (!this.rows.has(id)) this.rows.set(id, { sheet: sh, row }); });
      const im = new Image();
      im.onload = () => { sh.img = im; sh.ok = true; this.ready = true; };
      im.onerror = () => { sh.ok = false; };      /* this sheet stays on the emoji */
      im.src = s.src + (s.v ? '?v=' + s.v : '');
    });
  },
  /* The sheet a person is on, but only once it has actually decoded. */
  at(id) {
    const r = this.rows.get(id);
    return r && r.sheet.ok ? r : null;
  },
  has(id) { return !!this.at(id); },
  /* Sheet rows are the LPC direction order: up, left, down, right. Movement is
     one axis at a time for NPCs and can be diagonal for the player, so the
     dominant axis decides which way they are looking. */
  dirOf(dx, dy) {
    if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 1 : 3;
    return dy < 0 ? 0 : 2;
  },
  /* Which frame is the seated one. Per sheet, because a sheet from another
     project will not have the same number of poses in the same order. */
  sit(id) {
    const r = this.rows.get(id);
    return r ? r.sheet.sit : 0;
  },
  /* Frame 0 stands, 1..sit-1 is the walk, sit is seated. `phase` is free
     running, so callers keep no frame timer. */
  frame(id, walking, phase, fast) {
    if (!walking) return 0;
    /* Derived as the frames between standing and sitting, so a pose appended
       past `sit` (breath, run) is never walked into by accident. */
    const r = this.rows.get(id);
    const run = fast && r && r.sheet.run;
    if (run && run.length) return run[Math.floor(phase) % run.length];
    const cycle = Math.max(1, (r ? r.sheet.sit : 1) - 1);
    return 1 + (Math.floor(phase) % cycle);
  },
  /* Seconds per breath step, and the tuning knob. The kit's idle runs at
     animation speed, which on a body doing nothing reads as panting. The phase
     is offset per person, or the whole floor inhales together. */
  BREATH_S: 0.6,
  /* Where in the breath somebody is, 0..n-1. Separated from the frame lookup
     because a seated person needs the same rhythm without the same frames —
     see breathLift(). */
  breathStep(id, n) {
    let hsh = 0;
    for (let i = 0; i < id.length; i++) hsh = (hsh * 31 + id.charCodeAt(i)) & 1023;
    const step = Math.floor(R.t / this.BREATH_S + hsh % n + hsh / 1024);
    return ((step % n) + n) % n;
  },
  breath(id) {
    const r = this.rows.get(id), b = r && r.sheet.breath;
    if (!b || !b.length) return 0;
    return b[this.breathStep(id, b.length)];
  },
  /* One pixel on the same rhythm as everyone else's breath. The kit's three
     Sitting columns are three postures, not a cycle — playing them in sequence
     is a violent fidget — and most people on screen are sitting down, so frozen
     sitters are what most gives away that they are sprites. */
  breathLift(id) {
    const r = this.rows.get(id), b = r && r.sheet.breath;
    if (!b || !b.length) return 0;
    return this.breathStep(id, b.length) === 2 ? 1 : 0;
  },
  /* Standing still on a chair tile is sitting. Derived rather than stored, so
     there is no seated flag to keep in sync. */
  seatedAt(tx, ty) {
    return World.at(tx, ty).find(o => o.kind === 'chair') || null;
  },
  /* The seat, not the sitter. Nobody stops on a tile centre — NPCs stop a few
     pixels short, the player wherever the thumb left the stick — so a sitter
     drawn at their own position sits on the arm of the chair. */
  seatPos(o) { return { x: (o.x + 0.5) * TILE, y: (o.y + 0.5) * TILE - SEAT }; },
  /* The other way round: is anybody sitting on this tile right now. Used by
     the renderer to decide whether a chair draws in front of its occupant. */
  seatedHere(tx, ty) {
    if (!P.moving && Math.floor(P.x / TILE) === tx && Math.floor(P.y / TILE) === ty) return true;
    return NPCM.list.some(n => !n.walking
      && Math.floor(n.x / TILE) === tx && Math.floor(n.y / TILE) === ty);
  },
  /* The head off the standing, front-facing frame, as CSS for the dialogue
     portrait. 30 rows clears the tallest hair in the roster (Mo's afro, which
     reaches the top of the frame) and still reaches the shoulders. */
  HEAD_W: 28, HEAD_H: 30, HEAD_TOP: 0,
  portrait(id, scale) {
    const r = this.at(id);
    if (!r) return null;
    const m = r.sheet;
    /* dir 2 = facing the camera, frame 0 = standing still. */
    const fx = (2 * m.frames) * m.fw + (m.fw - this.HEAD_W) / 2;
    const fy = r.row * m.fh + this.HEAD_TOP;
    return {
      width: this.HEAD_W * scale + 'px',
      height: this.HEAD_H * scale + 'px',
      backgroundImage: 'url(' + m.src + ')',
      backgroundSize: (m.fw * m.frames * m.dirs.length * scale) + 'px ' + (m.fh * m.ids.length * scale) + 'px',
      backgroundPosition: '-' + (fx * scale) + 'px -' + (fy * scale) + 'px',
    };
  },
  /* The box a sprite occupies, for highlight rings and hit feedback. Sized off
     that person's own sheet — two sheets at two scales is the point. */
  box(id, x, y) {
    const r = this.at(id);
    if (!r) return { x: x - 18, y: y - 24, w: 36, h: 44 };
    const m = r.sheet;
    return { x: x - m.fw / 2, y: y + this.FOOT - m.fh, w: m.fw, h: m.fh };
  },
  draw(c, id, dir, frame, x, y) {
    const r = this.at(id);
    if (!r) return;
    const m = r.sheet, b = this.box(id, x, y);
    /* A bad row is not allowed to be silent. Anything non-numeric here makes
       the source rectangle NaN, and a NaN drawImage is a no-op that reports
       nothing — which is a person who simply is not on the screen. Face the
       camera instead, so a mistake looks wrong rather than looking like
       nothing. */
    if (!(dir >= 0 && dir < m.dirs.length)) dir = 2;
    /* The canvas is scaled by devicePixelRatio, so on a HiDPI phone this blit
       is an upscale — and smoothing turns pixel art into mush. Off for the
       sprite only; the emoji and the baked gradients still want it. */
    const smooth = c.imageSmoothingEnabled;
    c.imageSmoothingEnabled = false;
    c.drawImage(m.img, (dir * m.frames + frame) * m.fw, r.row * m.fh, m.fw, m.fh,
      Math.round(b.x), Math.round(b.y), m.fw, m.fh);
    c.imageSmoothingEnabled = smooth;
  }
};

/* ---------------- World art ----------------
   The other half of the kit: floors, doors, windows and the office furniture,
   packed by tools/build-sprites.mjs into one PNG of named rectangles. Same
   manifest, same licence, same third-party carve-out as the people — see
   LICENSE part 2 and art/CREDITS.md.

   A name is all the game knows. Nothing above this line has any idea which
   upstream sheet a printer came from, which is what makes swapping one a data
   change. Everything degrades to the emoji it replaced if the atlas is
   missing: every call site checks the return value. */
const Tiles = {
  ready: false, img: null, rects: null, anchors: null, cell: 32,
  load() {
    const s = atlasSheets().find(x => x && x.sprites);
    if (!s) return;
    this.rects = s.sprites; this.anchors = s.anchors || {}; this.cell = s.cell || 32;
    const im = new Image();
    im.onload = () => { this.img = im; this.ready = true; };
    im.onerror = () => { this.ready = false; };   /* stay on the emoji */
    im.src = s.src + (s.v ? '?v=' + s.v : '');
  },
  has(n) { return !!(this.ready && n && this.rects[n]); },
  /* The art is 32px and so is the tile, so everything here is 1:1 — no
     scaling, and smoothing off, or pixel art on a 2x screen turns to mush. */
  blit(c, r, x, y) {
    const sm = c.imageSmoothingEnabled;
    c.imageSmoothingEnabled = false;
    c.drawImage(this.img, r[0], r[1], r[2], r[3], Math.round(x), Math.round(y), r[2], r[3]);
    c.imageSmoothingEnabled = sm;
  },
  /* An object standing on the tile centred at (wx, wy). `floor` stands it on
     the tile's bottom edge, because a fridge is two tiles tall and its feet
     are on the floor; `flat` centres it, which is what a laptop on a desk
     wants. */
  draw(c, n, wx, wy, flip, turn) {
    const r = this.has(n) && this.rects[n];
    if (!r) return false;
    const a = this.anchors[n] || 'flat';
    const x = wx - r[2] / 2, y = a === 'floor' ? wy + TILE / 2 - r[3] : wy - r[3] / 2;
    /* A quarter turn, for a door in a wall that runs top to bottom: an open
       leaf lying back along the wall is the same door seen from the side. */
    if (turn) {
      c.save();
      c.translate(Math.round(wx), Math.round(wy));
      c.rotate(turn * Math.PI / 2);
      this.blit(c, r, -r[2] / 2, -r[3] / 2);
      c.restore();
      return true;
    }
    if (!flip) { this.blit(c, r, x, y); return true; }
    /* Mirrored, for the far half of a double doorway — a pair of doors is
       hinged at the jambs and opens outwards, not both the same way round. */
    c.save();
    c.translate(Math.round(x + r[2] / 2), 0);
    c.scale(-1, 1);
    this.blit(c, r, -r[2] / 2, y);
    c.restore();
    return true;
  },
  /* One floor tile at the top-left of its cell. */
  floor(c, n, px, py) {
    const r = this.has(n) && this.rects[n];
    if (!r) return false;
    this.blit(c, r, px, py);
    return true;
  },
};
