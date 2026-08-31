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
    /* `lazy` sheets are the character creator's parts, and they are the one
       thing on the manifest nobody should pay for by default: they are several
       times the size of the cast and only somebody who opens the creator ever
       needs them. loadParts() brings them in on demand. */
    atlasSheets().forEach(s => { if (s && Array.isArray(s.ids) && !s.lazy) this.adopt(s); });
  },

  /* ---- the character creator's parts ----
     Everything below this line exists because the player is CHOSEN and the
     cast is not. The twenty-one colleagues are composited at build time, one
     row each; the player's layers are packed one variant per row and stacked
     here instead, once, when somebody finishes making a character.

     It has to be that way round: colour in this kit is a directory rather than
     a palette ramp, so there is nothing to recolour at runtime and every
     option has to exist as pixels. Baking whole people would be one row per
     combination; baking layers is one row per option and the combinations come
     free. */

  /* Adopt the parts sheets and call back once every one of them has decoded.
     Fetched at most once — a second call while they are still arriving joins
     the same wait rather than starting another. */
  loadParts(done) {
    const want = atlasSheets().filter(s => s && s.lazy && Array.isArray(s.ids));
    if (!want.length) { if (done) done(false); return; }
    const sheets = want.map(s => this.adopt(s));
    const ready = () => sheets.every(sh => sh && sh.ok);
    if (ready()) { if (done) done(true); return; }
    /* No load event to hang off — adopt() owns the Image — so poll the flags
       it sets. A sheet that fails to decode leaves ok false for ever, which is
       why this gives up rather than waiting on it: the creator says so and the
       player keeps the character they came in with. */
    let waited = 0;
    const tick = () => {
      if (ready()) { if (done) done(true); return; }
      if ((waited += 100) > 20000) { if (done) done(false); return; }
      setTimeout(tick, 100);
    };
    setTimeout(tick, 100);
  },

  /* The creator's menu: one entry per axis, in stacking order, each with the
     variants it offers. Read off the sheets themselves rather than written
     down here, so adding a hairstyle is a change to the build alone. */
  partGroups() {
    return atlasSheets()
      .filter(s => s && s.part && Array.isArray(s.meta))
      .sort((a, b) => a.part.z - b.part.z)
      .map(s => ({ k: s.part.group, label: s.part.label, z: s.part.z,
        optional: !!s.part.optional, items: s.meta }));
  },
  partsReady() {
    const want = atlasSheets().filter(s => s && s.lazy && Array.isArray(s.ids));
    return want.length > 0 && want.every(s => {
      const sh = this.sheets.find(x => x.id === s.id);
      return sh && sh.ok;
    });
  },

  /* Stack the chosen variants into one row and hand it to the renderer as an
     ordinary sheet. A canvas is a perfectly good `img` — drawImage takes one —
     and this only ever DRAWS the parts, never reads them back, which is what
     keeps it working from file:// where the sheets taint every canvas they
     touch.

     Deliberately overrides whatever row already claimed `id`: "first sheet to
     claim a person wins" is a rule about two sheets arriving, and this is not
     that. The baked row underneath is remembered so uncompose() can put the
     default back. */
  compose(id, picks) {
    const rows = (picks || []).map(v => this.rows.get(v)).filter(r => r && r.sheet.ok && r.sheet.part);
    if (!rows.length) return null;
    rows.sort((a, b) => a.sheet.part.z - b.sheet.part.z);
    const m = rows[0].sheet;
    const w = m.fw * m.frames * m.dirs.length;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = m.fh;
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    rows.forEach(r => c.drawImage(r.sheet.img, 0, r.row * r.sheet.fh, w, r.sheet.fh, 0, 0, w, r.sheet.fh));

    if (!this._baked) this._baked = new Map();
    if (!this._baked.has(id) && this.rows.has(id)) this._baked.set(id, this.rows.get(id));
    const sh = { id: 'composed:' + id, src: null, img: cv, ok: true, composed: true,
      fw: m.fw, fh: m.fh, frames: m.frames, sit: m.sit, dirs: m.dirs, ids: [id],
      breath: m.breath, run: m.run };
    this.rows.set(id, { sheet: sh, row: 0 });
    this.ready = true;
    return sh;
  },
  /* Back to the row the build baked. Does NOTHING when nothing was composed:
     an earlier version deleted the row in that case, which took the baked
     `player` off the sheet and left the one character who is always on screen
     drawn as an emoji. */
  uncompose(id) {
    const was = this._baked && this._baked.get(id);
    if (!was) return false;
    this.rows.set(id, was);
    this._baked.delete(id);
    return true;
  },
  /* One sheet, by id. Re-callable with the same id, which is how a sheet whose
     geometry is still being worked out — the editor's importer — is re-read
     without a second copy of its bitmap: the game never does that, and a load()
     that pushed a duplicate would double every row and leave a megabyte of
     decoded PNG behind on each keystroke. */
  adopt(s) {
    if (!s || !s.src || !Array.isArray(s.ids)) return null;   /* not a roster sheet */
    let sh = this.sheets.find(x => x.id === s.id);
    const fresh = !sh;
    if (fresh) { sh = { id: s.id, src: null, img: null, ok: false }; this.sheets.push(sh); }
    Object.assign(sh, {
      fw: s.fw, fh: s.fh, frames: s.frames, sit: s.sit, dirs: s.dirs, ids: s.ids,
      /* What axis of the character creator this sheet is, if it is one at all.
         compose() sorts by `part.z`, so a sheet that arrived without this is a
         layer the compositor silently drops. */
      part: s.part || null, lazy: !!s.lazy,
      /* Named cycles the sheet may or may not carry. A pack built before these
         existed simply has neither, and everybody stands still and walks
         exactly as they did. */
      breath: Array.isArray(s.breath) ? s.breath : null,
      run: Array.isArray(s.run) ? s.run : null });
    /* Give up what this sheet claimed, then claim again — otherwise a row
       reassigned in the editor leaves the old person drawn from the old row. */
    const mine = [];
    this.rows.forEach((r, id) => { if (r.sheet === sh) mine.push(id); });
    mine.forEach(id => this.rows.delete(id));
    /* First sheet to claim a person wins, so a sheet added later cannot
       silently repaint somebody who is already drawn. */
    s.ids.forEach((id, row) => { if (id && !this.rows.has(id)) this.rows.set(id, { sheet: sh, row }); });
    if (fresh || sh.src !== s.src) {
      sh.src = s.src; sh.ok = false;
      const im = new Image();
      im.onload = () => { sh.img = im; sh.ok = true; this.ready = true; };
      im.onerror = () => { sh.ok = false; };      /* this sheet stays on the emoji */
      im.src = s.src + (s.v ? '?v=' + s.v : '');
    }
    return sh;
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
    /* A composed sheet is a canvas, not a file, and this hands CSS a url() —
       there is nothing to point at. Only ever asked of the person being talked
       to, which is never the player, so the honest answer is "no picture". */
    if (!r || !r.sheet.src) return null;
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
  ready: false, img: null, rects: null, anchors: null,
  /* SEVERAL sheets, exactly as Sprites has several people-sheets and for the
     same reason: a sheet is a PNG plus the geometry to read it, so a second one
     can come from another project in another style and nothing that draws needs
     to know. `rects` and `anchors` stay flat maps of name → geometry, because
     that is what every call site and the suite already read; `owner` is the
     only new thing, and it is what says which PNG a name's pixels are in. */
  sheets: [], owner: null,
  load() {
    atlasSheets().forEach(s => { if (s && s.sprites) this.adopt(s); });
  },
  /* One sheet. First to claim a name wins, so a sheet added later cannot
     silently repaint something already drawn — the same rule Sprites.rows
     follows for people, and for the same reason. */
  adopt(s) {
    if (!s || !s.src) return null;
    if (!this.rects) { this.rects = Object.create(null); this.anchors = Object.create(null); this.owner = Object.create(null); }
    let sh = this.sheets.find(x => x.id === s.id);
    const fresh = !sh;
    if (fresh) { sh = { id: s.id, src: null, img: null, ok: false }; this.sheets.push(sh); }
    /* A sheet's cell size is not kept here. Every entry in `rects` is in
       PIXELS — the kit's wall items are not on the 32px grid and rounding one
       to a cell clips the frame off it — so nothing that draws ever asks, and
       the one flat `cell` this used to carry could only ever be the first
       sheet's. The importer keeps its own, because slicing is where the
       question is asked. */
    /* Re-callable with the same id, and that is the point: the importer changes
       what a sheet declares on every keystroke, and a version that pushed a new
       sheet each time would leave a decoded megabyte behind for each one. Give
       up what this sheet claimed, then claim again. */
    Object.keys(this.owner).forEach(n => {
      if (this.owner[n] !== sh) return;
      delete this.owner[n]; delete this.rects[n]; delete this.anchors[n];
    });
    Object.keys(s.sprites || {}).forEach(n => {
      if (n in this.rects) return;         /* first to claim a name wins */
      this.rects[n] = s.sprites[n];
      this.anchors[n] = (s.anchors || {})[n] || 'flat';
      this.owner[n] = sh;
    });
    if (fresh || sh.src !== s.src) {
      sh.src = s.src; sh.ok = false;
      const im = new Image();
      im.onload = () => {
        sh.img = im; sh.ok = true;
        if (!this.img) this.img = im;        /* the first sheet to decode */
        this.ready = true;
      };
      im.onerror = () => { sh.ok = false; };   /* this sheet stays on the emoji */
      /* No cache key on a data: URI — a query string there is part of the data,
         not a cache bust, and the browser rejects the lot. An imported sheet has
         nothing to bust against anyway: it arrived with the page. */
      im.src = s.src + (s.v ? '?v=' + s.v : '');
    }
    return sh;
  },
  /* Which PNG a name's pixels are in. Named rather than assumed, because the
     baked floor and wall tiles in render.js reach for the bitmap directly. */
  imgFor(n) {
    const o = this.owner && this.owner[n];
    return o ? o.img : this.img;
  },
  has(n) {
    if (!n || !this.rects || !this.rects[n]) return false;
    const o = this.owner[n];
    return o ? o.ok : this.ready;
  },
  /* The art is 32px and so is the tile, so everything here is 1:1 — no
     scaling, and smoothing off, or pixel art on a 2x screen turns to mush. */
  blit(c, r, x, y, img) {
    const sm = c.imageSmoothingEnabled;
    c.imageSmoothingEnabled = false;
    c.drawImage(img || this.img, r[0], r[1], r[2], r[3], Math.round(x), Math.round(y), r[2], r[3]);
    c.imageSmoothingEnabled = sm;
  },
  /* An object standing on the tile centred at (wx, wy). `floor` stands it on
     the tile's bottom edge, because a fridge is two tiles tall and its feet
     are on the floor; `flat` centres it, which is what a laptop on a desk
     wants. */
  draw(c, n, wx, wy, flip, turn) {
    const r = this.has(n) && this.rects[n];
    if (!r) return false;
    const img = this.imgFor(n);
    const a = this.anchors[n] || 'flat';
    const x = wx - r[2] / 2, y = a === 'floor' ? wy + TILE / 2 - r[3] : wy - r[3] / 2;
    /* A quarter turn, for a door in a wall that runs top to bottom: an open
       leaf lying back along the wall is the same door seen from the side. */
    if (turn) {
      c.save();
      c.translate(Math.round(wx), Math.round(wy));
      c.rotate(turn * Math.PI / 2);
      this.blit(c, r, -r[2] / 2, -r[3] / 2, img);
      c.restore();
      return true;
    }
    if (!flip) { this.blit(c, r, x, y, img); return true; }
    /* Mirrored, for the far half of a double doorway — a pair of doors is
       hinged at the jambs and opens outwards, not both the same way round. */
    c.save();
    c.translate(Math.round(x + r[2] / 2), 0);
    c.scale(-1, 1);
    this.blit(c, r, -r[2] / 2, y, img);
    c.restore();
    return true;
  },
  /* Where a sprite's own middle lands when it is drawn at (wx, wy), which is
     NOT (wx, wy) for anything standing on the floor: a fridge is two tiles tall
     and anchored by its feet. Asked by anything that has to turn a sprite about
     itself rather than about the tile it stands on. */
  centre(n, wx, wy) {
    const r = this.has(n) && this.rects[n];
    if (!r) return { x: wx, y: wy };
    return { x: wx, y: (this.anchors[n] || 'flat') === 'floor' ? wy + TILE / 2 - r[3] / 2 : wy };
  },
  /* One floor tile at the top-left of its cell. */
  floor(c, n, px, py) {
    const r = this.has(n) && this.rects[n];
    if (!r) return false;
    this.blit(c, r, px, py);
    return true;
  },
};
