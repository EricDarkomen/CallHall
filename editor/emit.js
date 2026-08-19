'use strict';
/* ---------------- Writing it back out ----------------
   A browser cannot save over data/levels.js, and it should not want to: that
   file is where most of the writing lives, and its loops and its comments are
   the point of it. So the editor emits source and you paste it, deliberately.

   Two very different exports, because two very different things came in:

     GEOMETRY  — w, h, rooms, doors, counters, entries, links. Literal data in
                 the file and literal data here, so it round-trips exactly and
                 can be pasted over the old block without losing anything.

     FURNITURE — a flat furnish(). Correct for a level whose furnish() already
                 IS a flat list (the basement, outside, anything made here) and
                 destructive for one that is not: office builds thirty-two desks
                 in two loops and explains itself in twenty comments, and this
                 would replace all of it with ninety-six identical lines.

   For that second case there is the CHANGE LIST, which is what you actually
   want: it names what moved and by how much, so you edit the loop rather than
   flattening it. */

const Emit = {

  /* ---- literals ---- */

  /* Single quotes, because the codebase does. Only the two characters that can
     end the literal or start an escape need escaping — the prose is full of
     curly apostrophes and they are fine as they are. */
  str(s) { return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; },
  key(k) { return /^[A-Za-z_$][\w$]*$/.test(k) ? k : this.str(k); },
  lit(v) {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (typeof v === 'string') return this.str(v);
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) return '[' + v.map(x => this.lit(x)).join(', ') + ']';
    const ks = Object.keys(v);
    if (!ks.length) return '{}';
    return '{ ' + ks.map(k => this.key(k) + ': ' + this.lit(v[k])).join(', ') + ' }';
  },

  /* ---- objects ----
     Written in the order the file writes them, so a diff against the original
     is about what changed rather than about key order. */
  ORDER: ['x', 'y', 'e', 'name', 'kind', 'solid', 'use'],
  SKIP: ['_k'],
  objectLit(o) {
    const seen = new Set(this.SKIP);
    const parts = [];
    this.ORDER.forEach(k => {
      if (!(k in o)) return;
      seen.add(k);
      parts.push(k + ': ' + this.lit(o[k]));
    });
    Object.keys(o).forEach(k => {
      if (seen.has(k)) return;
      parts.push(k + ': ' + this.lit(o[k]));
    });
    return parts;
  },
  /* One add() call. `furn:` goes to its own line on a long one — that is where
     the file already breaks them, and it is the half you want to read. */
  objectLine(o, indent) {
    const pad = ' '.repeat(indent);
    const parts = this.objectLit(o);
    const one = pad + 'A({ ' + parts.join(', ') + ' });';
    if (one.length <= 108) return one;
    const cut = parts.findIndex(p => p.indexOf('furn: ') === 0);
    if (cut < 1) return one;
    return pad + 'A({ ' + parts.slice(0, cut).join(', ') + ',\n'
      + pad + '  ' + parts.slice(cut).join(', ') + ' });';
  },

  /* ---- geometry ----
     The data half of a level entry in data/levels.js, indented to sit inside
     the catalogue. Paste it over the old one. */
  geometry() {
    const i = '    ', L = [];
    const shared = this.usesSharedDefs();

    L.push(i + 'name: ' + this.str(Doc.name) + ',');
    L.push(i + 'w: ' + Doc.w + ', h: ' + Doc.h + ',');
    if (Doc.hub) L.push(i + 'hub: true,');
    if (!Doc.indoors) L.push(i + 'indoors: false,');

    if (shared) {
      /* The fourth floor's floor plan lives in data/world.js and is named from
         here, so this stays a reference and the arrays go in the other export.
         Flattening them into the catalogue would give the building two floor
         plans that are free to disagree. */
      L.push(i + 'rooms: ROOM_DEFS,');
      L.push(i + 'doors: DOOR_DEFS,');
    } else {
      L.push(this.listBlock('rooms', Doc.rooms, i));
      L.push(this.listBlock('doors', Doc.doors, i));
    }
    if (Doc.counters.length) L.push(this.listBlock('counters', Doc.counters, i));

    const ek = Object.keys(Doc.entries);
    if (ek.length === 1) {
      L.push(i + 'entries: { ' + this.key(ek[0]) + ': ' + this.lit(Doc.entries[ek[0]]) + ' },');
    } else {
      L.push(i + 'entries: {');
      ek.forEach(k => L.push(i + '  ' + this.key(k) + ': ' + this.lit(Doc.entries[k]) + ','));
      L.push(i + '},');
    }
    L.push(this.listBlock('links', Doc.links, i));
    return L.join('\n') + '\n';
  },
  /* `key: [ … ]`, one entry a line, or `key: []` when there is nothing in it. */
  listBlock(name, list, i) {
    if (!list.length) return i + name + ': [],';
    if (list.length === 1) return i + name + ': [' + this.lit(list[0]) + '],';
    return i + name + ': [\n'
      + list.map(v => i + '  ' + this.lit(v) + ',').join('\n') + '\n'
      + i + '],';
  },
  /* Is this level's floor plan the shared one in data/world.js? Asked of the
     catalogue rather than assumed of `office`, so a second level that names the
     same consts is handled without this knowing about it. */
  usesSharedDefs() {
    const def = LEVELS[Doc.id];
    return !!def && def.rooms === ROOM_DEFS && def.doors === DOOR_DEFS;
  },

  /* ---- a whole catalogue entry ----
     What a NEW level needs: the id, the data and the furnish, indented to drop
     straight into `const LEVELS = { … }`. Only offered where a flat furnish() is
     faithful, which a level made here always is. */
  levelEntry() {
    return '  ' + this.key(Doc.id) + ': {\n'
      + this.geometry()
      + this.furnish()
      + '  },\n';
  },

  /* ---- the floor plan, for data/world.js ----
     Emitted with the zone and name columns lined up, because that file lines
     them up and a floor plan is read down the columns. */
  roomDefs() {
    const w = Math.max.apply(null, Doc.rooms.map(r => this.str(r.z).length).concat([0]));
    return 'const ROOM_DEFS = [\n'
      + Doc.rooms.map(r =>
        '  { z: ' + pad(this.str(r.z) + ',', w + 1) + ' r: ' + this.lit(r.r) + ' }').join(',\n')
      + '\n];\n';
  },
  doorDefs() {
    const zw = Math.max.apply(null, Doc.doors.map(d => this.str(d.z).length).concat([0]));
    const xw = Math.max.apply(null, Doc.doors.map(d => String(d.x).length).concat([0]));
    const yw = Math.max.apply(null, Doc.doors.map(d => String(d.y).length).concat([0]));
    return 'const DOOR_DEFS = [\n'
      + Doc.doors.map(d => {
        let s = '  { x: ' + pad(d.x + ',', xw + 1) + ' y: ' + pad(d.y + ',', yw + 1)
          + ' z: ' + pad(this.str(d.z) + ',', zw + 1) + ' name: ' + this.str(d.name);
        if (d.locked) s += ', locked: ' + this.str(d.locked);
        return s + ' }';
      }).join(',\n')
      + '\n];\n';
  },

  /* ---- waypoints, for data/world.js ----
     Wrapped at a sensible width rather than one per line: WP is thirty short
     pairs and a column of thirty lines reads as thirty facts when it is really
     one table. */
  waypointDefs() {
    const keys = Object.keys(Doc.waypoints);
    if (!keys.length) return '/* This level has no waypoints. */\n';
    const lines = [];
    let row = '';
    keys.forEach(k => {
      const bit = this.key(k) + ': ' + this.lit(Doc.waypoints[k]) + ', ';
      if (row.length + bit.length > 76) { lines.push('  ' + row.trimEnd()); row = ''; }
      row += bit;
    });
    if (row.trim()) lines.push('  ' + row.trimEnd().replace(/,$/, ''));
    return '/* named spots used by NPC schedules */\nconst WP = {\n'
      + lines.join('\n') + '\n};\n';
  },

  /* ---- furniture ----
     A whole furnish(), flat. Right for a flat level, wrong for a procedural
     one — the panel says which this is before offering it. */
  furnish() {
    const L = ['    furnish() {', '      const A = o => this.add(o);'];
    Doc.objects.forEach(o => L.push(this.objectLine(o, 6)));
    if (Doc.desks.length) {
      L.push('      /* The renderer draws a surface and a partition per desk. */');
      L.push('      this.desks = [');
      Doc.desks.forEach(d => L.push('        ' + this.lit(d) + ','));
      L.push('      ];');
    }
    L.push('    }');
    return L.join('\n') + '\n';
  },
  /* Whether a flat furnish() would lose anything. A level built here has
     nothing to lose; one loaded from a hand-written procedural furnish() has
     its loops and its comments to lose, and no export can carry those. */
  flatIsSafe() {
    const def = LEVELS[Doc.id];
    if (!def) return true;
    /* A furnish() that is a plain run of A({…}) calls and nothing else. Read off
       the source rather than guessed at: a `for`, a `forEach` or a `const` in
       there means the file says something this export cannot. */
    const src = String(def.furnish);
    return !/\b(for|while|forEach|map|if)\b/.test(src);
  },

  /* ---- the change list ----
     What to do to a furnish() you do not want to regenerate. Matched on the
     identity the doc carries rather than on position, so a move is reported as
     a move instead of as a delete and an add. */
  changes() {
    const was = new Map((Doc.base.objects || []).map(o => [o._k, o]));
    const now = new Map(Doc.objects.map(o => [o._k, o]));
    const moved = [], added = [], removed = [], edited = [];

    now.forEach((o, k) => {
      const b = was.get(k);
      if (!b) { added.push(o); return; }
      if (b.x !== o.x || b.y !== o.y) moved.push({ b: b, o: o });
      const diffs = [];
      Object.keys(o).concat(Object.keys(b)).forEach(f => {
        if (f === '_k' || f === 'x' || f === 'y') return;
        if (diffs.some(d => d.f === f)) return;
        const a = JSON.stringify(b[f]), c = JSON.stringify(o[f]);
        if (a !== c) diffs.push({ f: f, from: b[f], to: o[f] });
      });
      if (diffs.length) edited.push({ o: o, diffs: diffs });
    });
    was.forEach((o, k) => { if (!now.has(k)) removed.push(o); });

    const geo = JSON.stringify({
      w: Doc.w, h: Doc.h, rooms: Doc.rooms, doors: Doc.doors,
      counters: Doc.counters, entries: Doc.entries, links: Doc.links
    }) !== JSON.stringify({
      w: Doc.base.w, h: Doc.base.h, rooms: Doc.base.rooms, doors: Doc.base.doors,
      counters: Doc.base.counters, entries: Doc.base.entries, links: Doc.base.links
    });

    return { moved: moved, added: added, removed: removed, edited: edited, geometry: geo };
  },
  changeText() {
    const c = this.changes();
    const L = [];
    const nm = o => this.str(o.name || o.kind);

    if (c.geometry) L.push('GEOMETRY changed — take it from the Geometry export above.', '');
    if (c.moved.length) {
      L.push('MOVED (' + c.moved.length + ')');
      c.moved.forEach(m => L.push('  ' + nm(m.o) + '  (' + m.b.x + ',' + m.b.y + ') → ('
        + m.o.x + ',' + m.o.y + ')'));
      L.push('');
    }
    if (c.edited.length) {
      L.push('EDITED (' + c.edited.length + ')');
      c.edited.forEach(e => e.diffs.forEach(d => L.push('  ' + nm(e.o) + '  ' + d.f + ': '
        + this.lit(d.from) + ' → ' + this.lit(d.to))));
      L.push('');
    }
    if (c.added.length) {
      L.push('ADDED (' + c.added.length + ') — paste these into furnish()');
      c.added.forEach(o => L.push(this.objectLine(o, 6)));
      L.push('');
    }
    if (c.removed.length) {
      L.push('REMOVED (' + c.removed.length + ') — delete these lines');
      c.removed.forEach(o => L.push('  ' + nm(o) + ' at (' + o.x + ',' + o.y + ')'));
      L.push('');
    }
    if (!L.length) return 'Nothing has changed on this level.\n';
    return L.join('\n');
  }
};

function pad(s, n) { return s + ' '.repeat(Math.max(0, n - s.length)); }
