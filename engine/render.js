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
  /* Which sprite an object is wearing today. Almost always the one its kind
     names and nothing more — but a thing may carry four of them keyed by
     season instead of one, and then this is what picks. The same question
     floorTile() asks of SURFACES.grass, asked of FURN.tree, and asked in one
     place so the next seasonal object is a table entry rather than a branch
     in the draw. */
  spriteOf(f) {
    if (!f) return undefined;
    /* Lit from inside, once the streetlights are on. The same idea as the
       seasonal swap below and a different axis of it: a shop is not a
       different shop after dark, it is the same shop with the lights on. Only
       outdoors — a window seen from inside the building it belongs to is the
       office's own, and Sky.lampsOn() has nothing to say about that. */
    if (f.lit && !World.indoors() && Sky.lampsOn()) return f.lit;
    return f.sprites ? f.sprites[Sky.season()] : f.sprite;
  },

  floorTile(z, v, s) {
    /* The kit's floor, multiplied through the zone's colour: straight from the
       atlas each material is one flat colour and thirteen rooms become one room
       thirteen times. Baked once, so the tint is free per frame. Never pick a
       floor cell off a contact sheet — most are edge pieces; tile a candidate
       and look for a seam.

       `s` is a SURFACE, from World.surf — what this particular tile is made of
       where that differs from what its room is made of. It is looked at first
       and it wins outright: a street is one zone with one name, and the tarmac
       down the middle of it is not a second street. */
    const S = s && SURFACES[s];
    /* A surface may have four tiles rather than one — see SURFACES.grass. The
       season is part of the bake key already, because the key carries the kit
       tile's NAME and the name is what changes, so nothing here has to be told
       to throw anything away when the year turns. */
    const kit = S ? (S.tiles ? S.tiles[Sky.season()] : S.tile) : ZONES[z] && ZONES[z].tile;
    const floor = S ? S.floor : ZONES[z] && ZONES[z].floor;
    const alt = S ? S.alt : ZONES[z] && ZONES[z].alt;
    if (Tiles.has(kit)) {
      return this._bake('k' + (S ? 's' + s : z) + v + kit, (g, N) => {
        const r = Tiles.rects[kit], src = Tiles.imgFor(kit);
        g.imageSmoothingEnabled = false;
        g.drawImage(src, r[0], r[1], r[2], r[3], 0, 0, N, N);
        g.globalCompositeOperation = 'multiply';
        g.fillStyle = this.shade(v ? floor : alt, .55);
        g.fillRect(0, 0, N, N);
        g.globalCompositeOperation = 'source-over';
        /* The seam along the top and left of a tile is what makes a floor read
           as laid rather than as wallpaper. A road has no seams in it — it was
           poured, not laid — so the surface that says so does without. */
        if (!S) {
          g.fillStyle = 'rgba(0,0,0,.10)';
          g.fillRect(0, 0, N, 1); g.fillRect(0, 0, 1, N);
        }
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
  /* Roofs, for the wall mass outdoors that has no floor beside it to be seen
     from — the middle of a terrace, and everything past the edge of the map.
     Slate: courses of tile with the joints staggered, dark enough that the
     streets between them are obviously the lit part of the picture. Baked like
     every other surface, so a whole block of it costs one blit a tile. */
  roofTile(v) {
    return this._bake('roof' + v, (g, N, rnd) => {
      const base = v ? '#2b3038' : '#292e35';
      g.fillStyle = base; g.fillRect(0, 0, N, N);
      const rows = 4, h = N / rows;
      for (let r = 0; r < rows; r++) {
        const y = r * h, off = (r & 1) ? h : 0;
        for (let x = -h; x < N + h; x += h * 2) {
          g.fillStyle = 'rgba(255,255,255,' + (0.03 + rnd() * 0.035).toFixed(3) + ')';
          g.fillRect(x + off + 1, y + 1, h * 2 - 2, h - 2);
        }
        g.fillStyle = 'rgba(0,0,0,.32)'; g.fillRect(0, y, N, 2);
      }
      /* One ridge or vent per few tiles, so a big roof is not a texture swatch
         repeated eighty times. */
      if (rnd() > .72) {
        g.fillStyle = 'rgba(0,0,0,.35)';
        g.fillRect(N * .3, N * .3, N * .3, N * .3);
        g.fillStyle = 'rgba(255,255,255,.06)';
        g.fillRect(N * .3, N * .3, N * .3, 3);
      }
    });
  },
  /* ---- the street ----
     Two passes that exist only because a level declared `surfaces:` and
     `paint:`, and that cost one bounds check on every level that did not.

     The KERB is derived rather than drawn by hand: wherever a tile of one
     surface meets walkable ground of another, there is a step between them,
     and a step is a lit top edge and a shadow in the gutter. Doing it this way
     means a car park somebody redraws in the editor gets its kerbs right
     without anybody drawing one — and it is the same reason the vehicle
     crossover at the car park exit has no kerb across it: the tarmac is
     carried through the pavement there, so there is no boundary to find. */
  kerbs(x0, y0, x1, y1) {
    if (!World.surf) return;
    const c = this.ctx;
    const at = (x, y) => (x < 0 || y < 0 || x >= MAPW || y >= MAPH || World.solid[y][x]) ? false
      : { s: World.surf[y][x] };
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const s = World.surf[y][x];
      if (!s || World.solid[y][x] || !World.zone[y][x]) continue;
      const px = x * TILE, py = y * TILE;
      /* Only ever from the surfaced side, and between two surfaced tiles only
         from the one whose name sorts first — otherwise every boundary is
         drawn twice, which doubles the shadow and shows as a dark line down
         the middle of the kerb. */
      const edge = n => n && n.s !== s && (!n.s || s < n.s);
      /* North and west get the kerb TOP (the pavement is up or left of here,
         so the lit face is on that side); south and east get it likewise. The
         gutter shadow is always inside the tarmac. */
      if (edge(at(x, y - 1))) {
        c.fillStyle = 'rgba(0,0,0,.30)'; c.fillRect(px, py, TILE, 3);
        c.fillStyle = 'rgba(226,229,234,.30)'; c.fillRect(px, py - 4, TILE, 4);
        c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(px, py - 5, TILE, 1);
      }
      if (edge(at(x, y + 1))) {
        c.fillStyle = 'rgba(0,0,0,.30)'; c.fillRect(px, py + TILE - 3, TILE, 3);
        c.fillStyle = 'rgba(226,229,234,.30)'; c.fillRect(px, py + TILE, TILE, 4);
      }
      if (edge(at(x - 1, y))) {
        c.fillStyle = 'rgba(0,0,0,.30)'; c.fillRect(px, py, 3, TILE);
        c.fillStyle = 'rgba(226,229,234,.30)'; c.fillRect(px - 4, py, 4, TILE);
      }
      if (edge(at(x + 1, y))) {
        c.fillStyle = 'rgba(0,0,0,.30)'; c.fillRect(px + TILE - 3, py, 3, TILE);
        c.fillStyle = 'rgba(226,229,234,.30)'; c.fillRect(px + TILE, py, 4, TILE);
      }
    }
  },
  /* The paint, from the level's own `paint:` list. Six words of vocabulary,
     all of them in TILES because that is what the rest of a level is written
     in, and all of them faded, because the last time anybody repainted
     Bellhaven Road the building had a different name over the door.

       dash   a broken white line from a to b — a centre line
       line   a solid one — a give way, a stop line
       yellow a double yellow along a kerb, from a to b
       zebra  a crossing filling r; the bars run the way the traffic does and
              repeat across it, which is the way you walk over them
       bays   r divided into two-tile parking bays, open on the side named
       text   words painted on the road at `at`, turned by `turn` quarter turns

     Drawn every frame rather than baked: it is a few dozen fillRects behind a
     camera cull, which is cheaper than the bookkeeping of a second offscreen
     canvas the size of a level that has to be thrown away whenever one is. */
  roadPaint() {
    const list = World.def && World.def.paint;
    if (!list || !list.length) return;
    const c = this.ctx;
    const WHITE = 'rgba(228,230,222,.58)', YELLOW = 'rgba(206,172,66,.5)';
    /* Anything wholly off-screen costs one rectangle test and nothing else. */
    const near = (ax, ay, bx, by) => !(Math.max(ax, bx) < Cam.x - TILE || Math.min(ax, bx) > Cam.x + Cam.w + TILE
      || Math.max(ay, by) < Cam.y - TILE || Math.min(ay, by) > Cam.y + Cam.h + TILE);
    /* One line, solid or broken, between two points. Everything except the
       crossing and the words is one of these. */
    const stroke = (ax, ay, bx, by, w, colour, dash) => {
      if (!near(ax, ay, bx, by)) return;
      const len = Math.hypot(bx - ax, by - ay);
      if (!len) return;
      const ux = (bx - ax) / len, uy = (by - ay) / len;
      c.save();
      c.strokeStyle = colour; c.lineWidth = w; c.lineCap = 'butt';
      if (dash) {
        /* Laid to a pitch rather than stretched to fit: a centre line that
           ends mid-dash is what a real one does. */
        const on = TILE * .78, off = TILE * .95;
        for (let d = 0; d + on <= len; d += on + off) {
          c.beginPath();
          c.moveTo(ax + ux * d, ay + uy * d);
          c.lineTo(ax + ux * (d + on), ay + uy * (d + on));
          c.stroke();
        }
      } else {
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
      }
      c.restore();
    };
    for (const m of list) {
      if (m.a && m.b) {
        const ax = m.a[0] * TILE, ay = m.a[1] * TILE, bx = m.b[0] * TILE, by = m.b[1] * TILE;
        if (m.p === 'dash') stroke(ax, ay, bx, by, 4, WHITE, true);
        else if (m.p === 'line') stroke(ax, ay, bx, by, 5, WHITE, false);
        else if (m.p === 'yellow') {
          /* Two of them, three pixels apart, because one is a restriction and
             two is a prohibition and everybody in the country knows which. */
          const len = Math.hypot(bx - ax, by - ay) || 1;
          const nx = -(by - ay) / len * 3, ny = (bx - ax) / len * 3;
          stroke(ax - nx, ay - ny, bx - nx, by - ny, 2.5, YELLOW, false);
          stroke(ax + nx, ay + ny, bx + nx, by + ny, 2.5, YELLOW, false);
        }
        continue;
      }
      if (m.p === 'zebra' && m.r) {
        const [x1, y1, x2, y2] = m.r;
        const px = x1 * TILE, py = y1 * TILE;
        const w = (x2 - x1 + 1) * TILE, h = (y2 - y1 + 1) * TILE;
        if (!near(px, py, px + w, py + h)) continue;
        c.save();
        c.fillStyle = 'rgba(232,234,228,.6)';
        /* The bars run WITH the traffic and REPEAT across it: you walk over
           them one at a time and you drive along the length of one. So each
           bar is laid along the crossing's SHORT side — which is the way the
           road runs, a crossing being a few tiles of road and the whole width
           of it — and they are spaced out along the long one.
           This was the other way round for a year and it is the sort of thing
           you cannot unsee once somebody says it: the stripes were at ninety
           degrees to every zebra crossing in the country. */
        if (h >= w) { for (let y = py + 5; y + 13 <= py + h; y += 26) c.fillRect(px, y, w, 13); }
        else { for (let x = px + 5; x + 13 <= px + w; x += 26) c.fillRect(x, py, 13, h); }
        c.restore();
        continue;
      }
      if (m.p === 'bays' && m.r) {
        const [x1, y1, x2, y2] = m.r;
        const px = x1 * TILE, py = y1 * TILE;
        const w = (x2 - x1 + 1) * TILE, h = (y2 - y1 + 1) * TILE;
        if (!near(px, py, px + w, py + h)) continue;
        /* Bays are two tiles across. The open side is the one you drive in
           from, so the dividers run away from it and the closed end gets a
           line along it. */
        const acrossX = m.open === 'n' || m.open === 's';
        c.save();
        c.strokeStyle = WHITE; c.lineWidth = 3;
        c.beginPath();
        if (acrossX) {
          for (let x = px; x <= px + w + 1; x += TILE * 2) { c.moveTo(x, py); c.lineTo(x, py + h); }
          const cy = m.open === 's' ? py : py + h;
          c.moveTo(px, cy); c.lineTo(px + w, cy);
        } else {
          for (let y = py; y <= py + h + 1; y += TILE * 2) { c.moveTo(px, y); c.lineTo(px + w, y); }
          const cx = m.open === 'e' ? px : px + w;
          c.moveTo(cx, py); c.lineTo(cx, py + h);
        }
        c.stroke(); c.restore();
        continue;
      }
      if (m.p === 'text' && m.at) {
        const px = m.at[0] * TILE, py = m.at[1] * TILE;
        if (!near(px - 60, py - 60, px + 60, py + 60)) continue;
        c.save();
        c.translate(px, py);
        if (m.turn) c.rotate((m.turn & 3) * Math.PI / 2);
        /* Road lettering is tall and narrow because it is read at an angle
           from a long way off, and squashing the font sideways is how it is
           done in real life too. */
        c.scale(0.82, 2);
        c.font = ROAD_FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = WHITE;
        c.fillText(m.s || '', 0, 0);
        c.restore();
      }
    }
  },
  /* One car, drawn from above: a body, a roof with the glass either end of it,
     four wheels with the front pair turned to wherever the steering is, and
     the lights that say what it is doing. All of it from the four numbers and
     three colours in its CARS entry, so a new model is an entry in a table and
     not a new drawing.

     Nothing here is a sprite, and that is not for want of looking: the kit
     this game pins is a mediaeval-through-Victorian tile set with a wheelchair
     and a shopping trolley in it as the only wheeled things in the whole
     repository. A car in that style would have to be drawn, and a car that is
     drawn may as well be drawn by the renderer, where it can turn through any
     angle rather than the eight a sprite sheet would give it. */
  car(car) {
    const c = this.ctx, d = car.def;
    const hl = d.len / 2, hw = d.wid / 2;
    /* The shadow is the ground's, so it is offset in the WORLD (down and a
       little right, like every other shadow in this game) and only then turned
       to match the body. */
    c.save();
    c.translate(car.x + 2, car.y + 6); c.rotate(car.a);
    c.fillStyle = 'rgba(0,0,0,.32)';
    c.beginPath(); c.roundRect(-hl, -hw, d.len, d.wid, 9); c.fill();
    c.restore();

    c.save();
    c.translate(car.x, car.y); c.rotate(car.a);

    /* Wheels first: they are under the arches. The front pair turn, which is
       four pixels of movement and the single thing that most makes the car
       look like it is being driven rather than slid. */
    c.fillStyle = '#16181c';
    const wheel = (u, turn) => {
      c.save(); c.translate(u, 0);
      for (const v of [-hw - 1, hw + 1]) {
        c.save(); c.translate(0, v); if (turn) c.rotate(turn);
        c.beginPath(); c.roundRect(-6, -3, 12, 6, 2); c.fill();
        c.restore();
      }
      c.restore();
    };
    wheel(hl * 0.58, (car.wheel || 0) * 0.5);
    wheel(-hl * 0.58, 0);

    /* The body. A flat fill would read as a card: the gradient across it is
       the light coming off a curved roof, which is the only reason a car in
       plan view looks like a car at all. */
    const g = c.createLinearGradient(0, -hw, 0, hw);
    g.addColorStop(0, this.shade(d.body, .16));
    g.addColorStop(.45, d.body);
    g.addColorStop(1, this.shade(d.body, -.28));
    c.fillStyle = g;
    c.beginPath(); c.roundRect(-hl, -hw, d.len, d.wid, 8); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 1.5; c.stroke();

    /* Roof and glass. The windscreen is the bigger of the two and it is at the
       front, which is how you can tell at a glance which way a stationary car
       is pointing — the thing GTA got right and nobody has improved on. */
    c.fillStyle = 'rgba(30,38,50,.85)';
    c.beginPath(); c.roundRect(hl * 0.18, -hw + 3, hl * 0.36, d.wid - 6, 3); c.fill();
    c.beginPath(); c.roundRect(-hl * 0.72, -hw + 4, hl * 0.26, d.wid - 8, 3); c.fill();
    c.fillStyle = this.shade(d.roof, .04);
    c.beginPath(); c.roundRect(-hl * 0.44, -hw + 2, hl * 0.62, d.wid - 4, 4); c.fill();
    c.fillStyle = 'rgba(255,255,255,.10)';
    c.fillRect(-hl * 0.44, -hw + 2, hl * 0.62, 2);

    /* Somebody in it. A head, at the right-hand seat, because this is
       Bellhaven and not Bellhaven, Ohio. */
    if (car === Cars.driving || car.traffic) {
      c.fillStyle = car === Cars.driving ? 'rgba(233,214,190,.95)' : 'rgba(60,66,78,.9)';
      c.beginPath(); c.arc(-hl * 0.1, hw * 0.42, 3.4, 0, 6.3); c.fill();
    }

    /* Lights. Two at each end; the back pair come up when the brakes are on or
       when it is reversing, which are the two times a car behind you needs to
       know. */
    const lit = car.braking || car.fwd < -4;
    for (const v of [-hw + 4, hw - 4]) {
      c.fillStyle = 'rgba(255,244,214,.85)';
      c.beginPath(); c.roundRect(hl - 4, v - 2.5, 3, 5, 1.5); c.fill();
      c.fillStyle = lit ? '#ff5f56' : 'rgba(150,52,48,.9)';
      c.beginPath(); c.roundRect(-hl + 1, v - 2.5, 3, 5, 1.5); c.fill();
    }
    if (lit && Math.abs(car.fwd) > 20) {
      c.fillStyle = 'rgba(255,95,86,.18)';
      c.beginPath(); c.roundRect(-hl - 7, -hw + 2, 8, d.wid - 4, 3); c.fill();
    }
    c.restore();
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
     is the only light source in the game with no shape to it.

     It follows the sun now, because it is the sun. A fixed wash was fine while
     the game had eight hours in it and every one of them was daytime; laid over
     a car park at two in the morning it is a floodlight nobody installed. */
  daylight() {
    const c = this.ctx;
    const up = clamp(Sky.sunPos() * 1.8 + .12, 0, 1);
    if (up <= 0.01) return;
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = .075 * up;
    c.fillStyle = '#a8c4e0';
    c.fillRect(Cam.x, Cam.y, Cam.w, Cam.h);
    c.restore();
  },
  /* ---------------- The sky, painted ----------------
     Sky knows what time it is and what the weather is doing; these four draw
     it. Everything here is over the top of a frame that was rendered exactly as
     it always was, which is the whole design: no tile, no sprite and no piece
     of furniture in this game knows that the sun sets.

     WATER ON THE GROUND. Two things, and they are different: a wet surface is
     darker and shinier everywhere, and a puddle is somewhere in particular.
     The puddles are picked off World.seed, so they are in the same places every
     time it rains and in different places on every map — a road that grows its
     puddles somewhere new each shower reads as static, not as weather. */
  wetGround(x0, y0, x1, y1) {
    const w = Sky.wet(), lie = Sky.lying();
    const k = Sky.kind();
    /* Rain hitting the ground. It used to be drawn with the falling rain, in
       screen space, which put a scatter of little ripples at fixed points on
       the CANVAS: walk, and the whole shower of them walked with you, pinned to
       the glass like spots on a lens. A splash happens where a drop lands, and
       where a drop lands is a place on the road. So it is here, with the
       puddles, in world coordinates, under everything that walks through it. */
    const splashing = this.animate && !World.indoors() && k.fall === 'rain' && k.rate >= 1;
    if (World.indoors() || (w < .04 && lie < .04 && !splashing)) return;
    const c = this.ctx;
    c.save();
    if (w > .04) {
      /* The sheen. Darker where it has soaked in, brighter where it has not,
         which is one multiply and one screen and reads as tarmac in the rain. */
      c.globalAlpha = .16 * w;
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = '#6d7a8e';
      c.fillRect(Cam.x, Cam.y, Cam.w, Cam.h);
      c.globalCompositeOperation = 'source-over';
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (!World.zone[y][x] || World.solid[y][x]) continue;
        const sd = World.seed[y][x];
        if (sd < .90) continue;
        /* Puddles gather on the road, not on the camber of a pavement — and
           not on grass, which is the other thing World.surf can say now. */
        const road = World.surf && World.surf[y][x] === 'tarmac';
        const px = x * TILE, py = y * TILE;
        c.globalAlpha = (road ? .34 : .20) * w;
        c.fillStyle = '#2b3a4e';
        c.beginPath();
        c.ellipse(px + TILE * (.3 + sd * .4), py + TILE * (.35 + (1 - sd) * 3 % .4),
          TILE * (.16 + (sd - .9) * 2.4), TILE * (.10 + (sd - .9) * 1.5), sd * 3, 0, 6.3);
        c.fill();
        c.globalAlpha = (road ? .16 : .10) * w;
        c.fillStyle = '#9fc0dd';
        c.beginPath();
        c.ellipse(px + TILE * (.3 + sd * .4) - 2, py + TILE * (.35 + (1 - sd) * 3 % .4) - 2,
          TILE * (.10 + (sd - .9) * 1.6), TILE * (.05 + (sd - .9) * .9), sd * 3, 0, 6.3);
        c.fill();
      }
    }
    if (lie > .04) {
      /* Lying snow. Over the ground rather than instead of it, so the paving
         still shows through a light fall and has gone entirely by the time it
         has been coming down for an hour. */
      c.globalAlpha = .80 * lie;
      c.fillStyle = '#eef4fb';
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (!World.zone[y][x] || World.solid[y][x]) continue;
        c.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
      /* Where feet and tyres have been. The road keeps less of it than the
         pavement, which is the only reason anybody can tell where the road is.
         The verges keep the most of all, and get nothing taken back off them. */
      c.globalAlpha = .35 * lie;
      c.fillStyle = '#8f9cad';
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (!World.zone[y][x] || World.solid[y][x]) continue;
        if (World.surf && World.surf[y][x] === 'tarmac') c.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
    if (splashing) {
      /* Each ground tile keeps its own clock, offset by its seed, and gets a
         ripple on some of its turns and not others — so the splashes come and
         go all over the road without anything having to remember one. The ring
         widens as it goes; the three passes are its fade, because alpha is a
         property of the path and a ripple that ends at full strength pops.

         Nothing lands on the tiles under lying snow that the road has not
         worn back through, and nothing lands indoors: both fall out of the
         gate above rather than being tested for here. */
      const t = this.t, dens = .10 * k.rate;
      c.strokeStyle = '#c8e0f5';
      c.lineWidth = 1;
      for (let pass = 0; pass < 3; pass++) {
        c.globalAlpha = (.30 - pass * .09) * Math.min(1, .35 + w);
        c.beginPath();
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          if (!World.zone[y][x] || World.solid[y][x]) continue;
          const sd = World.seed[y][x];
          const cyc = t * 2.6 + sd * 11;
          const g = Math.floor(cyc), ph = cyc - g;
          if (Math.floor(ph * 3) !== pass) continue;
          const i = x * 3011 + y * 7919;
          if (this.noise(i, g) > dens) continue;
          const cx = (x + this.noise(i + 1, g)) * TILE;
          const cy = (y + this.noise(i + 2, g)) * TILE;
          const r = 1.5 + ph * 5.5;
          c.moveTo(cx + r, cy);
          c.ellipse(cx, cy, r, r * .45, 0, 0, 6.3);
        }
        c.stroke();
      }
    }
    c.restore();
  },
  /* THE GRADE. One rectangle, multiplied, over everything that has been drawn
     so far. It is last because it is the light: a person standing under a
     streetlight and a person standing in the dark are the same sprite, and what
     separates them is what is painted over both of them and then taken back off
     one of them by lamps() below. */
  skyGrade() {
    const g = Sky.grade(World.indoors());
    if (g.a < .004) return;
    const c = this.ctx;
    c.save();
    c.globalCompositeOperation = 'multiply';
    c.globalAlpha = g.a;
    c.fillStyle = g.col;
    c.fillRect(Cam.x, Cam.y, Cam.w, Cam.h);
    c.restore();
    /* Fog sits on top of the multiply rather than in it: it is something in the
       air between you and the floor, so it LIFTS the blacks instead of
       deepening them, which is the one thing that makes fog read as fog. */
    /* — and only as much of it as there is light to catch. Fog is lit air, so
       at noon it is a white sheet and at two in the morning it is almost
       nothing except what the streetlights make of it. Without the daylight
       term a foggy 02:00 came out paler than a clear 18:00, which is the one
       reading a night should never give. */
    const fog = Sky.fog();
    if (fog > .01) {
      const lit = clamp(Sky.sunPos() * 1.2 + .45, .16, 1);
      c.save();
      c.globalAlpha = fog * lit * (.34 + Math.sin(this.t * .12) * .03);
      c.fillStyle = World.indoors() ? '#b6bdc7' : '#c6cdd6';
      c.fillRect(Cam.x, Cam.y, Cam.w, Cam.h);
      c.restore();
    }
    /* Lightning. A whole-frame flash, because that is what it is — and it is
       counted down here rather than in Sky.minute() so it lasts a fifth of a
       second of real time and not a fifth of a game minute. */
    const st = Sky.state();
    if (st.flash > 0) {
      st.flash = Math.max(0, st.flash - (this.lastDt || .016));
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = Math.min(.5, st.flash) * (World.indoors() ? .45 : 1);
      c.fillStyle = '#dfe8ff';
      c.fillRect(Cam.x, Cam.y, Cam.w, Cam.h);
      c.restore();
    }
  },
  /* Every lamppost on this level, found once and kept: the list only changes
     when the map underneath does, and levelChanged() is already the place that
     is said. */
  lampList() {
    if (this._lamps) return this._lamps;
    this._lamps = (World.objects || []).filter(o =>
      (o.fdef && o.fdef.sprite === 'obj.lamppost') || o.kind === 'lamp');
    return this._lamps;
  },
  /* THE LAMPS. Drawn after the grade and with 'lighter', so they are light put
     back rather than darkness left out — which is why a streetlight in this
     game has a pool under it and a headlight has a cone in front of it, and why
     neither of them does anything at all at two in the afternoon. */
  lamps(x0, y0, x1, y1) {
    if (World.indoors() || !Sky.lampsOn()) return;
    const c = this.ctx;
    /* Fog is what makes a streetlight visible as a light rather than as a lit
       patch of pavement, so it does not dim the lamps — it does the opposite. */
    const haze = 1 + Sky.fog() * .8;
    const night = clamp(-Sky.sunPos() * 2.2 + .35, .15, 1) * haze;
    c.save();
    c.globalCompositeOperation = 'lighter';
    const pool = this.glow('rgba(255,214,150,ALPHA)', Math.round(TILE * 3.4));
    this.lampList().forEach(o => {
      if (o.x < x0 - 4 || o.x > x1 + 4 || o.y < y0 - 4 || o.y > y1 + 4) return;
      /* Under the lamp, not at the base of the post: the light is at the top of
         it and this is where it lands. The flicker is one of them in eight, the
         same one every time, because a street where every lamp flickers is a
         horror film and a street where none of them does is a rendering. */
      const bad = ((o.x * 31 + o.y * 17) & 7) === 3;
      const f = bad ? (.55 + Math.abs(Math.sin(this.t * 9.3 + o.x)) * .45) : 1;
      /* The post is three tiles tall and anchored by its foot, so the base is
         the bottom of the tile and the lantern is two tiles above that. The
         pool goes on the ground at the foot and the lantern gets its own small
         bloom — the two halves of a streetlight, and without the second one the
         post is a dark stick standing in a bright circle. */
      const fx = (o.x + .5) * TILE;
      c.globalAlpha = .40 * night * f;
      c.drawImage(pool, fx - pool.width / 2, (o.y + .85) * TILE - pool.height / 2);
      c.globalAlpha = .26 * night * f;
      c.fillStyle = '#ffe6b0';
      c.beginPath(); c.arc(fx, (o.y - 1.7) * TILE, 6, 0, 6.3); c.fill();
    });
    /* Headlights. Only on something that is being driven — a car parked in a
       bay with its lights on all night is a flat battery, and the pool car has
       enough wrong with it. */
    (World.cars || []).forEach(car => {
      if (car !== Cars.driving && !car.traffic) return;
      if (!Cam.visible(car.x, car.y)) return;
      const d = car.def, hl = d.len / 2, hw = d.wid / 2;
      c.save();
      c.translate(car.x, car.y); c.rotate(car.a);
      const beam = c.createLinearGradient(hl, 0, hl + TILE * 3.6, 0);
      beam.addColorStop(0, 'rgba(255,242,214,.34)');
      beam.addColorStop(1, 'rgba(255,242,214,0)');
      c.fillStyle = beam;
      c.globalAlpha = night;
      c.beginPath();
      c.moveTo(hl - 2, -hw + 3); c.lineTo(hl + TILE * 3.6, -hw - TILE * 1.1);
      c.lineTo(hl + TILE * 3.6, hw + TILE * 1.1); c.lineTo(hl - 2, hw - 3);
      c.closePath(); c.fill();
      c.restore();
    });
    c.restore();
  },
  /* WHAT IS COMING DOWN. Screen space, after the camera transform has been
     popped: rain falls past the camera rather than past the map, and drawing it
     in world coordinates makes it slide sideways whenever you walk.

     No particle objects. Every drop's position is a function of its index and
     the clock, so a downpour is four hundred numbers rather than four hundred
     allocations a second, and pausing the game stops it dead because `this.t`
     stops. */
  /* A drop's own numbers, and the reason there is a hash here at all.

     This used to be a pair of terms of the form `i * BIG % M`, which is a
     lattice and not a scatter: both numbers were linear in the drop's index,
     so the pairs fell on a handful of parallel lines and the rain arrived in
     stripes. Worse, the two were correlated with each other and with
     everything derived from them — a column of drops all fell at the same
     speed, at the same length, because speed and length were read off the same
     linear sequence as the column.

     This is the finalising mix of a small integer hash: one multiply-xor-shift
     round per call, no allocation, and `s` selects a stream, so one drop's x,
     its y, its speed, its length and its lean are five independent numbers
     rather than five views of one. Same cost as the arithmetic it replaced. */
  noise(i, s) {
    let h = Math.imul(i + 1, 374761393) + Math.imul(s + 1, 668265263) | 0;
    h = Math.imul(h ^ h >>> 13, 1274126177);
    return ((h ^ h >>> 16) >>> 0) / 4294967296;
  },
  /* Three sheets of it at three distances, because rain seen through rain is
     not one flat curtain: the far stuff is thin, slow, short and dim, the near
     stuff is bright and long and comes down hard. Three passes rather than
     three hundred, since a stroke style is per path and a path is cheap. */
  RAIN_LAYERS: [
    { share: .46, alpha: .26, width: 1,   speed: .74, len: .70 },
    { share: .34, alpha: .42, width: 1.2, speed: 1,   len: 1 },
    { share: .20, alpha: .62, width: 1.7, speed: 1.32, len: 1.45 },
  ],
  weather() {
    const k = Sky.kind();
    if (!k.fall || !k.rate) return;
    /* Indoors you do not get rained on. You get a window with water running
       down it, and that is drawn by wallArt(). */
    if (World.indoors()) return;
    /* And with animation off — which follows the operating system's
       reduced-motion setting by default — nothing falls. The weather is still
       there: it is in the light, on the ground and on the window, and all three
       of those hold still. */
    if (!this.animate) return;
    const c = this.ctx, W = Cam.w, H = Cam.h, t = this.t;
    const n = Math.round((k.fall === 'snow' ? 90 : 150) * k.rate);
    c.save();
    /* Both of these wrap their positions through a span WIDER than the screen,
       so a drop that leaves one edge is already drawn coming in at the other.
       The base number has to cover that whole span: seed it across the screen
       only, as this did, and everything the lean pushes off the right-hand
       edge lands back in the same narrow band on the left — which is a stripe
       of double-thick rain down one side of the frame and nothing at all in
       the corner it came from. Uniform over the span in, uniform out. */
    const xSpan = W + 120, ySpan = H + 80;
    if (k.fall === 'snow') {
      c.fillStyle = 'rgba(244,250,255,.85)';
      for (let i = 0; i < n; i++) {
        const rx = this.noise(i, 1), ry = this.noise(i, 2), rs = this.noise(i, 3);
        const rr = this.noise(i, 4), rd = this.noise(i, 5);
        /* Not one drift for all of it: each flake has its own sway, its own
           period and its own idea of down, which is the difference between
           snow and a screensaver of dots. */
        const sp = 22 + rs * 40;
        const sway = Math.sin(t * (.45 + rd * .7) + rd * 12) * (7 + rd * 16);
        const x = ((i + rx) * (xSpan / n) + sway + t * (5 + rd * 9)) % xSpan - 60;
        const y = (ry * ySpan + t * sp) % ySpan - 40;
        c.globalAlpha = .30 + rr * .62;
        c.beginPath(); c.arc(x, y, .9 + rr * 2, 0, 6.3); c.fill();
      }
    } else {
      /* Rain and sleet. Sleet is rain that has given up: shorter, slower,
         paler, and it comes at you sideways because it always does. */
      const sleet = k.fall === 'sleet';
      const lean = sleet ? 0.42 : 0.22;
      const base = sleet ? 430 : 700, blen = sleet ? 7 : 12;
      const col = sleet ? '219,232,245' : '178,206,235';
      let from = 0;
      for (const L of this.RAIN_LAYERS) {
        const upto = Math.min(n, from + Math.round(n * L.share));
        c.strokeStyle = `rgba(${col},${L.alpha * (sleet ? 1.3 : 1)})`;
        c.lineWidth = L.width * (sleet ? 1.2 : 1);
        c.beginPath();
        /* Across, each drop gets its own slice of the width and a random
           position inside it, rather than a random position across the whole
           of it. Pure scatter clumps: with a few hundred drops you get a
           handful of gaps and a handful of thickets every frame, and the eye
           reads those as the rain being patchy rather than as the rain being
           random. A drop's x barely moves once it is falling — the lean only
           slides it a fifth of a screen over a whole descent — so evening it
           out here evens out the whole shower, and the jitter inside the slice
           is what keeps it from looking like railings. */
        const slice = xSpan / Math.max(1, upto - from);
        for (let i = from; i < upto; i++) {
          const rx = this.noise(i, 1), ry = this.noise(i, 2);
          const rs = this.noise(i, 3), rl = this.noise(i, 4), rn = this.noise(i, 5);
          const sp = base * L.speed * (.78 + rs * .5);
          const len = blen * L.len * (.62 + rl * .85);
          /* Its own lean, within a few degrees of the shower's. Rain that all
             leans by exactly the same amount is a hatching pattern. */
          const sl = lean * (.82 + rn * .36);
          const y = (ry * ySpan + t * sp) % ySpan - 40;
          const x = ((i - from + rx) * slice + y * sl) % xSpan - 60;
          c.moveTo(x, y); c.lineTo(x - len * sl, y - len);
        }
        c.stroke();
        from = upto;
      }
    }
    c.restore();
  },
  /* The map underneath has been replaced. Anything cached off its shape — the
     minimap is baked once and blitted after that — has to go, or the new level
     is played over a picture of the old one. */
  levelChanged() { this._mmBase = null; this._lamps = null; },
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
  /* Kit units in the break room only: the same run type is also the toilets'
     vanity and the training room's bench, and a wooden kitchen carcass under a
     washroom sink is worse than the grey slab it replaced.

     Asked in one place because two things need the answer and they must not
     disagree: this draws the run, and the object pass has to know how high to
     stand a kettle on it. */
  kitRun(t) { return !!t && World.zoneAt(t.x, t.y) === 'brk' && Tiles.has('obj.counter'); },
  /* The run under a tile, or null. World.worktops is a handful of entries — a
     scan is cheaper than another grid to keep in step with it. */
  worktopAt(x, y) {
    const list = World.worktops || [];
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      if (t.y === y && x >= t.x && x < t.x + t.w) return t;
    }
    return null;
  },
  /* How far above the centre of its tile a worktop's surface is.

     The slab is drawn 8/44 of a tile down from the top of its own tile, which
     puts its front edge a whisker under the centre — that is what the 11 was
     measured against, and it is why a jug on the vanity sits ON the vanity.
     The kit's kitchen unit is a two-tile sprite standing on the same tile: its
     worktop is the band 12..31 of a 64px slot whose foot is half a tile below
     the centre, so the surface is 26px ABOVE it and everything on that counter
     was standing fifteen pixels down the cupboard doors. */
  SLAB_TOP: 11,
  KIT_TOP: 26,
  worktopTop(x, y) { return this.kitRun(this.worktopAt(x, y)) ? this.KIT_TOP : this.SLAB_TOP; },

  worktops(x0, y0, x1, y1) {
    const list = World.worktops; if (!list) return;
    const kit = [];
    for (const t of list) {
      if (t.x + t.w < x0 - 1 || t.x > x1 + 1 || t.y < y0 - 2 || t.y > y1 + 1) continue;
      if (this.kitRun(t)) kit.push(t); else kit.push(null);
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
     furniture and were just as visible through the wall in front of them.

     What the ANSWER means differs, though, and that is the whole of the note
     on colleague() below: a person is taller than the course that hides them,
     so 0 here means "clip them at the top of it", not "drop them". Furniture
     is shorter than the course, so for furniture the two are the same thing.

     The PLAYER is deliberately never asked: the extension fades so you can see
     your own avatar when you cross, and veiling it would undo the thing the
     fade is for. */
  veilAt(x, y) {
    const wy = y + 1;
    if (wy + 1 >= MAPH || !World.solid[wy] || !World.solid[wy][x]) return 1;
    /* Only a wall with a room below it grows the extension — see the `below`
       branch of the wall loop. Interior mass has nothing stacked on it. */
    if (World.solid[wy + 1][x] || !World.zone[wy + 1][x]) return 1;
    const rel = (P.y - wy * TILE) / (TILE * 1.6);
    return Math.max(0, Math.min(1, (1 - Math.max(.15, Math.min(1, rel + .35))) * 2.2));
  },

  /* ONE COLLEAGUE, drawn where they are standing. Its own method because the
     wall clip in draw() draws them twice — once above the top of the wall
     course and once behind it — and both halves have to be the same person:
     the same seat, the same frame of the same walk, the same name under them.
     Everything that hangs off somebody (shadow, ring, quest mark, name,
     bubble) is in here for that reason, and clips with them. */
  colleague(n, hi) {
    const c = this.ctx;
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
  },
  /* One person on the street. Split out for the same reason colleague() is:
     the wall clip draws them twice and both halves have to be the same
     stranger. */
  stranger(p, hi) {
    const c = this.ctx;
    this.shadow(p.x, p.y + 13, 12, 5);
    if (hi === p) {
      const box = Sprites.box(p.sprite, p.x, p.y);
      c.save(); c.strokeStyle = 'rgba(255,179,71,.9)'; c.lineWidth = 2;
      c.shadowColor = '#ffb347'; c.shadowBlur = 14;
      c.beginPath(); c.roundRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4, 8); c.stroke();
      c.restore();
    }
    if (Sprites.has(p.sprite)) {
      const f = p.walking ? Sprites.frame(p.sprite, this.animate, p.step)
        : this.animate ? Sprites.breath(p.sprite) : 0;
      Sprites.draw(c, p.sprite, p.dir ?? 2, f, p.x, p.y);
    } else this.emoji('🧑', p.x, p.y, 28);
    /* No name over a stranger. That label is how you tell one of the twenty
       colleagues from another, and a street of floating names would say these
       are twenty more people to get to know. They are not. */
    if (p.sayT > 0) this.bubble(p.x, p.y - 34, p.say, Math.min(1, p.sayT));
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
        /* The only daylight in the building, and it keeps the time. It used to
           keep the SHIFT'S time — a fraction from 09:00 to 17:00, which meant
           the glass was as bright at 04:00 as it was at nine — and it asks the
           sky now, so the one window on the fourth floor and the whole of the
           town outside can never disagree about what it is doing out there.
           It is also the only place indoors that shows you the weather, which
           is exactly how much of the weather anybody at this desk sees. */
        const w = size * 1.06, h = size * .86;
        const view = Sky.windowSky();
        const sky = c.createLinearGradient(0, -h / 2, 0, h / 2);
        sky.addColorStop(0, view.top);
        sky.addColorStop(1, view.bot);
        frame(w, h, '#cdd6e4', '#8fb4d8');
        c.fillStyle = sky; c.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
        /* The building opposite, which is the whole view. */
        c.fillStyle = 'rgba(30,38,52,.45)';
        c.fillRect(-w / 2 + 3, h / 2 - 3 - h * .3, w - 6, h * .3);
        c.fillStyle = 'rgba(255,214,120,' + (view.lit ? .5 : .16) + ')';
        for (let i = 0; i < 6; i++)
          c.fillRect(-w / 2 + 6 + rnd() * (w - 14), h / 2 - 4 - rnd() * h * .26, 2, 2);
        /* Water on the glass, or snow going past it. Two lines' worth, and it
           is the difference between a window and a picture of one. */
        const wk = Sky.kind();
        if (wk.fall === 'snow') {
          c.fillStyle = 'rgba(250,253,255,.8)';
          for (let i = 0; i < 7; i++) {
            const fx = -w / 2 + 5 + rnd() * (w - 10);
            const fy = -h / 2 + 4 + ((rnd() * h + this.t * 9) % (h - 8));
            c.fillRect(fx, fy, 1.6, 1.6);
          }
        } else if (wk.fall) {
          c.strokeStyle = 'rgba(210,232,250,.45)'; c.lineWidth = 1;
          c.beginPath();
          for (let i = 0; i < 9; i++) {
            const fx = -w / 2 + 5 + rnd() * (w - 10);
            const fy = -h / 2 + 4 + ((rnd() * h + this.t * (22 + rnd() * 30)) % (h - 8));
            c.moveTo(fx, fy); c.lineTo(fx - 1, fy - 4 - rnd() * 4);
          }
          c.stroke();
        }
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
    const c = this.ctx; this.t += dt || 0; this.lastDt = dt || 0;
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
      c.drawImage(this.floorTile(z, (x + y) & 1, World.surf && World.surf[y][x]), x * TILE, y * TILE, TILE, TILE);
    }
    /* The kerb, and then the paint on the road. Both go straight onto the
       floor, before the wear and the wall shadows: a marking is painted on the
       tarmac and everything the building does to the light happens on top of
       it. Both cost nothing on a level with no surfaces declared. */
    this.kerbs(x0, y0, x1, y1);
    this.roadPaint();
    /* And then the weather on it. Water and lying snow are part of what the
       ground is made of today, so they go on with the ground rather than over
       the whole frame — a puddle a colleague walks through has to be under
       them, and a screen-space wash never can be. */
    this.wetGround(x0, y0, x1, y1);

    /* worn patches and old stains. The patch is a whole tile lightened by
       under two percent, which is nothing at all on carpet or on grit and was
       nothing at all on the road until the road became a flat, poured sheet
       with no grain in it: on that, a tile-shaped patch is a tile-shaped
       patch, and a road with a chequerboard on it is worse than a road with
       nothing on it. So the carriageway sits this one out and keeps the
       stains below, which are round, and which a road has anyway. */
    c.fillStyle = 'rgba(255,255,255,.018)';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!World.zone[y][x] || World.solid[y][x]) continue;
      if (World.surf && World.surf[y][x] === 'tarmac') continue;
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
      /* Looking DOWN finds a doorway as readily as a room, and that is right:
         the wall above an opening is its head, seen from the opening, and it
         takes the finish of the room the door leads to. That is what puts two
         courses of glazed brick over the toilet door and it is the whole of
         why a doorway in a wall you walk through east-west reads as a door.
         Looking UP must NOT: a doorway above this tile is a hole in the same
         wall run, not a room this wall caps, and taking its zone painted the
         one tile south of the toilet door in the toilets' white brick while
         the rest of the column stayed office drywall. Left as the only wrong
         tile on that wall, in the one room whose finish is light enough to
         see it. */
      const nz = (World.zone[y + 1] && World.zone[y + 1][x])
        || (!World.isOpening(x, y - 1) && World.zone[y - 1] && World.zone[y - 1][x])
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
      /* Indoors this is the inside of the building and it is black. Outdoors
         it used to be a flat pale blue-grey standing for distance, which was
         right while the only wall mass out there was one course of car park
         wall — and became wrong the moment a level had a whole city block in
         the middle of it, because forty tiles of flat pale grey between two
         streets reads as a lake. It is roofs now, which is what is actually up
         there: correct over the block, and better than a flat colour past the
         edge of the map as well, where what you are looking at is the rest of
         a town. */
      if (!anyNear) {
        if (World.indoors()) { c.fillStyle = '#080b11'; c.fillRect(x * TILE, y * TILE, TILE, TILE); }
        else c.drawImage(this.roofTile((x * 5 + y * 3) & 1), x * TILE, y * TILE, TILE, TILE);
        continue;
      }
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
        /* Except over a doorway. The fade answers "which side of this wall is
           the player on", and the head of an opening has no sides to be on:
           what it hides is a tile of wall you are already looking through a
           hole in. Fading it took the top half off the door surround and left
           the bottom half standing, which is the one thing on this wall that
           reads as a fault rather than as depth. */
        const head = World.isOpening(x, y + 1);
        const rel = (P.y - py) / (TILE * 1.6);
        const wallAlpha = head ? 1 : Math.max(.15, Math.min(1, rel + .35));
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
    /* Cars sort with everybody else, which is the whole reason they are in
       this list rather than drawn in a pass of their own: walk behind a parked
       car and you are behind it, walk in front and you are in front of it. */
    (World.cars || []).forEach(car => { if (Cam.visible(car.x, car.y)) drawables.push({ y: car.y, kind: 'car', car }); });
    /* The people on the street, sorted with everybody else for the same reason
       the cars are: walk behind one and you are behind them. */
    (World.peds || []).forEach(p => { if (Cam.visible(p.x, p.y)) drawables.push({ y: p.y, kind: 'ped', p }); });
    /* Not while you are in one. You are the car — drawing you as well puts a
       person standing on the roof of the thing they are driving. */
    if (!Cars.driving) drawables.push({ y: P.y, kind: 'player' });
    drawables.sort((a, b) => a.y - b.y);

    const hi = Interact.target;
    drawables.forEach(d => {
      if (d.kind === 'counter') {
        this.counter(d.t);
      } else if (d.kind === 'ped') {
        /* Somebody on the street, behind the same two-course wall and clipped
           by it the same way — the car park has one along the road and the
           retail park has one across the back, and a stranger blinking out on
           the pavement behind either of them is the same fault as a colleague
           doing it in the corridor. */
        const p = d.p, pty = Math.floor(p.y / TILE);
        const pveil = this.veilAt(Math.floor(p.x / TILE), pty);
        if (pveil >= 1) { this.stranger(p, hi); return; }
        const plip = pty * TILE;
        c.save(); c.beginPath(); c.rect(-1e6, -1e6, 2e6, 1e6 + plip); c.clip();
        this.stranger(p, hi); c.restore();
        if (pveil > 0) {
          c.save(); c.beginPath(); c.rect(-1e6, plip, 2e6, 1e6); c.clip();
          c.globalAlpha = pveil; this.stranger(p, hi); c.restore();
        }
      } else if (d.kind === 'car') {
        this.car(d.car);
        if (hi === d.car && !Cars.driving) {
          c.save();
          c.strokeStyle = 'rgba(77,163,255,.9)'; c.lineWidth = 2;
          c.shadowColor = '#4da3ff'; c.shadowBlur = 14;
          const cw = d.car.def.len + 12, ch = d.car.def.wid + 12;
          c.translate(d.car.x, d.car.y); c.rotate(d.car.a);
          c.beginPath(); c.roundRect(-cw / 2, -ch / 2, cw, ch, 10); c.stroke();
          c.restore();
        }
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
        /* Resolved once, here, because everything below asks the same question
           of it — whether it hangs, whether it draws its own shadow, where its
           middle is, and what to draw — and a tree must not be able to answer
           in two different seasons within one frame. */
        const fsprite = this.spriteOf(f);
        const size = o.kind === 'chair' ? (Sprites.ready ? 22 : 16) : (f.size ?? 20);
        let ex = d.wx, ey = d.wy, onFloor = true;
        if (o.mount === 'wall') {
          const s = o.wallSide;
          /* Hung things stop short of the wall they hang on — that three
             quarters of a tile is the thickness of the thing plus the fact
             that you are looking at it from in front. Paint has no thickness
             and no front: a tag goes ON the wall tile, centred, or half of it
             ends up lying on the pavement beside it. */
          const off = f.paint ? TILE : TILE * .72;
          ex += s === 'w' ? -off : s === 'e' ? off : 0;
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
          const wallSprite = fsprite && Tiles.anchors && Tiles.anchors[fsprite] === 'wall';
          const high = s === 'n' && (o.art || wallSprite);
          ey += s === 'n' ? (high ? -TILE * 1.45 : -TILE * .72) : s === 's' ? (f.paint ? TILE : TILE * .68) : 0;
          onFloor = false;
        } else if (o.onTable) {
          /* Before the worktop case: the jug and the biscuits are `surface`
             things that happen to be standing on a table, and a table is not
             as tall as a counter. */
          ey -= 8;                                   /* up onto the tabletop */
          onFloor = false;
        } else if (o.mount === 'surface' || o.onCounter) {
          /* Up onto the worktop — and there are two of those. A front desk is
             the counter's own height, which is what the slab is; the break
             room's kitchen units are the kit's, and a tile taller. */
          ey -= o.onCounter ? this.SLAB_TOP : this.worktopTop(o.x, o.y);
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
        const drawsOwn = (fsprite && Tiles.has(fsprite)) || f.drawn || o.art || o.noEmoji;
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
        const edgeOn = o.mount === 'wall' && o.wallSide !== 'n' && !f.paint
                    && fsprite && Tiles.anchors && Tiles.anchors[fsprite] === 'wall';
        /* Fifteen archive boxes and thirty-two chairs cut from one rectangle
           read as a stamp rather than as a room. Tiles.draw already mirrors —
           it is how the far leaf of a double doorway is drawn — so variety
           costs a boolean rather than a second crop. Seeded off the tile so it
           is stable across a rebuild, and limited to kinds whose art is
           symmetrical enough that the mirror is a variation rather than a
           mistake: nothing with a handle, a hinge or a console on one side. */
        const canFlip = FLIPPABLE.has(o.kind) && ((o.x * 7 + o.y * 13) & 1) === 1;
        /* `turn` is quarter turns clockwise, and it is ART AND NOTHING ELSE —
           the same standing as `flip`. A sofa turned to face the other way is
           still one tile, still solid or not exactly as it was, and still
           interacted with from wherever it always was: nothing here touches
           World.solid and nothing downstream reads this.

           About the sprite's own middle rather than about the tile it is
           anchored to, or a bookcase would swing out of the room when it
           turned. The shadow, the highlight and the ringing pool stay square
           to the map above: they are the floor and the UI, not the object. */
        const turn = (o.turn || 0) & 3;
        if (turn) {
          const mid = (fsprite && Tiles.has(fsprite))
            ? Tiles.centre(fsprite, ex, ey + bob) : { x: ex, y: ey + bob };
          c.save();
          c.translate(mid.x, mid.y); c.rotate(turn * Math.PI / 2); c.translate(-mid.x, -mid.y);
        }
        if (edgeOn || !(fsprite && Tiles.draw(c, fsprite, ex, ey + bob, canFlip))) {
          if (o.art) this.wallArt(o, ex, ey + bob, size);
          else if (!o.noEmoji) this.emoji(o.e, ex, ey + bob, size);
        }
        if (turn) c.restore();
        if (o.kind === 'pc' && this.animate) {
          c.fillStyle = 'rgba(120,190,255,' + (0.05 + Math.abs(Math.sin(this.t * 2 + o.wob)) * .08) + ')';
          c.fillRect(ex - 13, ey - 12, 26, 16);
        }
        c.restore();
      } else if (d.kind === 'npc') {
        const n = d.n;
        /* BEHIND THE WALL IN FRONT OF YOU — and a person is not a filing
           cabinet about it.

           Every wall whose face you can see is drawn two courses tall, and the
           upper course is painted over the row of floor BEHIND it. For
           furniture that is the whole story: a filing cabinet is shorter than
           the course that hides it, so veil() drops it and that is what stops
           this building's furniture painting straight through its own walls.

           A colleague is taller than that course. Half of them stands above
           its top edge — which is why dropping them the same way was wrong in
           a way you could sit and watch: a hundred and thirty-six squares of
           this floor plan are "the row behind a wall", and one of them is the
           bottom lane of the corridor, which is four lanes deep and which
           everybody walks all day. From the main floor a colleague crossing it
           blinked out and back every time they drifted a lane.

           So they are CLIPPED rather than culled. What stands above the top of
           the course is drawn solid, because you can see it and there is
           nothing in front of it; what is behind the course fades on the
           veil's own ramp exactly as it always did. Nothing shows through a
           wall, which is the thing the veil was written for, and nobody
           vanishes, which is the thing it cost. */
        const nty = Math.floor(n.y / TILE);
        const nveil = this.veilAt(Math.floor(n.x / TILE), nty);
        if (nveil >= 1) { this.colleague(n, hi); return; }
        /* The top edge of the course is the top edge of the tile they are
           standing on: it is drawn over that tile, one course up from the wall
           itself. Both halves are the same person drawn twice — same seat,
           same frame of the same walk, same name — so neither can drift. */
        const lip = nty * TILE;
        c.save(); c.beginPath(); c.rect(-1e6, -1e6, 2e6, 1e6 + lip); c.clip();
        this.colleague(n, hi); c.restore();
        if (nveil > 0) {
          c.save(); c.beginPath(); c.rect(-1e6, lip, 2e6, 1e6); c.clip();
          c.globalAlpha = nveil; this.colleague(n, hi); c.restore();
        }
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

    /* THE LIGHT, over the top of everything the world is made of and under
       everything the game says about it. The order is the whole trick: the
       grade darkens the office, the lamps put the light back where there is a
       lamp, and the particles and the floating numbers are drawn after both
       because a damage number is not lit by anything. */
    this.skyGrade();
    this.lamps(x0, y0, x1, y1);

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
    /* Rain falls past the CAMERA, not past the map, so it is drawn out here
       with everything else that lives at the edge of the screen. */
    this.weather();
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
    const steps = Guide.steps();
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
      /* A surface paints itself, because a minimap of a town in which the
         roads are the same colour as the pavements is a minimap of a car park.
         `map` and not `floor`: a surface's floor colour is a TINT multiplied
         through a texture, and there is no texture down here to multiply. */
      const s = World.surf && World.surf[y][x];
      const S = s && SURFACES[s];
      /* And the seasonal ones paint themselves four ways, for the same reason
         the tile does: a green verge on the map in January is a lie about a
         white one. Sky.newDay() drops the baked minimap when the season turns. */
      c.fillStyle = (S && ((S.maps && S.maps[Sky.season()]) || S.map)) || ZONES[z].floor;
      c.fillRect(x * sx, y * sy, sx + .5, sy + .5);
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
    (World.cars || []).forEach(car => {
      if (car === Cars.driving) return;      /* that dot is the player's */
      c.fillStyle = car.canDrive ? 'rgba(90,212,138,.9)' : 'rgba(200,205,215,.6)';
      c.fillRect(car.x / TILE * sx - 1, car.y / TILE * sy - 1, 2.6, 2.6);
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
