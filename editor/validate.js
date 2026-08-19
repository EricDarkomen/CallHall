'use strict';
/* ---------------- What is wrong with this level ----------------
   The faults worth a tool are the ones you cannot see. A sealed room looks
   exactly like a room; a waypoint inside a sink looks like a sink. Both shipped,
   and both were found by walking World.isSolid outward from the spawn and asking
   what could not be reached — so that fill is the first thing here, and it runs
   on every edit rather than at the end.

   These are the same invariants the `levels` and `systems` suites assert. The
   suites are the backstop; this is the version that tells you while your hand is
   still on the mouse. */

const Check = {
  /* Last result, for the overlay and the panel. */
  open: 0, reachable: 0,
  marooned: [], faults: [], tiles: new Map(),

  run() {
    this.marooned = []; this.faults = []; this.tiles = new Map();
    this.connectivity();
    this.entries();
    this.waypoints();
    this.reach();
    this.mounts();
    this.windows();
    this.links();
    this.tables();
    this.bounds();
    return this;
  },

  /* A fault, and the tiles to paint. `level` is 'error' for something that is
     broken now and 'warn' for something that will bite later. */
  fault(level, msg, tiles, extra) {
    const f = Object.assign({ level: level, msg: msg, tiles: tiles || [] }, extra || {});
    this.faults.push(f);
    (f.tiles || []).forEach(t => {
      const k = t[0] + ',' + t[1];
      /* An error outranks a warning on a tile that has both. */
      if (level === 'error' || !this.tiles.has(k)) this.tiles.set(k, level);
    });
    return f;
  },
  errors() { return this.faults.filter(f => f.level === 'error').length; },
  warns() { return this.faults.filter(f => f.level === 'warn').length; },

  /* ---- connectivity ----
     Not "which tiles can be reached from an arrival point", which is the
     question this asked first and the wrong one: the fourth floor has an entry
     INSIDE the archive (you climb out of the hatch there), so sealing the
     archive door — the exact bug the Christmas decorations caused — left every
     tile still reachable from one entry or the other and the check said nothing.

     The right question is how many separate pieces the walkable floor is in. A
     level is one piece. A piece with no arrival point in it is floor nobody can
     ever stand on; two pieces that both have one are two places you cannot walk
     between, which is a building with a sealed room in it however you arrived. */
  connectivity() {
    const walk = (x, y) => x >= 0 && y >= 0 && x < MAPW && y < MAPH && !World.isSolid(x, y);
    const owner = new Map();
    const parts = [];

    for (let y = 0; y < MAPH; y++) for (let x = 0; x < MAPW; x++) {
      if (!walk(x, y) || owner.has(x + ',' + y)) continue;
      const part = { tiles: [], entries: [] };
      const idx = parts.length;
      const queue = [[x, y]];
      owner.set(x + ',' + y, idx);
      while (queue.length) {
        const [cx, cy] = queue.pop();
        part.tiles.push([cx, cy]);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
          const nx = cx + dx, ny = cy + dy, k = nx + ',' + ny;
          if (owner.has(k) || !walk(nx, ny)) return;
          owner.set(k, idx); queue.push([nx, ny]);
        });
      }
      parts.push(part);
    }

    for (const k in Doc.entries) {
      const e = Doc.entries[k];
      const at = owner.get(Math.floor(e[0]) + ',' + Math.floor(e[1]));
      if (at !== undefined) parts[at].entries.push(k);
    }

    const landed = parts.filter(p => p.entries.length);
    const orphans = parts.filter(p => !p.entries.length);

    /* Everything you can stand on having arrived legitimately. The object reach
       check is asked against this rather than against the whole floor. */
    this.reachSet = new Set();
    landed.forEach(p => p.tiles.forEach(t => this.reachSet.add(t[0] + ',' + t[1])));
    this.open = parts.reduce((n, p) => n + p.tiles.length, 0);
    this.reachable = this.reachSet.size;
    this.marooned = [];
    orphans.forEach(p => p.tiles.forEach(t => this.marooned.push(t)));
    this.parts = parts;

    if (!landed.length) {
      this.fault('error', 'No arrival point lands on walkable floor, so nothing on this level '
        + 'can be reached at all.', []);
      return;
    }
    if (this.marooned.length) {
      this.fault('error', this.marooned.length + ' walkable '
        + (this.marooned.length === 1 ? 'tile is' : 'tiles are')
        + ' cut off — floor nobody can ever stand on.', this.marooned);
    }
    if (landed.length > 1) {
      /* Name them by their arrival points, because that is what you will
         recognise: "start and hatch are not connected" is the whole diagnosis. */
      this.fault('error', 'This level is in ' + landed.length + ' separate pieces you cannot '
        + 'walk between (' + landed.map(p => p.entries.join('/')).join(' · ') + ').',
        landed.slice(1).reduce((a, p) => a.concat(p.tiles), []));
    }
  },
  walkableAndReached(x, y) {
    return this.reachSet && this.reachSet.has(x + ',' + y);
  },

  /* ---- arrival points ----
     A level that will not load leaves the previous one on screen, and nothing
     about that reads as an error — which is how a shift saved in the basement
     came back on the fourth floor. */
  entries() {
    const names = Object.keys(Doc.entries);
    if (!names.length) {
      this.fault('error', 'This level declares no entry points. go() would refuse to load it.', []);
      return;
    }
    names.forEach(k => {
      const e = Doc.entries[k];
      const x = Math.floor(e[0]), y = Math.floor(e[1]);
      if (x < 0 || y < 0 || x >= MAPW || y >= MAPH) {
        this.fault('error', 'Entry “' + k + '” is off the map.', []);
      } else if (World.isSolid(x, y)) {
        this.fault('error', 'Entry “' + k + '” is inside something solid.', [[x, y]]);
      }
    });
  },

  /* ---- waypoints ----
     The other fault the flood fill found, and the one that is hardest to see:
     WP.looSink pointed AT the sink rather than in front of it, so everyone who
     walked there shuffled into the basin until the stuck timer gave up and
     stood them in it. NPC movement is greedy rather than pathfound — nobody
     routes around anything — so a waypoint has to be floor, and it has to be
     floor on the same piece of floor as everybody else. */
  waypoints() {
    for (const k in Doc.waypoints) {
      const w = Doc.waypoints[k];
      const x = w[0], y = w[1];
      if (x < 0 || y < 0 || x >= MAPW || y >= MAPH) {
        this.fault('error', 'Waypoint “' + k + '” is off the map.', []);
        continue;
      }
      if (World.isSolid(x, y)) {
        this.fault('error', 'Waypoint “' + k + '” is inside something solid — anyone sent there '
          + 'walks into it until the stuck timer fires.', [[x, y]], { wp: k });
      } else if (!this.walkableAndReached(x, y)) {
        this.fault('error', 'Waypoint “' + k + '” is on floor nobody can walk to.', [[x, y]], { wp: k });
      }
    }
  },

  /* ---- can you get to the things ----
     An object you cannot stand beside is an act nobody will ever read. Checked
     against the fill rather than against the map, because "there is floor next
     to it" and "there is floor next to it that you can reach" are different
     questions and only the second one matters. */
  reach() {
    const bad = [];
    Doc.objects.forEach((o, i) => {
      if (!o.use) return;
      const sides = [[o.x, o.y - 1], [o.x, o.y + 1], [o.x - 1, o.y], [o.x + 1, o.y]];
      /* You can stand on a non-solid object's own tile, so it counts too. */
      if (!o.solid) sides.push([o.x, o.y]);
      if (sides.some(([x, y]) => this.walkableAndReached(x, y))) return;
      bad.push({ i: i, o: o });
    });
    bad.forEach(b => this.fault('error',
      '“' + (b.o.name || b.o.kind) + '” cannot be reached — no tile beside it that anyone can stand on.',
      [[b.o.x, b.o.y]], { obj: b.i }));
  },

  /* ---- things on walls ----
     World.build() resolves which face a wall-mounted object hangs on and quietly
     drops it to the floor when there is no wall on any of the four sides. Quiet
     is the problem: it looks like a poster lying in the middle of the carpet.

     Two kinds are exempt, and both for a reason rather than because they
     happened to fire: R.wallArt() draws a little stand under a `sign` with no
     wall, which is what the HOT DESKING sign in the middle of the main floor
     is; and a `pigeon` on a wall is a pigeon on a ledge while a pigeon on the
     road is a pigeon. Anything else lying on the carpet is an accident. */
  FREESTANDING: ['sign', 'pigeon'],
  mounts() {
    Doc.objects.forEach((o, i) => {
      if (this.FREESTANDING.indexOf(o.kind) >= 0) return;
      const built = World.objects.find(b => b.x === o.x && b.y === o.y && b.name === o.name && b.kind === o.kind);
      if (!built) return;
      const wants = (built.fdef || {}).mount === 'wall';
      if (wants && !built.wallSide) {
        this.fault('warn', '“' + (o.name || o.kind) + '” wants a wall and has none, so it is on the floor.',
          [[o.x, o.y]], { obj: i });
      }
    });
  },

  /* ---- a window has to have somewhere to look ----
     The corridor window hung on the corridor's south wall with the toilets on
     the other side. Step two tiles through the wall it is on: if there is a room
     back there, it is an interior window into the loos. */
  windows() {
    const step = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] };
    Doc.objects.forEach((o, i) => {
      if (o.kind !== 'window') return;
      const built = World.objects.find(b => b.x === o.x && b.y === o.y && b.kind === 'window');
      const d = step[(built || {}).wallSide];
      if (!d) return;
      const bx = o.x + d[0] * 2, by = o.y + d[1] * 2;
      if (bx < 0 || by < 0 || bx >= MAPW || by >= MAPH) return;
      if (World.zoneAt(bx, by) && !World.solid[by][bx]) {
        this.fault('warn', '“' + (o.name || o.kind) + '” looks into '
          + ((ZONES[World.zoneAt(bx, by)] || {}).name || 'another room') + ', not outside.',
          [[o.x, o.y], [bx, by]], { obj: i });
      }
    });
  },

  /* ---- the link table ----
     Nothing outside data/levels.js names a destination, so a typo here is a door
     that silently does nothing rather than an error anybody sees. */
  links() {
    Doc.links.forEach(l => {
      const dest = LEVELS[l.to];
      if (!dest) {
        this.fault('error', 'Link “' + l.via + '” goes to “' + l.to + '”, which is not a level.', []);
        return;
      }
      if (l.entry && !(dest.entries || {})[l.entry]) {
        this.fault('error', 'Link “' + l.via + '” arrives at “' + l.entry
          + '”, which ' + l.to + ' does not declare.', []);
      }
      if (!Doc.objects.some(o => o.use === l.via)) {
        this.fault('warn', 'Link “' + l.via + '” has no object on this level with that `use`, '
          + 'so there is no way to take it.', []);
      }
    });
    /* There is deliberately no check the other way round — "this looks like a
       way out and has no link". The lift is exactly that and it is the joke:
       it asks for a link, finds none, and says so. The day somebody adds a
       floor it starts working with no code change, and a warning here would
       have to be suppressed on the one object it would ever fire on. */
  },

  /* ---- a table you can still read ----
     Burying every tile of a table hides its own act: you walk up to the
     birthday cake and are offered the formica. The last tile of a `use` has to
     stay clear, and it is per `use` rather than per table. */
  tables() {
    const byUse = new Map();
    Doc.objects.forEach(o => {
      if (o.kind !== 'table' || !o.use) return;
      if (!byUse.has(o.use)) byUse.set(o.use, []);
      byUse.get(o.use).push(o);
    });
    byUse.forEach((list, use) => {
      const clear = list.some(t => !Doc.objects.some(o =>
        o !== t && o.x === t.x && o.y === t.y && o.kind !== 'table'));
      if (!clear) this.fault('warn', 'Every tile of “' + (list[0].name || use)
        + '” has something on it, so the table itself can never be inspected.',
        list.map(t => [t.x, t.y]));
    });
  },

  /* ---- inside the map ---- */
  bounds() {
    const off = [];
    Doc.objects.forEach((o, i) => {
      if (o.x < 0 || o.y < 0 || o.x >= Doc.w || o.y >= Doc.h) off.push(o.name || o.kind);
    });
    if (off.length) this.fault('error', off.length + ' object'
      + (off.length === 1 ? '' : 's') + ' outside the map: ' + off.slice(0, 4).join(', ')
      + (off.length > 4 ? '…' : ''), []);

    Doc.rooms.forEach(rm => {
      const [x1, y1, x2, y2] = rm.r;
      /* A room touching the edge has no wall to draw on that side, and the
         renderer's boundary is what makes a level read as enclosed. */
      if (x1 < 1 || y1 < 1 || x2 > Doc.w - 2 || y2 > Doc.h - 2)
        this.fault('warn', ((ZONES[rm.z] || {}).name || rm.z)
          + ' reaches the edge of the map, so it has no boundary wall.', []);
    });
    Doc.doors.forEach(d => {
      if (d.x < 0 || d.y < 0 || d.x >= Doc.w || d.y >= Doc.h)
        this.fault('error', 'A door is off the map.', []);
    });
  }
};
