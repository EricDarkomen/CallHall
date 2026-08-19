'use strict';
/* ---------------- The side panel ----------------
   Five tabs, and each is a plain rebuild of its own pane: the doc is the truth
   and the panel is a view of it, so every edit ends in refresh() and no part of
   the UI holds state that could disagree with the level.

   Fields commit on `change`, not on `input`. Every commit marks an undo entry
   and rebuilds the map, and doing that per keystroke would put "The Fridg",
   "The Frid", "The Fri" on the undo stack. */

const Side = {
  tab: 'inspect',
  msg: '',
  /* Doc.rebuild() refreshes the panel, and the first rebuild happens while the
     editor is still starting up. Nothing to refresh until init() has run. */
  live: false,

  init() {
    const lv = $('#edLevel');
    this.levelOptions();
    lv.onchange = () => {
      /* "New level…" lives in the list rather than as another toolbar button:
         it is the same decision as picking one, and the bar is full. */
      if (lv.value === '__new__') { lv.value = Doc.id; Ed.newLevel(); return; }
      Ed.open(lv.value);
    };

    const zn = $('#edZone');
    zn.innerHTML = Object.keys(ZONES).map(z =>
      '<option value="' + esc(z) + '">' + esc(ZONES[z].name) + '</option>').join('');
    zn.value = Tools.zone;
    zn.onchange = () => { Tools.zone = zn.value; };

    document.querySelectorAll('#edTools button').forEach(b => {
      b.onclick = () => Tools.set(b.dataset.tool);
    });
    document.querySelectorAll('#edTabs button[data-tab]').forEach(b => {
      b.onclick = () => this.show(b.dataset.tab);
    });
    $('#edSheet').onclick = () => this.sheet();

    $('#edGrid').onchange = e => { View.grid = e.target.checked; };
    $('#edPlan').onchange = e => { View.plan = e.target.checked; };
    $('#edFaults').onchange = e => { View.faults = e.target.checked; };
    $('#edWps').onchange = e => { View.wps = e.target.checked; this.refresh(); };
    $('#edIn').onclick = () => View.setZoom(View.zoom * 1.25);
    $('#edOut').onclick = () => View.setZoom(View.zoom / 1.25);
    $('#edFit').onclick = () => View.fit();
    $('#edRevert').onclick = () => Ed.revert();
    $('#edUndo').onclick = () => this.step(false);
    $('#edRedo').onclick = () => this.step(true);

    Palette.collect();
    this.live = true;
    this.toolButtons();
    /* On a phone the sheet starts closed, so what you arrive at is the map. It
       is one tap from open and the tab strip is still there saying what is in
       it — whereas an editor that opens on a form reads as a form. */
    if (matchMedia('(pointer: coarse)').matches) this.sheet(false);
    this.refresh();
  },

  /* The catalogue, in its own order, plus the way to add to it. Rebuilt rather
     than appended to, so a level created here appears without this having to
     know where in the list it went. */
  levelOptions() {
    const lv = $('#edLevel');
    if (!lv) return;
    lv.innerHTML = Levels.ids().map(id =>
      '<option value="' + esc(id) + '">' + esc(LEVELS[id].name || id) + '</option>').join('')
      + '<option value="__new__">+ New level…</option>';
    lv.value = Doc.id;
  },

  show(tab) {
    this.tab = tab;
    let picked = null;
    document.querySelectorAll('#edTabs button[data-tab]').forEach(b => {
      const on = b.dataset.tab === tab;
      b.classList.toggle('on', on);
      if (on) picked = b;
    });
    document.querySelectorAll('.pane').forEach(p =>
      p.classList.toggle('on', p.id === 'pane' + tab[0].toUpperCase() + tab.slice(1)));
    /* The tab strip scrolls on a phone, so the tab you just chose has to be put
       back into view — otherwise picking the one at the far end scrolls it off
       and nothing looks selected. Same reason the game's panel does it. */
    if (picked && picked.scrollIntoView) {
      picked.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    /* Choosing a tab is asking to read it. */
    if (this.shut) this.sheet(false);
    this.refresh();
  },

  /* The bottom sheet. Closed, the panel is its tab strip and the map has the
     screen; open, it takes a fixed share. Phone only — the desktop's side panel
     is a column and there is nothing to get out of the way of. */
  shut: false,
  sheet(open) {
    this.shut = open === undefined ? !this.shut : !open;
    $('#app').classList.toggle('sheet-shut', this.shut);
    const b = $('#edSheet');
    if (b) {
      b.title = this.shut ? 'Show the panel' : 'Collapse the panel';
      b.setAttribute('aria-label', b.title);
    }
    /* The canvas just changed size. */
    if (R.cv) { R.resize(); View.clamp(); }
  },
  toolButtons() {
    document.querySelectorAll('#edTools button').forEach(b =>
      b.classList.toggle('on', b.dataset.tool === Tools.current));
  },
  zoomLabel() {
    const el = $('#edZoomV');
    if (el) el.textContent = Math.round(View.zoom * 100) + '%';
  },
  say(m) { this.msg = m; this.readout(); },

  /* One way in for both the buttons and Ctrl+Z, so the message and the button
     states cannot get out of step with each other. */
  step(forward) {
    const label = forward ? Doc.redo() : Doc.undo();
    this.say(label ? (forward ? 'Redid ' : 'Undid ') + label
      : 'Nothing to ' + (forward ? 'redo' : 'undo') + '.');
    this.refresh();
  },
  /* Disabled when there is nothing to take back, and titled with what it would
     take back — the label is the only thing that says whether the last thing
     you did registered at all. */
  histButtons() {
    const u = $('#edUndo'), r = $('#edRedo');
    if (!u || !r) return;
    const back = Doc.undoStack[Doc.undoStack.length - 1];
    const fwd = Doc.redoStack[Doc.redoStack.length - 1];
    u.disabled = !back; r.disabled = !fwd;
    u.title = back ? 'Undo ' + back.label + '  (Ctrl+Z)' : 'Nothing to undo';
    r.title = fwd ? 'Redo ' + fwd.label + '  (Ctrl+Shift+Z)' : 'Nothing to redo';
  },

  /* The status line under the canvas: where the pointer is and what is there. */
  readout() {
    const el = $('#readout');
    if (!el) return;
    const bits = [];
    const t = View.hover;
    if (t) {
      bits.push('(' + t.x + ',' + t.y + ')');
      const z = World.zoneAt(t.x, t.y);
      bits.push(z ? ((ZONES[z] || {}).name || z) : 'void');
      bits.push(World.isSolid(t.x, t.y) ? 'solid' : 'walkable');
      const objs = Doc.objectsAt(t.x, t.y);
      if (objs.length) bits.push(objs.map(x => x.o.name || x.o.kind).join(' · '));
    }
    if (this.msg) bits.push('— ' + this.msg);
    el.textContent = bits.join('  ·  ');
  },

  /* ---- the panes ---- */

  refresh() {
    this.histButtons();
    $('#edFaultN').textContent = Check.faults.length ? String(Check.faults.length) : '';
    $('#edFaultN').className = 'pill' + (Check.errors() ? ' bad' : Check.faults.length ? ' warn' : '');
    if (this.tab === 'inspect') this.inspect();
    else if (this.tab === 'check') this.check();
    else if (this.tab === 'palette') Palette.render();
    else if (this.tab === 'level') this.level();
    else if (this.tab === 'export') this.exportPane();
    this.readout();
  },

  /* ---- inspect ---- */
  inspect() {
    const p = $('#paneInspect');
    if (Sel.kind === 'object') return this.inspectObject(p);
    if (Sel.kind === 'room') return this.inspectRoom(p);
    if (Sel.kind === 'door') return this.inspectDoor(p);
    if (Sel.kind === 'counter') return this.inspectCounter(p);
    if (Sel.kind === 'entry') return this.inspectEntry(p);
    if (Sel.kind === 'wp') return this.inspectWaypoint(p);
    return this.finder(p);
  },

  inspectWaypoint(p) {
    const name = Sel.name, w = Doc.waypoints[name];
    if (!w) { Sel.kind = null; return this.inspect(); }
    const solid = World.isSolid(w[0], w[1]);
    p.innerHTML = '<h3>✜ ' + esc(name) + '</h3>'
      + this.row('tile', '<input type="number" data-f="x" value="' + w[0] + '"> '
        + '<input type="number" data-f="y" value="' + w[1] + '">')
      + '<div class="note">' + (solid
        ? '⚠ This tile is solid. NPC movement is greedy rather than pathfound, so anybody '
          + 'sent here walks into it until the stuck timer gives up.'
        : 'On floor, which is the whole requirement. Whole tiles, not halves — a waypoint is '
          + 'a square somebody walks at until they are close enough.') + '</div>'
      + '<div class="note">Used by the NPC schedules in data/npcs.js. Renaming one here does '
      + 'not rename it there, so move them rather than renaming them.</div>'
      + '<div class="btns"><button data-a="del" class="warn">Delete</button></div>';
    p.querySelectorAll('[data-f]').forEach(el => {
      el.onchange = () => {
        const x = el.dataset.f === 'x' ? +el.value : w[0];
        const y = el.dataset.f === 'y' ? +el.value : w[1];
        Doc.setWaypoint(name, x, y);
        this.refresh();
      };
    });
    p.querySelector('[data-a="del"]').onclick = () => { Doc.removeWaypoint(name); Tools.select(null); };
  },

  /* Nothing selected is not nothing to show. Three hundred objects on the hub
     is more than anybody can find by looking, so the empty inspector is where
     you go looking for one by name. */
  finder(p) {
    const q = (this.find || '').toLowerCase();
    const hits = q ? Doc.objects
      .map((o, i) => ({ o: o, i: i }))
      .filter(h => (h.o.name || '').toLowerCase().indexOf(q) >= 0
        || (h.o.kind || '').toLowerCase().indexOf(q) >= 0
        || (h.o.use || '').toLowerCase().indexOf(q) >= 0)
      .slice(0, 60) : [];

    p.innerHTML = '<label class="frow"><span>find</span><span>'
      + '<input id="edSeek" value="' + esc(this.find || '') + '" placeholder="name, kind or use"></span></label>'
      + (q
        ? (hits.length
          ? '<ul class="list">' + hits.map(h =>
            '<li data-i="' + h.i + '"><b>' + esc(h.o.e || '') + ' ' + esc(h.o.name || h.o.kind) + '</b>'
            + '<em>' + esc(h.o.kind) + ' · (' + h.o.x + ',' + h.o.y + ')'
            + (h.o.use ? ' · ' + esc(h.o.use) : '') + '</em></li>').join('') + '</ul>'
          : '<p class="empty">Nothing on this level matches.</p>')
        : '<p class="empty">Nothing selected. Click something with the select tool — rooms, '
          + 'doors, counters, arrival points and waypoints are all selectable, and the '
          + 'furniture is simply what is on top.</p>'
          + '<p class="empty">Or type above to find one of the ' + Doc.objects.length
          + ' objects on this level.</p>');

    const seek = $('#edSeek');
    seek.oninput = () => { this.find = seek.value; this.finder(p); $('#edSeek').focus(); };
    p.querySelectorAll('[data-i]').forEach(li => {
      li.onclick = () => {
        const i = +li.dataset.i;
        this.centre(Doc.objects[i].x, Doc.objects[i].y);
        Tools.select('object', i);
      };
    });
  },

  inspectObject(p) {
    const i = Sel.i, o = Doc.objects[i];
    if (!o) { Sel.kind = null; return this.inspect(); }
    const built = World.objects.find(b => b.x === o.x && b.y === o.y && b.name === o.name);
    const extra = {};
    Object.keys(o).forEach(k => {
      if (['_k', 'x', 'y', 'e', 'name', 'kind', 'solid', 'use'].indexOf(k) < 0) extra[k] = o[k];
    });

    p.innerHTML = '<h3>' + esc(o.e || '') + ' ' + esc(o.name || o.kind) + '</h3>'
      + this.row('name', '<input data-f="name" value="' + esc(o.name || '') + '">')
      + this.row('emoji', '<input data-f="e" value="' + esc(o.e || '') + '" size="3">')
      + this.row('kind', '<input data-f="kind" value="' + esc(o.kind || '') + '" list="edKinds">')
      + this.row('use', '<input data-f="use" value="' + esc(o.use || '') + '">')
      + this.row('tile', '<input type="number" data-f="x" value="' + o.x + '"> '
        + '<input type="number" data-f="y" value="' + o.y + '">')
      + this.row('solid', '<input type="checkbox" data-f="solid"' + (o.solid ? ' checked' : '') + '>')
      + this.row('other', '<textarea data-f="_extra" rows="3">'
        + esc(Object.keys(extra).length ? JSON.stringify(extra) : '') + '</textarea>')
      + '<div class="note">' + this.builtNote(built) + '</div>'
      + '<div class="btns"><button data-a="dup">Duplicate</button>'
      + '<button data-a="del" class="warn">Delete</button></div>';

    p.querySelectorAll('[data-f]').forEach(el => {
      el.onchange = () => {
        const f = el.dataset.f;
        if (f === 'x' || f === 'y') {
          const x = f === 'x' ? +el.value : o.x, y = f === 'y' ? +el.value : o.y;
          Doc.moveObject(i, x, y);
        } else if (f === 'solid') {
          Doc.setObject(i, 'solid', el.checked);
        } else if (f === '_extra') {
          let parsed = null;
          try { parsed = el.value.trim() ? JSON.parse(el.value) : {}; }
          catch (_) { this.say('That is not valid JSON, so nothing was changed.'); this.refresh(); return; }
          Doc.mark('edit ' + (o.name || o.kind));
          Object.keys(extra).forEach(k => delete o[k]);
          Object.assign(o, parsed);
          Doc.rebuild();
        } else {
          Doc.setObject(i, f, el.value);
        }
        this.refresh();
      };
    });
    p.querySelector('[data-a="dup"]').onclick = () => {
      const c = clone(o); delete c._k; c.x = o.x + 1;
      Doc.addObject(c);
      Tools.select('object', Doc.objects.length - 1);
    };
    p.querySelector('[data-a="del"]').onclick = () => { Doc.removeObject(i); Tools.select(null); };
  },
  /* What the builder made of it — the derived half, which is exactly the half
     you cannot see from the source and the reason a thing ends up on the floor
     when it was meant to be on a wall. */
  builtNote(b) {
    if (!b) return 'Not in the built map — check the tile is inside it.';
    const bits = [];
    bits.push('drawn ' + (b.mount === 'wall' ? 'on the ' + ({ n: 'north', s: 'south', e: 'east', w: 'west' }[b.wallSide] || '?') + ' wall'
      : b.mount === 'surface' ? (b.onTable ? 'on a table' : 'on a worktop') : 'on the floor'));
    if (b.fdef && b.fdef.sprite) bits.push('sprite ' + b.fdef.sprite);
    else if (b.art) bits.push('drawn as ' + b.art);
    else if (b.noEmoji) bits.push('drawn by the renderer');
    else bits.push('emoji at ' + ((b.fdef || {}).size || 20) + 'px');
    if (b.onCounter) bits.push('on a counter');
    return bits.join(' · ');
  },

  inspectRoom(p) {
    const i = Sel.i, rm = Doc.rooms[i];
    if (!rm) { Sel.kind = null; return this.inspect(); }
    const [x1, y1, x2, y2] = rm.r;
    p.innerHTML = '<h3>▦ ' + esc((ZONES[rm.z] || {}).name || rm.z) + '</h3>'
      + this.row('zone', '<select data-f="z">' + Object.keys(ZONES).map(z =>
        '<option value="' + esc(z) + '"' + (z === rm.z ? ' selected' : '') + '>'
        + esc(ZONES[z].name) + '</option>').join('') + '</select>')
      + this.row('from', '<input type="number" data-f="x1" value="' + x1 + '"> '
        + '<input type="number" data-f="y1" value="' + y1 + '">')
      + this.row('to', '<input type="number" data-f="x2" value="' + x2 + '"> '
        + '<input type="number" data-f="y2" value="' + y2 + '">')
      + '<div class="note">' + (x2 - x1 + 1) + ' × ' + (y2 - y1 + 1) + ' tiles</div>'
      + '<div class="btns"><button data-a="del" class="warn">Delete</button></div>';

    p.querySelectorAll('[data-f]').forEach(el => {
      el.onchange = () => {
        if (el.dataset.f === 'z') { Doc.setRoomZone(i, el.value); this.refresh(); return; }
        const v = { x1: x1, y1: y1, x2: x2, y2: y2 };
        v[el.dataset.f] = +el.value;
        Doc.mark('resize room');
        rm.r = [Math.min(v.x1, v.x2), Math.min(v.y1, v.y2), Math.max(v.x1, v.x2), Math.max(v.y1, v.y2)];
        Doc.rebuild();
        this.refresh();
      };
    });
    p.querySelector('[data-a="del"]').onclick = () => { Doc.removeRoom(i); Tools.select(null); };
  },

  inspectDoor(p) {
    const i = Sel.i, d = Doc.doors[i];
    if (!d) { Sel.kind = null; return this.inspect(); }
    p.innerHTML = '<h3>🚪 ' + esc(d.name || 'Door') + '</h3>'
      + this.row('name', '<input data-f="name" value="' + esc(d.name || '') + '">')
      + this.row('zone', '<select data-f="z">' + Object.keys(ZONES).map(z =>
        '<option value="' + esc(z) + '"' + (z === d.z ? ' selected' : '') + '>'
        + esc(ZONES[z].name) + '</option>').join('') + '</select>')
      + this.row('tile', '<input type="number" data-f="x" value="' + d.x + '"> '
        + '<input type="number" data-f="y" value="' + d.y + '">')
      + this.row('locked by', '<input data-f="locked" value="' + esc(d.locked || '') + '" placeholder="an item id, or empty">')
      + '<div class="note">A door is walkable floor punched through the wall. The leaf and '
      + 'the jambs are art — nothing here changes what is solid except the hole itself.</div>'
      + '<div class="btns"><button data-a="del" class="warn">Delete</button></div>';
    p.querySelectorAll('[data-f]').forEach(el => {
      el.onchange = () => {
        const f = el.dataset.f;
        Doc.setDoor(i, f, f === 'x' || f === 'y' ? +el.value : el.value);
        this.refresh();
      };
    });
    p.querySelector('[data-a="del"]').onclick = () => { Doc.removeDoor(i); Tools.select(null); };
  },

  inspectCounter(p) {
    const i = Sel.i, t = Doc.counters[i];
    if (!t) { Sel.kind = null; return this.inspect(); }
    p.innerHTML = '<h3>▤ ' + esc(t.label || 'Counter') + '</h3>'
      + this.row('label', '<input data-f="label" value="' + esc(t.label || '') + '">')
      + this.row('tile', '<input type="number" data-f="x" value="' + t.x + '"> '
        + '<input type="number" data-f="y" value="' + t.y + '">')
      + this.row('width', '<input type="number" data-f="w" value="' + t.w + '" min="1">')
      + '<div class="note">Bare stretches of a counter are solid — but through World.blocked, '
      + 'not World.solid, or the renderer grows a wall on it.</div>'
      + '<div class="btns"><button data-a="del" class="warn">Delete</button></div>';
    p.querySelectorAll('[data-f]').forEach(el => {
      el.onchange = () => {
        Doc.mark('edit counter');
        const f = el.dataset.f;
        t[f] = f === 'label' ? el.value : +el.value;
        Doc.rebuild();
        this.refresh();
      };
    });
    p.querySelector('[data-a="del"]').onclick = () => { Doc.removeCounter(i); Tools.select(null); };
  },

  inspectEntry(p) {
    const name = Sel.name, e = Doc.entries[name];
    if (!e) { Sel.kind = null; return this.inspect(); }
    p.innerHTML = '<h3>⚑ ' + esc(name) + '</h3>'
      + this.row('at', '<input type="number" step="0.5" data-f="x" value="' + e[0] + '"> '
        + '<input type="number" step="0.5" data-f="y" value="' + e[1] + '">')
      + '<div class="note">In tiles, not pixels, and fractional on purpose — data/levels.js '
      + 'loads before TILE exists, so the loader multiplies. A link from another level names '
      + 'this by its key.</div>'
      + '<div class="btns"><button data-a="del" class="warn">Delete</button></div>';
    p.querySelectorAll('[data-f]').forEach(el => {
      el.onchange = () => {
        Doc.mark('move entry ' + name);
        Doc.entries[name][el.dataset.f === 'x' ? 0 : 1] = +el.value;
        Doc.rebuild();
        this.refresh();
      };
    });
    p.querySelector('[data-a="del"]').onclick = () => { Doc.removeEntry(name); Tools.select(null); };
  },

  row(label, html) {
    return '<label class="frow"><span>' + esc(label) + '</span><span>' + html + '</span></label>';
  },

  /* ---- check ---- */
  check() {
    const p = $('#paneCheck');
    const marooned = Check.marooned.length;
    let h = '<div class="stat"><b>' + Check.open + '</b> walkable · <b>' + Check.reachable
      + '</b> reachable · <b class="' + (marooned ? 'bad' : 'good') + '">' + marooned + '</b> marooned</div>';

    if (!Check.faults.length) {
      h += '<p class="ok">Nothing wrong with this level.</p>';
    } else {
      h += '<ul class="faults">' + Check.faults.map((f, i) =>
        '<li class="' + f.level + '" data-i="' + i + '">' + esc(f.msg)
        + (f.tiles.length ? '<em>' + f.tiles.slice(0, 3).map(t => '(' + t[0] + ',' + t[1] + ')').join(' ')
          + (f.tiles.length > 3 ? ' +' + (f.tiles.length - 3) : '') + '</em>' : '')
        + '</li>').join('') + '</ul>';
    }
    h += '<div class="note">The check walks World.isSolid and counts how many separate pieces '
      + 'the walkable floor is in. One is right. A piece with no arrival point in it is floor '
      + 'nobody can stand on; two pieces that each have one are rooms you cannot walk between — '
      + 'which is what the Christmas decorations did to the archive, invisibly, for months.</div>';
    p.innerHTML = h;

    p.querySelectorAll('.faults li').forEach(li => {
      li.onclick = () => {
        const f = Check.faults[+li.dataset.i];
        if (f.obj !== undefined) Tools.select('object', f.obj);
        if (f.tiles.length) this.centre(f.tiles[0][0], f.tiles[0][1]);
      };
    });
  },
  centre(tx, ty) {
    View.x = (tx + .5) * TILE - View.spanW() / 2;
    View.y = (ty + .5) * TILE - View.spanH() / 2;
    View.clamp();
  },

  /* ---- level ---- */
  level() {
    const p = $('#paneLevel');
    p.innerHTML = '<h3>' + esc(Doc.name) + '</h3>'
      + this.row('id', '<code>' + esc(Doc.id) + '</code>')
      + this.row('name', '<input data-f="name" value="' + esc(Doc.name) + '">')
      + this.row('size', '<input type="number" data-f="w" value="' + Doc.w + '" min="4"> '
        + '<input type="number" data-f="h" value="' + Doc.h + '" min="4">')
      + this.row('indoors', '<input type="checkbox" data-f="indoors"' + (Doc.indoors ? ' checked' : '') + '>')
      + this.row('hub', '<input type="checkbox" data-f="hub"' + (Doc.hub ? ' checked' : '') + '>')
      + '<h4>Arrival points</h4>'
      + (Object.keys(Doc.entries).length
        ? '<ul class="list">' + Object.keys(Doc.entries).map(k =>
          '<li data-e="' + esc(k) + '"><b>' + esc(k) + '</b><em>'
          + Doc.entries[k].join(', ') + '</em></li>').join('') + '</ul>'
        : '<p class="empty">None — this level cannot be loaded.</p>')
      + '<h4>Ways out</h4>'
      + (Doc.links.length
        ? '<ul class="list">' + Doc.links.map((l, i) =>
          '<li data-l="' + i + '"><b>' + esc(l.via) + '</b><em>→ ' + esc(l.to)
          + ' · ' + esc(l.entry || 'start') + '</em></li>').join('') + '</ul>'
        : '<p class="empty">None.</p>')
      + '<div class="btns"><button data-a="link">Add a way out</button></div>'
      + '<div class="note">A link is the only place a destination is named. An act says '
      + 'Levels.take(&rsquo;hatch&rsquo;) and never knows where the hatch goes.</div>'
      + (Object.keys(Doc.waypoints).length
        ? '<h4>Waypoints <span class="pill">' + Object.keys(Doc.waypoints).length + '</span></h4>'
          + '<ul class="list">' + Object.keys(Doc.waypoints).map(k =>
            '<li data-w="' + esc(k) + '"><b>' + esc(k) + '</b><em>'
            + Doc.waypoints[k].join(', ')
            + (World.isSolid(Doc.waypoints[k][0], Doc.waypoints[k][1]) ? ' · ⚠ solid' : '')
            + '</em></li>').join('') + '</ul>'
        : '');

    p.querySelectorAll('[data-f]').forEach(el => {
      el.onchange = () => {
        const f = el.dataset.f;
        if (f === 'w' || f === 'h') Doc.setSize(f === 'w' ? +el.value : Doc.w, f === 'h' ? +el.value : Doc.h);
        else if (f === 'indoors' || f === 'hub') Doc.setFlag(f, el.checked);
        else Doc.setFlag(f, el.value);
        View.clamp();
        this.refresh();
      };
    });
    p.querySelectorAll('[data-e]').forEach(li => {
      li.onclick = () => Tools.select('entry', -1, li.dataset.e);
    });
    p.querySelectorAll('[data-w]').forEach(li => {
      li.onclick = () => {
        const k = li.dataset.w;
        /* Turn the layer on rather than selecting something the map is not
           showing — otherwise the inspector describes an invisible marker. */
        View.wps = true; $('#edWps').checked = true;
        this.centre(Doc.waypoints[k][0], Doc.waypoints[k][1]);
        Tools.select('wp', -1, k);
      };
    });
    p.querySelectorAll('[data-l]').forEach(li => {
      li.onclick = () => this.editLink(+li.dataset.l);
    });
    p.querySelector('[data-a="link"]').onclick = () => this.editLink(-1);
  },

  /* One form for both, because adding and editing a way out ask exactly the
     same three questions. `to` is a select: the destinations are a known set and
     a typo there is a door that silently does nothing. */
  editLink(i) {
    const l = i >= 0 ? Doc.links[i] : { via: '', to: Levels.ids().filter(x => x !== Doc.id)[0] || 'office', entry: 'start' };
    if (!l) return;
    /* The handlers on this level that could plausibly be a way out — anything
       with a `use`. Offered rather than demanded: a link may be written before
       the object that takes it exists, and the check will say so. */
    const uses = Array.from(new Set(Doc.objects.map(o => o.use).filter(Boolean))).sort();
    Ask.form(i >= 0 ? 'Edit a way out' : 'Add a way out', [
      { k: 'via', label: 'you take', value: l.via, hint: 'the `use` handler, e.g. hatch',
        options: uses.length ? uses : null },
      { k: 'to', label: 'to level', value: l.to, options: Levels.ids() },
      { k: 'entry', label: 'arriving at', value: l.entry || 'start', hint: 'an entry over there' },
    ], i >= 0 ? 'Save' : 'Add').then(v => {
      if (!v || !v.via || !v.to) return;
      Doc.mark(i >= 0 ? 'edit link' : 'add link');
      const link = { via: v.via, to: v.to, entry: v.entry || 'start' };
      if (i >= 0) Doc.links[i] = link; else Doc.links.push(link);
      Doc.rebuild();
      this.refresh();
    });
  },

  /* ---- export ---- */
  exportPane() {
    const p = $('#paneExport');
    const shared = Emit.usesSharedDefs();
    const flat = Emit.flatIsSafe();
    /* The whole entry is only honest where a flat furnish() is faithful and the
       floor plan is the level's own — which is exactly the case for a level
       invented here, and for the flat ones that already exist. */
    const whole = flat && !shared;
    p.innerHTML = '<label class="frow"><span>what</span><span><select id="edWhat">'
      + (whole ? '<option value="entry">Whole entry → data/levels.js</option>' : '')
      + '<option value="geometry">Geometry → data/levels.js</option>'
      + (shared ? '<option value="plan">Floor plan → data/world.js</option>' : '')
      + (Object.keys(Doc.waypoints).length ? '<option value="wp">Waypoints → data/world.js</option>' : '')
      + '<option value="furnish">Whole furnish() → data/levels.js</option>'
      + '<option value="changes">Change list</option>'
      + '</select></span></label>'
      + '<div class="note" id="edWhatNote"></div>'
      + '<textarea id="edOut2" class="code" rows="18" spellcheck="false" readonly wrap="off"></textarea>'
      + '<div class="btns"><button data-a="copy">Copy</button>'
      + '<button data-a="dl">Download</button></div>';

    const sel = $('#edWhat');
    const out = $('#edOut2');
    const note = $('#edWhatNote');
    const render = () => {
      const what = sel.value;
      if (what === 'entry') {
        out.value = Emit.levelEntry();
        note.textContent = 'The complete catalogue entry — drop it into `const LEVELS = { … }` '
          + 'in data/levels.js. A level created here exists in this tab and nowhere else until '
          + 'you do.';
      } else if (what === 'geometry') {
        out.value = Emit.geometry();
        note.textContent = 'The data half of this level’s entry. Literal in the file and '
          + 'literal here, so it pastes straight over the old block.'
          + (shared ? ' The floor plan itself is a reference to data/world.js — export that separately.' : '');
      } else if (what === 'plan') {
        out.value = Emit.roomDefs() + '\n' + Emit.doorDefs();
        note.textContent = 'ROOM_DEFS and DOOR_DEFS, for data/world.js. This level names them '
          + 'rather than carrying its own copy.';
      } else if (what === 'wp') {
        out.value = Emit.waypointDefs();
        note.textContent = 'The WP table, for data/world.js. The NPC schedules in data/npcs.js '
          + 'name these by key, so moving one is safe and renaming one is not.';
      } else if (what === 'furnish') {
        out.value = Emit.furnish();
        note.textContent = flat
          ? 'A whole furnish(). This level’s furniture is a flat list already, so this is a '
            + 'faithful replacement.'
          : '⚠ This level builds its furniture with loops and explains itself in comments. '
            + 'Pasting this would replace all of that with one line per object. Use the change '
            + 'list instead unless you mean it.';
      } else {
        out.value = Emit.changeText();
        note.textContent = 'What you changed, so you can edit the source rather than regenerate it.';
      }
    };
    sel.onchange = render;
    render();

    p.querySelector('[data-a="copy"]').onclick = () => {
      out.select();
      const ok = navigator.clipboard
        ? navigator.clipboard.writeText(out.value).then(() => true, () => false)
        : Promise.resolve(document.execCommand && document.execCommand('copy'));
      Promise.resolve(ok).then(good => this.say(good ? 'Copied.' : 'Could not copy — select it and copy by hand.'));
    };
    p.querySelector('[data-a="dl"]').onclick = () => this.download(Doc.id + '.' + sel.value + '.txt', out.value);
  },

  /* Saving a file is the one thing that is not the same everywhere the editor
     runs. Served off disk or a local server it is an <a download>; inside the
     claude.ai artifact viewer that is inert by design and the host mediates the
     save instead. Asked for in that order, because the host is the special case
     and its absence is the normal one — and `use()` resolving null is how a
     viewer that cannot save says so, which is a message rather than a dead
     button. Copy is always there either way. */
  download(name, text) {
    const host = window.claude && typeof window.claude.use === 'function'
      ? window.claude.use('downloads') : Promise.resolve(null);
    host.then(dl => {
      if (!dl) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        this.say('Saved ' + name + '.');
        return;
      }
      dl.save({ filename: name, data: text })
        .then(() => this.say('Saved ' + name + '.'))
        .catch(err => this.say(err && err.code === 'declined'
          ? 'Save cancelled — Copy still works.'
          : 'Could not save here. Use Copy instead.'));
    }, () => this.say('Could not save here. Use Copy instead.'));
  }
};

/* ---------------- The palette ----------------
   Built from the game rather than written out here: every distinct object in
   the whole catalogue, so placing a water cooler places THE water cooler —
   right kind, right emoji, right `use` — instead of something that looks like
   one and has no act behind it. */
const Palette = {
  items: [],
  filter: '',

  collect() {
    const seen = new Map();
    const live = World.level ? Levels.snapshot() : null;
    Levels.ids().forEach(id => {
      const def = LEVELS[id];
      if (!def) return;
      World.build(def);
      World.objects.forEach(o => {
        /* Doors come from the door table, not from the palette. */
        if (o.kind === 'door') return;
        const k = o.kind + '|' + o.e + '|' + o.use;
        if (seen.has(k)) return;
        seen.set(k, { e: o.e, name: o.name, kind: o.kind, solid: !!o.solid, use: o.use });
      });
    });
    if (live) Levels.apply(live);
    this.items = Array.from(seen.values()).sort((a, b) =>
      a.kind.localeCompare(b.kind) || String(a.name).localeCompare(String(b.name)));
  },

  render() {
    const p = $('#panePalette');
    const q = this.filter.toLowerCase();
    const list = this.items.filter(it => !q
      || (it.name || '').toLowerCase().indexOf(q) >= 0
      || (it.kind || '').toLowerCase().indexOf(q) >= 0
      || (it.use || '').toLowerCase().indexOf(q) >= 0);

    p.innerHTML = '<label class="frow"><span>find</span><span>'
      + '<input id="edFind" value="' + esc(this.filter) + '" placeholder="name, kind or use"></span></label>'
      + '<div class="note">Clicking one loads it into the object tool. These are the real '
      + 'objects from the catalogue, so the act behind the <code>use</code> already exists.</div>'
      + '<div class="pal">' + list.map((it, i) =>
        '<button data-i="' + i + '" title="' + esc(it.kind + ' · ' + (it.use || 'no act')) + '">'
        + '<span class="pe">' + esc(it.e || '·') + '</span>'
        + '<span class="pn">' + esc(it.name || it.kind) + '</span></button>').join('')
      + '</div>'
      + '<h4>Or make one up</h4>'
      + '<div class="btns"><button data-a="custom">Custom object…</button></div>';

    const find = $('#edFind');
    find.oninput = () => { this.filter = find.value; this.render(); find.focus(); };
    p.querySelectorAll('.pal button').forEach(b => {
      b.onclick = () => {
        Tools.brush = clone(list[+b.dataset.i]);
        Tools.set('object');
        Side.say('Placing “' + (Tools.brush.name || Tools.brush.kind) + '”.');
      };
    });
    p.querySelector('[data-a="custom"]').onclick = () => {
      Ask.form('Make one up', [
        { k: 'name', label: 'name', value: 'A thing' },
        { k: 'e', label: 'emoji', value: '📦' },
        { k: 'kind', label: 'kind', value: 'box', options: Object.keys(FURN).sort() },
        { k: 'use', label: 'use', value: '', hint: 'a handler in data/acts.js — may be blank' },
      ], 'Place it').then(v => {
        if (!v || !v.name) return;
        Tools.brush = { e: v.e || '📦', name: v.name, kind: v.kind || 'box', solid: true };
        if (v.use) Tools.brush.use = v.use;
        Tools.set('object');
        Side.say('Placing “' + v.name + '”.');
      });
    };
  }
};
