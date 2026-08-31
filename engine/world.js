'use strict';
/* ---------------- World / map ---------------- */
/* The builder, and the map it has most recently built. The definitions it
   builds FROM — ZONES, FURN, ROOM_DEFS, DOOR_DEFS, WP — are in data/world.js,
   and which set of them to use is a level, from data/levels.js.

   World is deliberately still one map rather than a collection of them: it is
   whichever level is loaded, so every reader — the renderer, collision, the
   minimap, Interact, the test suite — asks the same questions of the same
   object it always did and never has to know that levels exist. Levels.go()
   swaps the contents underneath it; engine/levels.js keeps the ones it is not
   currently showing. */
const World = {
  /* The id of the loaded level, and the definition it was built from. Anything
     that has to behave differently in the basement than on the fourth floor
     reads these — Phones does, because a phone only rings where there are
     phones to ring. */
  level: null, def: null,
  solid: null, zone: null, seed: null, objects: [], byTile: new Map(),
  build(def) {
    this.def = def; this.level = def.id;
    /* The live dimensions of the map, which is what MAPW/MAPH mean. Set before
       anything below reads them: every loop in this file is bounded by them. */
    MAPW = def.w; MAPH = def.h;
    this.solid = []; this.zone = []; this.seed = []; this.objects = []; this.byTile = new Map();
    /* Everything derived. Reset rather than left over, or a level with no desks
       in it draws the previous level's desks on its floor. */
    this.desks = []; this.worktops = []; this.tables = []; this.doorways = [];
    this.blocked = new Set();
    for (let y = 0; y < MAPH; y++) {
      this.solid[y] = []; this.zone[y] = []; this.seed[y] = [];
      for (let x = 0; x < MAPW; x++) { this.solid[y][x] = 1; this.zone[y][x] = null; this.seed[y][x] = Math.random(); }
    }
    (def.rooms || []).forEach(rm => {
      const [x1, y1, x2, y2] = rm.r;
      for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) { this.solid[y][x] = 0; this.zone[y][x] = rm.z; }
    });
    (def.doors || []).forEach(d => {
      this.solid[d.y][d.x] = 0;
      this.zone[d.y][d.x] = this.zone[d.y][d.x] || d.z;
      this.add({ x: d.x, y: d.y, e: d.locked ? '🔐' : '🚪', name: d.name, kind: 'door', solid: false, use: d.locked ? 'lockedDoor' : 'door', locked: d.locked || null });
    });
    def.furnish.call(this);
    this.computeAO();
    this.buildDoorways();
    this.buildFurniture();
    return this;
  },
  /* Is there a sky over this one. Everything outdoors is decided from this
     single flag: no ceiling lights, daylight instead of strip lighting, and the
     void beyond the walls painted as sky rather than left black. */
  indoors() { return !this.def || this.def.indoors !== false; },
  /* Work out once, here, how each object is furnished: which wall it hangs on,
     which worktop it stands on, and where the tables and counters run. All of
     it is art — nothing below touches World.solid, so what is walkable and
     what you can interact with are exactly what they were. */
  buildFurniture() {
    const at = (x, y) => (x < 0 || y < 0 || x >= MAPW || y >= MAPH) ? 1 : this.solid[y][x];
    this.worktops = []; this.tables = [];
    /* Where the front desks are is a fact about a particular level, not about
       furnishing in general, so it comes from the level definition. Copied
       rather than referenced: the renderer is free to annotate these and must
       not write through to the catalogue, which outlives the build. */
    this.counters = (this.def.counters || []).map(t => Object.assign({}, t));
    const onCounter = (x, y) => this.counters.some(t => y === t.y && x >= t.x && x < t.x + t.w);

    this.objects.forEach(o => {
      if (onCounter(o.x, o.y)) o.onCounter = true;
      /* The kind says how this sort of thing is normally furnished; the object
         gets the last word. Merged once, here, so the renderer never has to ask
         the question twice. */
      const f = o.fdef = Object.assign({}, FURN[o.kind], o.furn);
      o.mount = f.mount || null;
      o.art = f.art || null;
      if (f.drawn || f.art) o.noEmoji = true;
      /* The kit only draws fronts, so a cupboard needs its back to a wall
         behind it. The cabinet and trophy shelf are against the SOUTH wall,
         which put their doors flat against the plaster: those keep the emoji. */
      if (f.sprite && (f.sprite === 'obj.cabinet' || f.sprite === 'obj.shelf')
          && at(o.x, o.y + 1) && !at(o.x, o.y - 1)) f.sprite = null;
      /* Which wall is it against? North reads best — you see the whole face of
         it — so prefer that, then the sides, then the wall below. Something
         standing in open floor keeps mount null and stays on the floor rather
         than being hung on a wall two tiles away that it never touched. */
      if (f.mount === 'wall') {
        const side = at(o.x, o.y - 1) ? 'n' : at(o.x - 1, o.y) ? 'w'
          : at(o.x + 1, o.y) ? 'e' : at(o.x, o.y + 1) ? 's' : null;
        o.wallSide = side;
        if (!side) o.mount = null;
      }
    });

    /* Group surface-mounted things into runs along a row, so the kettle, the
       washing up and the biscuit tin are one counter rather than three objects
       on squares of carpet. A run bridges a tile ONLY when something stands on
       it: bridging any gap read the four spaced-out training modules as one
       bench with holes in it, and once bare stretches became solid those holes
       sealed off the front of the room. */
    /* A table is a surface too: standing on a table tile is derived, like
       sitting. Must run BEFORE the worktops are grouped, or a jug on the
       meeting table gets a one-tile kitchen counter of its own. */
    const tabTiles = new Set(this.objects.filter(o => o.kind === 'table').map(o => o.x + ',' + o.y));
    this.objects.forEach(o => {
      if (o.kind !== 'table' && tabTiles.has(o.x + ',' + o.y)) o.onTable = true;
    });

    const surfaces = this.objects.filter(o => o.mount === 'surface' && !o.onTable);
    const rows = new Map();
    surfaces.forEach(o => {
      const k = o.y;
      if (!rows.has(k)) rows.set(k, []);
      rows.get(k).push(o);
    });
    rows.forEach((list, y) => {
      list.sort((a, b) => a.x - b.x);
      let run = [list[0]];
      const flush = () => {
        const x0 = run[0].x, x1 = run[run.length - 1].x;
        this.worktops.push({ x: x0, y, w: x1 - x0 + 1 });
        run.forEach(o => o.onTop = true);
      };
      for (let i = 1; i < list.length; i++) {
        const prev = run[run.length - 1].x, gap = list[i].x - prev;
        const bridged = gap === 1 || (gap === 2 && this.at(prev + 1, y).length > 0);
        if (bridged) run.push(list[i]);
        else { flush(); run = [list[i]]; }
      }
      flush();
    });

    /* Tables are drawn, not emoji. Contiguous table tiles on a row are one
       table — the long table in Meeting Room 2 is four of them. */
    const tabs = this.objects.filter(o => o.kind === 'table').sort((a, b) => a.y - b.y || a.x - b.x);
    let cur = null;
    tabs.forEach(o => {
      if (cur && o.y === cur.y && o.x === cur.x + cur.w) cur.w++;
      else { cur = { x: o.x, y: o.y, w: 1 }; this.tables.push(cur); }
    });

    /* Everything above this line is art; this is not. Bare stretches of a
       counter or worktop go in World.blocked, which isSolid() consults — NOT
       World.solid, which means *wall* to the renderer and would grow one on the
       worktop. Tiles carrying an object are left alone: that object's own
       `solid` still decides, which keeps the red tray and the cake walkable. */
    this.blocked = new Set();
    const fill = t => {
      for (let i = 0; i < t.w; i++)
        if (!this.at(t.x + i, t.y).length) this.blocked.add((t.x + i) + ',' + t.y);
    };
    this.counters.forEach(fill);
    this.worktops.forEach(fill);
  },
  /* A door is walkable floor punched through a wall run; the doorway is art
     only. Work out each opening's axis once here so the renderer can build it
     into the wall — jambs, threshold, and a leaf on the hinge side. */
  buildDoorways() {
    const at = (x, y) => (x < 0 || y < 0 || x >= MAPW || y >= MAPH) ? 1 : this.solid[y][x];
    this.doorways = [];
    /* 'loo' is NOT a door. The cubicles are toilets, and treating them as
       doorways drew a door leaf lying on its side across each one and
       suppressed the toilet underneath — the room had no toilets in it. They
       get proper stalls from R.cubicles() instead. */
    const isDoor = o => o.kind === 'door' || o.kind === 'exit';
    /* Probe PAST the opening. A two-tile doorway's neighbour is its other
       half, not a jamb; reading it as floor gave the corridor and main-floor
       doors the wrong axis and drew them lying on their side. */
    const doorTiles = new Set(this.objects.filter(isDoor).map(o => o.x + ',' + o.y));
    const jamb = (x, y, dx, dy) => {
      let cx = x + dx, cy = y + dy;
      while (doorTiles.has(cx + ',' + cy)) { cx += dx; cy += dy; }
      return at(cx, cy);
    };
    this.objects.forEach(o => {
      if (!isDoor(o)) return;
      const lr = jamb(o.x, o.y, -1, 0) && jamb(o.x, o.y, 1, 0);
      const ud = jamb(o.x, o.y, 0, -1) && jamb(o.x, o.y, 0, 1);
      /* 'h' = jambs to the left and right, so you walk through it vertically. */
      const axis = lr && !ud ? 'h' : (ud && !lr ? 'v' : (lr ? 'h' : 'v'));
      /* For a door set into a solid wall, the leaf faces whichever side you can
         actually stand on. */
      let face = 1;
      if (o.solid) {
        if (axis === 'h') face = !at(o.x, o.y + 1) ? 1 : -1;
        else face = !at(o.x + 1, o.y) ? 1 : -1;
      }
      this.doorways.push({ x: o.x, y: o.y, axis, face,
        locked: !!o.locked, solid: !!o.solid, kind: o.kind });
      /* The drawn doorway replaces the emoji; two doors on one tile is worse
         than none. The object itself stays exactly as it was, so interaction,
         the minimap and every Act are untouched. */
      o.noEmoji = true;
    });
  },
  /* Precompute, per open tile, which sides touch a wall. Used to lay a contact
     shadow along those edges — the cheapest way to stop the floor and the walls
     looking like two unrelated flat colours. */
  computeAO() {
    this.ao = [];
    for (let y = 0; y < MAPH; y++) {
      this.ao[y] = [];
      for (let x = 0; x < MAPW; x++) {
        if (this.solid[y][x] || !this.zone[y][x]) { this.ao[y][x] = 0; continue; }
        let m = 0;
        if (y > 0 && this.solid[y - 1][x]) m |= 1;
        if (y < MAPH - 1 && this.solid[y + 1][x]) m |= 2;
        if (x > 0 && this.solid[y][x - 1]) m |= 4;
        if (x < MAPW - 1 && this.solid[y][x + 1]) m |= 8;
        this.ao[y][x] = m;
      }
    }
  },
  add(o) {
    o.id = 'o' + this.objects.length;
    o.wob = Math.random() * 6.28;
    this.objects.push(o);
    const k = o.x + ',' + o.y;
    if (!this.byTile.has(k)) this.byTile.set(k, []);
    this.byTile.get(k).push(o);
    return o;
  },
  at(x, y) { return this.byTile.get(x + ',' + y) || []; },
  isSolid(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MAPW || ty >= MAPH) return true;
    if (this.solid[ty][tx]) return true;
    /* The bare stretches of counter and worktop — see buildFurniture(). Kept
       out of World.solid on purpose: solid means wall, and these are waist
       height. */
    if (this.blocked && this.blocked.has(tx + ',' + ty)) return true;
    return this.at(tx, ty).some(o => o.solid);
  },
  zoneAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MAPW || ty >= MAPH) return null;
    return this.zone[ty][tx];
  },
  /* The furniture itself is content, and lives with the rest of the content:
     each level's `furnish` in data/levels.js, called above with World as `this`
     so it still says `this.add(o)` and still records `this.desks`. It is here
     for the same reason Acts is in data/acts.js — it is one entry per object
     and it is where the writing is, not where the engine is. */
};
