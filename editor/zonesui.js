'use strict';
/* ---------------- The zone editor's panes ----------------
   The list is swatches, because thirteen dark navy-greys are told apart by
   looking at them and by nothing else — the same reason the room-tool palette
   carries its tints. */

const ZonesUI = {
  refresh() {
    this.workspace();
    if (Side.tab === 'inspect') this.inspect();
    else if (Side.tab === 'check') this.check();
    else if (Side.tab === 'export') this.exportPane();
  },

  filter: '',
  workspace() {
    const el = $('#zonesWork');
    if (!el) return;
    const q = this.filter.toLowerCase();
    const use = Zones.usage();
    const ids = Zones.ids().filter(id => !q
      || id.toLowerCase().indexOf(q) >= 0
      || String((ZONES[id] || {}).name || '').toLowerCase().indexOf(q) >= 0);

    const rows = ids.map(id => {
      const z = id === Zones.id ? Zones.z : ZONES[id];
      const used = use.get(id) || [];
      const tiles = used.reduce((n, r) => n + r.tiles, 0);
      const worst = ZoneCheck.worstFor(id);
      const n = ZoneCheck.countFor(id);
      const chip = c => '<i style="background:' + esc(String(c || '#000')) + '"></i>';
      return '<li data-zone="' + esc(id) + '" class="' + (id === Zones.id ? 'on ' : '') + worst + '">'
        + '<b><span class="swatch">' + chip(z.floor) + chip(z.wall) + chip(z.tint) + '</span>'
        + esc(z.name || id) + '</b>'
        + '<em><code>' + esc(id) + '</code> · '
        + (used.length ? used.length + ' room' + (used.length === 1 ? '' : 's') + ' · ' + tiles + ' tiles'
          : 'nowhere') + '</em>'
        + '<span class="tags">'
        + (z.tile ? '<span class="tag code">' + esc(z.tile) + '</span>' : '')
        + (z.surf ? '<span class="tag">' + esc(z.surf) + '</span>' : '')
        + (z.wsurf ? '<span class="tag">wall ' + esc(z.wsurf) + '</span>' : '')
        + '</span>'
        + (n ? '<span class="badge ' + worst + '">' + n + '</span>' : '')
        + '</li>';
    }).join('');

    el.innerHTML = '<div class="work-head"><h2>Rooms</h2>'
      + '<span class="work-sub">' + Zones.ids().length + ' kinds of room · what a level is made '
      + 'of, and everything about how one looks</span></div>'
      + '<div class="seek"><input id="edZoneSeek" value="' + esc(this.filter)
      + '" placeholder="Find by name or id"></div>'
      + (rows ? '<ul class="list rows">' + rows + '</ul>' : '<p class="empty">No zone matches.</p>');

    const seek = $('#edZoneSeek');
    seek.oninput = () => { this.filter = seek.value; this.workspace(); $('#edZoneSeek').focus(); };
    el.querySelectorAll('li[data-zone]').forEach(li => {
      li.onclick = () => Mode.openSubject(li.dataset.zone);
    });
  },

  /* A colour field is a text box AND a picker, side by side. The text box is
     what the file holds and what gets pasted between zones; the picker is how
     anybody actually chooses a colour. */
  colour(label, k) {
    const v = Zones.z[k];
    const ok = ZoneCheck.colour(v);
    return Side.row(label, '<span class="pair">'
      + '<input type="color" data-col="' + esc(k) + '" value="' + esc(ok ? v : '#000000') + '">'
      + '<input data-f="' + esc(k) + '" value="' + esc(v === undefined ? '' : String(v))
      + '" spellcheck="false">' + '</span>');
  },
  pick(label, k, list, none) {
    const v = Zones.z[k];
    return Side.row(label, '<select data-f="' + esc(k) + '">'
      + '<option value="">' + esc(none) + '</option>'
      + list.map(o => '<option value="' + esc(o) + '"' + (o === v ? ' selected' : '') + '>'
        + esc(o) + '</option>').join('')
      + (v !== undefined && list.indexOf(v) < 0
        ? '<option value="' + esc(v) + '" selected>' + esc(v) + '  (unknown)</option>' : '')
      + '</select>');
  },

  inspect() {
    const p = $('#paneInspect');
    if (!Zones.z) { p.innerHTML = '<p class="empty">No zone open.</p>'; return; }
    const atlas = (typeof Tiles !== 'undefined' && Tiles.rects) ? Object.keys(Tiles.rects) : [];
    const floors = atlas.filter(n => /^floor\./.test(n)).sort();
    const walls = atlas.filter(n => /^wall\./.test(n)).sort();
    const used = Zones.usage().get(Zones.id) || [];

    p.innerHTML = '<h3>' + esc(Zones.z.name || Zones.id) + '</h3>'
      + '<div class="note">Rooms · <code>' + esc(Zones.id) + '</code></div>'
      + Side.row('called', '<input data-f="name" value="' + esc(Zones.z.name || '') + '">')
      + '<div class="note">What the HUD says you are standing in.</div>'
      + '<h4>Colour</h4>'
      + this.colour('floor', 'floor')
      + this.colour('alternate', 'alt')
      + this.colour('wall', 'wall')
      + this.colour('tint', 'tint')
      + '<div class="note">The two floor shades alternate tile to tile. <b>tint</b> is the minimap '
      + 'and the room chip, not the floor. A wall too close to its own floor in brightness loses '
      + 'the edge of the room — these colours are dark on purpose, which is what makes that easy '
      + 'to do.</div>'
      + '<h4>Texture</h4>'
      + this.pick('floor art', 'tile', floors, 'none — use the drawn surface')
      + this.pick('wall art', 'wtile', walls, 'none — use the drawn surface')
      + this.pick('floor surface', 'surf', Zones.SURF, 'carpet (the default)')
      + this.pick('wall surface', 'wsurf', Zones.WSURF, 'plain')
      + '<div class="note">A named rect from the world atlas wins over the drawn surface, and is '
      + 'tinted through the colours above — straight from the atlas each material is one flat '
      + 'colour and every room becomes the same room. The drawn surfaces are what the toilets and '
      + 'the fire escape use on purpose.</div>'
      + '<h4>Where it is <span class="pill">' + used.length + '</span></h4>'
      + (used.length
        ? '<ul class="list tight">' + used.map(r =>
          '<li><b>' + esc((LEVELS[r.level] || {}).name || r.level) + '</b>'
          + '<em>' + r.tiles + ' tiles</em></li>').join('') + '</ul>'
        : '<div class="note bad">No room anywhere is painted with this, so nobody will ever '
          + 'see it. Paint one with the room tool on the Levels tab.</div>')
      + '<div class="btns"><button data-a="new">New room type…</button>'
      + '<button data-a="dup">Duplicate</button>'
      + '<button data-a="drop" class="warn">Delete</button></div>';

    p.querySelectorAll('[data-f]').forEach(el => {
      el.onchange = () => Zones.set(el.dataset.f, el.value);
    });
    /* The picker writes the text box's value, so the two can never disagree —
       and it is `change`, not `input`, or dragging through a gradient marks a
       hundred undo steps. */
    p.querySelectorAll('[data-col]').forEach(el => {
      el.onchange = () => Zones.set(el.dataset.col, el.value);
    });
    p.querySelectorAll('[data-a]').forEach(b => {
      b.onclick = () => {
        if (b.dataset.a === 'new') ZonesMake.create();
        else if (b.dataset.a === 'dup') Mode.duplicate();
        else ZonesMake.drop();
      };
    });
  },

  check() {
    const p = $('#paneCheck');
    const f = ZoneCheck.faults;
    const errors = f.filter(x => x.level === 'error');
    const warns = f.filter(x => x.level === 'warn');
    const table = Zones.ids().reduce((n, id) => n + ZoneCheck.countFor(id), 0);
    const unused = Zones.ids().filter(id => !(Zones.usage().get(id) || []).length);
    const group = (list, title, cls) => !list.length ? '' : '<h4>' + esc(title) + '</h4>'
      + '<ul class="faults">' + list.map(x => '<li class="' + cls + '">' + esc(x.msg) + '</li>').join('')
      + '</ul>';

    p.innerHTML = '<div class="stat">'
      + '<div><b class="' + (errors.length ? 'bad' : 'good') + '">' + errors.length + '</b><span>broken</span></div>'
      + '<div><b>' + warns.length + '</b><span>warnings</span></div>'
      + '<div><b>' + table + '</b><span>table-wide</span></div>'
      + '</div>'
      + (f.length
        ? group(errors, errors.length + ' broken now', 'error')
          + group(warns, warns.length + ' will bite later', 'warn')
        : '<p class="ok">✓ Nothing wrong with this room type.</p>')
      + '<h4>Nowhere in the building <span class="pill">' + unused.length + '</span></h4>'
      + (unused.length
        ? '<ul class="list tight">' + unused.map(id =>
          '<li><b>' + esc((ZONES[id] || {}).name || id) + '</b><em><code>' + esc(id) + '</code></em></li>').join('')
          + '</ul><div class="note">Defined, and no room is painted with them.</div>'
        : '<div class="note">Every room type is used somewhere.</div>');
  },

  exportPane() {
    const p = $('#paneExport');
    p.innerHTML = '<label class="frow"><span>what</span><span><select id="edWhat">'
      + '<option value="one">This room type → data/world.js</option>'
      + '<option value="all">The whole ZONES table</option>'
      + '<option value="changes">Change list</option>'
      + '</select></span></label>'
      + '<div class="note" id="edWhatNote"></div>'
      + '<textarea id="edOut2" class="code" rows="16" spellcheck="false" readonly wrap="off"></textarea>'
      + '<div class="btns"><button data-a="copy">Copy</button>'
      + '<button data-a="dl">Download</button></div>';
    const sel = $('#edWhat'), out = $('#edOut2'), note = $('#edWhatNote');
    const render = () => {
      if (sel.value === 'one') {
        out.value = Emit.zoneEntry(Zones.id, Zones.z);
        note.textContent = 'One line of ZONES, ready to paste over the old one.';
      } else if (sel.value === 'all') {
        out.value = Emit.zoneTable();
        note.textContent = 'The whole table with this one as you have it. data/world.js lines its '
          + 'columns up by hand and carries a comment about the outdoor zones; this does not.';
      } else {
        out.value = Emit.zoneChanges();
        note.textContent = 'What you changed, so you can edit the line rather than replace the table.';
      }
    };
    sel.onchange = render;
    render();
    Side.wireExport(p, out, () => Zones.id + '.zone.txt');
  }
};
