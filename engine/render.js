'use strict';
/* Kinds whose kit art is symmetrical enough that mirroring it is a variation
   rather than a mistake. Deliberately short and deliberately by hand: the
   copier has its console on one side, the trolley has a handle, the sofa has
   an arm that meets the wall, and a mirrored one of any of those is not a
   second piece of furniture, it is the same piece drawn wrong. What is in here
   is boxes, pot plants, chairs, bins and filing cabinets — the things this
   building has fifteen and thirty-two of. */
const FLIPPABLE = new Set(['box', 'plant', 'chair', 'bin', 'cab']);

const R = {
  cv: null, ctx: null, dpr: 1, emojiScale: 1, animate: true, t: 0,
  /* The opening draws this same building behind its letterbox, and a shot of
     an office with twenty floating name tags and a row of red ❗ over it is a
     screenshot of a game rather than a place. Owned here rather than read off
     the cutscene, because this file is loaded by editor.html and boot.js is
     not: naming Cine from in here would be a ReferenceError on that page. */
  cinema: false,
  init() {
    this.cv = $('#view'); this.ctx = this.cv.getContext('2d');
    this.resize(); window.addEventListener('resize', () => this.resize());
    /* Fullscreen and a retracting address bar both change the drawable area
       and only the first reliably fires `resize`; visualViewport catches the
       other (iOS reports the bar retracting as a scroll). */
    if (window.visualViewport) {
      visualViewport.addEventListener('resize', () => this.resize());
      /* iOS retracts the bar as you scroll, and reports that as a scroll on
         the visual viewport rather than a resize. */
      visualViewport.addEventListener('scroll', () => this.resize());
    }
    document.addEventListener('fullscreenchange', () => this.resize());
    document.addEventListener('webkitfullscreenchange', () => this.resize());
    /* Render the minimap at device resolution so it isn't a blurry postage
       stamp on a HiDPI screen. */
    const mm = $('#minimap');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    mm.style.width = mm.width + 'px'; mm.style.height = mm.height + 'px';
    mm.width = Math.round(mm.width * dpr); mm.height = Math.round(mm.height * dpr);
    this._mmBase = null;
  },
  /* Pin the app to the height a phone actually shows. 100dvh in the stylesheet
     covers modern browsers; this is exact and reaches further back, because in
     some engines dvh is the LARGEST dynamic size — the wrong end of it. */
  fitViewport() {
    const app = $('#app'); if (!app) return;
    const vv = window.visualViewport;
    /* The soft keyboard shrinks the visual viewport too, and squashing the
       layout around somebody typing their name is worse than the clipping it
       would be avoiding. Let the stylesheet have it back while a field has
       focus. */
    const typing = document.activeElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.nodeName);
    if (!vv || typing) { app.style.height = ''; return; }
    app.style.height = Math.round(vv.height) + 'px';
  },
  resize() {
    this.fitViewport();
    const r = this.cv.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = Math.max(320, r.width * this.dpr);
    this.cv.height = Math.max(240, r.height * this.dpr);
    Cam.w = this.cv.width / this.dpr; Cam.h = this.cv.height / this.dpr;
    Cam.snap();
  },
  _fontCache: new Map(),
  emojiFont(size) {
    const px = Math.round(size * this.emojiScale * 2) / 2;
    let f = this._fontCache.get(px);
    if (!f) { f = px + 'px ' + EMOJI_FONT; this._fontCache.set(px, f); }
    return f;
  },
  emoji(e, x, y, size, alpha) {
    const c = this.ctx;
    c.font = this.emojiFont(size);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    /* Chromium applies the fill's alpha to colour-emoji glyphs, and every
       object is drawn straight after its shadow() leaves rgba(0,0,0,.35)
       behind. Set an opaque fill every time or the desk phones half-vanish. */
    c.fillStyle = '#fff';
    if (alpha !== undefined) c.globalAlpha = alpha;
    c.fillText(e, x, y);
    if (alpha !== undefined) c.globalAlpha = 1;
  },
  /* A radial gradient is expensive to build; bake each colour once and blit it. */
  glow(colour, r) {
    const key = colour + r;
    this._glows = this._glows || new Map();
    let g = this._glows.get(key);
    if (!g) {
      g = document.createElement('canvas');
      g.width = g.height = r * 2;
      const gc = g.getContext('2d');
      const grad = gc.createRadialGradient(r, r, 0, r, r, r);
      grad.addColorStop(0, colour.replace('ALPHA', '.6'));
      grad.addColorStop(0.5, colour.replace('ALPHA', '.22'));
      grad.addColorStop(1, colour.replace('ALPHA', '0'));
      gc.fillStyle = grad; gc.fillRect(0, 0, r * 2, r * 2);
      this._glows.set(key, g);
    }
    return g;
  },
  /* ---- Baked surfaces ----
     Each surface is drawn once into a small canvas and blitted after that, so a
     textured floor costs what the fillRect it replaced did. Baked at 2x because
     the canvas is scaled by devicePixelRatio and a 44px texture blown up to 88
     is a smear. Textures seed off the cache key, never Math.random(), or the
     floor changes every time the window is resized. */
  _rand(seed) {
    /* Deterministic, because a texture that is baked with Math.random() is a
       texture that changes every time the window is resized. */
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  },
  _hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  },
  /* t > 0 towards white, t < 0 towards black. */
  shade(hex, t) {
    const n = parseInt(hex.slice(1), 16), to = t > 0 ? 255 : 0, a = Math.abs(t);
    const ch = s => Math.round(((n >> s) & 255) + (to - ((n >> s) & 255)) * a);
    return 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')';
  },
  /* Throw the baked tiles away. Nothing in the GAME changes a zone while it is
     running, so this is never called there — but the baked bitmap is the only
     thing that ever reaches the screen, and an editor that lets somebody repaint
     a room has to be able to say so. Without this, changing a zone's colour
     changes nothing at all and the preview quietly lies. */
  rebake() { if (this._tiles) this._tiles.clear(); },
  _bake(key, draw) {
    this._tiles = this._tiles || new Map();
    let cv = this._tiles.get(key);
    if (cv) return cv;
    const S = 2, N = TILE * S;
    cv = document.createElement('canvas'); cv.width = cv.height = N;
    draw(cv.getContext('2d'), N, this._rand(this._hash(key)));
    this._tiles.set(key, cv);
    return cv;
  },
  floorTile(z, v) {
    /* The kit's floor, multiplied through the zone's colour: straight from the
       atlas each material is one flat colour and thirteen rooms become one room
       thirteen times. Baked once, so the tint is free per frame. Never pick a
       floor cell off a contact sheet — most are edge pieces; tile a candidate
       with tools/tiled.mjs and look for a seam. */
    const kit = ZONES[z] && ZONES[z].tile;
    if (Tiles.has(kit)) {
      return this._bake('k' + z + v + kit, (g, N) => {
        const r = Tiles.rects[kit], src = Tiles.imgFor(kit);
        g.imageSmoothingEnabled = false;
        g.drawImage(src, r[0], r[1], r[2], r[3], 0, 0, N, N);
        g.globalCompositeOperation = 'multiply';
        g.fillStyle = this.shade(v ? ZONES[z].floor : ZONES[z].alt, .55);
        g.fillRect(0, 0, N, N);
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = 'rgba(0,0,0,.10)';
        g.fillRect(0, 0, N, 1); g.fillRect(0, 0, 1, N);
      });
    }
    return this._bake('f' + z + v, (g, N, rnd) => {
      const Z = ZONES[z], base = v ? Z.floor : Z.alt;
      g.fillStyle = base; g.fillRect(0, 0, N, N);
      const speck = (n, light, dark) => {
        for (let i = 0; i < n; i++) {
          g.fillStyle = rnd() > .5 ? light : dark;
          g.fillRect(Math.floor(rnd() * N), Math.floor(rnd() * N), 2, 2);
        }
      };
      switch (Z.surf) {
        case 'tile': {
          /* Toilets and nowhere else: 300mm tiles, four to a floor tile, laid
             by somebody who was paid by the tile. */
          const h = N / 2;
          for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
            g.fillStyle = this.shade(base, .05 + ((i + j) & 1) * .05);
            g.fillRect(i * h + 2, j * h + 2, h - 4, h - 4);
            g.fillStyle = 'rgba(255,255,255,.07)';
            g.fillRect(i * h + 2, j * h + 2, h - 4, 2);
          }
          g.fillStyle = 'rgba(0,0,0,.34)';
          g.fillRect(0, 0, N, 2); g.fillRect(0, 0, 2, N);
          g.fillRect(N / 2 - 1, 0, 2, N); g.fillRect(0, N / 2 - 1, N, 2);
          break;
        }
        case 'vinyl':
          /* Sheet vinyl: no seams anywhere, and a fleck in it chosen in 1994
             specifically so that nothing shows up on it. */
          for (let i = 0; i < 130; i++) {
            const a = rnd();
            g.fillStyle = a > .66 ? 'rgba(255,255,255,.06)' : a > .33 ? 'rgba(0,0,0,.09)' : 'rgba(255,214,150,.05)';
            g.fillRect(rnd() * N, rnd() * N, 2 + rnd() * 5, 2);
          }
          break;
        case 'stone': {
          /* The lobby, and only the lobby. Whatever this cost, it was spent
             where visitors could see it. */
          g.fillStyle = this.shade(base, .05);
          g.fillRect(3, 3, N - 6, N - 6);
          g.strokeStyle = 'rgba(255,255,255,.045)'; g.lineWidth = 2;
          for (let i = 0; i < 3; i++) {
            g.beginPath();
            let x = rnd() * N, y = 0; g.moveTo(x, y);
            for (let s = 0; s < 4; s++) { x += (rnd() - .5) * 20; y += N / 4; g.lineTo(x, y); }
            g.stroke();
          }
          g.fillStyle = 'rgba(0,0,0,.34)'; g.fillRect(0, 0, N, 3); g.fillRect(0, 0, 3, N);
          g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, 3, N, 2); g.fillRect(3, 0, 2, N);
          break;
        }
        case 'raised': {
          /* An access floor. The panels lift out, which is where six years of
             cable has gone. */
          g.fillStyle = 'rgba(0,0,0,.40)'; g.fillRect(0, 0, N, N);
          g.fillStyle = this.shade(base, .06); g.fillRect(3, 3, N - 6, N - 6);
          g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(3, 3, N - 6, 2);
          g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(3, N - 5, N - 6, 2);
          speck(40, 'rgba(255,255,255,.05)', 'rgba(0,0,0,.07)');
          g.fillStyle = 'rgba(0,0,0,.40)';
          [[9, 9], [N - 9, 9], [9, N - 9], [N - 9, N - 9]].forEach(([x, y]) => {
            g.beginPath(); g.arc(x, y, 2.4, 0, 6.3); g.fill();
          });
          break;
        }
        case 'concrete':
          for (let i = 0; i < 9; i++) {
            g.fillStyle = rnd() > .5 ? 'rgba(255,255,255,.028)' : 'rgba(0,0,0,.06)';
            g.beginPath();
            g.ellipse(rnd() * N, rnd() * N, 7 + rnd() * 16, 6 + rnd() * 12, rnd() * 3, 0, 6.3);
            g.fill();
          }
          speck(110, 'rgba(255,255,255,.07)', 'rgba(0,0,0,.10)');
          break;
        default: {
          /* Carpet tiles, and the reason the office reads as an office: they
             are laid with the pile at ninety degrees tile to tile, so a floor
             of exactly one colour still has a grain that changes direction. */
          g.globalAlpha = .05; g.strokeStyle = '#fff'; g.lineWidth = 1;
          for (let i = 0; i < 26; i++) {
            const a = rnd() * N, b = rnd() * N, len = 6 + rnd() * 15;
            g.beginPath();
            if (v) { g.moveTo(a, b); g.lineTo(a + len, b); } else { g.moveTo(a, b); g.lineTo(a, b + len); }
            g.stroke();
          }
          g.globalAlpha = 1;
          speck(80, 'rgba(255,255,255,.045)', 'rgba(0,0,0,.07)');
          g.fillStyle = 'rgba(0,0,0,.17)'; g.fillRect(0, 0, N, 2); g.fillRect(0, 0, 2, N);
          g.fillStyle = 'rgba(255,255,255,.03)'; g.fillRect(0, 2, N, 2); g.fillRect(2, 0, 2, N);
        }
      }
    });
  },
  wallTile(z, v) {
    /* The kit's wall, tinted per room exactly as floorTile() does. The toilets
       and the fire escape opt out below: glazed brick and breeze block are the
       point of those rooms. */
    const kw = ZONES[z] && ZONES[z].wtile;
    if (Tiles.has(kw)) {
      return this._bake('kw' + z + v + kw, (g, N) => {
        const r = Tiles.rects[kw], src = Tiles.imgFor(kw);
        g.imageSmoothingEnabled = false;
        g.drawImage(src, r[0], r[1], r[2], r[3], 0, 0, N, N);
        g.globalCompositeOperation = 'multiply';
        /* Lifted off the flat wall colour: the texture is nearly white, and
           multiplying it straight through a #1a212e leaves a black rectangle. */
        /* A third, not two-thirds. The wall colours are dark on purpose and a
           wall the same value as the floor loses the edge of the room. */
        g.fillStyle = this.shade(ZONES[z].wall, v ? 0.34 : 0.28);
        g.fillRect(0, 0, N, N);
        g.globalCompositeOperation = 'source-over';
      });
    }
    return this._bake('w' + z + v, (g, N, rnd) => {
      const base = (ZONES[z] && ZONES[z].wall) || '#141a24';
      g.fillStyle = base; g.fillRect(0, 0, N, N);
      switch (ZONES[z] && ZONES[z].wsurf) {
        case 'tile': {
          /* Glazed brick, half bond, to about shoulder height in every
             institutional toilet ever built. */
          const rows = 3, h = N / rows, w = N / 2;
          for (let r = 0; r < rows; r++) {
            const off = (r & 1) ? w / 2 : 0;
            for (let x = -w; x < N + w; x += w) {
              g.fillStyle = this.shade(base, .11);
              g.fillRect(x + off + 2, r * h + 2, w - 4, h - 4);
              g.fillStyle = 'rgba(255,255,255,.07)';
              g.fillRect(x + off + 2, r * h + 2, w - 4, 2);
            }
          }
          break;
        }
        case 'block': {
          /* Painted breeze block. Painted, repainted, and painted again over
             the notice that used to be screwed to it. */
          const rows = 2, h = N / rows;
          for (let r = 0; r < rows; r++) {
            const off = (r & 1) ? N / 2 : 0;
            for (let x = -N; x < N * 2; x += N) {
              g.fillStyle = this.shade(base, .07);
              g.fillRect(x + off + 2, r * h + 2, N - 4, h - 4);
            }
          }
          for (let i = 0; i < 60; i++) {
            g.fillStyle = rnd() > .5 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.07)';
            g.fillRect(rnd() * N, rnd() * N, 3, 3);
          }
          break;
        }
        default:
          /* Plaster, painted the colour of the room, with the mottling of a
             wall that has been touched up in patches for twenty years. */
          for (let i = 0; i < 7; i++) {
            g.fillStyle = rnd() > .5 ? 'rgba(255,255,255,.022)' : 'rgba(0,0,0,.05)';
            g.beginPath();
            g.ellipse(rnd() * N, rnd() * N, 10 + rnd() * 22, 8 + rnd() * 18, 0, 0, 6.3);
            g.fill();
          }
          /* Every wall at trolley height in this building has one of these. */
          if (v) { g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(rnd() * N * .5, N * .58, 12 + rnd() * 14, 3); }
      }
    });
  },
  /* Bake an out-of-focus version of the current frame into the canvas, once,
     when a full-screen overlay opens. One canvas operation instead of a CSS
     filter the compositor would redo on every frame. */
  freeze() {
    const c = this.ctx, cv = this.cv;
    if (typeof c.filter === 'undefined') return;   /* older Safari: just stay sharp */
    try {
      const s = this._scratch || (this._scratch = document.createElement('canvas'));
      if (s.width !== cv.width || s.height !== cv.height) { s.width = cv.width; s.height = cv.height; }
      const sc = s.getContext('2d');
      sc.clearRect(0, 0, s.width, s.height);
      sc.drawImage(cv, 0, 0);
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, cv.width, cv.height);
      c.filter = 'blur(' + (6 * this.dpr).toFixed(1) + 'px) saturate(0.75) brightness(0.72)';
      c.drawImage(s, 0, 0);
      c.filter = 'none';
    } catch (e) { /* leave the sharp frame in place */ }
  },
  shadow(x, y, w, h) {
    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,.35)';
    c.beginPath(); c.ellipse(x, y, w, h, 0, 0, 6.3); c.fill();
  },
  /* ---- Legacy furniture ----
     Desks, tables, worktops, counters, cubicles and doorways are full of pixel
     counts chosen by eye at the old 44px tile. Rather than re-tune sixty of
     them, they draw in their own units and the canvas scales them down: `fn`
     is handed that tile size, shadowing the global one. Anything new should be
     written against TILE and stay outside this wrapper. */
  REF_TILE: 44,
  legacy(fn) {
    const c = this.ctx;
    c.save(); c.scale(TILE / this.REF_TILE, TILE / this.REF_TILE);
    fn(this.REF_TILE);
    c.restore();
  },
  /* Doorways, built into the wall rather than floating in the gap. The tile
     stays walkable — nothing here touches World.solid — so a doorway is purely
     what it looks like: two jambs carrying the wall into the opening, a
     threshold strip across the floor, and a leaf on the hinge side. */
  doorways(x0, y0, x1, y1) {
    this.legacy(TILE => {
      const list = World.doorways; if (!list) return;
      const c = this.ctx;
      for (let i = 0; i < list.length; i++) {
        const d = list[i];
        if (d.x < x0 - 1 || d.x > x1 + 1 || d.y < y0 - 1 || d.y > y1 + 1) continue;
        const z = World.zone[d.y] && World.zone[d.y][d.x];
        const wall = (ZONES[z] && ZONES[z].wall) || '#1a212e';
        const px = d.x * TILE, py = d.y * TILE;
        const JAMB = 9;                     /* how far the wall reaches in */
        c.save();
        if (!d.solid) {
          /* The reveal: the cut face of the wall, darker than the wall itself. */
          c.fillStyle = wall;
          if (d.axis === 'h') {
            /* Only where there is a wall to carry in. A two-tile opening is
               one opening: jamb both halves and you build a post down the
               middle of your own double doorway. */
            const wOpen = list.some(o => o.y === d.y && o.x === d.x - 1);
            const eOpen = list.some(o => o.y === d.y && o.x === d.x + 1);
            if (!wOpen) c.fillRect(px, py, JAMB, TILE);
            if (!eOpen) c.fillRect(px + TILE - JAMB, py, JAMB, TILE);
            c.fillStyle = 'rgba(255,255,255,.06)';
            if (!wOpen) c.fillRect(px, py, JAMB, 3);
            if (!eOpen) c.fillRect(px + TILE - JAMB, py, JAMB, 3);
            c.fillStyle = 'rgba(0,0,0,.45)';
            if (!wOpen) c.fillRect(px + JAMB - 2, py, 2, TILE);
            if (!eOpen) c.fillRect(px + TILE - JAMB, py, 2, TILE);
            /* Threshold: a strip of a different material underfoot. */
            c.fillStyle = 'rgba(140,150,170,.16)';
            c.fillRect(px + JAMB, py + TILE / 2 - 4, TILE - JAMB * 2, 8);
            c.fillStyle = 'rgba(0,0,0,.25)';
            c.fillRect(px + JAMB, py + TILE / 2 - 4, TILE - JAMB * 2, 1.5);
          } else {
            c.fillRect(px, py, TILE, JAMB);
            c.fillRect(px, py + TILE - JAMB, TILE, JAMB);
            c.fillStyle = 'rgba(255,255,255,.06)';
            c.fillRect(px, py, TILE, 2);
            c.fillStyle = 'rgba(0,0,0,.45)';
            c.fillRect(px, py + JAMB - 2, TILE, 2);
            c.fillRect(px, py + TILE - JAMB, TILE, 2);
            c.fillStyle = 'rgba(140,150,170,.16)';
            c.fillRect(px + TILE / 2 - 4, py + JAMB, 8, TILE - JAMB * 2);
            c.fillStyle = 'rgba(0,0,0,.25)';
            c.fillRect(px + TILE / 2 - 4, py + JAMB, 1.5, TILE - JAMB * 2);
          }
        }
        /* The leaf. Locked is shut across the opening with a reader beside it,
           open is swung back against its jamb — which is what tells you at a
           glance that you can walk through. */
        const open = !d.locked;
        const face = d.locked ? '#5b4632' : '#7c5738';
        /* The kit's own leaf is drawn afterwards at true scale by
           doorLeaves(); this block still draws a door in a vertical wall,
           which the kit has no art for. */
        /* A vertical opening you can walk through gets no leaf at all (see
           doorLeaves); one set into a solid wall still needs something to show
           for itself, so it keeps the drawn leaf. */
        const kitLeaf = Tiles.has(d.locked ? 'door.shut.locked' : 'door.open')
          && (d.axis === 'h' || !d.solid);
        const leaf = (lx, ly, lw, lh, vert) => {
          /* `vert` says which way the leaf runs. Hinges go at the near end of its
             long edge and the handle at the far end, so a shut door and an open
             one are read the same way round. */
          c.fillStyle = 'rgba(0,0,0,.40)';
          c.beginPath(); c.roundRect(lx + 1.5, ly + 2, lw, lh, 2); c.fill();
          const g = c.createLinearGradient(lx, ly, vert ? lx + lw : lx, vert ? ly : ly + lh);
          g.addColorStop(0, this.shade(face, .12)); g.addColorStop(1, this.shade(face, -.16));
          c.fillStyle = g;
          c.beginPath(); c.roundRect(lx, ly, lw, lh, 2); c.fill();
          c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 1;
          c.beginPath(); c.roundRect(lx + .5, ly + .5, lw - 1, lh - 1, 2); c.stroke();
          /* Two recessed panels down the length of it. */
          for (let p = 0; p < 2; p++) {
            const a = .36 + p * .28;
            c.fillStyle = 'rgba(0,0,0,.24)';
            if (vert) c.fillRect(lx + 2.5, ly + lh * a, lw - 5, lh * .21);
            else c.fillRect(lx + lw * a, ly + 2.5, lw * .21, lh - 5);
            c.fillStyle = 'rgba(255,255,255,.08)';
            if (vert) c.fillRect(lx + 2.5, ly + lh * a, lw - 5, 1);
            else c.fillRect(lx + lw * a, ly + 2.5, 1, lh - 5);
          }
          c.fillStyle = 'rgba(210,220,235,.42)';
          for (let h = 0; h < 2; h++) {
            const a = h ? .24 : .09;
            if (vert) c.fillRect(lx, ly + lh * a, lw, 2);
            else c.fillRect(lx + lw * a, ly, 2, lh);
          }
          c.fillStyle = '#d8c48a';
          if (vert) c.fillRect(lx + lw * .18, ly + lh - 7, lw * .64, 2.5);
          else c.fillRect(lx + lw - 7, ly + lh * .18, 2.5, lh * .64);
        };
        /* Architrave: the frame the leaf hangs in. Only on an opening you can
           walk through — a door set into a solid wall has no reveal to trim. */
        if (!d.solid) {
          c.fillStyle = 'rgba(255,255,255,.05)';
          if (d.axis === 'h') {
            if (!list.some(o => o.y === d.y && o.x === d.x - 1)) c.fillRect(px + JAMB - 3, py, 3, TILE);
            if (!list.some(o => o.y === d.y && o.x === d.x + 1)) c.fillRect(px + TILE - JAMB, py, 3, TILE);
          }
          else { c.fillRect(px, py + JAMB - 3, TILE, 3); c.fillRect(px, py + TILE - JAMB, TILE, 3); }
        }
        if (kitLeaf) { c.restore(); continue; }
        if (d.axis === 'h') {
          if (open) leaf(px + JAMB, py + 5, TILE * 0.28, TILE - 10, true);
          else {
            leaf(px + JAMB, py + TILE / 2 - 5, TILE - JAMB * 2, 10, false);
            /* The reader. Green because it is working, which is not the same
               thing as it letting you in. */
            c.fillStyle = 'rgba(18,24,32,.9)';
            c.fillRect(px + TILE - JAMB + 1, py + TILE / 2 - 9, 6, 12);
            c.fillStyle = '#5ad48a'; c.fillRect(px + TILE - JAMB + 3, py + TILE / 2 - 6, 2, 2);
          }
        } else {
          if (open) leaf(px + 5, py + JAMB, TILE - 10, TILE * 0.28, false);
          else {
            leaf(px + TILE / 2 - 5, py + JAMB, 10, TILE - JAMB * 2, true);
            c.fillStyle = 'rgba(18,24,32,.9)';
            c.fillRect(px + TILE / 2 - 9, py + TILE - JAMB + 1, 12, 6);
            c.fillStyle = '#5ad48a'; c.fillRect(px + TILE / 2 - 6, py + TILE - JAMB + 3, 2, 2);
          }
        }
        c.restore();
      }
    });
  },
  /* The kit's door leaves, drawn at true scale — outside legacy(), because a
     32px sprite scaled by 32/44 is not pixel art any more. Only openings in a
     horizontal wall: the kit draws a door face-on, which is what you see of a
     wall running left to right, and R.doorways() still draws the rest. */
  doorLeaves(x0, y0, x1, y1) {
    const list = World.doorways; if (!list || !Tiles.ready) return;
    const c = this.ctx;
    for (const d of list) {
      if (d.x < x0 - 1 || d.x > x1 + 1 || d.y < y0 - 1 || d.y > y1 + 1) continue;
      const n = d.locked ? 'door.shut.locked' : d.solid ? 'door.shut' : 'door.open';
      if (!Tiles.has(n)) continue;
      /* The far half of a two-tile opening is the other leaf of a pair, so it
         is hinged on the other jamb and mirrored. Detected by asking whether
         the tile to the west is also part of this opening. */
      /* Nothing for a walkable opening in a vertical wall. The kit draws doors
         face-on and turning one on its side reads as decking, not as a door;
         an opening you walk through sideways is a gap with the leaf swung back
         out of sight, and jambs and a threshold say that on their own. */
      if (d.axis !== 'h') continue;
      const pair = list.some(o => o.y === d.y && o.x === d.x - 1 && o.axis === 'h');
      /* Hung in the wall band, standing on the threshold. */
      Tiles.draw(c, n, (d.x + .5) * TILE, (d.y + .5) * TILE - TILE * .18, pair);
    }
  },
  /* Strip lighting: the only thing breaking up an acre of identical carpet.
     One cached sprite on a 7-tile grid, offset from the 4-tile desk pitch or
     the pools line up with the rows and read as banding. Light tubes were tried
     and removed — a bright bar every few tiles reads as a rendering fault. */
  ceiling(x0, y0, x1, y1) {
    const c = this.ctx;
    /* Offset from the desk grid deliberately: on a multiple of the 4-tile desk
       pitch the pools line up with the rows and read as banding rather than as
       light. Tubes were tried and removed — at this scale a 44px bright bar
       every few tiles looks like a rendering fault, not a light fitting. */
    const SP = 7, OFF = 3;
    const pool = this.glow('rgba(255,246,220,ALPHA)', Math.round(TILE * 4.3));
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = .14;
    const ty0 = Math.floor((y0 - OFF) / SP) * SP + OFF;
    const tx0 = Math.floor((x0 - OFF) / SP) * SP + OFF;
    for (let ty = ty0; ty <= y1 + SP; ty += SP) {
      for (let tx = tx0; tx <= x1 + SP; tx += SP) {
        if (ty < 0 || tx < 0 || ty >= MAPH || tx >= MAPW) continue;
        if (!World.zone[ty][tx] || World.solid[ty][tx]) continue;
        c.drawImage(pool, (tx + .5) * TILE - pool.width / 2, (ty + .5) * TILE - pool.height / 2);
      }
    }
    c.restore();
  },
  /* The outdoor counterpart of ceiling(): flat, cold and everywhere at once,
     which is exactly the difference between daylight and a strip light. One
     rectangle over the viewport rather than a grid of pools — an overcast sky
     is the only light source in the game with no shape to it. */
  daylight() {
    const c = this.ctx;
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = .075;
    c.fillStyle = '#a8c4e0';
    c.fillRect(Cam.x, Cam.y, Cam.w, Cam.h);
    c.restore();
  },
  /* The map underneath has been replaced. Anything cached off its shape — the
     minimap is baked once and blitted after that — has to go, or the new level
     is played over a picture of the old one. */
  levelChanged() { this._mmBase = null; },
  /* Desks. Thirty-two of them, and until now they were a monitor emoji and a
     phone emoji sitting on carpet with nothing underneath — which is what made
     the floor read as a spreadsheet rather than an office. Each one gets a
     surface to stand on and a partition behind it. */
  desks(x0, y0, x1, y1) {
    this.legacy(TILE => {
      const list = World.desks; if (!list) return;
      const c = this.ctx;
      for (let i = 0; i < list.length; i++) {
        const d = list[i];
        if (d.x + d.w < x0 - 1 || d.x > x1 + 1 || d.y < y0 - 2 || d.y > y1 + 1) continue;
        const px = d.x * TILE + 3, py = d.y * TILE + 4;
        const w = d.w * TILE - 6, h = TILE - 6;

        /* Partition behind: fabric panel, lit along its top edge. Drawn first so
           the desk surface overlaps its foot. */
        const ph = 13;
        c.fillStyle = 'rgba(0,0,0,.28)';
        c.fillRect(px - 2, py - ph + 3, w + 4, ph);
        c.fillStyle = '#3a4357';
        c.fillRect(px - 2, py - ph, w + 4, ph);
        c.fillStyle = 'rgba(255,255,255,.10)';
        c.fillRect(px - 2, py - ph, w + 4, 2);
        c.fillStyle = 'rgba(0,0,0,.18)';
        c.fillRect(px - 2, py - 2, w + 4, 2);

        /* Contact shadow, then the desktop itself. */
        c.fillStyle = 'rgba(0,0,0,.30)';
        c.beginPath(); c.roundRect(px + 2, py + 5, w, h, 6); c.fill();
        /* Warmer and lighter than the carpet on purpose — at the carpet's own
           blue-grey the surface disappeared and the desks went back to looking
           like emoji on a floor. */
        const g = c.createLinearGradient(0, py, 0, py + h);
        g.addColorStop(0, '#6d7183');
        g.addColorStop(1, '#4c5162');
        c.fillStyle = g;
        c.beginPath(); c.roundRect(px, py, w, h, 6); c.fill();
        /* Laminate edge: a light top lip and a dark front lip. */
        c.fillStyle = 'rgba(255,255,255,.13)';
        c.beginPath(); c.roundRect(px, py, w, 3, 3); c.fill();
        c.fillStyle = 'rgba(0,0,0,.22)';
        c.beginPath(); c.roundRect(px, py + h - 3, w, 3, 3); c.fill();
        /* A keyboard in front of the monitor. Small, but it is the detail that
           makes the surface read as a desk rather than a coloured rectangle. */
        c.fillStyle = 'rgba(20,25,34,.55)';
        c.beginPath(); c.roundRect(px + 7, py + h - 13, TILE - 20, 9, 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,.07)';
        c.fillRect(px + 9, py + h - 11, TILE - 24, 1.5);
        /* Clutter. Deterministic per desk — a stable seed off the index, not
           Math.random(), or the papers rearrange themselves every frame. Thirty-
           two identical desks is the joke; thirty-two identical desks rendered
           identically is just a tiling pattern. */
        const s = (i * 2654435761) % 97 / 97;
        const cx2 = px + w - 30;
        if (s > .18) {                                   /* a mug */
          c.fillStyle = ['#c9d3e4', '#d8b48a', '#8ab6d8', '#cf8f8f'][i % 4];
          c.beginPath(); c.arc(cx2 + 5, py + 11, 4, 0, 6.3); c.fill();
          c.fillStyle = 'rgba(0,0,0,.35)';
          c.beginPath(); c.arc(cx2 + 5, py + 11, 2.1, 0, 6.3); c.fill();
        }
        if (s > .45) {                                   /* a stack of paper */
          c.fillStyle = 'rgba(232,236,244,.72)';
          c.fillRect(px + 9, py + 7, 13, 9);
          c.fillStyle = 'rgba(0,0,0,.2)';
          c.fillRect(px + 10, py + 9, 9, 1); c.fillRect(px + 10, py + 12, 7, 1);
        }
        if (s > .72) {                                   /* a sticky note */
          c.fillStyle = ['#ffe08a', '#b9e6a1', '#ffb8c8'][i % 3];
          c.fillRect(cx2 - 8, py + h - 15, 8, 8);
        }
        /* Yours has a name card on it. Thirty-two identical desks is the joke;
           being unable to find your own was not meant to be part of it. */
        if (d.mine) {
          c.fillStyle = 'rgba(90,212,138,.16)';
          c.beginPath(); c.roundRect(px, py, w, h, 6); c.fill();
          c.strokeStyle = 'rgba(90,212,138,.5)'; c.lineWidth = 1.5;
          c.beginPath(); c.roundRect(px, py, w, h, 6); c.stroke();
          c.fillStyle = '#e9eef7';
          c.fillRect(px + w - 27, py + h - 13, 21, 9);
          c.fillStyle = 'rgba(0,0,0,.5)';
          c.fillRect(px + w - 25, py + h - 11, 17, 1.5);
          c.fillRect(px + w - 25, py + h - 8, 11, 1.5);
        }
      }
    });
  },
  /* A slab with a lit top edge and a dark front lip — the same read as the
     desks, so a table looks like it belongs to the same office. */
  slab(px, py, w, h, top, bot, r = 6) {
    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,.30)';
    c.beginPath(); c.roundRect(px + 2, py + 5, w, h, r); c.fill();
    const g = c.createLinearGradient(0, py, 0, py + h);
    g.addColorStop(0, top); g.addColorStop(1, bot);
    c.fillStyle = g;
    c.beginPath(); c.roundRect(px, py, w, h, r); c.fill();
    c.fillStyle = 'rgba(255,255,255,.13)';
    c.beginPath(); c.roundRect(px, py, w, 3, 3); c.fill();
    c.fillStyle = 'rgba(0,0,0,.22)';
    c.beginPath(); c.roundRect(px, py + h - 3, w, 3, 3); c.fill();
  },
  /* A run of tables is an end, some middles and an end — tiling the middle the
     whole way puts a leg and a seam on every tile and reads as five small
     tables shoved together. Falls back to the drawn slab when the atlas has
     nothing, which is also a copy opened without art/. */
  tables(x0, y0, x1, y1) {
    const list = World.tables; if (!list) return;
    const vis = list.filter(t =>
      !(t.x + t.w < x0 - 1 || t.x > x1 + 1 || t.y < y0 - 1 || t.y > y1 + 1));
    const kit = Tiles.has('obj.table.m');
    if (kit) {
      for (const t of vis) {
        for (let i = 0; i < t.w; i++) {
          const piece = t.w === 1 ? 'obj.table.m'
            : i === 0 ? 'obj.table.l' : i === t.w - 1 ? 'obj.table.r' : 'obj.table.m';
          Tiles.draw(this.ctx, piece, (t.x + i + .5) * TILE, (t.y + .5) * TILE);
        }
      }
      return;
    }
    this.legacy(TILE => {
      for (const t of vis)
        this.slab(t.x * TILE + 3, t.y * TILE + 5, t.w * TILE - 6, TILE - 10, '#6f6152', '#4c433a', 8);
    });
  },
  /* Worktops: kitchen counters and the row of sinks in the toilets. Given a
     splashback when they stand against a wall, which is what stops them
     reading as a plank floating on the carpet. */
  worktops(x0, y0, x1, y1) {
    /* Kit units in the break room only: the same run type is also the toilets'
       vanity and the training room's bench, and a wooden kitchen carcass under
       a washroom sink is worse than the grey slab it replaced. */
    const list = World.worktops; if (!list) return;
    const kit = [];
    for (const t of list) {
      if (t.x + t.w < x0 - 1 || t.x > x1 + 1 || t.y < y0 - 2 || t.y > y1 + 1) continue;
      if (World.zoneAt(t.x, t.y) === 'brk' && Tiles.has('obj.counter')) kit.push(t); else kit.push(null);
    }
    let i = 0;
    this.legacy(TILE => {
      const c = this.ctx;
      for (const t of list) {
        if (t.x + t.w < x0 - 1 || t.x > x1 + 1 || t.y < y0 - 2 || t.y > y1 + 1) continue;
        if (kit[i++]) continue;                     /* drawn from the kit below */
        const px = t.x * TILE + 2, py = t.y * TILE + 8, w = t.w * TILE - 4, h = TILE - 14;
        if (World.solid[t.y - 1] && World.solid[t.y - 1][t.x]) {
          c.fillStyle = 'rgba(212,222,238,.10)';
          c.fillRect(px, py - 9, w, 9);
        }
        /* One mirror over the whole row of basins, part of the run rather than
           a line of hung objects. On the wall face, which for the vanity is the
           band BELOW the counter — the basins are on the last row of the room
           and the wall is to the south. Above it, it is a mirror on the floor. */
        if (World.zoneAt(t.x, t.y) === 'toilet'
            && World.solid[t.y + 1] && World.solid[t.y + 1][t.x]) {
          const my = (t.y + 1) * TILE + 2, mh = 13;
          c.fillStyle = 'rgba(24,32,42,.85)';
          c.fillRect(px - 2, my - 2, w + 4, mh + 4);
          c.fillStyle = 'rgba(126,158,192,.55)';
          c.fillRect(px, my, w, mh);
          /* Two streaks of ceiling light down the glass, per basin, which is
             the only thing that makes a rectangle read as a mirror. */
          c.fillStyle = 'rgba(232,242,255,.22)';
          /* `b`, not `i`: the run counter above is an `i` in this same
             function and a shadow here is one rename away from a silent
             off-by-one in which kitchen units draw over the vanity. */
          for (let b = 0; b < t.w; b++) {
            const bx = px + b * TILE + TILE * .2;
            c.beginPath();
            c.moveTo(bx, my + mh); c.lineTo(bx + 9, my);
            c.lineTo(bx + 14, my); c.lineTo(bx + 5, my + mh);
            c.closePath(); c.fill();
          }
          c.fillStyle = 'rgba(236,244,255,.5)'; c.fillRect(px, my, w, 1.5);
          c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(px, my + mh - 1.5, w, 1.5);
        }
        this.slab(px, py, w, h, '#7c8496', '#565d6c', 4);
      }
    });
    for (const t of kit) {
      if (!t) continue;
      for (let n = 0; n < t.w; n++) {
        Tiles.draw(this.ctx, 'obj.counter', (t.x + n + .5) * TILE, (t.y + .5) * TILE);
      }
    }
  },
  /* The reception and security counters. A counter is a desk you stand behind,
     so it gets a taller front panel and a strip of signage. */
  counter(t) {
    this.legacy(TILE => {
      const c = this.ctx;
      {
        const px = t.x * TILE + 2, py = t.y * TILE + 6, w = t.w * TILE - 4, h = TILE - 12;
        this.slab(px, py, w, h, '#5b6b86', '#38445a', 5);
        /* Front panel, standing proud of the top so it reads as a counter you
           cannot see over rather than a table you can. */
        c.fillStyle = 'rgba(16,21,30,.55)';
        c.beginPath(); c.roundRect(px + 3, py + h - 2, w - 6, 9, 3); c.fill();
        c.fillStyle = 'rgba(255,255,255,.07)';
        c.fillRect(px + 5, py + h, w - 10, 1.5);
        if (t.label) {
          c.font = '600 8px ui-monospace,Consolas,monospace';
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillStyle = 'rgba(223,230,242,.5)';
          c.fillText(t.label, px + w / 2, py + h + 3.5);
        }
      }
    });
  },
  /* Toilet cubicles: a stall with partitions on three sides and its door
     standing open, so you can see there is a toilet in there. They used to be
     drawn as doorways, which meant a door leaf lying on its side and no toilet
     at all. */
  cubicles(x0, y0, x1, y1) {
    /* Same rule as the architectural wall each stall backs onto: full height
       facing the room, fading once the player is past it. Computed here, in
       real tile units, because the drawing below runs inside legacy()'s 44px
       space and TILE means something else by the time it gets there. */
    const wallAlpha = new Map();
    for (const o of World.objects) {
      if (o.kind !== 'loo') continue;
      const rel = (P.y - o.y * TILE) / (TILE * 1.6);
      wallAlpha.set(o, Math.max(.15, Math.min(1, rel + .35)));
    }
    this.legacy(TILE => {
      const c = this.ctx;
      for (const o of World.objects) {
        if (o.kind !== 'loo') continue;
        if (o.x < x0 - 1 || o.x > x1 + 1 || o.y < y0 - 1 || o.y > y1 + 1) continue;
        /* A stall backs onto a wall. The accessible toilet is a door in the far
           wall of the room — a room, not a cubicle — and a stall drawn there
           had its back panel standing in mid-floor. */
        if (!World.solid[o.y - 1] || !World.solid[o.y - 1][o.x]) continue;
        const px = o.x * TILE, py = o.y * TILE;
        const T = 5;                                  /* partition thickness */
        /* Inside of the stall, a shade off the room so the opening reads. */
        c.fillStyle = 'rgba(10,14,19,.30)';
        c.fillRect(px + T, py - 4, TILE - T * 2, TILE - 4);
        /* Back and sides. Melamine: light face, dark edge. */
        c.fillStyle = '#5d6980';
        c.fillRect(px, py - 8, TILE, T + 3);          /* back */
        c.fillRect(px, py - 8, T, TILE + 2);          /* left */
        c.fillRect(px + TILE - T, py - 8, T, TILE + 2);
        /* The partition, two tiles tall like everything else it stands
           against — the base is always solid, and the extension above it
           fades exactly the way the real wall behind it does, so a stall
           doesn't read as a squat afterthought next to it. */
        c.save();
        c.globalAlpha = wallAlpha.get(o);
        c.fillStyle = '#5d6980';
        c.fillRect(px, py - 8 - TILE, TILE, TILE);          /* back ext. */
        c.fillRect(px, py - 8 - TILE, T, TILE);             /* left ext. */
        c.fillRect(px + TILE - T, py - 8 - TILE, T, TILE);  /* right ext. */
        c.fillStyle = 'rgba(255,255,255,.10)';
        c.fillRect(px, py - 8 - TILE, TILE, 2);
        c.restore();
        c.fillStyle = 'rgba(0,0,0,.35)';
        c.fillRect(px, py + TILE - 6, T, 6);
        c.fillRect(px + TILE - T, py + TILE - 6, T, 6);
        /* The door, hinged left and standing open into the room. */
        c.fillStyle = '#6b7790';
        c.fillRect(px + T - 1, py + TILE - 6, TILE - T * 2 - 8, T);
        c.fillStyle = 'rgba(0,0,0,.3)';
        c.fillRect(px + T - 1, py + TILE - 6 + T, TILE - T * 2 - 8, 2);
        /* Vacant/engaged, the only thing anybody actually reads on a cubicle.
           The engaged one also gets a real closed door drawn over all of this,
           below — the indicator stays because the door is only there when the
           atlas is. */
        c.fillStyle = o.n === 1 && G.flags.looClosed ? '#ff5f56' : '#5ad48a';
        c.fillRect(px + TILE - T - 4, py + TILE - 7, 3, 3);
      }
    });
    /* The locked cubicle, drawn shut. Outside legacy(): this is kit art and
       belongs in TILE space rather than in the 44px space the drawn furniture
       above was written for. Only ever the engaged one — a closed door on the
       three you can walk into would cover the pan, and the whole point of the
       stall standing open is that you can see there is one. */
    for (const o of World.objects) {
      if (o.kind !== 'loo' || !(o.n === 1 && G.flags.looClosed)) continue;
      if (o.x < x0 - 1 || o.x > x1 + 1 || o.y < y0 - 1 || o.y > y1 + 1) continue;
      if (!World.solid[o.y - 1] || !World.solid[o.y - 1][o.x]) continue;
      Tiles.draw(this.ctx, 'loo.door', (o.x + .5) * TILE, (o.y + .5) * TILE);
    }
  },
  /* How much of an object standing BEHIND a wall you are allowed to see.

     Every wall you can see the front of gets a second tile stacked into the
     row above it, and that row is real floor with real furniture on it. The
     extension is painted in the wall pass; the drawables come after it, full
     stop — which is exactly what keeps the wall off the player's head, and
     exactly what let the far room's furniture paint straight over the wall
     enclosing it. Thirteen objects on the fourth floor alone: the fax table
     through the management wall, the trophy shelf, three sinks through the
     back of the toilets.

     It is not a cull, because from the OTHER side that object is in the room
     you are standing in and must be fully visible — which is the same reason
     the extension itself fades to .15 when you cross. So it fades on the wall's
     own ramp, in the opposite direction, and the two cross over while you are
     standing in the wall band and looking at neither. */
  veil(o) {
    if (o.mount === 'wall' || o.onTable) return 1;
    return this.veilAt(o.x, o.y);
  },
  /* The same question for anything that stands on a tile rather than being an
     object — a colleague, mostly. NPCs are drawn in the sorted pass like the
     furniture and were just as visible through the wall in front of them. The
     PLAYER is deliberately never asked: the extension fades so you can see your
     own avatar when you cross, and veiling it would undo the thing the fade is
     for. */
  veilAt(x, y) {
    const wy = y + 1;
    if (wy + 1 >= MAPH || !World.solid[wy] || !World.solid[wy][x]) return 1;
    /* Only a wall with a room below it grows the extension — see the `below`
       branch of the wall loop. Interior mass has nothing stacked on it. */
    if (World.solid[wy + 1][x] || !World.zone[wy + 1][x]) return 1;
    const rel = (P.y - wy * TILE) / (TILE * 1.6);
    return Math.max(0, Math.min(1, (1 - Math.max(.15, Math.min(1, rel + .35))) * 2.2));
  },

  /* ---- The drawn things ----
     At 29px the candidate emoji are four near-identical rounded rectangles, and
     some things have none at all. Each is seeded off its own id, so the same
     poster is the same poster every frame and no two are alike. The test is
     whether the emoji is worse than nothing, not whether it hangs on a wall. */
  wallArt(o, ex, ey, size) {
    const c = this.ctx;
    const rnd = this._rand(this._hash(o.id + o.kind));
    const r1 = rnd(), r2 = rnd(), r3 = rnd();
    /* Seen at an angle, a thing on a side wall shows you its edge rather than
       its face. Squashing it is cheaper than a second set of drawings and
       reads correctly at this size. */
    const side = o.wallSide;
    const sq = (side === 'w' || side === 'e') ? .44 : 1;
    c.save();
    c.translate(ex, ey);
    c.scale(sq, 1);
    /* A poster nobody has straightened since it went up. Boards and screens
       are screwed to the wall and stay level. */
    if (o.art === 'poster') c.rotate((r3 - .5) * .13);
    const frame = (w, h, edge, fill) => {
      c.fillStyle = 'rgba(0,0,0,.45)';
      c.fillRect(-w / 2 + 2, -h / 2 + 3, w, h);
      c.fillStyle = edge; c.fillRect(-w / 2, -h / 2, w, h);
      c.fillStyle = fill; c.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
      c.fillStyle = 'rgba(255,255,255,.10)'; c.fillRect(-w / 2, -h / 2, w, 1.5);
    };
    switch (o.art) {
      case 'poster': {
        const w = size * .82, h = size * 1.12;
        const tint = ['#4da3ff', '#5ad48a', '#ffb347', '#b48cff', '#ff5f56'][Math.floor(r1 * 5)];
        frame(w, h, '#20262f', '#e9eef7');
        /* The photograph, the enormous single word, and the small print
           nobody has read since 2016. */
        c.fillStyle = tint;
        c.globalAlpha = .55; c.fillRect(-w / 2 + 4, -h / 2 + 4, w - 8, h * .42); c.globalAlpha = 1;
        c.fillStyle = '#2b3444';
        c.fillRect(-w / 2 + 4, -h / 2 + h * .52, (w - 8) * (.5 + r2 * .45), 4);
        c.fillStyle = 'rgba(43,52,68,.55)';
        for (let i = 0; i < 3; i++)
          c.fillRect(-w / 2 + 4, -h / 2 + h * .66 + i * 4, (w - 8) * (.4 + rnd() * .55), 1.5);
        break;
      }
      case 'board': {
        /* Cork, and four things pinned to it at four different angles by four
           people who each thought theirs was the important one. */
        const w = size * 1.12, h = size * .84;
        frame(w, h, '#2a2018', '#8a6b46');
        for (let i = 0; i < 4; i++) {
          const pw = 6 + rnd() * 5, ph = 7 + rnd() * 4;
          const x = -w / 2 + 5 + rnd() * (w - 12), y = -h / 2 + 4 + rnd() * (h - 12);
          c.save(); c.translate(x, y); c.rotate((rnd() - .5) * .4);
          c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(-pw / 2 + 1, -ph / 2 + 1, pw, ph);
          c.fillStyle = ['#e9eef7', '#e9eef7', '#ffe08a', '#b9e6a1'][i];
          c.fillRect(-pw / 2, -ph / 2, pw, ph);
          c.fillStyle = 'rgba(0,0,0,.35)';
          c.fillRect(-pw / 2 + 1.5, -ph / 2 + 2, pw - 3, 1);
          c.fillRect(-pw / 2 + 1.5, -ph / 2 + 4.5, pw - 5, 1);
          c.fillStyle = '#ff5f56';
          c.beginPath(); c.arc(0, -ph / 2 + 1.5, 1.3, 0, 6.3); c.fill();
          c.restore();
        }
        break;
      }
      case 'chart': {
        /* Bars going up and a line going down, or the other way round. It has
           never mattered which. */
        const w = size * 1.16, h = size * .8;
        frame(w, h, '#20262f', '#f2f5fa');
        const n = 5, bw = (w - 12) / n;
        for (let i = 0; i < n; i++) {
          const bh = (h - 12) * (.25 + rnd() * .7);
          c.fillStyle = i === n - 1 ? '#ff5f56' : '#4da3ff';
          c.fillRect(-w / 2 + 5 + i * bw, h / 2 - 5 - bh, bw - 2, bh);
        }
        c.strokeStyle = 'rgba(20,26,36,.5)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(-w / 2 + 4, h / 2 - 5); c.lineTo(w / 2 - 4, h / 2 - 5); c.stroke();
        break;
      }
      case 'window': {
        /* The only daylight in the building, and it keeps the time: the glass
           goes from morning to five o'clock over the course of a shift. */
        const w = size * 1.06, h = size * .86;
        const t = Math.max(0, Math.min(1, (G.minutes - DAY_START) / Math.max(1, DAY_END - DAY_START)));
        const sky = c.createLinearGradient(0, -h / 2, 0, h / 2);
        sky.addColorStop(0, t > .82 ? '#5a4a6b' : t < .18 ? '#7f9dc4' : '#9fc4e8');
        sky.addColorStop(1, t > .82 ? '#c08a5a' : t < .18 ? '#c9d7e6' : '#dce9f6');
        frame(w, h, '#cdd6e4', '#8fb4d8');
        c.fillStyle = sky; c.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
        /* The building opposite, which is the whole view. */
        c.fillStyle = 'rgba(30,38,52,.45)';
        c.fillRect(-w / 2 + 3, h / 2 - 3 - h * .3, w - 6, h * .3);
        c.fillStyle = 'rgba(255,214,120,' + (t > .7 ? .5 : .16) + ')';
        for (let i = 0; i < 6; i++)
          c.fillRect(-w / 2 + 6 + rnd() * (w - 14), h / 2 - 4 - rnd() * h * .26, 2, 2);
        /* Frame: one mullion, one transom, and a sill you could put a mug on. */
        c.fillStyle = '#cdd6e4';
        c.fillRect(-1.5, -h / 2 + 3, 3, h - 6); c.fillRect(-w / 2 + 3, -2, w - 6, 3);
        c.fillStyle = 'rgba(255,255,255,.18)';
        c.beginPath(); c.moveTo(-w / 2 + 4, h / 2 - 4); c.lineTo(w / 2 - 4, -h / 2 + 4);
        c.lineTo(w / 2 - 4, -h / 2 + 10); c.lineTo(-w / 2 + 10, h / 2 - 4); c.closePath(); c.fill();
        c.fillStyle = '#b6c1d2'; c.fillRect(-w / 2 - 2, h / 2 - 1, w + 4, 3);
        break;
      }
      case 'screen': {
        const w = size * 1.0, h = size * .74;
        frame(w, h, '#0f141b', '#10161e');
        c.fillStyle = 'rgba(77,163,255,' + (.14 + Math.abs(Math.sin(this.t * 1.6 + r1 * 6)) * .1) + ')';
        c.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
        c.fillStyle = 'rgba(200,225,255,.55)';
        for (let i = 0; i < 3; i++)
          c.fillRect(-w / 2 + 6, -h / 2 + 7 + i * 5, (w - 12) * (.35 + rnd() * .6), 1.5);
        c.fillStyle = '#5ad48a';
        c.beginPath(); c.arc(w / 2 - 4, h / 2 - 4, 1.2, 0, 6.3); c.fill();
        break;
      }
      case 'roll': {
        /* Bracket, roll, and the tail hanging off it. The one with something
           written on it has something written on it. */
        const w = size * .95, h = size * .72;
        c.fillStyle = 'rgba(0,0,0,.4)';
        c.beginPath(); c.ellipse(1, h * .5, w * .34, 3, 0, 0, 6.3); c.fill();
        c.fillStyle = '#9aa6ba'; c.fillRect(-w / 2, -h / 2, 3, h * .8);
        c.fillRect(w / 2 - 3, -h / 2, 3, h * .8);
        c.fillStyle = '#b7c2d4'; c.fillRect(-w / 2, -h / 2, w, 3);
        /* The paper. */
        c.fillStyle = '#f4f6fa';
        c.beginPath(); c.ellipse(0, h * .06, w * .33, h * .33, 0, 0, 6.3); c.fill();
        c.fillStyle = 'rgba(0,0,0,.18)';
        c.beginPath(); c.ellipse(0, h * .06, w * .11, h * .11, 0, 0, 6.3); c.fill();
        c.fillStyle = '#e8ecf4';
        c.fillRect(w * .22, h * .06, w * .13, h * .48);
        /* The flap, and on one of them, the writing. */
        c.fillStyle = '#aab5c8'; c.fillRect(-w * .38, -h * .34, w * .76, 4);
        if (o.use === 'poopRoll') {
          c.fillStyle = 'rgba(30,40,120,.85)';
          c.fillRect(-w * .30, -h * .33, w * .40, 1.4);
          c.fillRect(-w * .30, -h * .27, w * .28, 1.2);
          /* the arrow, pointing at the toilet roll */
          c.fillRect(w * .14, -h * .30, 1.2, h * .16);
          c.fillRect(w * .11, -h * .18, 4, 1.2);
        }
        break;
      }
      case 'sign': {
        /* 🪧 is a placard on a stick and every sign in this building is a
           laminated A5 someone printed in 2017. A plate, a coloured band, and
           two lines of words you have never once read — plus a stand, but only
           for the one that is standing in the middle of the floor. */
        const w = size * 1.04, h = size * .66;
        if (!side) {
          c.fillStyle = 'rgba(0,0,0,.35)';
          c.beginPath(); c.ellipse(0, h * .74, w * .3, 3, 0, 0, 6.3); c.fill();
          c.fillStyle = '#8c97a8'; c.fillRect(-1.5, h * .3, 3, h * .44);
        }
        frame(w, h, '#20262f', '#f2f5fa');
        c.fillStyle = ['#4da3ff', '#ff5f56', '#ffb347'][Math.floor(r1 * 3)];
        c.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h * .26);
        c.fillStyle = 'rgba(43,52,68,.6)';
        for (let i = 0; i < 2; i++)
          c.fillRect(-w / 2 + 4, h * .04 + i * 4, (w - 8) * (.55 + rnd() * .4), 1.5);
        break;
      }
      case 'dryer': {
        /* 🖐️ is a hand, waving, at head height. This is the machine: a box on
           the wall, a nozzle underneath, and the standby light that is the only
           part of it anybody trusts. */
        const w = size * .96, h = size * .8;
        frame(w, h, '#1b2028', '#ccd5e2');
        c.fillStyle = 'rgba(20,26,36,.42)';
        for (let i = 0; i < 3; i++) c.fillRect(-w / 2 + 4, -h / 2 + 5 + i * 3, w - 8, 1.4);
        /* The nozzle, and the draught coming out of it. */
        c.fillStyle = '#8792a4';
        c.fillRect(-w * .26, h / 2 - 3, w * .52, 4);
        c.fillStyle = 'rgba(180,205,240,.30)';
        c.fillRect(-w * .18, h / 2 + 1, w * .36, 3);
        c.fillStyle = '#5ad48a';
        c.beginPath(); c.arc(w / 2 - 4, h / 2 - 6, 1.2, 0, 6.3); c.fill();
        break;
      }
      case 'loo': {
        /* The pan inside a cubicle, seen from above: cistern at the back with
           the flush plate on it, the seat ring, and the water. */
        const w = size * .68, h = size * .96;
        c.fillStyle = 'rgba(0,0,0,.32)';
        c.beginPath(); c.ellipse(1, h * .34, w * .5, h * .16, 0, 0, 6.3); c.fill();
        c.fillStyle = '#dbe3ee';
        c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h * .36, 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-w / 2, -h / 2, w, 1.5);
        c.fillStyle = '#9fabbd'; c.fillRect(-3, -h * .40, 6, 3.5);
        c.fillStyle = 'rgba(20,26,36,.20)'; c.fillRect(-w / 2, -h * .16, w, 2);
        c.fillStyle = '#eef2f8';
        c.beginPath(); c.ellipse(0, h * .14, w * .46, h * .30, 0, 0, 6.3); c.fill();
        c.strokeStyle = '#c3cddb'; c.lineWidth = 2.2;
        c.beginPath(); c.ellipse(0, h * .14, w * .33, h * .21, 0, 0, 6.3); c.stroke();
        c.fillStyle = 'rgba(96,152,196,.42)';
        c.beginPath(); c.ellipse(0, h * .16, w * .21, h * .12, 0, 0, 6.3); c.fill();
        break;
      }
      case 'graf': {
        /* Biro, years of it, on tile. Not one message — a dozen, over each
           other, at every angle, most of them illegible, which is what the act
           that reads them out is describing. */
        const w = size * 1.1, h = size * .9;
        for (let i = 0; i < 11; i++) {
          const y = -h / 2 + 2 + rnd() * (h - 4);
          const x = -w / 2 + 1 + rnd() * (w * .35);
          const len = (w - 4) * (.3 + rnd() * .62);
          c.strokeStyle = rnd() < .78 ? 'rgba(38,52,120,.75)' : 'rgba(24,26,32,.6)';
          c.lineWidth = rnd() < .3 ? 1.4 : .9;
          c.beginPath();
          c.moveTo(x, y);
          /* Handwriting: three little humps rather than a straight rule, or it
             reads as a barcode. */
          for (let s = 1; s <= 3; s++)
            c.lineTo(x + len * (s / 3), y + (rnd() - .5) * 2.4);
          c.stroke();
        }
        /* The one somebody went over twice so it would still be there. */
        c.strokeStyle = 'rgba(46,60,140,.9)'; c.lineWidth = 1.8;
        c.beginPath();
        c.moveTo(-w / 2 + 2, h * .18); c.lineTo(w * .28, h * .18 + (r2 - .5) * 2);
        c.stroke();
        break;
      }
      case 'ledger': {
        /* Not everything flat is on a wall: the sign-in book lies open on the
           reception counter with a biro on a string beside it, which is the
           only way a visitors' book has ever been drawn. */
        const w = size * 1.25, h = size * .8;
        c.fillStyle = 'rgba(0,0,0,.38)';
        c.beginPath(); c.roundRect(-w / 2 + 2, -h / 2 + 3, w, h, 2); c.fill();
        c.fillStyle = '#7c3f3f';                      /* the hardbound cover */
        c.beginPath(); c.roundRect(-w / 2 - 1.5, -h / 2 - 1, w + 3, h + 2, 2); c.fill();
        c.fillStyle = '#f4f1e8';
        c.fillRect(-w / 2, -h / 2, w, h);
        c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(-1, -h / 2, 2, h);
        /* Ruled columns — NAME, COMPANY, VISITING — and the entries, which stop
           partway down the page and have never got as far as TIME OUT. */
        c.fillStyle = 'rgba(60,72,92,.45)';
        c.fillRect(-w * .16, -h / 2 + 2, 1, h - 4);
        c.fillRect(w * .22, -h / 2 + 2, 1, h - 4);
        c.fillStyle = 'rgba(60,72,92,.55)';
        for (let i = 0; i < 3; i++)
          c.fillRect(-w / 2 + 2, -h / 2 + 4 + i * 3, (w * .4) * (.5 + rnd() * .5), 1);
        c.fillStyle = '#2b3444';                      /* the biro, on its string */
        c.fillRect(w * .06, h * .18, w * .38, 1.6);
        break;
      }
    }
    c.restore();
  },
  draw(dt) {
    /* `|| 0` because one call with no dt makes t NaN forever, NaN spreads into
       every frame index derived from it, and a NaN frame index draws nothing
       and throws nothing. Tests calling R.draw() by hand must pass a dt. */
    const c = this.ctx; this.t += dt || 0;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, Cam.w, Cam.h);
    const sx = FX.shakeAmt ? rnd(-FX.shakeAmt, FX.shakeAmt) : 0;
    const sy = FX.shakeAmt ? rnd(-FX.shakeAmt, FX.shakeAmt) : 0;
    const ox = -Math.round(Cam.x) + sx, oy = -Math.round(Cam.y) + sy;
    c.save(); c.translate(ox, oy);

    const x0 = Math.max(0, Math.floor(Cam.x / TILE) - 1), x1 = Math.min(MAPW - 1, Math.ceil((Cam.x + Cam.w) / TILE));
    const y0 = Math.max(0, Math.floor(Cam.y / TILE) - 1), y1 = Math.min(MAPH - 1, Math.ceil((Cam.y + Cam.h) / TILE) + 1);

    /* The tile seam belongs to the sprite, not to a grid stroke over the top:
       carpet has a seam, glazed tile has grout, sheet vinyl has neither. */
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const z = World.zone[y][x];
      if (!z || World.solid[y][x]) continue;
      c.drawImage(this.floorTile(z, (x + y) & 1), x * TILE, y * TILE, TILE, TILE);
    }

    /* worn patches and old stains */
    c.fillStyle = 'rgba(255,255,255,.018)';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!World.zone[y][x] || World.solid[y][x]) continue;
      if (World.seed[y][x] > .82) c.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
    c.fillStyle = 'rgba(0,0,0,.13)'; c.beginPath();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!World.zone[y][x] || World.solid[y][x]) continue;
      const s = World.seed[y][x];
      if (s > .965) { const px = x * TILE, py = y * TILE; c.moveTo(px + TILE * s % TILE + 3 + s * 3, py + TILE * (1 - s) % TILE); c.arc(px + TILE * s % TILE, py + TILE * (1 - s) % TILE, 3 + s * 3, 0, 6.3); }
    }
    c.fill();

    /* contact shadow, two bands for a soft falloff */
    for (let pass = 0; pass < 2; pass++) {
      c.fillStyle = pass ? 'rgba(0,0,0,.10)' : 'rgba(0,0,0,.20)';
      const t = pass ? 9 : 5, o = pass ? 5 : 0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const m = World.ao[y] && World.ao[y][x];
        if (!m) continue;
        const px = x * TILE, py = y * TILE;
        if (m & 1) c.fillRect(px, py + o, TILE, t - o);
        if (m & 2) c.fillRect(px, py + TILE - t, TILE, t - o);
        if (m & 4) c.fillRect(px + o, py, t - o, TILE);
        if (m & 8) c.fillRect(px + TILE - t, py, t - o, TILE);
      }
    }
    /* walls */
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!World.solid[y][x]) continue;
      /* Which room's wall this is: the one it faces. A wall tile between two
         rooms belongs to whichever is below it, because that is the face you
         can see — and that's the ONLY neighbour a one-sided lookup like
         `south, else east` ever found, which is fine for the common case (an
         interior wall with a room to its south) but wrong for a room's own
         south or east boundary: nothing there to find, and south-else-east
         has no fallback, so it silently painted every such wall in the
         generic 'main' tint. Invisible inside the building, where most zones
         are dark variations of the same navy-grey and 'main' often IS the
         room anyway (the break room's own south wall was one of the ones
         quietly getting it wrong) — impossible to miss the moment a level's
         boundary wall is meant to be a daylit car-park breeze block and
         renders as an indoor office wall instead. All four neighbours now
         get a look, in the order the wall could actually be seen from: the
         room it caps from below, then the room it caps from above, then
         whichever side is left. */
      const nz = (World.zone[y + 1] && World.zone[y + 1][x]) || (World.zone[y - 1] && World.zone[y - 1][x])
        /* WEST before east, and that is a tie-break rather than a symmetry.
           A vertical wall run has wall above and below it, so it never reaches
           the two cases above and is decided entirely here — and whichever way
           round it goes, the tile is one finish for a partition that really has
           two. West wins because it keeps a small room's finish from leaking
           out onto the floor the player is standing on: the toilets' west wall
           is seen from the main floor far more often than from inside the
           toilets, and it went pale the day that room got a light wall. It did
           not matter while every zone was a dark variation of the same
           navy-grey, which is why it surfaced only now. */
        || World.zone[y][x - 1] || World.zone[y][x + 1]
        /* A CORNER has wall on all four sides and so reached none of the above:
           it fell through to the generic 'main' tint and stopped matching the
           two walls it joins, which is what makes a room look like it does not
           close. Its room is diagonally adjacent, so ask there. */
        || (World.zone[y + 1] && World.zone[y + 1][x + 1]) || (World.zone[y + 1] && World.zone[y + 1][x - 1])
        || (World.zone[y - 1] && World.zone[y - 1][x + 1]) || (World.zone[y - 1] && World.zone[y - 1][x - 1])
        || null;
      const below = y + 1 < MAPH && !World.solid[y + 1][x] && World.zone[y + 1][x];
      const anyNear = below || (x + 1 < MAPW && !World.solid[y][x + 1]) || (x > 0 && !World.solid[y][x - 1]) || (y > 0 && !World.solid[y - 1][x]);
      /* Wall mass with nothing beside it to see it from. Indoors that is the
         inside of the building and it is black; outdoors it is whatever is
         past the car park wall, and black there reads as a hole cut in the
         world rather than as distance. */
      if (!anyNear) { c.fillStyle = World.indoors() ? '#080b11' : '#4a5a6b'; c.fillRect(x * TILE, y * TILE, TILE, TILE); continue; }
      const px = x * TILE, py = y * TILE;
      c.drawImage(this.wallTile(nz || 'main', (x * 3 + y) & 1), px, py, TILE, TILE);
      if (below) {
        /* A one-tile wall reads as a kerb, not something you could stand
           behind. Every face you can actually see the front of (the same
           population that gets a skirting board below) gets a second tile
           stacked on top of it, so the room reads as enclosed rather than
           bounded by ankle-height dado rail. It is drawn over whatever is in
           the row above — floor, another wall, or void — because that row
           was already finished by the time this row's turn comes round: the
           loop runs top to bottom, so "in front" is simply "drawn later".
           That ordering is also what keeps it off the player and every NPC —
           both are drawn in the sorted pass after every wall, full stop, so
           the extension can only ever cover something behind it, never
           someone standing in front of it.
           Its opacity still answers "which side is the player on", because a
           solid tall wall between the player and their own avatar the moment
           they cross into the room behind it reads as broken rendering even
           though nothing is actually hidden. Full strength looking up at it
           from the room it encloses; faded by the time the player is a tile
           past it into whatever is on the other side. */
        const rel = (P.y - py) / (TILE * 1.6);
        const wallAlpha = Math.max(.15, Math.min(1, rel + .35));
        c.save();
        c.globalAlpha = wallAlpha;
        c.drawImage(this.wallTile(nz || 'main', (x * 3 + y + 1) & 1), px, py - TILE, TILE, TILE);
        c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(px, py - TILE, TILE, 4);
        c.restore();
        /* Skirting. One 7px board along the foot of every wall you can see the
           face of, which is the cheapest detail in the building and the one
           that stops the wall and the floor reading as two flat colours that
           happen to meet. */
        const sk = py + TILE - 9;
        c.fillStyle = 'rgba(0,0,0,.34)'; c.fillRect(px, sk - 2, TILE, 3);
        c.fillStyle = this.shade((ZONES[nz] && ZONES[nz].wall) || '#141a24', .22);
        c.fillRect(px, sk, TILE, 9);
        c.fillStyle = 'rgba(255,255,255,.10)'; c.fillRect(px, sk, TILE, 2);
        c.fillStyle = 'rgba(0,0,0,.30)'; c.fillRect(px, py + TILE - 2, TILE, 2);
        const g = c.createLinearGradient(0, py + TILE, 0, py + TILE + 10);
        g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g; c.fillRect(px, py + TILE, TILE, 10);
      } else {
        /* Not a visible face — interior wall mass, or a boundary with nothing
           behind it to enclose. One tile, same as it always was. */
        c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(px, py, TILE, 4);
      }
    }

    /* Doorways sit in the wall band, so they are drawn straight after the walls
       and before anything that stands in front of them. */
    this.doorways(x0, y0, x1, y1);
    this.doorLeaves(x0, y0, x1, y1);

    /* Ceiling lights and furniture, under everything that moves. Both are
       static, so both are cheap: the light is one cached sprite blitted a
       handful of times, and a desk is four rectangles.
       Outdoors there is no ceiling to hang a light from, and the giveaway that
       a level is outside is not the sky — you never see it, the camera looks
       straight down — it is that the light stops arriving in pools. */
    if (World.indoors()) this.ceiling(x0, y0, x1, y1);
    else this.daylight();
    this.desks(x0, y0, x1, y1);
    this.tables(x0, y0, x1, y1);
    this.worktops(x0, y0, x1, y1);
    this.cubicles(x0, y0, x1, y1);

    /* drawables sorted by y */
    const drawables = [];
    World.objects.forEach(o => {
      const wx = (o.x + .5) * TILE, wy = (o.y + .5) * TILE;
      if (!Cam.visible(wx, wy)) return;
      /* An occupied chair sorts AFTER its occupant: same tile centre, so a
         plain y sort drew the chair under them and everyone perched on top of
         their seat. Only when occupied — an empty one draws behind you. */
      let sy = wy;
      if (o.kind === 'chair' && Sprites.seatedHere(o.x, o.y)) sy = wy + 2;
      drawables.push({ y: sy, kind: 'obj', o, wx, wy });
    });
    /* Counters are sorted with everything else rather than drawn with the
       static furniture: the whole point of a reception desk is that the person
       on duty stands behind it, and static art would put Ron in front of his
       own counter. */
    (World.counters || []).forEach(t => {
      const wy = (t.y + .5) * TILE;
      if (Cam.visible((t.x + t.w / 2) * TILE, wy)) drawables.push({ y: wy - 1, kind: 'counter', t });
    });
    NPCM.list.forEach(n => { if (Cam.visible(n.x, n.y)) drawables.push({ y: n.y, kind: 'npc', n }); });
    drawables.push({ y: P.y, kind: 'player' });
    drawables.sort((a, b) => a.y - b.y);

    const hi = Interact.target;
    drawables.forEach(d => {
      if (d.kind === 'counter') {
        this.counter(d.t);
      } else if (d.kind === 'obj') {
        const o = d.o;
        /* Behind a wall you are looking at the front of: don't draw it at all.
           Anything less than opaque here IS the bug — a chair you can see
           through a wall reads as the wall being broken, not the chair. */
        const veil = this.veil(o);
        if (veil <= 0) return;
        let bob = 0;
        if (this.animate) {
          if (o.kind === 'phone' && o.ringing) bob = Math.sin(this.t * 18 + o.wob) * 5;
          else if (o.kind === 'pc') bob = Math.sin(this.t * 1.4 + o.wob) * 1.2;
          else if (o.kind === 'plant') bob = Math.sin(this.t * .8 + o.wob) * 1.4;
          else if (o.kind === 'printer') bob = Math.sin(this.t * 9 + o.wob) * (chance(.02) ? 3 : .5);
          else if (o.kind === 'coffee') bob = Math.sin(this.t * 2.2 + o.wob) * 1.2;
        }
        /* Where the thing is drawn, not which tile it occupies: a poster is on
           the wall face, a kettle on the worktop. Emoji, shadow and highlight
           move together or you highlight the carpet under a poster. */
        const f = o.fdef || FURN[o.kind] || {};
        const size = o.kind === 'chair' ? (Sprites.ready ? 22 : 16) : (f.size ?? 20);
        let ex = d.wx, ey = d.wy, onFloor = true;
        if (o.mount === 'wall') {
          const s = o.wallSide;
          ex += s === 'w' ? -TILE * .72 : s === 'e' ? TILE * .72 : 0;
          /* A north wall is the one case with a wall to hang this ON: it is the
             only side that gets the second, taller tile stacked above it (see
             the `below` branch of the wall loop) — every other side is either a
             flat single-tile wall or the back of one, with nothing above the
             base tile to be "up" on. Paintings, noticeboards, charts and the
             rest of `o.art` belong on that top block, not down by the skirting
             where a fire extinguisher or a thermostat actually lives — real
             pictures hang at head height, not ankle height, and now the wall is
             tall enough for that to be visible instead of hidden behind the
             player's own sprite. */
          /* Head height rather than ankle height. This asked for `o.art` because
             the procedural pictures were the only things ever hung up here —
             but a wall-anchored SPRITE is the same kind of object, and a
             television bracketed level with the skirting board is not mounted,
             it is leaning. Anything that hangs hangs. */
          const wallSprite = f.sprite && Tiles.anchors && Tiles.anchors[f.sprite] === 'wall';
          const high = s === 'n' && (o.art || wallSprite);
          ey += s === 'n' ? (high ? -TILE * 1.45 : -TILE * .72) : s === 's' ? TILE * .68 : 0;
          onFloor = false;
        } else if (o.onTable) {
          /* Before the worktop case: the jug and the biscuits are `surface`
             things that happen to be standing on a table, and a table is not
             as tall as a counter. */
          ey -= 8;                                   /* up onto the tabletop */
          onFloor = false;
        } else if (o.mount === 'surface' || o.onCounter) {
          ey -= 11;                                  /* up onto the worktop */
          onFloor = false;
        }
        c.save();
        if (veil < 1) c.globalAlpha = veil;
        /* Only the emoji need a shadow under them. Everything that draws its
           OWN art already carries its own grounding: a kit sprite has one
           baked into the pixels, R.tables() and R.desks() draw a real piece of
           furniture with its own shading, and R.wallArt() stands a sign on its
           own little post. An ellipse under any of those is a second shadow at
           a different angle, which is what makes a room look assembled rather
           than drawn. `chair`, `bin` and `hatch` used to be named here one at a
           time for exactly this reason; two of the three are covered by the
           sprite test now and the third by `drawn`. */
        const drawsOwn = (f.sprite && Tiles.has(f.sprite)) || f.drawn || o.art || o.noEmoji;
        if (onFloor && !drawsOwn && o.kind !== 'hatch') {
          this.shadow(ex, ey + size * .45, Math.max(11, size * .42), 5);
        }
        if (hi === o) {
          c.save();
          c.strokeStyle = 'rgba(77,163,255,.9)'; c.lineWidth = 2;
          c.shadowColor = '#4da3ff'; c.shadowBlur = 14;
          const hw = Math.max(40, size + 13), hh = Math.max(42, size + 15);
          c.beginPath(); c.roundRect(ex - hw / 2, ey - hh / 2, hw, hh, 8); c.stroke();
          c.restore();
        }
        if (o.ringing) {
          /* a pool of light on the carpet, so a ringing phone reads from across
             the floor rather than only when it is already on screen centre */
          const gs = this.glow('rgba(255,179,71,ALPHA)', Math.round(TILE * 1.27));
          c.save();
          c.globalAlpha = .55 + Math.sin(this.t * 6) * .2;
          c.drawImage(gs, d.wx - gs.width / 2, d.wy - gs.height / 2 + 10);
          c.globalAlpha = .35 + Math.sin(this.t * 10) * .25;
          c.strokeStyle = '#ffb347'; c.lineWidth = 2;
          c.beginPath(); c.arc(d.wx, d.wy, 20 + Math.sin(this.t * 6) * 5, 0, 6.3); c.stroke();
          c.restore();
        }
        /* Already drawn by doorways(), tables() or wallArt() — the emoji would
           be a second one on top. Chairs scale with the people: 22px is doll's
           furniture under a 58px sprite. */
        /* The kit's own furniture where there is any, then the drawn wall
           art, then the emoji it all replaced. */
        /* The kit draws its wall items FACE-ON, and NORTH is the only wall this
           projection shows you the face of — it is the one side that gets the
           second tile stacked above it, which is what you are looking at. East
           and west you see edge-on; south you are looking at the BACK of a
           wall. R.wallArt() squashes its own drawings to 44% on e/w for exactly
           this reason, and a sprite has no such affordance: a widescreen
           television on a side wall arrives as a poster of a television, and a
           mirror on a south wall is a mirror hung facing away from you. Fall
           back to the emoji anywhere but north — it has no orientation to get
           wrong. By anchor, so the next one is right without anybody
           remembering this. */
        const edgeOn = o.mount === 'wall' && o.wallSide !== 'n'
                    && f.sprite && Tiles.anchors && Tiles.anchors[f.sprite] === 'wall';
        /* Fifteen archive boxes and thirty-two chairs cut from one rectangle
           read as a stamp rather than as a room. Tiles.draw already mirrors —
           it is how the far leaf of a double doorway is drawn — so variety
           costs a boolean rather than a second crop. Seeded off the tile so it
           is stable across a rebuild, and limited to kinds whose art is
           symmetrical enough that the mirror is a variation rather than a
           mistake: nothing with a handle, a hinge or a console on one side. */
        const canFlip = FLIPPABLE.has(o.kind) && ((o.x * 7 + o.y * 13) & 1) === 1;
        if (edgeOn || !(f.sprite && Tiles.draw(c, f.sprite, ex, ey + bob, canFlip))) {
          if (o.art) this.wallArt(o, ex, ey + bob, size);
          else if (!o.noEmoji) this.emoji(o.e, ex, ey + bob, size);
        }
        if (o.kind === 'pc' && this.animate) {
          c.fillStyle = 'rgba(120,190,255,' + (0.05 + Math.abs(Math.sin(this.t * 2 + o.wob)) * .08) + ')';
          c.fillRect(ex - 13, ey - 12, 26, 16);
        }
        c.restore();
      } else if (d.kind === 'npc') {
        const n = d.n;
        /* Behind the wall in front of you, exactly as the furniture is. A
           colleague showing through a wall reads as the wall being broken. */
        const nveil = this.veilAt(Math.floor(n.x / TILE), Math.floor(n.y / TILE));
        if (nveil <= 0) return;
        if (nveil < 1) { c.save(); c.globalAlpha = nveil; }
        const sprite = Sprites.has(n.id);
        /* Stopped on a chair means seated, facing north — every desk chair has
           its desk there. `at` is where they are DRAWN, and everything hanging
           off a person (shadow, ring, name, quest mark, bubble) moves with it.
           Interaction deliberately still uses n.x/n.y: reach should not change
           because somebody sat down. */
        const seat = sprite && !n.walking
          ? Sprites.seatedAt(Math.floor(n.x / TILE), Math.floor(n.y / TILE)) : null;
        const at = seat ? Sprites.seatPos(seat) : { x: n.x, y: n.y };
        this.shadow(at.x, at.y + 13, 12, 5);
        /* The LPC walk cycle carries its own vertical movement, so the bob is
           only for the emoji fallback — doubling them reads as a limp. */
        const bob = sprite ? 0
          : n.walking && this.animate ? Math.abs(Math.sin(n.bob * 2)) * 3.5 : Math.sin(n.bob * .5) * 1;
        const box = Sprites.box(n.id, at.x, at.y);
        if (hi === n) {
          c.save(); c.strokeStyle = 'rgba(255,179,71,.9)'; c.lineWidth = 2; c.shadowColor = '#ffb347'; c.shadowBlur = 14;
          c.beginPath(); c.roundRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4, 8); c.stroke(); c.restore();
        }
        if (!this.cinema && this.questMark(n)) this.emoji('❗', at.x + 13, box.y - 4, 15);
        if (sprite) {
          /* Standing colleagues breathe. Walking ones do not need it — the
             walk cycle already moves them — and a seated one is holding a
             pose on purpose. Off entirely when Animation is off. */
          const nf = seat ? Sprites.sit(n.id)
            : n.walking ? Sprites.frame(n.id, this.animate, n.step)
            : this.animate ? Sprites.breath(n.id) : 0;
          const nlift = seat && this.animate ? Sprites.breathLift(n.id) : 0;
          Sprites.draw(c, n.id, seat ? 0 : n.dir ?? 2, nf, at.x, at.y - nlift);
        } else this.emoji(n.face, at.x, at.y - bob, 29);
        /* NB: canvas font strings cannot contain CSS custom properties — an
           invalid string is ignored and the previous (emoji-sized) font sticks. */
        if (!this.cinema) {
          c.font = NAME_FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.7)';
          c.strokeText(n.name, at.x, at.y + 26);
          c.fillStyle = n.def.colour ? n.def.colour : 'rgba(223,230,242,.82)';
          c.fillText(n.name, at.x, at.y + 26);
        }
        if (n.sayT > 0) this.bubble(at.x, at.y - 34, n.say, Math.min(1, n.sayT));
        if (nveil < 1) c.restore();
      } else {
        const psprite = Sprites.has('player');
        /* Same as the colleagues: sitting draws you in the chair, not at the
           pixel you happened to stop on. You stop wherever the thumb came off
           the stick, which is almost never the middle of the seat. */
        const seat = psprite && !P.moving
          ? Sprites.seatedAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE)) : null;
        const at = seat ? Sprites.seatPos(seat) : { x: P.x, y: P.y };
        this.shadow(at.x, at.y + 13, 13, 5);
        const bob = psprite ? 0 : P.moving && this.animate ? Math.abs(Math.sin(P.bob * 2)) * 4 : 0;
        c.save();
        /* The glow is what tells you which of twenty-one similar people is
           you — it matters more with sprites than it did with a distinct emoji. */
        c.shadowColor = 'rgba(77,163,255,.55)'; c.shadowBlur = 16;
        if (psprite) {
          /* You run when you are actually moving at speed and walk when you
             are easing along on the stick — P.fast is set by movePlayer from
             the size of the movement vector, so the animation and the pace
             can never disagree. */
          const pf = seat ? Sprites.sit('player')
            : P.moving ? Sprites.frame('player', this.animate, P.step, P.fast)
            : this.animate ? Sprites.breath('player') : 0;
          const plift = seat && this.animate ? Sprites.breathLift('player') : 0;
          Sprites.draw(c, 'player', seat ? 0 : P.dir ?? 2, pf, at.x, at.y - plift);
        } else this.emoji(P.face, at.x, at.y - bob, 30);
        c.restore();
      }
    });

    /* particles + floats */
    FX.parts.forEach(p => {
      const a = 1 - p.t / p.life;
      if (p.e) this.emoji(p.e, p.x, p.y, p.sz, a);
      else { c.globalAlpha = a; c.fillStyle = p.c || '#fff'; c.fillRect(p.x, p.y, 3, 3); c.globalAlpha = 1; }
    });
    c.textAlign = 'center'; c.textBaseline = 'middle';
    FX.floats.forEach(f => {
      const a = 1 - f.t / f.life;
      c.globalAlpha = a; c.font = FLOAT_FONT;
      c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.65)';
      c.strokeText(f.text, f.x, f.y); c.fillStyle = f.c; c.fillText(f.text, f.x, f.y);
      c.globalAlpha = 1;
    });
    if (Guide.on()) this.guidePin();
    c.restore();
    /* The edge arrow is drawn after the camera transform is popped, because it
       lives at the edge of the screen rather than anywhere in the office. */
    if (Guide.on()) this.guideArrow();
  },
  /* A pin over the waypoint, with a pool of light so it reads across a floor
     of identical furniture. */
  guidePin() {
    const c = this.ctx;
    const wx = (Guide.tx + .5) * TILE, wy = (Guide.ty + .5) * TILE;
    if (!Cam.visible(wx, wy)) return;
    const bob = Math.sin(this.t * 3.4) * 4;
    c.save();
    const g = this.glow('rgba(90,212,138,ALPHA)', Math.round(TILE * 1.18));
    c.globalAlpha = .5 + Math.sin(this.t * 3) * .18;
    c.drawImage(g, wx - g.width / 2, wy - g.height / 2 + 8);
    c.globalAlpha = 1;
    c.strokeStyle = 'rgba(90,212,138,.85)'; c.lineWidth = 2;
    c.beginPath(); c.arc(wx, wy, 19 + Math.sin(this.t * 3) * 3, 0, 6.3); c.stroke();
    this.emoji('📍', wx, wy - 34 + bob, 24);
    if (Guide.label) {
      c.font = NAME_FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.75)';
      c.strokeText(Guide.label, wx, wy - 52 + bob);
      c.fillStyle = '#5ad48a'; c.fillText(Guide.label, wx, wy - 52 + bob);
    }
    c.restore();
  },
  /* A compass arrow orbiting the player, NOT an edge arrow: an edge arrow
     lands in a corner and both top corners are HUD cards. Orbiting also
     survives the camera hitting the map edge, where the player is off centre. */
  guideArrow() {
    const c = this.ctx;
    const wx = (Guide.tx + .5) * TILE, wy = (Guide.ty + .5) * TILE;
    if (Cam.visible(wx, wy)) return;
    const px = P.x - Cam.x, py = P.y - Cam.y;
    const ang = Math.atan2(wy - P.y, wx - P.x);
    const rad = Math.min(96, Math.min(Cam.w, Cam.h) * .3);
    const ax = px + Math.cos(ang) * rad, ay = py + Math.sin(ang) * rad;
    const steps = Math.round(Math.hypot(wx - P.x, wy - P.y) / TILE);
    const pulse = .78 + Math.sin(this.t * 3) * .18;
    c.save();
    c.globalAlpha = pulse;
    c.translate(ax, ay); c.rotate(ang);
    c.fillStyle = '#5ad48a'; c.strokeStyle = 'rgba(6,9,14,.9)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(16, 0); c.lineTo(-10, -11); c.lineTo(-5, 0); c.lineTo(-10, 11);
    c.closePath(); c.fill(); c.stroke();
    c.restore();
    /* The label sits outside the arrow, along the same bearing, so it never
       covers the player and never reads upside down. */
    const lx = px + Math.cos(ang) * (rad + 26), ly = py + Math.sin(ang) * (rad + 26);
    c.save();
    c.font = NAME_FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
    const txt = (Guide.label || 'this way') + ' · ' + steps;
    c.lineWidth = 3.5; c.strokeStyle = 'rgba(0,0,0,.85)';
    c.strokeText(txt, lx, ly); c.fillStyle = '#5ad48a'; c.fillText(txt, lx, ly);
    c.restore();
  },
  questMark(n) {
    if (!n.def.entry) return false;
    try {
      const id = n.def.entry();
      return ['first', 'quest', 'reveal', 'solve', 'gotmug', 'headset', 'mug', 'printer', 'spread', 'review', 'quickword'].includes(id);
    } catch (e) { return false; }
  },
  bubble(x, y, text, alpha) {
    const c = this.ctx;
    c.font = BUBBLE_FONT; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    const w = Math.min(230, c.measureText(text).width + 18);
    c.globalAlpha = alpha;
    c.fillStyle = 'rgba(15,20,29,.92)'; c.strokeStyle = 'rgba(77,163,255,.5)'; c.lineWidth = 1;
    c.beginPath(); c.roundRect(x - w / 2, y - 20, w, 24, 7); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x - 5, y + 4); c.lineTo(x + 5, y + 4); c.lineTo(x, y + 10); c.fill();
    c.fillStyle = '#dfe6f2';
    let t = text; if (c.measureText(t).width > 212) { while (c.measureText(t + '…').width > 212 && t.length > 4) t = t.slice(0, -1); t += '…'; }
    c.fillText(t, x, y - 4);
    c.globalAlpha = 1;
  },
  /* The floor plan never changes, so it is rasterised once and blitted. */
  minimapBase() {
    const cv = $('#minimap');
    const b = document.createElement('canvas');
    b.width = cv.width; b.height = cv.height;
    const c = b.getContext('2d');
    const sx = cv.width / MAPW, sy = cv.height / MAPH;
    for (let y = 0; y < MAPH; y++) for (let x = 0; x < MAPW; x++) {
      const z = World.zone[y][x];
      if (!z || World.solid[y][x]) continue;
      c.fillStyle = ZONES[z].floor; c.fillRect(x * sx, y * sy, sx + .5, sy + .5);
    }
    this._mmBase = b;
  },
  minimap() {
    const cv = $('#minimap'), c = cv.getContext('2d');
    const sx = cv.width / MAPW, sy = cv.height / MAPH;
    c.clearRect(0, 0, cv.width, cv.height);
    if (!this._mmBase) this.minimapBase();
    c.drawImage(this._mmBase, 0, 0);
    World.objects.forEach(o => {
      if (o.kind === 'door') { c.fillStyle = '#8d9bb5'; c.fillRect(o.x * sx, o.y * sy, sx, sy); }
      else if (o.ringing) { c.fillStyle = '#ffb347'; c.fillRect(o.x * sx - 1, o.y * sy - 1, sx + 2, sy + 2); }
      else if (o.kind === 'coffee' || o.kind === 'printer') { c.fillStyle = 'rgba(255,179,71,.7)'; c.fillRect(o.x * sx, o.y * sy, sx, sy); }
    });
    NPCM.list.forEach(n => {
      const q = this.questMark(n);
      c.fillStyle = q ? '#ff5f56' : 'rgba(180,140,255,.85)';
      c.fillRect(n.x / TILE * sx - 1, n.y / TILE * sy - 1, 2.6, 2.6);
    });
    if (Guide.tx !== null) {
      c.fillStyle = '#5ad48a';
      c.fillRect(Guide.tx * sx - 1.5, Guide.ty * sy - 1.5, 4, 4);
    }
    c.fillStyle = '#fff';
    c.fillRect(P.x / TILE * sx - 1.5, P.y / TILE * sy - 1.5, 3.5, 3.5);
    c.strokeStyle = 'rgba(255,255,255,.25)';
    c.strokeRect(Cam.x / TILE * sx, Cam.y / TILE * sy, Cam.w / TILE * sx, Cam.h / TILE * sy);
  }
};
